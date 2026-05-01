const { COPY } = require('../../config/copy');
const {
  CONTENT_BLOCK_TYPES,
  PANEL_TYPES
} = require('../../config/constants');
const { inlineField } = require('../../utils/embeds');
const { ensureGuildConfig, getPanel } = require('../config/configRepository');
const { logAction } = require('../logs/logService');
const {
  ensureDefaultContentBlocks,
  getContentBlock,
  listContentBlocks,
  upsertContentBlock
} = require('./contentRepository');
const {
  buildAnnouncementEmbed,
  buildHelpCommandEmbed,
  buildOnboardingPanelPayload
} = require('./onboardingViews');
const { publishPanel } = require('../../services/discord/panelPublisher');

function resolvePanelTypeFromContentKey(contentKey) {
  switch (contentKey) {
    case CONTENT_BLOCK_TYPES.RULES:
      return PANEL_TYPES.RULES;
    case CONTENT_BLOCK_TYPES.FAQ:
      return PANEL_TYPES.FAQ;
    case CONTENT_BLOCK_TYPES.CHANGELOG:
      return PANEL_TYPES.CHANGELOG;
    case CONTENT_BLOCK_TYPES.HELP_CENTER:
      return PANEL_TYPES.HELP_CENTER;
    default:
      return null;
  }
}

function resolveContentKeyFromPanelType(panelType) {
  switch (panelType) {
    case PANEL_TYPES.RULES:
      return CONTENT_BLOCK_TYPES.RULES;
    case PANEL_TYPES.FAQ:
      return CONTENT_BLOCK_TYPES.FAQ;
    case PANEL_TYPES.CHANGELOG:
      return CONTENT_BLOCK_TYPES.CHANGELOG;
    case PANEL_TYPES.HELP_CENTER:
      return CONTENT_BLOCK_TYPES.HELP_CENTER;
    default:
      return null;
  }
}

async function publishOnboardingPanel(channel, guildConfig, panelType) {
  const contentKey = resolveContentKeyFromPanelType(panelType);
  if (!contentKey) {
    throw new Error('Tipo de painel de onboarding invalido.');
  }

  await ensureDefaultContentBlocks(guildConfig.guildId);
  const block = await getContentBlock(guildConfig.guildId, contentKey);
  if (!block) {
    throw new Error('Conteudo do onboarding nao encontrado.');
  }

  return publishPanel({
    guildConfig,
    panelType,
    channel,
    payload: buildOnboardingPanelPayload(channel.guild, contentKey, block)
  });
}

async function publishOnboardingPanels(guild, channelsByPanelType) {
  const guildConfig = await ensureGuildConfig(guild.id);
  const results = {};

  for (const [panelType, channel] of Object.entries(channelsByPanelType || {})) {
    if (!channel) {
      continue;
    }

    results[panelType] = await publishOnboardingPanel(channel, guildConfig, panelType);
  }

  return results;
}

async function republishOnboardingPanelIfExists(guild, panelType) {
  const panel = await getPanel(guild.id, panelType);
  if (!panel?.channelId) {
    return null;
  }

  const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return null;
  }

  const guildConfig = await ensureGuildConfig(guild.id);
  return publishOnboardingPanel(channel, guildConfig, panelType);
}

async function updateContentAndRepublish(guild, contentKey, input, actorId = null) {
  const block = await upsertContentBlock(guild.id, contentKey, input);
  const panelType = resolvePanelTypeFromContentKey(contentKey);

  if (panelType) {
    await republishOnboardingPanelIfExists(guild, panelType).catch(() => null);
  }

  if (actorId) {
    await logAction({
      guild,
      guildId: guild.id,
      type: 'admin_commands',
      title: 'Conteudo de onboarding atualizado',
      description: `<@${actorId}> atualizou o bloco **${contentKey}**.`,
      actorId,
      entityType: 'content_block',
      entityId: contentKey,
      details: {
        contentKey,
        title: block.title
      }
    });
  }

  return block;
}

async function getOnboardingSummary(guildId) {
  await ensureDefaultContentBlocks(guildId);
  return listContentBlocks(guildId);
}

async function buildHelpPayload(guild) {
  const guildConfig = await ensureGuildConfig(guild.id);
  const [ticketPanel, whitelistPanel, helpCenterPanel] = await Promise.all([
    getPanel(guild.id, PANEL_TYPES.TICKET),
    getPanel(guild.id, PANEL_TYPES.WHITELIST),
    getPanel(guild.id, PANEL_TYPES.HELP_CENTER)
  ]);

  return buildHelpCommandEmbed(guild, {
    statusPanel: 'Use /status ou o painel fixo do servidor',
    whitelistPanel: whitelistPanel?.channelId
      ? `Painel publicado em <#${whitelistPanel.channelId}>`
      : COPY.common.notConfigured,
    ticketPanel: ticketPanel?.channelId
      ? `Painel publicado em <#${ticketPanel.channelId}>`
      : COPY.common.notConfigured,
    helpCenter: helpCenterPanel?.channelId
      ? `Painel publicado em <#${helpCenterPanel.channelId}>`
      : guildConfig.whitelistReviewChannelId
        ? `Central administrada pela staff em <#${guildConfig.whitelistReviewChannelId}>`
        : COPY.common.notConfigured
  });
}

function buildAnnouncementPayload(guild, input) {
  const embed = buildAnnouncementEmbed(
    guild,
    input.title,
    input.description,
    input.tone
  );

  return {
    embeds: [embed]
  };
}

module.exports = {
  buildAnnouncementPayload,
  buildHelpPayload,
  getOnboardingSummary,
  publishOnboardingPanel,
  publishOnboardingPanels,
  republishOnboardingPanelIfExists,
  resolveContentKeyFromPanelType,
  resolvePanelTypeFromContentKey,
  updateContentAndRepublish
};
