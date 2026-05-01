const { COPY } = require('../../config/copy');
const { successEmbed } = require('../../utils/embeds');
const { createTicketFromPanel } = require('../../modules/tickets/ticketService');

module.exports = {
  type: 'select',
  canHandle(interaction) {
    return interaction.customId === 'ticket:panel';
  },
  async execute(interaction) {
    const categoryKey = interaction.values[0];
    const { channel, category } = await createTicketFromPanel(interaction, categoryKey);

    await interaction.reply({
      embeds: [
        successEmbed(
          interaction.guild,
          'Ticket criado',
          COPY.tickets.createdReply(category.label, channel)
        )
      ],
      ephemeral: true
    });
  }
};
