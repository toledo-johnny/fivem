const crypto = require('node:crypto');
const { SYSTEM_JOB_TYPES } = require('../../config/constants');
const { withLockedTransaction } = require('../../database/locks');
const { logAction } = require('../logs/logService');
const { findPlayerByDiscordId, getPlayerByAccountId } = require('../players/playerRepository');
const { getPortalPackage } = require('../portal/portalRepository');
const { upsertSystemJob } = require('../system/jobRepository');
const {
  createCheckoutPreference,
  getPaymentDetails,
  searchPaymentsByExternalReference,
  validateWebhookSignature
} = require('./mercadoPagoService');
const {
  createPaymentEvent,
  createPaymentOrder,
  getPaymentDeliveryByOrderId,
  getPaymentOrderByExternalReference,
  getPaymentOrderById,
  listOrdersRequiringReconciliation,
  listPaymentOrdersForDiscordUser,
  listPaymentOrdersForGuild,
  updatePaymentOrder,
  upsertPaymentDelivery,
  upsertWebhookReceipt
} = require('./paymentRepository');

function buildExternalReference(guildId, discordUserId) {
  return [
    'mp',
    guildId,
    discordUserId,
    Date.now(),
    crypto.randomBytes(4).toString('hex')
  ].join('-');
}

function normalizeOrderPaymentStatus(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'approved') {
    return 'approved';
  }

  if (['pending', 'in_process', 'in_mediation', 'authorized'].includes(normalized)) {
    return 'pending';
  }

  if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(normalized)) {
    return 'failed';
  }

  return 'pending';
}

function buildPurchaseSummary(items) {
  return {
    totalOrders: items.length,
    approvedOrders: items.filter((item) => item.paymentStatus === 'approved').length,
    deliveredOrders: items.filter((item) => item.deliveryStatus === 'delivered').length
  };
}

async function findLatestProviderPaymentForOrder(order) {
  if (!order?.externalReference) {
    return null;
  }

  const items = await searchPaymentsByExternalReference(order.externalReference, {
    limit: 10
  });
  const match = items.find(
    (payment) => String(payment?.external_reference || '').trim() === order.externalReference
  );

  return match || items[0] || null;
}

async function createPortalPaymentOrder({ guildId, discordUserId, packageId, quantity = 1 }) {
  const safeQuantity = Math.max(1, Math.min(Number(quantity || 1), 10));
  const selectedPackage = await getPortalPackage(guildId, Number(packageId));
  if (!selectedPackage || !selectedPackage.isActive) {
    throw new Error('Pacote nao encontrado ou indisponivel para compra.');
  }

  const linkedPlayer = await findPlayerByDiscordId(discordUserId);
  const order = await createPaymentOrder({
    guildId,
    discordUserId,
    playerAccountId: linkedPlayer?.accountId || null,
    packageId: selectedPackage.id,
    provider: 'mercadopago',
    externalReference: buildExternalReference(guildId, discordUserId),
    packageSnapshot: {
      id: selectedPackage.id,
      name: selectedPackage.name,
      descriptionText: selectedPackage.descriptionText,
      diamondAmount: selectedPackage.diamondAmount,
      bonusAmount: selectedPackage.bonusAmount,
      highlightLabel: selectedPackage.highlightLabel
    },
    metadata: {
      createdFrom: 'portal',
      linkedAtCreation: Boolean(linkedPlayer)
    },
    quantity: safeQuantity,
    currencyId: 'BRL',
    totalPriceCents: Number(selectedPackage.priceCents || 0) * safeQuantity,
    totalDiamonds: Number(selectedPackage.diamondAmount || 0) * safeQuantity,
    totalBonus: Number(selectedPackage.bonusAmount || 0) * safeQuantity,
    paymentStatus: 'draft',
    deliveryStatus: linkedPlayer ? 'pending' : 'awaiting_link'
  });

  const checkout = await createCheckoutPreference(order);
  return updatePaymentOrder(order.id, {
    paymentStatus: 'pending',
    providerPreferenceId: checkout.preferenceId,
    providerCheckoutUrl: checkout.checkoutUrl,
    metadata: {
      ...order.metadata,
      preferenceCreated: true,
      checkoutReturnEnabled: checkout.checkoutReturnEnabled,
      checkoutMode: checkout.checkoutReturnEnabled ? 'redirect' : 'manual_local_dev'
    }
  });
}

