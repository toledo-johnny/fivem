const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertRoleOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-support-role')
    .setDescription('Define o cargo de suporte usado no dashboard e tickets.')
    .setDMPermission(false)
    .addRoleOption((option) =>
      option.setName('role').setDescription('Cargo do nivel suporte').setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const role = interaction.options.getRole('role', true);
    await assertRoleOperational(interaction.guild, role);
    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      supportRoleId: role.id
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Cargo de suporte atualizado',
          `${role} agora sera usado como cargo de suporte no ecossistema.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'set-support-role',
      details: {
        roleId: role.id
      }
    });
  }
};
