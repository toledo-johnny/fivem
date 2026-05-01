const { COPY } = require('../../config/copy');
const { errorEmbed } = require('../../utils/embeds');
const { hasAdminAccess } = require('../../utils/permissions');
const { ensureGuildConfig } = require('../../modules/config/configRepository');

async function requireGuildAdmin(interaction) {
  if (!interaction.inGuild()) {
    throw new Error('Este comando so pode ser usado dentro de um servidor.');
  }

  const guildConfig = await ensureGuildConfig(interaction.guild.id);
  if (!hasAdminAccess(interaction.member, guildConfig)) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          interaction.guild,
          COPY.common.accessDeniedTitle,
          COPY.common.accessDeniedDescription
        )
      ],
      ephemeral: true
    });

    return null;
  }

  return guildConfig;
}

module.exports = {
  requireGuildAdmin
};
