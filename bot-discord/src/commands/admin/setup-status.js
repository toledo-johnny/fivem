const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { publishFiveMStatusPanel } = require('../../modules/fivem/statusPanelService');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertTextChannelOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-status')
    .setDescription('Publica ou republica o painel fixo de status FiveM.')
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('panel_channel')
        .setDescription('Canal onde o painel de status sera publicado.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const panelChannel = interaction.options.getChannel('panel_channel', true);
    await assertTextChannelOperational(panelChannel);
    const message = await publishFiveMStatusPanel(panelChannel, guildConfig);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Painel de status publicado',
          `O painel fixo de status FiveM foi enviado em ${panelChannel}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig,
      commandName: 'setup-status',
      details: {
        panelChannelId: panelChannel.id,
        messageId: message.id
      }
    });
  }
};
