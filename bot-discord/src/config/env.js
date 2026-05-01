const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: process.env.BOT_ENV_PATH || path.resolve(process.cwd(), '.env')
});

function getEnv(primaryKey, fallbackKeys = [], defaultValue = '') {
  const keys = [primaryKey, ...fallbackKeys];
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return defaultValue;
}

function splitOrigins(...values) {
  const items = values
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(items)];
}

const defaultDashboardOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173'
];
const configuredDashboardOrigin = getEnv(
  'DASHBOARD_WEB_ORIGIN',
  [],
  defaultDashboardOrigins[0]
);
const configuredDashboardOrigins = splitOrigins(
  configuredDashboardOrigin,
  getEnv('DASHBOARD_WEB_ORIGINS'),
  ...defaultDashboardOrigins
);

const env = {
  botToken: getEnv('BOT_TOKEN', ['TOKEN']),
  discordClientId: getEnv('DISCORD_CLIENT_ID', ['CLIENT_ID']),
  discordTestGuildId: getEnv('DISCORD_TEST_GUILD_ID', ['GUILD_ID']) || null,
  discordPrimaryGuildId:
    getEnv('DISCORD_PRIMARY_GUILD_ID', ['DASHBOARD_GUILD_ID']) ||
    getEnv('DISCORD_TEST_GUILD_ID', ['GUILD_ID']) ||
    null,
  discordOauthClientSecret: getEnv('DISCORD_OAUTH_CLIENT_SECRET') || null,
  discordOauthRedirectUri:
    getEnv('DISCORD_OAUTH_REDIRECT_URI') || 'http://localhost:3050/auth/discord/callback',
  botShortName: getEnv('BOT_SHORT_NAME') || null,
  botFooterName: getEnv('BOT_FOOTER_NAME', [], 'FiveM RP'),
  botLogoUrl: getEnv('BOT_LOGO_URL') || null,
  botPresenceText: getEnv(
    'BOT_PRESENCE_TEXT',
    [],
    'tickets, whitelist e status FiveM'
  ),
  db: {
    host: getEnv('DB_HOST'),
    port: Number(getEnv('DB_PORT', [], '3306')),
    user: getEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: getEnv('DB_NAME', ['DB_DATABASE']),
    connectionLimit: Number(getEnv('DB_CONNECTION_LIMIT', [], '10'))
  },
  colors: {
    primary: getEnv('BOT_PRIMARY_COLOR', [], '#1f2937'),
    success: getEnv('BOT_SUCCESS_COLOR', [], '#16a34a'),
    error: getEnv('BOT_ERROR_COLOR', [], '#dc2626'),
    warning: getEnv('BOT_WARNING_COLOR', [], '#f59e0b')
  },
  dashboard: {
    baseUrl: getEnv('DASHBOARD_BASE_URL', [], 'http://localhost:3050'),
    apiPort: Number(getEnv('DASHBOARD_API_PORT', [], '3050')),
    webOrigin: configuredDashboardOrigin,
    webOrigins: configuredDashboardOrigins,
    sessionSecret:
      getEnv('DASHBOARD_SESSION_SECRET') || getEnv('BOT_TOKEN', ['TOKEN']) || 'dashboard-dev-secret'
  },
  fivem: {
    statusBaseUrl: getEnv('FIVEM_STATUS_BASE_URL'),
    connectUrl: getEnv('FIVEM_CONNECT_URL'),
    serverName: getEnv('FIVEM_SERVER_NAME', [], 'FiveM RP'),
    statusLogoUrl: getEnv('FIVEM_STATUS_LOGO_URL') || null,
    statusBannerUrl: getEnv('FIVEM_STATUS_BANNER_URL') || null,
    statusButtonUrl: getEnv('FIVEM_STATUS_BUTTON_URL') || null,
    statusRefreshMinutes: Number(getEnv('FIVEM_STATUS_REFRESH_MINUTES', [], '2'))
  },
  mercadoPago: {
    accessToken: getEnv('MERCADOPAGO_ACCESS_TOKEN') || null,
    webhookSecret: getEnv('MERCADOPAGO_WEBHOOK_SECRET') || null,
    webhookUrl:
      getEnv('MERCADOPAGO_WEBHOOK_URL') ||
      `${getEnv('DASHBOARD_BASE_URL', [], 'http://localhost:3050').replace(/\/+$/, '')}/webhooks/mercadopago`,
    successUrl:
      getEnv('MERCADOPAGO_SUCCESS_URL') ||
      `${configuredDashboardOrigin.replace(/\/+$/, '')}/dashboard?payment=approved`,
    pendingUrl:
      getEnv('MERCADOPAGO_PENDING_URL') ||
      `${configuredDashboardOrigin.replace(/\/+$/, '')}/dashboard?payment=pending`,
    failureUrl:
      getEnv('MERCADOPAGO_FAILURE_URL') ||
      `${configuredDashboardOrigin.replace(/\/+$/, '')}/dashboard?payment=failed`
  }
};

const missingKeys = [];

if (!env.botToken) missingKeys.push('BOT_TOKEN');
if (!env.discordClientId) missingKeys.push('DISCORD_CLIENT_ID');
if (!env.db.host) missingKeys.push('DB_HOST');
if (!env.db.user) missingKeys.push('DB_USER');
if (!env.db.database) missingKeys.push('DB_NAME');

if (missingKeys.length > 0) {
  throw new Error(
    `Variaveis obrigatorias ausentes: ${missingKeys.join(', ')}. ` +
      'Crie seu arquivo .env usando o .env.example.'
  );
}

module.exports = env;
