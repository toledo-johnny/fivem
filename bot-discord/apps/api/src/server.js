const net = require('node:net');
const express = require('express');
const cors = require('cors');
const env = require('../../../src/config/env');
const { getBotClient, getLastReconciliation, getSchedulerHeartbeat } = require('../../../src/bot/runtime');
const { getSharedCitySchemaHealth } = require('../../../src/database/schema');
const { pingDatabase } = require('../../../src/database/mysql');
const { createAuthRouter } = require('./routes/auth');
const { createApiRouter } = require('./routes/api');
const { createPortalRouter } = require('./routes/portal');
const { createPublicRouter } = require('./routes/public');
const { createWebhookRouter } = require('./routes/webhooks');

function isPortInUseError(error) {
  return error?.code === 'EADDRINUSE';
}

function canBindToPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => {
      resolve(false);
    });

    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function probeExistingDashboardApi(port) {
  const hosts = ['127.0.0.1', 'localhost'];

  for (const host of hosts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    try {
      const response = await fetch(`http://${host}:${port}/healthz`, {
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json().catch(() => null);
      if (payload?.api === 'online') {
        return payload;
      }
    } catch (error) {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}

async function buildPortConflictError(port) {
  const existingApi = await probeExistingDashboardApi(port);
  const message = existingApi
    ? `Ja existe outra instancia do dashboard API respondendo em http://localhost:${port}. ` +
      'Feche a janela antiga do bot antes de iniciar uma nova instancia.'
    : `A porta ${port} ja esta em uso por outro processo. ` +
      'Libere a porta ou altere DASHBOARD_API_PORT antes de iniciar o bot.';

  const error = new Error(message);
  error.code = 'EADDRINUSE';
  return error;
}

async function assertDashboardPortAvailable() {
  const port = env.dashboard.apiPort;
  const available = await canBindToPort(port);

  if (available) {
    return;
  }

  throw await buildPortConflictError(port);
}

function createApiApp() {
  const app = express();
  const allowedOrigins = env.dashboard.webOrigins || [env.dashboard.webOrigin];

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin nao permitido: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/healthz', async (req, res) => {
    let database = 'ok';
    let schema = {
      ok: true,
      missing: []
    };
    try {
      await pingDatabase();
    } catch (error) {
      database = 'error';
    }

    schema = await getSharedCitySchemaHealth();

    const client = getBotClient();
    res.json({
      ok: database === 'ok' && schema.ok,
      api: 'online',
      database,
      schema,
      discordReady: Boolean(client?.isReady?.()),
      schedulerHeartbeatAt: getSchedulerHeartbeat(),
      lastReconciliationAt: getLastReconciliation(),
      primaryGuildId: env.discordPrimaryGuildId || null
    });
  });

  app.use('/auth', createAuthRouter());
  app.use('/webhooks', createWebhookRouter());
  app.use('/api/public', createPublicRouter());
  app.use('/api/portal', createPortalRouter());
  app.use('/api', createApiRouter());

  return app;
}

async function startApiServer() {
  const app = createApiApp();
  await assertDashboardPortAvailable();

  return new Promise((resolve, reject) => {
    const server = app.listen(env.dashboard.apiPort, () => {
      console.log(`[dashboard-api] online em :${env.dashboard.apiPort}`);
      resolve(server);
    });

    server.on('error', (error) => {
      if (!isPortInUseError(error)) {
        reject(error);
        return;
      }

      buildPortConflictError(env.dashboard.apiPort)
        .then(reject)
        .catch(() => reject(error));
    });
  });
}

module.exports = {
  assertDashboardPortAvailable,
  createApiApp,
  startApiServer
};
