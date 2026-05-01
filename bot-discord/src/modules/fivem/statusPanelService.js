const { markSchedulerHeartbeat } = require('../../bot/runtime');
const { PANEL_TYPES, SYSTEM_JOB_TYPES } = require('../../config/constants');
const { publishPanel } = require('../../services/discord/panelPublisher');
const { listPanelsByType, upsertPanel } = require('../config/configRepository');
const { logError } = require('../logs/logService');
const { upsertSystemJob } = require('../system/jobRepository');
const { buildFiveMStatusPayload, getFiveMStatus, getRefreshMinutes } = require('./fivemService');

async function publishFiveMStatusPanel(channel, guildConfig) {
  const status = await getFiveMStatus();

  return publishPanel({
    guildConfig,
    panelType: PANEL_TYPES.FIVEM_STATUS,
    channel,
    payload: buildFiveMStatusPayload(channel.guild, status)
  });
}

async function markPanelRequiresRepublish(panel, reason) {
  await upsertPanel(panel.guildId, panel.panelType, {
    channelId: panel.channelId,
    messageId: null,
    metadata: {
      ...(panel.metadata || {}),
      needsRepublish: true,
      republishReason: reason,
      markedAt: new Date().toISOString()
    }
  });
}

async function refreshPanelMessage(client, panel, status) {
  const guild =
    client.guilds.cache.get(panel.guildId) ||
    (await client.guilds.fetch(panel.guildId).catch(() => null));

  if (!guild) {
    await markPanelRequiresRepublish(panel, 'guild_not_found');
    return;
  }

  const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await markPanelRequiresRepublish(panel, 'channel_not_found');
    await logError({
      guild,
      guildId: panel.guildId,
      context: 'fivem_status_channel_not_found',
      error: new Error('O canal do painel de status FiveM nao foi encontrado.')
    });
    return;
  }

  if (!panel.messageId) {
    return;
  }

  const message = await channel.messages.fetch(panel.messageId).catch(() => null);
  if (!message) {
    await markPanelRequiresRepublish(panel, 'message_not_found');
    await logError({
      guild,
      guildId: panel.guildId,
      context: 'fivem_status_message_not_found',
      error: new Error('A mensagem do painel de status FiveM foi apagada e precisa ser republicada.')
    });
    return;
  }

  await message.edit(buildFiveMStatusPayload(guild, status));
}

async function refreshFiveMStatusPanels(client) {
  const panels = await listPanelsByType(PANEL_TYPES.FIVEM_STATUS);
  const startedAt = new Date();
  markSchedulerHeartbeat(startedAt);

  if (panels.length === 0) {
    await upsertSystemJob(
      SYSTEM_JOB_TYPES.FIVEM_STATUS,
      'idle',
      { panelsUpdated: 0 },
      startedAt
    );
    return 0;
  }

  const status = await getFiveMStatus();

  for (const panel of panels) {
    try {
      await refreshPanelMessage(client, panel, status);
    } catch (error) {
      const guild = client.guilds.cache.get(panel.guildId) || null;
      await logError({
        guild,
        guildId: panel.guildId,
        context: 'fivem_status_refresh_failed',
        error
      });
    }
  }

  await upsertSystemJob(
    SYSTEM_JOB_TYPES.FIVEM_STATUS,
    'ok',
    {
      panelsUpdated: panels.length,
      online: Boolean(status.online),
      configured: Boolean(status.configured)
    },
    startedAt
  );

  return panels.length;
}

function startFiveMStatusScheduler(client) {
  if (client.fivemStatusInterval) {
    return client.fivemStatusInterval;
  }

  const runRefresh = () =>
    refreshFiveMStatusPanels(client).catch((error) => {
      console.error('[fivemStatusScheduler]', error);
      upsertSystemJob(
        SYSTEM_JOB_TYPES.FIVEM_STATUS,
        'error',
        { message: error.message },
        new Date()
      ).catch(() => null);
    });

  setTimeout(runRefresh, 5000);
  client.fivemStatusInterval = setInterval(runRefresh, getRefreshMinutes() * 60 * 1000);
  return client.fivemStatusInterval;
}

module.exports = {
  publishFiveMStatusPanel,
  refreshFiveMStatusPanels,
  startFiveMStatusScheduler
};
