const { SlashCommandBuilder } = require('discord.js');
const { buildHelpPayload } = require('../modules/onboarding/onboardingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra os atalhos principais do servidor e do bot.')
    .setDMPermission(false),
  async execute(interaction) {
    const embed = await buildHelpPayload(interaction.guild);

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
