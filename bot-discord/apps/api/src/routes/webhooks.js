const express = require('express');
const { handleMercadoPagoWebhook } = require('../../../../src/modules/payments/paymentService');

function createWebhookRouter() {
  const router = express.Router();

  router.post('/mercadopago', async (req, res, next) => {
    try {
      const result = await handleMercadoPagoWebhook({
        query: req.query || {},
        headers: req.headers || {},
        body: req.body || {}
      });

      res.status(result.statusCode || 202).json({
        ok: result.ok,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  });

  router.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao processar o webhook.'
    });
  });

  return router;
}

module.exports = {
  createWebhookRouter
};
