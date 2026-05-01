const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const env = require('../src/config/env');
const {
  buildMercadoPagoBackUrls,
  buildWebhookManifest,
  isMercadoPagoTestToken,
  isMercadoPagoPublicUrl,
  pickCheckoutUrl,
  shouldUseMercadoPagoBackUrl,
  shouldUseMercadoPagoWebhookUrl,
  validateWebhookSignature
} = require('../src/modules/payments/mercadoPagoService');
const { buildPurchaseSummary } = require('../src/modules/payments/paymentService');

test('buildPurchaseSummary aggregates approved and delivered orders', () => {
  const summary = buildPurchaseSummary([
    { paymentStatus: 'approved', deliveryStatus: 'delivered' },
    { paymentStatus: 'pending', deliveryStatus: 'pending' },
    { paymentStatus: 'approved', deliveryStatus: 'awaiting_link' }
  ]);

  assert.deepEqual(summary, {
    totalOrders: 3,
    approvedOrders: 2,
    deliveredOrders: 1
  });
});

test('buildWebhookManifest follows Mercado Pago signature template', () => {
  const result = buildWebhookManifest(
    { 'data.id': '998877' },
    {
      'x-request-id': 'req-123',
      'x-signature': 'ts=1710000000,v1=abcdef'
    }
  );

  assert.equal(result.manifest, 'id:998877;request-id:req-123;ts:1710000000;');
  assert.equal(result.timestamp, '1710000000');
  assert.equal(result.hash, 'abcdef');
});

test('validateWebhookSignature accepts a valid Mercado Pago webhook signature', () => {
  const previousSecret = env.mercadoPago.webhookSecret;
  env.mercadoPago.webhookSecret = 'test-secret';

  try {
    const manifest = 'id:998877;request-id:req-123;ts:1710000000;';
    const hash = crypto
      .createHmac('sha256', env.mercadoPago.webhookSecret)
      .update(manifest)
      .digest('hex');

    const result = validateWebhookSignature(
      { 'data.id': '998877' },
      {
        'x-request-id': 'req-123',
        'x-signature': `ts=1710000000,v1=${hash}`
      }
    );

    assert.equal(result.isValid, true);
    assert.equal(result.manifest, manifest);
  } finally {
    env.mercadoPago.webhookSecret = previousSecret;
  }
});

test('isMercadoPagoTestToken detects test credentials', () => {
  assert.equal(isMercadoPagoTestToken('TEST-123456'), true);
  assert.equal(isMercadoPagoTestToken('APP_USR-123456'), false);
  assert.equal(isMercadoPagoTestToken(''), false);
});

test('pickCheckoutUrl prefers sandbox URL with test token', () => {
  const url = pickCheckoutUrl(
    {
      init_point: 'https://www.mercadopago.com/checkout/start?pref_id=prod',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/pay?pref_id=test'
    },
    'TEST-123456'
  );

  assert.equal(url, 'https://sandbox.mercadopago.com/checkout/pay?pref_id=test');
});

test('pickCheckoutUrl prefers production URL with production token', () => {
  const url = pickCheckoutUrl(
    {
      init_point: 'https://www.mercadopago.com/checkout/start?pref_id=prod',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/pay?pref_id=test'
    },
    'APP_USR-123456'
  );

  assert.equal(url, 'https://www.mercadopago.com/checkout/start?pref_id=prod');
});

test('shouldUseMercadoPagoWebhookUrl only accepts public https urls', () => {
  assert.equal(shouldUseMercadoPagoWebhookUrl('http://localhost:3050/webhooks/mercadopago'), false);
  assert.equal(shouldUseMercadoPagoWebhookUrl('https://127.0.0.1/webhooks/mercadopago'), false);
  assert.equal(shouldUseMercadoPagoWebhookUrl('https://example.ngrok-free.app/webhooks/mercadopago'), true);
});

test('isMercadoPagoPublicUrl rejects localhost and raw ips', () => {
  assert.equal(isMercadoPagoPublicUrl('http://localhost:3000/dashboard'), false);
  assert.equal(isMercadoPagoPublicUrl('https://127.0.0.1/dashboard'), false);
  assert.equal(isMercadoPagoPublicUrl('https://portal.exemplo.com/dashboard'), true);
});

test('shouldUseMercadoPagoBackUrl requires a public named host', () => {
  assert.equal(shouldUseMercadoPagoBackUrl('http://localhost:3000/dashboard?payment=approved'), false);
  assert.equal(shouldUseMercadoPagoBackUrl('https://portal.exemplo.com/dashboard?payment=approved'), true);
});

test('buildMercadoPagoBackUrls omits localhost urls', () => {
  const previousSuccess = env.mercadoPago.successUrl;
  const previousPending = env.mercadoPago.pendingUrl;
  const previousFailure = env.mercadoPago.failureUrl;

  env.mercadoPago.successUrl = 'http://localhost:3000/dashboard?payment=approved';
  env.mercadoPago.pendingUrl = 'http://localhost:3000/dashboard?payment=pending';
  env.mercadoPago.failureUrl = 'http://localhost:3000/dashboard?payment=failed';

  try {
    assert.equal(buildMercadoPagoBackUrls(), null);
  } finally {
    env.mercadoPago.successUrl = previousSuccess;
    env.mercadoPago.pendingUrl = previousPending;
    env.mercadoPago.failureUrl = previousFailure;
  }
});
