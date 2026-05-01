const { SlashCommandBuilder } = require('discord.js');
const { COPY } = require('../../config/copy');
const { PANEL_TYPES } = require('../../config/constants');
const { getPanel } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { getSystemOverview } = require('../../modules/system/overviewService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { adminEmbed } = require('../../utils/embeds');
const {
  buildFiveMPanelFields,
  buildOperationalFields,
  buildTicketConfigFields,
  buildWhitelistConfigFields
} = require('../../utils/configViews');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-bot')
    .setDescription('Mostra a saude do bot e o estado da configuracao do servidor.')
    .setDMPermission(false),
  async execute(interaction, client) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const statusPanel = await getPanel(interaction.guild.id, PANEL_TYPES.FIVEM_STATUS);
    const overview = await getSystemOverview(client, interaction.guild.id);

    await interaction.reply({
      embeds: [
        adminEmbed(
          interaction.guild,
          COPY.admin.statusTitle,
          COPY.admin.statusDescription,
          [
            ...buildOperationalFields(overview),
            ...buildTicketConfigFields(guildConfig),
            ...buildWhitelistConfigFields(guildConfig),
            ...buildFiveMPanelFields(statusPanel)
          ].slice(0, 25)
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig,
      commandName: 'status-bot'
    });
  }
};
