const { ChannelType } = require('discord.js');
const { PANEL_TYPES, SYSTEM_JOB_TYPES, TICKET_CATEGORIES, TICKET_STATUS, WHITELIST_STATUS } = require('../../config/constants');
const { markReconciliation } = require('../../bot/runtime');
const { ensureGuildConfig, listGuildConfigs, listPanelsForGuild, upsertPanel } = require('../config/configRepository');
const { logError } = require('../logs/logService');
const { ensureDefaultContentBlocks } = require('../onboarding/contentRepository');
const { listOpenTickets, updateTicket } = require('../tickets/ticketRepository');
const { buildModerationButtons, buildWhitelistReviewEmbed, hydrateWhitelistSettings } = require('../whitelist/whitelistViews');
const { listPendingApplications, updateApplication } = require('../whitelist/whitelistRepository');
const { upsertSystemJob } = require('./jobRepository');

function isLikelyTicketChannel(channel) {
  if (!channel || channel.type !== ChannelType.GuildText) {
    return false;
  }

  return TICKET_CATEGORIES.some((category) => channel.name.startsWith(`${category.channelPrefix}-`));
}

async function markPanelNeedsRepublish(panel, reason) {
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

async function reconcilePanels(guild) {
  const panels = await listPanelsForGuild(guild.id);
  let republishRequired = 0;

  for (const panel of panels) {
    const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      await markPanelNeedsRepublish(panel, 'channel_missing');
      republishRequired += 1;
      continue;
    }

    if (!panel.messageId) {
      continue;
    }

    const message = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (!message) {
      await markPanelNeedsRepublish(panel, 'message_missing');
      republishRequired += 1;
    }
  }

  return {
    republishRequired
  };
}

async function reconcileTickets(client, guild, guildConfig) {
  const openTickets = await listOpenTickets(guild.id);
  let missingChannels = 0;
  let orphanChannels = 0;

  for (const ticket of openTickets) {
    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (channel) {
      continue;
    }

    missingChannels += 1;
    await updateTicket(ticket.id, {
      status: TICKET_STATUS.CLOSED,
      closeReason: 'Encerrado automaticamente na reconciliacao: canal ausente.',
      closedBy: client.user?.id || null,
      closedAt: new Date(),
      metadata: {
        ...ticket.metadata,
        recoveredBySystem: true,
        recoveryReason: 'channel_missing',
        recoveredAt: new Date().toISOString()
      }
    });

    await logError({
      guild,
      guildId: guild.id,
      context: 'ticket_channel_missing_recovered',
      error: new Error(`O canal do ticket #${ticket.id} nao foi encontrado e o registro foi finalizado.`)
    });
  }

  if (guildConfig.ticketCategoryId) {
    const categoryChildren = guild.channels.cache.filter(
      (channel) =>
        channel.parentId === guildConfig.ticketCategoryId && isLikelyTicketChannel(channel)
    );

    const openChannelIds = new Set(openTickets.map((ticket) => ticket.channelId));
    orphanChannels = Array.from(categoryChildren.values()).filter(
      (channel) => !openChannelIds.has(channel.id)
    ).length;
  }

  return {
    missingChannels,
    orphanChannels
  };
}

async function reconcileWhitelistReviews(guild, guildConfig) {
  const pendingApplications = await listPendingApplications(guild.id);
  if (pendingApplications.length === 0) {
    return {
      republishedReviewMessages: 0
    };
  }

  const settings = hydrateWhitelistSettings(guildConfig.whitelistSettings);
  const fallbackReviewChannelId = guildConfig.whitelistReviewChannelId;
  let republishedReviewMessages = 0;

  for (const application of pendingApplications) {
    const reviewChannelId = application.reviewChannelId || fallbackReviewChannelId;
    if (!reviewChannelId) {
      continue;
    }

    const reviewChannel = await guild.channels.fetch(reviewChannelId).catch(() => null);
    if (!reviewChannel?.isTextBased()) {
      continue;
    }

    let reviewMessage = null;
    if (application.reviewMessageId) {
      reviewMessage = await reviewChannel.messages.fetch(application.reviewMessageId).catch(() => null);
    }

    if (reviewMessage) {
      continue;
    }

    const newMessage = await reviewChannel.send({
      embeds: [buildWhitelistReviewEmbed(guild, application, settings)],
      components: [buildModerationButtons(application.id)]
    });

    await updateApplication(application.id, {
      reviewChannelId: reviewChannel.id,
      reviewMessageId: newMessage.id,
      status: WHITELIST_STATUS.PENDING
    });

    republishedReviewMessages += 1;
  }

  return {
    republishedReviewMessages
  };
}

async function reconcileGuildState(client, guildConfig) {
  const guild =
    client.guilds.cache.get(guildConfig.guildId) ||
    (await client.guilds.fetch(guildConfig.guildId).catch(() => null));

  if (!guild) {
    return {
      guildId: guildConfig.guildId,
      available: false
    };
  }

  await ensureDefaultContentBlocks(guild.id);

  const [panelResult, ticketResult, whitelistResult] = await Promise.all([
    reconcilePanels(guild),
    reconcileTickets(client, guild, guildConfig),
    reconcileWhitelistReviews(guild, guildConfig)
  ]);

  return {
    guildId: guild.id,
    available: true,
    ...panelResult,
    ...ticketResult,
    ...whitelistResult
  };
}

async function runStateReconciliation(client) {
  const startedAt = new Date();
  const guildConfigs = await listGuildConfigs();
  const results = [];

  try {
    for (const guildConfig of guildConfigs) {
      const ensuredConfig = await ensureGuildConfig(guildConfig.guildId);
      results.push(await reconcileGuildState(client, ensuredConfig));
    }

    const summary = {
      guildsProcessed: results.length,
      republishRequired: results.reduce((sum, item) => sum + Number(item.republishRequired || 0), 0),
      ticketChannelsRecovered: results.reduce((sum, item) => sum + Number(item.missingChannels || 0), 0),
      orphanTicketChannels: results.reduce((sum, item) => sum + Number(item.orphanChannels || 0), 0),
      whitelistMessagesRepublished: results.reduce(
        (sum, item) => sum + Number(item.republishedReviewMessages || 0),
        0
      ),
      results
    };

    await upsertSystemJob(
      SYSTEM_JOB_TYPES.RECONCILIATION,
      'ok',
      summary,
      startedAt
    );
    markReconciliation(startedAt);
    return summary;
  } catch (error) {
    await upsertSystemJob(
      SYSTEM_JOB_TYPES.RECONCILIATION,
      'error',
      {
        message: error.message
      },
      startedAt
    );
    throw error;
  }
}

function startStateReconciliationScheduler(client) {
  if (client.reconciliationInterval) {
    return client.reconciliationInterval;
  }

  const run = () =>
    runStateReconciliation(client).catch((error) => {
      console.error('[reconciliationScheduler]', error);
    });

  setTimeout(run, 10000);
  client.reconciliationInterval = setInterval(run, 5 * 60 * 1000);
  return client.reconciliationInterval;
}

module.exports = {
  reconcileGuildState,
  runStateReconciliation,
  startStateReconciliationScheduler
};
