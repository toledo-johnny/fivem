const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertRoleOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-admin-role')
    .setDescription('Define o cargo de administrador usado no dashboard.')
    .setDMPermission(false)
    .addRoleOption((option) =>
      option.setName('role').setDescription('Cargo do nivel admin').setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const role = interaction.options.getRole('role', true);
    await assertRoleOperational(interaction.guild, role);
    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      adminRoleId: role.id
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Cargo de admin atualizado',
          `${role} agora sera usado como cargo de administrador do ecossistema.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'set-admin-role',
      details: {
        roleId: role.id
      }
    });
  }
};
