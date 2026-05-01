const { successEmbed } = require('../../utils/embeds');
const {
  approveApplication,
  buildRejectModal,
  continueWhitelistApplication,
  startWhitelistApplication
} = require('../../modules/whitelist/whitelistService');

module.exports = {
  type: 'button',
  canHandle(interaction) {
    return interaction.customId.startsWith('whitelist:');
  },
  async execute(interaction) {
    const [, action, applicationIdRaw, pageRaw] = interaction.customId.split(':');

    if (action === 'start') {
      await startWhitelistApplication(interaction);
      return;
    }

    if (action === 'continue') {
      await continueWhitelistApplication(interaction, Number(applicationIdRaw), Number(pageRaw));
      return;
    }

    if (action === 'approve') {
      await interaction.deferReply({ ephemeral: true });
      const { application, syncResult } = await approveApplication(interaction, Number(applicationIdRaw));
      await interaction.editReply({
        embeds: [
          successEmbed(
            interaction.guild,
            'Whitelist aprovada',
            `A whitelist #${application.id} foi aprovada. ID sincronizado: ${syncResult.linkedUserId}.`
          )
        ]
      });
      return;
    }

    if (action === 'reject') {
      await interaction.showModal(buildRejectModal(Number(applicationIdRaw)));
    }
  }
};
