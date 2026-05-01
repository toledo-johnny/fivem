const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { setBotClient } = require('./bot/runtime');
const env = require('./config/env');
const { ensureSchema } = require('./database/schema');
const { closePool, pingDatabase } = require('./database/mysql');
const { loadCommands, loadEvents, loadInteractionHandlers } = require('./bot/loaders');
const { logError } = require('./modules/logs/logService');

let isShuttingDown = false;

async function shutdown(client, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('[shutdown:discord-bot] encerrando recursos...');

  if (client?.fivemStatusInterval) {
    clearInterval(client.fivemStatusInterval);
  }

  if (client?.reconciliationInterval) {
    clearInterval(client.reconciliationInterval);
  }

  if (client) {
    client.destroy();
  }

  await closePool().catch(() => null);
  process.exitCode = exitCode;
}

function registerProcessHandlers(client) {
  process.on('unhandledRejection', async (reason) => {
    console.error('[unhandledRejection]', reason);
    await logError({
      guild: null,
      guildId: null,
      actorId: null,
      context: 'unhandledRejection',
      error: reason instanceof Error ? reason : new Error(String(reason))
    });
  });

  process.on('uncaughtException', async (error) => {
    console.error('[uncaughtException]', error);
    await logError({
      guild: null,
      guildId: null,
      actorId: null,
      context: 'uncaughtException',
      error
    });
  });

  process.on('SIGINT', () => {
    shutdown(client, 0).catch(() => null);
  });

  process.on('SIGTERM', () => {
    shutdown(client, 0).catch(() => null);
  });
}

async function bootstrap() {
  let client = null;

  try {
    await pingDatabase();
    await ensureSchema();

    client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
      partials: [Partials.Channel]
    });

    client.commands = new Map();
    client.buttons = [];
    client.modals = [];
    client.selects = [];
    setBotClient(client);

    await loadCommands(client);
    await loadInteractionHandlers(client);
    await loadEvents(client);

    registerProcessHandlers(client);
    await client.login(env.botToken);
  } catch (error) {
    if (client) {
      await shutdown(client, 1).catch(() => null);
    } else {
      await closePool().catch(() => null);
      process.exitCode = 1;
    }

    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('[bootstrap:discord-bot]', error);
  process.exitCode = 1;
});
