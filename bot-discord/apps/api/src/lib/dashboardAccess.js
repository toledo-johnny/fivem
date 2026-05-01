const env = require('../../../../src/config/env');
const { ensureGuildConfig } = require('../../../../src/modules/config/configRepository');
const { fetchGuildBridge, DiscordRestError } = require('../../../../src/services/discord/restBridge');
const { getAccessSummary } = require('../../../../src/utils/permissions');

const ACCESS_LEVEL_ORDER = ['player', 'support', 'admin', 'owner'];

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getAccessLevelRank(level) {
  return ACCESS_LEVEL_ORDER.indexOf(level);
}

function assertMinimumAccessLevel(context, minimumLevel, message) {
  if (!minimumLevel) {
    return context;
  }

  if (getAccessLevelRank(context.access.level) >= getAccessLevelRank(minimumLevel)) {
    return context;
  }

  throw createHttpError(
    403,
    message || 'Seu usuario nao possui nivel de acesso suficiente para continuar.'
  );
}

function assertAccessCapability(context, capabilityKey, message) {
  if (context?.access?.capabilities?.[capabilityKey]) {
    return context;
  }

  throw createHttpError(
    403,
    message || 'Seu usuario nao possui permissao para acessar este recurso.'
  );
}

async function getPortalAccessContext(userId) {
  if (!env.discordPrimaryGuildId) {
    throw createHttpError(503, 'DISCORD_PRIMARY_GUILD_ID nao configurado.');
  }

  let guild = null;
  try {
    guild = await fetchGuildBridge(env.discordPrimaryGuildId);
  } catch (error) {
    throw createHttpError(503, 'O servidor principal do dashboard nao foi encontrado.');
  }

  let member = null;
  try {
    member = await guild.members.fetch(userId);
  } catch (error) {
    if (error instanceof DiscordRestError && error.statusCode === 404) {
      throw createHttpError(403, 'Seu usuario nao faz parte do servidor principal.');
    }

    throw createHttpError(503, 'Nao foi possivel validar os dados do membro no Discord.');
  }

  const guildConfig = await ensureGuildConfig(guild.id);
  const access = getAccessSummary(member, guildConfig);

  return {
    guild,
    guildConfig,
    member,
    user: member.user,
    access
  };
}

async function getDashboardAccessContext(userId, options = {}) {
  const context = await getPortalAccessContext(userId);

  if (options.minimumLevel) {
    assertMinimumAccessLevel(
      context,
      options.minimumLevel,
      options.message || 'Seu usuario nao possui permissao para acessar o dashboard.'
    );
  }

  return context;
}

module.exports = {
  assertAccessCapability,
  assertMinimumAccessLevel,
  createHttpError,
  getDashboardAccessContext,
  getPortalAccessContext
};
