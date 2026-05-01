const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { buildAnnouncementPayload } = require('../../modules/onboarding/onboardingService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertTextChannelOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Publica um comunicado padronizado em um canal do servidor.')
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Canal onde o comunicado sera enviado.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('title').setDescription('Titulo do comunicado.').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('message').setDescription('Conteudo principal.').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('tone')
        .setDescription('Tom visual do comunicado.')
        .setRequired(false)
        .addChoices(
          { name: 'Comunicado', value: 'announcement' },
          { name: 'Atualizacao', value: 'update' },
          { name: 'Aviso urgente', value: 'emergency' }
        )
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const channel = interaction.options.getChannel('channel', true);
    await assertTextChannelOperational(channel);

    const payload = buildAnnouncementPayload(interaction.guild, {
      title: interaction.options.getString('title', true),
      description: interaction.options.getString('message', true),
      tone: interaction.options.getString('tone') || 'announcement'
    });

    const message = await channel.send(payload);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Comunicado publicado',
          `O comunicado foi enviado em ${channel}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig,
      commandName: 'announce',
      details: {
        channelId: channel.id,
        messageId: message.id
      }
    });
  }
};
