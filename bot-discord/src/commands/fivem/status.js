const { SlashCommandBuilder } = require('discord.js');
const { buildFiveMStatusPayload, getFiveMStatus } = require('../../modules/fivem/fivemService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra o status atual do servidor FiveM.')
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply();

    const status = await getFiveMStatus();
    await interaction.editReply(
      buildFiveMStatusPayload(interaction.guild, status, {
        includeDiagnostics: true
      })
    );
  }
};
