const { assertDashboardPortAvailable, startApiServer } = require('../apps/api/src/server');
const { setApiServer } = require('./bot/runtime');
const { ensureSchema } = require('./database/schema');
const { closePool, pingDatabase } = require('./database/mysql');
const { startPaymentReconciliationScheduler } = require('./modules/payments/paymentService');

const apiRuntimeState = {
  paymentReconciliationInterval: null
};

let isShuttingDown = false;

async function shutdown(server, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('[shutdown:portal-api] encerrando recursos...');

  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (apiRuntimeState.paymentReconciliationInterval) {
    clearInterval(apiRuntimeState.paymentReconciliationInterval);
    apiRuntimeState.paymentReconciliationInterval = null;
  }

  await closePool().catch(() => null);
  process.exitCode = exitCode;
}

function registerProcessHandlers(server) {
  process.on('SIGINT', () => {
    shutdown(server, 0).catch(() => null);
  });

  process.on('SIGTERM', () => {
    shutdown(server, 0).catch(() => null);
  });
}

async function bootstrap() {
  let server = null;

  try {
    await assertDashboardPortAvailable();
    await pingDatabase();
    await ensureSchema();

    server = await startApiServer();
    setApiServer(server);
    startPaymentReconciliationScheduler(apiRuntimeState);
    registerProcessHandlers(server);
  } catch (error) {
    if (server) {
      await shutdown(server, 1).catch(() => null);
    } else {
      await closePool().catch(() => null);
      process.exitCode = 1;
    }

    throw error;
  }
}

bootstrap().catch((error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`[bootstrap:portal-api] ${error.message}`);
  } else {
    console.error('[bootstrap:portal-api]', error);
  }

  process.exitCode = 1;
});
