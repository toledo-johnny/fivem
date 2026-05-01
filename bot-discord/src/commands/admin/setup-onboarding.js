const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { COPY } = require('../../config/copy');
const { PANEL_TYPES } = require('../../config/constants');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { publishOnboardingPanels } = require('../../modules/onboarding/onboardingService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertTextChannelOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-onboarding')
    .setDescription('Publica os paineis publicos de onboarding do servidor.')
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('rules_channel')
        .setDescription('Canal para o painel de regras.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('faq_channel')
        .setDescription('Canal para o painel de FAQ.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('changelog_channel')
        .setDescription('Canal para o painel de changelog.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('help_channel')
        .setDescription('Canal para a central de ajuda.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const channels = {
      [PANEL_TYPES.RULES]: interaction.options.getChannel('rules_channel', true),
      [PANEL_TYPES.FAQ]: interaction.options.getChannel('faq_channel', true),
      [PANEL_TYPES.CHANGELOG]: interaction.options.getChannel('changelog_channel', true),
      [PANEL_TYPES.HELP_CENTER]: interaction.options.getChannel('help_channel', true)
    };

    for (const channel of Object.values(channels)) {
      await assertTextChannelOperational(channel);
    }

    const published = await publishOnboardingPanels(interaction.guild, channels);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          COPY.admin.setupOnboardingSuccess,
          `Regras, FAQ, changelog e central de ajuda foram publicados em ${Object.values(channels)
            .map((channel) => `${channel}`)
            .join(', ')}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig,
      commandName: 'setup-onboarding',
      details: {
        panelMessageIds: Object.fromEntries(
          Object.entries(published).map(([panelType, message]) => [panelType, message.id])
        )
      }
    });
  }
};
