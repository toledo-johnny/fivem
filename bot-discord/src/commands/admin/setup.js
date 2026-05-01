const { SlashCommandBuilder } = require('discord.js');
const { COPY } = require('../../config/copy');
const { PANEL_TYPES } = require('../../config/constants');
const { getPanel } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { adminEmbed } = require('../../utils/embeds');
const {
  buildFiveMPanelFields,
  buildLogFields,
  buildOnboardingPanelFields,
  buildTicketConfigFields,
  buildWhitelistConfigFields
} = require('../../utils/configViews');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Inicializa e resume a configuracao atual do bot.')
    .setDMPermission(false),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const [statusPanel, rulesPanel, faqPanel, changelogPanel, helpCenterPanel] = await Promise.all([
      getPanel(interaction.guild.id, PANEL_TYPES.FIVEM_STATUS),
      getPanel(interaction.guild.id, PANEL_TYPES.RULES),
      getPanel(interaction.guild.id, PANEL_TYPES.FAQ),
      getPanel(interaction.guild.id, PANEL_TYPES.CHANGELOG),
      getPanel(interaction.guild.id, PANEL_TYPES.HELP_CENTER)
    ]);

    await interaction.reply({
      embeds: [
        adminEmbed(
          interaction.guild,
          COPY.admin.setupTitle,
          COPY.admin.setupDescription,
          [
            ...buildTicketConfigFields(guildConfig),
            ...buildWhitelistConfigFields(guildConfig),
            ...buildFiveMPanelFields(statusPanel),
            ...buildOnboardingPanelFields({
              rules: rulesPanel,
              faq: faqPanel,
              changelog: changelogPanel,
              help_center: helpCenterPanel
            }),
            ...buildLogFields(guildConfig)
          ].slice(0, 25)
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig,
      commandName: 'setup'
    });
  }
};
