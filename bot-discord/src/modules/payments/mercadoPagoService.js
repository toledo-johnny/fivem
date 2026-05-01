const crypto = require('node:crypto');
const { isIP } = require('node:net');
const env = require('../../config/env');

const MERCADO_PAGO_API_BASE_URL = 'https://api.mercadopago.com';

function assertMercadoPagoConfigured() {
  if (!env.mercadoPago.accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN nao configurado.');
  }
}

async function mercadoPagoRequest(method, path, options = {}) {
  assertMercadoPagoConfigured();

  const headers = {
    Authorization: `Bearer ${env.mercadoPago.accessToken}`,
    ...(options.headers || {})
  };

  let body = null;
  if (typeof options.body !== 'undefined' && options.body !== null) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (options.idempotencyKey) {
    headers['X-Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE_URL}${path}`, {
    method,
    headers,
    body
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Mercado Pago respondeu com status ${response.status}.`
    );
  }

  return payload;
}

function buildWebhookManifest(query = {}, headers = {}) {
  const dataId = query['data.id'] || query.id || '';
  const requestId = headers['x-request-id'] || '';
  const signature = String(headers['x-signature'] || '');
  const parts = signature
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  let timestamp = '';
  let hash = '';
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') {
      timestamp = value || '';
    }

    if (key === 'v1') {
      hash = value || '';
    }
  }

  return {
    manifest: `id:${dataId};request-id:${requestId};ts:${timestamp};`,
    timestamp,
    hash
  };
}

function validateWebhookSignature(query = {}, headers = {}) {
  if (!env.mercadoPago.webhookSecret) {
    return {
      isValid: false,
      manifest: '',
      reason: 'MERCADOPAGO_WEBHOOK_SECRET nao configurado.'
    };
  }

  const { manifest, hash } = buildWebhookManifest(query, headers);
  if (!manifest || !hash) {
    return {
      isValid: false,
      manifest,
      reason: 'Cabecalhos de assinatura ausentes.'
    };
  }

  const digest = crypto
    .createHmac('sha256', env.mercadoPago.webhookSecret)
    .update(manifest)
    .digest('hex');

  return {
    isValid: crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hash)),
    manifest,
    reason: null
  };
}

function isMercadoPagoTestToken(token = env.mercadoPago.accessToken) {
  return /^TEST-/i.test(String(token || '').trim());
}

function pickCheckoutUrl(preference = {}, token = env.mercadoPago.accessToken) {
  if (isMercadoPagoTestToken(token)) {
    return preference.sandbox_init_point || preference.init_point || null;
  }

  return preference.init_point || preference.sandbox_init_point || null;
}

function isMercadoPagoPublicUrl(url, options = {}) {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const protocolAllowed = ['http:', 'https:'].includes(parsed.protocol);
    if (!protocolAllowed) {
      return false;
    }

    if (options.requireHttps && parsed.protocol !== 'https:') {
      return false;
    }

    if (['localhost', '127.0.0.1', '::1'].includes(hostname) || isIP(hostname)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

function shouldUseMercadoPagoWebhookUrl(url = env.mercadoPago.webhookUrl) {
  return isMercadoPagoPublicUrl(url, { requireHttps: true });
}

function shouldUseMercadoPagoBackUrl(url) {
  return isMercadoPagoPublicUrl(url, { requireHttps: false });
}

function buildMercadoPagoBackUrls() {
  const backUrls = {};

  if (shouldUseMercadoPagoBackUrl(env.mercadoPago.successUrl)) {
    backUrls.success = env.mercadoPago.successUrl;
  }

  if (shouldUseMercadoPagoBackUrl(env.mercadoPago.pendingUrl)) {
    backUrls.pending = env.mercadoPago.pendingUrl;
  }

  if (shouldUseMercadoPagoBackUrl(env.mercadoPago.failureUrl)) {
    backUrls.failure = env.mercadoPago.failureUrl;
  }

  return Object.keys(backUrls).length > 0 ? backUrls : null;
}

async function createCheckoutPreference(order) {
  const unitPrice = Number(order.totalPriceCents || 0) / Math.max(1, Number(order.quantity || 1)) / 100;
  const backUrls = buildMercadoPagoBackUrls();
  const body = {
    external_reference: order.externalReference,
    metadata: {
      order_id: order.id,
      guild_id: order.guildId,
      discord_user_id: order.discordUserId
    },
    items: [
      {
        id: String(order.packageId),
        title: order.packageSnapshot.name || `Pacote ${order.packageId}`,
        description:
          order.packageSnapshot.descriptionText ||
          'Pacote oficial de diamantes do portal.',
        quantity: Number(order.quantity || 1),
        currency_id: order.currencyId || 'BRL',
        unit_price: Number(unitPrice.toFixed(2))
      }
    ]
  };

  if (backUrls) {
    body.back_urls = backUrls;
  }

  if (backUrls?.success) {
    body.auto_return = 'approved';
  }

  if (shouldUseMercadoPagoWebhookUrl()) {
    body.notification_url = env.mercadoPago.webhookUrl;
  }

  const response = await mercadoPagoRequest('POST', '/checkout/preferences', {
    idempotencyKey: order.externalReference,
    body
  });

  return {
    preferenceId: response.id || null,
    checkoutUrl: pickCheckoutUrl(response),
    checkoutReturnEnabled: Boolean(backUrls?.success),
    raw: response
  };
}

async function getPaymentDetails(paymentId) {
  return mercadoPagoRequest('GET', `/v1/payments/${paymentId}`);
}

async function searchPaymentsByExternalReference(externalReference, options = {}) {
  const reference = String(externalReference || '').trim();
  if (!reference) {
    return [];
  }

  const params = new URLSearchParams({
    sort: 'date_created',
    criteria: 'desc',
    external_reference: reference,
    range: 'date_created',
    begin_date: options.beginDate || 'NOW-30DAYS',
    end_date: options.endDate || 'NOW',
    limit: String(Math.max(1, Math.min(Number(options.limit || 10), 50)))
  });

  const response = await mercadoPagoRequest('GET', `/v1/payments/search?${params.toString()}`);
  return Array.isArray(response?.results) ? response.results : [];
}

module.exports = {
  assertMercadoPagoConfigured,
  buildWebhookManifest,
  createCheckoutPreference,
  getPaymentDetails,
  isMercadoPagoTestToken,
  isMercadoPagoPublicUrl,
  mercadoPagoRequest,
  buildMercadoPagoBackUrls,
  pickCheckoutUrl,
  searchPaymentsByExternalReference,
  shouldUseMercadoPagoBackUrl,
  shouldUseMercadoPagoWebhookUrl,
  validateWebhookSignature
};
