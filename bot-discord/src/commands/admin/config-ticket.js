const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { publishTicketPanel } = require('../../modules/tickets/ticketService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const {
  assertCategoryOperational,
  assertTextChannelOperational
} = require('../../services/discord/preflightService');
const { adminEmbed, successEmbed } = require('../../utils/embeds');
const { buildTicketConfigFields } = require('../../utils/configViews');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-ticket')
    .setDescription('Visualiza ou ajusta a configuracao do modulo de tickets.')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand.setName('show').setDescription('Exibe a configuracao atual de tickets.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('category')
        .setDescription('Atualiza a categoria onde os tickets serao criados.')
        .addChannelOption((option) =>
          option
            .setName('category')
            .setDescription('Categoria de tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('publish')
        .setDescription('Republica o painel de tickets.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Canal para republicar o painel (opcional).')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'show') {
      await interaction.reply({
        embeds: [
          adminEmbed(
            interaction.guild,
            'Configuracao de tickets',
            'Resumo do painel, categoria e cargo operacional de tickets.',
            buildTicketConfigFields(guildConfig)
          )
        ],
        ephemeral: true
      });

      await logAdministrativeCommand({
        interaction,
        guildConfig,
        commandName: 'config-ticket',
        details: {
          action: 'show'
        }
      });
      return;
    }

    if (subcommand === 'category') {
      const category = interaction.options.getChannel('category', true);
      await assertCategoryOperational(category);
      const updatedConfig = await updateGuildConfig(interaction.guild.id, {
        ticketCategoryId: category.id
      });

      await interaction.reply({
        embeds: [
          successEmbed(
            interaction.guild,
            'Categoria atualizada',
            `${category} agora sera usada para os novos tickets.`
          )
        ],
        ephemeral: true
      });

      await logAdministrativeCommand({
        interaction,
        guildConfig: updatedConfig,
        commandName: 'config-ticket',
        details: {
          action: 'category',
          categoryId: category.id
        }
      });
      return;
    }

    const targetChannel =
      interaction.options.getChannel('channel') ||
      (guildConfig.ticketPanelChannelId
        ? await interaction.guild.channels.fetch(guildConfig.ticketPanelChannelId).catch(() => null)
        : null);

    if (!targetChannel?.isTextBased()) {
      throw new Error('Defina um canal valido para republicar o painel de tickets.');
    }
    await assertTextChannelOperational(targetChannel);

    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      ticketPanelChannelId: targetChannel.id
    });

    const message = await publishTicketPanel(targetChannel, updatedConfig);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Painel republicado',
          `O painel de tickets foi republicado em ${targetChannel}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'config-ticket',
      details: {
        action: 'publish',
        channelId: targetChannel.id,
        messageId: message.id
      }
    });
  }
};
