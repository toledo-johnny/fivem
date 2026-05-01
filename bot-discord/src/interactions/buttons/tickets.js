const { successEmbed } = require('../../utils/embeds');
const { COPY } = require('../../config/copy');
const {
  claimTicket,
  showAddUserModal,
  showCloseModal,
  showRemoveUserModal
} = require('../../modules/tickets/ticketService');

module.exports = {
  type: 'button',
  canHandle(interaction) {
    return interaction.customId.startsWith('ticket:');
  },
  async execute(interaction) {
    const [, action, ticketIdRaw] = interaction.customId.split(':');
    const ticketId = Number(ticketIdRaw);

    switch (action) {
      case 'claim': {
        const ticket = await claimTicket(interaction, ticketId);
        await interaction.reply({
          embeds: [
            successEmbed(
              interaction.guild,
              'Ticket assumido',
              COPY.tickets.claimReply(ticket.id)
            )
          ],
          ephemeral: true
        });
        return;
      }
      case 'add_user':
        await showAddUserModal(interaction, ticketId);
        return;
      case 'remove_user':
        await showRemoveUserModal(interaction, ticketId);
        return;
      case 'close':
        await showCloseModal(interaction, ticketId);
        return;
      default:
        return;
    }
  }
};