async function listPlayerPaymentOrders(discordUserId, limit = 10) {
  const items = await listPaymentOrdersForDiscordUser(discordUserId, { limit });
  return {
    items,
    summary: buildPurchaseSummary(items)
  };
}

async function listGuildPaymentOrders(guildId, options = {}) {
  const items = await listPaymentOrdersForGuild(guildId, options);
  return {
    items,
    summary: buildPurchaseSummary(items)
  };
}

async function markPaymentOrderFromProvider(order, payment, executor) {
  if (!order) {
    return null;
  }

  return updatePaymentOrder(
    order.id,
    {
      playerAccountId: order.playerAccountId || null,
      paymentStatus: normalizeOrderPaymentStatus(payment.status),
      providerPaymentId: String(payment.id),
      approvedAt: payment.date_approved ? new Date(payment.date_approved) : order.approvedAt,
      metadata: {
        providerStatus: payment.status || null,
        providerStatusDetail: payment.status_detail || null,
        lastProviderSyncAt: new Date().toISOString()
      }
    },
    executor
  );
}

async function deliverApprovedOrder(orderId) {
  return withLockedTransaction(`payment-delivery:${orderId}`, async (connection) => {
    const order = await getPaymentOrderById(orderId, connection);
    if (!order) {
      throw new Error('Pedido nao encontrado para entrega.');
    }

    if (order.paymentStatus !== 'approved') {
      return {
        ok: false,
        code: 'payment_not_approved',
        order
      };
    }

    const existingDelivery = await getPaymentDeliveryByOrderId(order.id, connection);
    if (existingDelivery?.status === 'delivered') {
      return {
        ok: true,
        code: 'already_delivered',
        order,
        delivery: existingDelivery
      };
    }

    const linkedPlayer =
      order.playerAccountId !== null
        ? await getPlayerByAccountId(order.playerAccountId, connection)
        : await findPlayerByDiscordId(order.discordUserId, connection);

    if (!linkedPlayer) {
      const pendingOrder = await updatePaymentOrder(
        order.id,
        {
          deliveryStatus: 'awaiting_link',
          metadata: {
            lastDeliveryAttemptAt: new Date().toISOString(),
            lastDeliveryAttemptResult: 'awaiting_link'
          }
        },
        connection
      );

      await upsertPaymentDelivery(
        order.id,
        {
          playerAccountId: 0,
          providerPaymentId: order.providerPaymentId,
          gemsBefore: 0,
          gemsAfter: 0,
          gemsDelta: 0,
          status: 'awaiting_link',
          details: {
            reason: 'player_not_linked'
          }
        },
        connection
      );

      return {
        ok: false,
        code: 'awaiting_link',
        order: pendingOrder
      };
    }

    const gemsDelta = Number(order.totalDiamonds || 0) + Number(order.totalBonus || 0);
    const gemsBefore = Number(linkedPlayer.gems || 0);
    const gemsAfter = gemsBefore + gemsDelta;

    await connection.execute('UPDATE accounts SET gems = gems + ? WHERE id = ?', [
      gemsDelta,
      linkedPlayer.accountId
    ]);

    const updatedOrder = await updatePaymentOrder(
      order.id,
      {
        playerAccountId: linkedPlayer.accountId,
        deliveryStatus: 'delivered',
        deliveredAt: new Date(),
        metadata: {
          lastDeliveryAttemptAt: new Date().toISOString(),
          lastDeliveryAttemptResult: 'delivered'
        }
      },
      connection
    );

    const delivery = await upsertPaymentDelivery(
      order.id,
      {
        playerAccountId: linkedPlayer.accountId,
        providerPaymentId: updatedOrder.providerPaymentId,
        gemsBefore,
        gemsAfter,
        gemsDelta,
        status: 'delivered',
        details: {
          packageId: updatedOrder.packageId,
          quantity: updatedOrder.quantity
        }
      },
      connection
    );

    await logAction({
      guild: null,
      guildId: updatedOrder.guildId,
      type: 'payment_delivered',
      title: 'Diamantes entregues automaticamente',
      description: `O pedido #${updatedOrder.id} creditou ${gemsDelta} diamantes no passaporte ${linkedPlayer.accountId}.`,
      actorId: null,
      targetId: updatedOrder.discordUserId,
      entityType: 'payment_order',
      entityId: String(updatedOrder.id),
      details: {
        playerAccountId: linkedPlayer.accountId,
        providerPaymentId: updatedOrder.providerPaymentId,
        gemsBefore,
        gemsAfter,
        gemsDelta
      }
    });

    return {
      ok: true,
      code: 'delivered',
      order: updatedOrder,
      delivery
    };
  });
}

