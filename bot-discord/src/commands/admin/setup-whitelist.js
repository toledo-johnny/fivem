const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { publishWhitelistPanel } = require('../../modules/whitelist/whitelistService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertTextChannelOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-whitelist')
    .setDescription('Configura e publica o painel principal da whitelist.')
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('panel_channel')
        .setDescription('Canal onde o painel da whitelist sera publicado.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('review_channel')
        .setDescription('Canal onde a staff analisara as whitelist.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const panelChannel = interaction.options.getChannel('panel_channel', true);
    const reviewChannel = interaction.options.getChannel('review_channel', true);

    await assertTextChannelOperational(panelChannel);
    await assertTextChannelOperational(reviewChannel);

    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      whitelistPanelChannelId: panelChannel.id,
      whitelistReviewChannelId: reviewChannel.id
    });

    const message = await publishWhitelistPanel(panelChannel, updatedConfig);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Painel de whitelist publicado',
          `O painel foi enviado em ${panelChannel} e as analises seguirao para ${reviewChannel}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'setup-whitelist',
      details: {
        panelChannelId: panelChannel.id,
        reviewChannelId: reviewChannel.id,
        messageId: message.id
      }
    });
  }
};
