const { successEmbed } = require('../../utils/embeds');
const { replyEphemeral } = require('../../utils/interactions');
const {
  addUserToTicket,
  closeTicket,
  removeUserFromTicket
} = require('../../modules/tickets/ticketService');

module.exports = {
  type: 'modal',
  canHandle(interaction) {
    return interaction.customId.startsWith('ticket:');
  },
  async execute(interaction) {
    const [, action, ticketIdRaw] = interaction.customId.split(':');
    const ticketId = Number(ticketIdRaw);

    if (action === 'add_user_modal') {
      const member = await addUserToTicket(
        interaction,
        ticketId,
        interaction.fields.getTextInputValue('target_user')
      );
      await replyEphemeral(interaction, {
        embeds: [
          successEmbed(
            interaction.guild,
            'Usuario adicionado',
            `${member} agora possui acesso ao ticket.`
          )
        ]
      });
      return;
    }

    if (action === 'remove_user_modal') {
      const member = await removeUserFromTicket(
        interaction,
        ticketId,
        interaction.fields.getTextInputValue('target_user')
      );
      await replyEphemeral(interaction, {
        embeds: [
          successEmbed(
            interaction.guild,
            'Usuario removido',
            `${member} nao possui mais acesso ao ticket.`
          )
        ]
      });
      return;
    }

    if (action === 'close_modal') {
      await interaction.deferReply({ ephemeral: true });
      const ticket = await closeTicket(
        interaction,
        ticketId,
        interaction.fields.getTextInputValue('close_reason')
      );

      await interaction.editReply({
        embeds: [
          successEmbed(
            interaction.guild,
            'Ticket finalizado',
            `O ticket #${ticket.id} foi encerrado e sera removido do Discord.`
          )
        ]
      });

      await interaction.channel.delete(`Ticket ${ticket.id} finalizado por ${interaction.user.tag}`);
    }
  }
};