async function processMercadoPagoPayment(payment, requestContext = {}) {
  const externalReference = String(payment.external_reference || '').trim();
  const order =
    (externalReference
      ? await getPaymentOrderByExternalReference(externalReference)
      : null) || null;

  await createPaymentEvent({
    orderId: order?.id || null,
    provider: 'mercadopago',
    providerEventType: requestContext.eventType || payment.status || 'payment.updated',
    providerResourceId: String(payment.id),
    requestId: requestContext.requestId || null,
    payload: payment,
    headers: requestContext.headers || {}
  });

  if (!order) {
    return {
      ok: false,
      code: 'order_not_found'
    };
  }

  const updatedOrder = await markPaymentOrderFromProvider(order, payment);
  if (updatedOrder.paymentStatus === 'approved') {
    return deliverApprovedOrder(updatedOrder.id);
  }

  return {
    ok: true,
    code: 'payment_status_updated',
    order: updatedOrder
  };
}

async function syncPortalPaymentOrder({
  discordUserId,
  externalReference = '',
  paymentId = null,
  requestId = null,
  headers = {}
}) {
  const normalizedExternalReference = String(externalReference || '').trim();

  let order = null;
  let payment = null;

  if (paymentId) {
    payment = await getPaymentDetails(paymentId);
    const providerExternalReference = String(payment?.external_reference || '').trim();
    if (providerExternalReference) {
      order = await getPaymentOrderByExternalReference(providerExternalReference);
    }
  }

  if (!order && normalizedExternalReference) {
    order = await getPaymentOrderByExternalReference(normalizedExternalReference);
  }

  if (!order) {
    return {
      ok: false,
      code: 'order_not_found',
      item: null
    };
  }

  if (discordUserId && order.discordUserId !== discordUserId) {
    return {
      ok: false,
      code: 'order_forbidden',
      item: null
    };
  }

  if (!payment) {
    payment = await findLatestProviderPaymentForOrder(order);
  }

  if (!payment) {
    return {
      ok: false,
      code: 'payment_not_found',
      item: order
    };
  }

  const result = await processMercadoPagoPayment(payment, {
    eventType: 'checkout_return',
    requestId: requestId || `checkout-return-${payment.id || order.id}`,
    headers
  });

  return {
    ok: result.ok,
    code: result.code,
    item: result.order || order
  };
}

