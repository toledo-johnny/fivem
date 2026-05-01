const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function getExecutor(executor) {
  return executor || pool;
}

function mapPaymentOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    discordUserId: row.discord_user_id,
    playerAccountId:
      row.player_account_id === null || row.player_account_id === undefined
        ? null
        : Number(row.player_account_id),
    packageId: Number(row.package_id),
    provider: row.provider,
    externalReference: row.external_reference,
    packageSnapshot: safeParseJson(row.package_snapshot_text, {}),
    metadata: safeParseJson(row.metadata_text, {}),
    quantity: Number(row.quantity || 1),
    currencyId: row.currency_id,
    totalPriceCents: Number(row.total_price_cents || 0),
    totalDiamonds: Number(row.total_diamonds || 0),
    totalBonus: Number(row.total_bonus || 0),
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    providerPreferenceId: row.provider_preference_id || null,
    providerCheckoutUrl: row.provider_checkout_url || null,
    providerPaymentId: row.provider_payment_id || null,
    approvedAt: row.approved_at || null,
    deliveredAt: row.delivered_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPaymentEventRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    orderId:
      row.order_id === null || row.order_id === undefined ? null : Number(row.order_id),
    provider: row.provider,
    providerEventType: row.provider_event_type,
    providerResourceId: row.provider_resource_id || null,
    requestId: row.request_id || null,
    payload: safeParseJson(row.payload_text, {}),
    headers: safeParseJson(row.headers_text, {}),
    createdAt: row.created_at
  };
}

function mapPaymentDeliveryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    playerAccountId: Number(row.player_account_id),
    providerPaymentId: row.provider_payment_id || null,
    gemsBefore: Number(row.gems_before || 0),
    gemsAfter: Number(row.gems_after || 0),
    gemsDelta: Number(row.gems_delta || 0),
    status: row.status,
    details: safeParseJson(row.details_text, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getPaymentOrderById(orderId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    'SELECT * FROM discord_bot_payment_orders WHERE id = ? LIMIT 1',
    [orderId]
  );

  return mapPaymentOrderRow(rows[0] || null);
}

async function getPaymentOrderByExternalReference(externalReference, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    'SELECT * FROM discord_bot_payment_orders WHERE external_reference = ? LIMIT 1',
    [externalReference]
  );

  return mapPaymentOrderRow(rows[0] || null);
}

async function getPaymentOrderByProviderPaymentId(providerPaymentId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    'SELECT * FROM discord_bot_payment_orders WHERE provider_payment_id = ? LIMIT 1',
    [String(providerPaymentId)]
  );

  return mapPaymentOrderRow(rows[0] || null);
}

