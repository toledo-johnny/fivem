const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { publishTicketPanel } = require('../../modules/tickets/ticketService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const {
  assertCategoryOperational,
  assertRoleOperational,
  assertTextChannelOperational
} = require('../../services/discord/preflightService');
const { getStaffRoleIds } = require('../../utils/permissions');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Configura a categoria e publica o painel de tickets.')
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('panel_channel')
        .setDescription('Canal onde o painel de tickets sera publicado.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('category')
        .setDescription('Categoria onde os tickets serao criados.')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const panelChannel = interaction.options.getChannel('panel_channel', true);
    const category = interaction.options.getChannel('category', true);

    await assertTextChannelOperational(panelChannel);
    await assertCategoryOperational(category);

    for (const roleId of getStaffRoleIds(guildConfig)) {
      const staffRole = await interaction.guild.roles.fetch(roleId).catch(() => null);
      if (!staffRole) {
        continue;
      }

      await assertRoleOperational(interaction.guild, staffRole);
    }

    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      ticketPanelChannelId: panelChannel.id,
      ticketCategoryId: category.id
    });

    const message = await publishTicketPanel(panelChannel, updatedConfig);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Painel de tickets publicado',
          `O painel foi enviado em ${panelChannel} e os tickets serao criados na categoria ${category}.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'setup-ticket',
      details: {
        panelChannelId: panelChannel.id,
        categoryId: category.id,
        messageId: message.id
      }
    });
  }
};
