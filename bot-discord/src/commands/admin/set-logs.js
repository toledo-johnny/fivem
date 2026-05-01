const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { LOG_TYPES } = require('../../config/constants');
const { setLogChannel } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertTextChannelOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-logs')
    .setDescription('Configura um canal de logs para um tipo especifico.')
    .setDMPermission(false)
    .addStringOption((option) => {
      option.setName('type').setDescription('Tipo de log').setRequired(true);
      for (const logType of LOG_TYPES) {
        option.addChoices({
          name: logType.label,
          value: logType.key
        });
      }
      return option;
    })
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Canal que recebera os logs.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const logType = interaction.options.getString('type', true);
    const channel = interaction.options.getChannel('channel', true);
    await assertTextChannelOperational(channel, {
      needsAttachments: logType === 'tickets_transcripts'
    });
    const updatedConfig = await setLogChannel(interaction.guild.id, logType, channel.id);
    const logTypeLabel = LOG_TYPES.find((entry) => entry.key === logType)?.label || logType;

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Canal de log atualizado',
          `${logTypeLabel} agora aponta para ${channel}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'set-logs',
      details: {
        logType,
        channelId: channel.id
      }
    });
  }
};