async function listPaymentOrdersForDiscordUser(discordUserId, options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const limit = Math.max(1, Math.min(Number(options.limit || 20), 100));
  const [rows] = await queryExecutor.execute(
    `
      SELECT *
      FROM discord_bot_payment_orders
      WHERE discord_user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [discordUserId, limit]
  );

  return rows.map(mapPaymentOrderRow).filter(Boolean);
}

async function listPaymentOrdersForGuild(guildId, options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const clauses = ['guild_id = ?'];
  const params = [guildId];

  if (options.paymentStatus) {
    clauses.push('payment_status = ?');
    params.push(options.paymentStatus);
  }

  if (options.deliveryStatus) {
    clauses.push('delivery_status = ?');
    params.push(options.deliveryStatus);
  }

  const limit = Math.max(1, Math.min(Number(options.limit || 50), 200));
  params.push(limit);

  const [rows] = await queryExecutor.execute(
    `
      SELECT *
      FROM discord_bot_payment_orders
      WHERE ${clauses.join(' AND ')}
      ORDER BY id DESC
      LIMIT ?
    `,
    params
  );

  return rows.map(mapPaymentOrderRow).filter(Boolean);
}

async function listOrdersRequiringReconciliation(limit = 50, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200));
  const [rows] = await queryExecutor.execute(
    `
      SELECT *
      FROM discord_bot_payment_orders
      WHERE
        payment_status IN ('pending', 'approved')
        AND delivery_status IN ('pending', 'awaiting_link', 'error')
      ORDER BY id DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return rows.map(mapPaymentOrderRow).filter(Boolean);
}

async function createPaymentOrder(input, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [result] = await queryExecutor.execute(
    `
      INSERT INTO discord_bot_payment_orders (
        guild_id,
        discord_user_id,
        player_account_id,
        package_id,
        provider,
        external_reference,
        package_snapshot_text,
        metadata_text,
        quantity,
        currency_id,
        total_price_cents,
        total_diamonds,
        total_bonus,
        payment_status,
        delivery_status,
        provider_preference_id,
        provider_checkout_url,
        provider_payment_id,
        approved_at,
        delivered_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.guildId,
      input.discordUserId,
      input.playerAccountId || null,
      Number(input.packageId),
      input.provider || 'mercadopago',
      input.externalReference,
      safeStringifyJson(input.packageSnapshot || {}, {}),
      safeStringifyJson(input.metadata || {}, {}),
      Number(input.quantity || 1),
      input.currencyId || 'BRL',
      Number(input.totalPriceCents || 0),
      Number(input.totalDiamonds || 0),
      Number(input.totalBonus || 0),
      input.paymentStatus || 'draft',
      input.deliveryStatus || 'pending',
      input.providerPreferenceId || null,
      input.providerCheckoutUrl || null,
      input.providerPaymentId || null,
      input.approvedAt || null,
      input.deliveredAt || null
    ]
  );

  return getPaymentOrderById(result.insertId, queryExecutor);
}

async function updatePaymentOrder(orderId, updates, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const current = await getPaymentOrderById(orderId, queryExecutor);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...updates,
    packageSnapshot: updates.packageSnapshot || current.packageSnapshot,
    metadata: updates.metadata
      ? {
          ...(current.metadata || {}),
          ...updates.metadata
        }
      : current.metadata
  };

  await queryExecutor.execute(
    `
      UPDATE discord_bot_payment_orders
      SET
        guild_id = ?,
        discord_user_id = ?,
        player_account_id = ?,
        package_id = ?,
        provider = ?,
        external_reference = ?,
        package_snapshot_text = ?,
        metadata_text = ?,
        quantity = ?,
        currency_id = ?,
        total_price_cents = ?,
        total_diamonds = ?,
        total_bonus = ?,
        payment_status = ?,
        delivery_status = ?,
        provider_preference_id = ?,
        provider_checkout_url = ?,
        provider_payment_id = ?,
        approved_at = ?,
        delivered_at = ?
      WHERE id = ?
    `,
    [
      next.guildId,
      next.discordUserId,
      next.playerAccountId,
      next.packageId,
      next.provider,
      next.externalReference,
      safeStringifyJson(next.packageSnapshot || {}, {}),
      safeStringifyJson(next.metadata || {}, {}),
      Number(next.quantity || 1),
      next.currencyId || 'BRL',
      Number(next.totalPriceCents || 0),
      Number(next.totalDiamonds || 0),
      Number(next.totalBonus || 0),
      next.paymentStatus || 'draft',
      next.deliveryStatus || 'pending',
      next.providerPreferenceId || null,
      next.providerCheckoutUrl || null,
      next.providerPaymentId || null,
      next.approvedAt || null,
      next.deliveredAt || null,
      orderId
    ]
  );

  return getPaymentOrderById(orderId, queryExecutor);
}

async function createPaymentEvent(input, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [result] = await queryExecutor.execute(
    `
      INSERT INTO discord_bot_payment_events (
        order_id,
        provider,
        provider_event_type,
        provider_resource_id,
        request_id,
        payload_text,
        headers_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.orderId || null,
      input.provider,
      input.providerEventType,
      input.providerResourceId || null,
      input.requestId || null,
      safeStringifyJson(input.payload || {}, {}),
      safeStringifyJson(input.headers || {}, {})
    ]
  );

  const [rows] = await queryExecutor.execute(
    'SELECT * FROM discord_bot_payment_events WHERE id = ? LIMIT 1',
    [result.insertId]
  );

  return mapPaymentEventRow(rows[0] || null);
}

async function upsertWebhookReceipt(input, executor = pool) {
  const queryExecutor = getExecutor(executor);
  await queryExecutor.execute(
    `
      INSERT INTO discord_bot_webhook_receipts (
        provider,
        request_id,
        signature_text,
        manifest_text,
        query_text,
        headers_text,
        body_text,
        is_valid_signature,
        processing_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        signature_text = VALUES(signature_text),
        manifest_text = VALUES(manifest_text),
        query_text = VALUES(query_text),
        headers_text = VALUES(headers_text),
        body_text = VALUES(body_text),
        is_valid_signature = VALUES(is_valid_signature),
        processing_status = VALUES(processing_status)
    `,
    [
      input.provider,
      input.requestId || null,
      input.signatureText || null,
      input.manifestText || null,
      safeStringifyJson(input.query || {}, {}),
      safeStringifyJson(input.headers || {}, {}),
      safeStringifyJson(input.body || {}, {}),
      input.isValidSignature ? 1 : 0,
      input.processingStatus || 'received'
    ]
  );
}

async function getPaymentDeliveryByOrderId(orderId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    'SELECT * FROM discord_bot_payment_deliveries WHERE order_id = ? LIMIT 1',
    [orderId]
  );

  return mapPaymentDeliveryRow(rows[0] || null);
}

