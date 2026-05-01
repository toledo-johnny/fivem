const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertRoleOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-whitelist-role')
    .setDescription('Define o cargo entregue ao usuario aprovado na whitelist.')
    .setDMPermission(false)
    .addRoleOption((option) =>
      option.setName('role').setDescription('Cargo de aprovado').setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const role = interaction.options.getRole('role', true);
    await assertRoleOperational(interaction.guild, role);
    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      whitelistRoleId: role.id
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Cargo de whitelist atualizado',
          `${role} sera aplicado aos usuarios aprovados.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'set-whitelist-role',
      details: {
        roleId: role.id
      }
    });
  }
};
