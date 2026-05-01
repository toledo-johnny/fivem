const { COPY } = require('../config/copy');
const { errorEmbed } = require('./embeds');
const { logError } = require('../modules/logs/logService');

async function replyEphemeral(interaction, payload) {
  const normalizedPayload = {
    ephemeral: true,
    ...payload
  };

  if (interaction.deferred) {
    const { ephemeral, ...editPayload } = normalizedPayload;
    return interaction.editReply(editPayload);
  }

  if (interaction.replied) {
    return interaction.followUp(normalizedPayload);
  }

  return interaction.reply(normalizedPayload);
}

async function handleInteractionError(interaction, error, context = 'interaction') {
  console.error(`[${context}]`, error);

  if (interaction.guild) {
    await logError({
      guild: interaction.guild,
      guildId: interaction.guild.id,
      actorId: interaction.user?.id || null,
      context,
      error
    });
  }

  const embed = errorEmbed(
    interaction.guild,
    COPY.common.genericErrorTitle,
    error?.message || COPY.common.genericErrorDescription
  );

  try {
    if (interaction.deferred) {
      await interaction.editReply({
        embeds: [embed],
        components: [],
        files: []
      });
      return;
    }

    if (interaction.replied) {
      await interaction.followUp({
        embeds: [embed],
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  } catch (followUpError) {
    console.error('[handleInteractionError.followUp]', followUpError);
  }
}

function requireConfigured(value, message = COPY.common.notConfigured) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

module.exports = {
  handleInteractionError,
  replyEphemeral,
  requireConfigured
};