async function upsertPaymentDelivery(orderId, input, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const current = await getPaymentDeliveryByOrderId(orderId, queryExecutor);
  const next = {
    ...(current || {}),
    ...input,
    orderId,
    details: input.details
      ? {
          ...(current?.details || {}),
          ...input.details
        }
      : current?.details || {}
  };

  if (!current) {
    await queryExecutor.execute(
      `
        INSERT INTO discord_bot_payment_deliveries (
          order_id,
          player_account_id,
          provider_payment_id,
          gems_before,
          gems_after,
          gems_delta,
          status,
          details_text
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        next.playerAccountId,
        next.providerPaymentId || null,
        Number(next.gemsBefore || 0),
        Number(next.gemsAfter || 0),
        Number(next.gemsDelta || 0),
        next.status || 'pending',
        safeStringifyJson(next.details || {}, {})
      ]
    );
  } else {
    await queryExecutor.execute(
      `
        UPDATE discord_bot_payment_deliveries
        SET
          player_account_id = ?,
          provider_payment_id = ?,
          gems_before = ?,
          gems_after = ?,
          gems_delta = ?,
          status = ?,
          details_text = ?
        WHERE order_id = ?
      `,
      [
        next.playerAccountId,
        next.providerPaymentId || null,
        Number(next.gemsBefore || 0),
        Number(next.gemsAfter || 0),
        Number(next.gemsDelta || 0),
        next.status || 'pending',
        safeStringifyJson(next.details || {}, {}),
        orderId
      ]
    );
  }

  return getPaymentDeliveryByOrderId(orderId, queryExecutor);
}

module.exports = {
  createPaymentEvent,
  createPaymentOrder,
  getPaymentDeliveryByOrderId,
  getPaymentOrderByExternalReference,
  getPaymentOrderById,
  getPaymentOrderByProviderPaymentId,
  listOrdersRequiringReconciliation,
  listPaymentOrdersForDiscordUser,
  listPaymentOrdersForGuild,
  mapPaymentDeliveryRow,
  mapPaymentEventRow,
  mapPaymentOrderRow,
  updatePaymentOrder,
  upsertPaymentDelivery,
  upsertWebhookReceipt
};
