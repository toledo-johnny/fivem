const { PANEL_TYPES } = require('../../config/constants');
const {
  getPanel,
  updateGuildConfig,
  upsertPanel
} = require('../../modules/config/configRepository');

async function publishPanel({ guildConfig, panelType, channel, payload }) {
  const currentPanel = await getPanel(guildConfig.guildId, panelType);
  let message = null;

  if (currentPanel?.channelId === channel.id && currentPanel?.messageId) {
    message = await channel.messages.fetch(currentPanel.messageId).catch(() => null);
  }

  if (message) {
    await message.edit(payload);
  } else {
    message = await channel.send(payload);
  }

  await upsertPanel(guildConfig.guildId, panelType, {
    channelId: channel.id,
    messageId: message.id,
    metadata: {}
  });

  if (panelType === PANEL_TYPES.TICKET) {
    await updateGuildConfig(guildConfig.guildId, {
      ticketPanelChannelId: channel.id,
      ticketPanelMessageId: message.id
    });
  }

  if (panelType === PANEL_TYPES.WHITELIST) {
    await updateGuildConfig(guildConfig.guildId, {
      whitelistPanelChannelId: channel.id,
      whitelistPanelMessageId: message.id
    });
  }

  return message;
}

module.exports = {
  publishPanel
};
