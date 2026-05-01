const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertRoleOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-staff-role')
    .setDescription('Comando legado: define suporte/admin com o mesmo cargo.')
    .setDMPermission(false)
    .addRoleOption((option) =>
      option.setName('role').setDescription('Cargo da staff').setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const role = interaction.options.getRole('role', true);
    await assertRoleOperational(interaction.guild, role);
    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      staffRoleId: role.id,
      supportRoleId: role.id,
      adminRoleId: role.id
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Cargo legado atualizado',
          `${role} agora sera usado como fallback para suporte/admin quando nenhum cargo especifico estiver configurado.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'set-staff-role',
      details: {
        roleId: role.id
      }
    });
  }
};