async function handleMercadoPagoWebhook({ query = {}, headers = {}, body = {} }) {
  const requestId = headers['x-request-id'] || null;
  const signatureText = headers['x-signature'] || null;
  const signature = validateWebhookSignature(query, headers);

  await upsertWebhookReceipt({
    provider: 'mercadopago',
    requestId,
    signatureText,
    manifestText: signature.manifest,
    query,
    headers,
    body,
    isValidSignature: signature.isValid,
    processingStatus: signature.isValid ? 'received' : 'invalid_signature'
  });

  if (!signature.isValid) {
    return {
      ok: false,
      statusCode: 401,
      message: signature.reason || 'Assinatura do webhook invalida.'
    };
  }

  const paymentId = query['data.id'] || body?.data?.id || body?.id || null;
  const eventType = String(body?.type || body?.topic || body?.action || 'payment').toLowerCase();

  if (!paymentId || !eventType.includes('payment')) {
    await upsertWebhookReceipt({
      provider: 'mercadopago',
      requestId,
      signatureText,
      manifestText: signature.manifest,
      query,
      headers,
      body,
      isValidSignature: true,
      processingStatus: 'ignored'
    });

    return {
      ok: true,
      statusCode: 202,
      message: 'Evento ignorado.'
    };
  }

  const payment = await getPaymentDetails(paymentId);
  const result = await processMercadoPagoPayment(payment, {
    eventType,
    requestId,
    headers
  });

  await upsertWebhookReceipt({
    provider: 'mercadopago',
    requestId,
    signatureText,
    manifestText: signature.manifest,
    query,
    headers,
    body,
    isValidSignature: true,
    processingStatus: result.ok ? 'processed' : 'error'
  });

  return {
    ok: true,
    statusCode: 202,
    message: 'Webhook processado.',
    result
  };
}

async function reconcilePendingPaymentOrders(limit = 50) {
  const startedAt = new Date();
  const items = await listOrdersRequiringReconciliation(limit);
  const results = [];

  try {
    for (const order of items) {
      if (order.providerPaymentId) {
        const payment = await getPaymentDetails(order.providerPaymentId);
        results.push(
          await processMercadoPagoPayment(payment, {
            eventType: 'reconciliation',
            requestId: `reconcile-${order.id}`,
            headers: {}
          })
        );
        continue;
      }

      if (order.paymentStatus === 'pending') {
        const payment = await findLatestProviderPaymentForOrder(order);
        if (payment) {
          results.push(
            await processMercadoPagoPayment(payment, {
              eventType: 'reconciliation',
              requestId: `reconcile-${order.id}`,
              headers: {}
            })
          );
          continue;
        }
      }

      if (order.paymentStatus === 'approved') {
        results.push(await deliverApprovedOrder(order.id));
      }
    }

    await upsertSystemJob(
      SYSTEM_JOB_TYPES.PAYMENTS_RECONCILIATION,
      'ok',
      {
        processed: results.length,
        pendingCandidates: items.length
      },
      startedAt
    );

    return {
      processed: results.length,
      pendingCandidates: items.length,
      results
    };
  } catch (error) {
    await upsertSystemJob(
      SYSTEM_JOB_TYPES.PAYMENTS_RECONCILIATION,
      'error',
      {
        message: error.message
      },
      startedAt
    );

    throw error;
  }
}

function startPaymentReconciliationScheduler(runtimeState = {}) {
  if (runtimeState.paymentReconciliationInterval) {
    return runtimeState.paymentReconciliationInterval;
  }

  const run = () =>
    reconcilePendingPaymentOrders().catch((error) => {
      console.error('[paymentReconciliationScheduler]', error);
    });

  setTimeout(run, 15000);
  runtimeState.paymentReconciliationInterval = setInterval(run, 5 * 60 * 1000);
  return runtimeState.paymentReconciliationInterval;
}

module.exports = {
  buildPurchaseSummary,
  createPortalPaymentOrder,
  deliverApprovedOrder,
  handleMercadoPagoWebhook,
  listGuildPaymentOrders,
  listPlayerPaymentOrders,
  processMercadoPagoPayment,
  reconcilePendingPaymentOrders,
  syncPortalPaymentOrder,
  startPaymentReconciliationScheduler
};
