const { successEmbed } = require('../../utils/embeds');
const { COPY } = require('../../config/copy');
const { replyEphemeral } = require('../../utils/interactions');
const {
  buildContinueButton,
  rejectApplication,
  submitWhitelistPage
} = require('../../modules/whitelist/whitelistService');

module.exports = {
  type: 'modal',
  canHandle(interaction) {
    return interaction.customId.startsWith('whitelist:');
  },
  async execute(interaction) {
    const [, action, applicationIdRaw, pageRaw] = interaction.customId.split(':');
    const applicationId = Number(applicationIdRaw);

    if (action === 'page') {
      const result = await submitWhitelistPage(interaction, applicationId, Number(pageRaw));

      if (!result.completed) {
        await replyEphemeral(interaction, {
          embeds: [
            successEmbed(
              interaction.guild,
              'Etapa concluida',
              COPY.whitelist.pageSaved
            )
          ],
          components: [buildContinueButton(applicationId, result.nextPage)]
        });
        return;
      }

      await replyEphemeral(interaction, {
        embeds: [
          successEmbed(
            interaction.guild,
            'Whitelist enviada',
            COPY.whitelist.pendingReply
          )
        ]
      });
      return;
    }

    if (action === 'reject_modal') {
      await interaction.deferReply({ ephemeral: true });
      const application = await rejectApplication(
        interaction,
        applicationId,
        interaction.fields.getTextInputValue('rejection_reason')
      );
      await interaction.editReply({
        embeds: [
          successEmbed(
            interaction.guild,
            'Whitelist reprovada',
            `A whitelist #${application.id} foi reprovada com sucesso.`
          )
        ]
      });
    }
  }
};
