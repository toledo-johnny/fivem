const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../modules/config/configRepository');
const { logAdministrativeCommand } = require('../../modules/logs/logService');
const { requireGuildAdmin } = require('../../services/discord/adminCommandUtils');
const { assertRoleOperational } = require('../../services/discord/preflightService');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-unverified-role')
    .setDescription('Define o cargo removido quando a whitelist for aprovada.')
    .setDMPermission(false)
    .addRoleOption((option) =>
      option.setName('role').setDescription('Cargo de nao verificado').setRequired(true)
    ),
  async execute(interaction) {
    const guildConfig = await requireGuildAdmin(interaction);
    if (!guildConfig) return;

    const role = interaction.options.getRole('role', true);
    await assertRoleOperational(interaction.guild, role);
    const updatedConfig = await updateGuildConfig(interaction.guild.id, {
      unverifiedRoleId: role.id
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Cargo de nao verificado atualizado',
          `${role} sera removido quando a whitelist for aprovada.`
        )
      ],
      ephemeral: true
    });

    await logAdministrativeCommand({
      interaction,
      guildConfig: updatedConfig,
      commandName: 'set-unverified-role',
      details: {
        roleId: role.id
      }
    });
  }
};
