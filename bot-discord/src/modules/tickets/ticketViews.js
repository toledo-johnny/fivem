const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { COPY } = require('../../config/copy');
const { TICKET_CATEGORIES, TICKET_STATUS } = require('../../config/constants');
const { blockField, buildEmbed, inlineField } = require('../../utils/embeds');

function getTicketCategory(categoryKey) {
  return TICKET_CATEGORIES.find((category) => category.key === categoryKey) || null;
}

function buildTicketPanelPayload(guild) {
  const embed = buildEmbed(guild, {
    title: COPY.tickets.panelTitle,
    description: `${COPY.tickets.panelDescription}\n\n${COPY.tickets.panelFooter}`,
    fields: TICKET_CATEGORIES.map((category) => ({
      name: `${category.emoji} ${category.label}`,
      value: category.description,
      inline: false
    }))
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket:panel')
    .setPlaceholder('Escolha o tipo de atendimento')
    .addOptions(
      TICKET_CATEGORIES.map((category) => ({
        label: category.label,
        description: category.description.slice(0, 100),
        value: category.key,
        emoji: category.emoji
      }))
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(selectMenu)]
  };
}

function buildTicketActionRows(ticket, options = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:claim:${ticket.id}`)
        .setLabel('Assumir ticket')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(Boolean(options.disableAll) || Boolean(ticket.claimedBy)),
      new ButtonBuilder()
        .setCustomId(`ticket:add_user:${ticket.id}`)
        .setLabel('Adicionar usuario')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(Boolean(options.disableAll)),
      new ButtonBuilder()
        .setCustomId(`ticket:remove_user:${ticket.id}`)
        .setLabel('Remover usuario')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(Boolean(options.disableAll)),
      new ButtonBuilder()
        .setCustomId(`ticket:close:${ticket.id}`)
        .setLabel('Fechar ticket')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(Boolean(options.disableAll))
    )
  ];
}

function buildTicketEmbed(guild, ticket, options = {}) {
  const category = getTicketCategory(ticket.categoryKey);

  return buildEmbed(guild, {
    title: category ? `${category.emoji} ${category.label}` : 'Ticket',
    description: options.description || COPY.tickets.openDescription,
    fields: [
      inlineField('Aberto por', `<@${ticket.ownerId}>`),
      inlineField('Categoria', category ? category.label : ticket.categoryKey),
      inlineField('Status', ticket.status === TICKET_STATUS.OPEN ? 'Aberto' : 'Fechado'),
      inlineField('Responsavel', ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Aguardando staff')
    ]
  });
}

function buildTicketTranscriptEmbed(guild, ticket, closer, reason) {
  return buildEmbed(guild, {
    title: COPY.tickets.transcriptTitle,
    description: COPY.tickets.transcriptDescription(ticket.id, closer),
    fields: [
      inlineField('Canal', `<#${ticket.channelId}>`),
      blockField('Motivo', reason)
    ]
  });
}

function buildTicketOwnerClosedEmbed(guild, ticket, closer, reason) {
  return buildEmbed(guild, {
    title: COPY.tickets.ownerClosedTitle,
    description: COPY.tickets.ownerClosedDescription(ticket.id, closer),
    fields: [blockField('Motivo', reason)]
  });
}

function buildMemberModal(ticketId, action) {
  const isAdd = action === 'add_user';
  const modal = new ModalBuilder()
    .setCustomId(`ticket:${action}_modal:${ticketId}`)
    .setTitle(isAdd ? 'Adicionar usuario ao ticket' : 'Remover usuario do ticket');

  const input = new TextInputBuilder()
    .setCustomId('target_user')
    .setLabel('Informe o ID ou @mencao do usuario')
    .setPlaceholder('Ex.: 123456789012345678')
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function buildCloseModal(ticketId) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket:close_modal:${ticketId}`)
    .setTitle('Fechar ticket');

  const reasonInput = new TextInputBuilder()
    .setCustomId('close_reason')
    .setLabel('Informe o motivo do fechamento')
    .setPlaceholder('Ex.: atendimento concluido / problema resolvido')
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

module.exports = {
  buildCloseModal,
  buildMemberModal,
  buildTicketActionRows,
  buildTicketEmbed,
  buildTicketOwnerClosedEmbed,
  buildTicketPanelPayload,
  buildTicketTranscriptEmbed,
  getTicketCategory
};
