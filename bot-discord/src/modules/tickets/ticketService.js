const { buildCloseModal, buildMemberModal } = require('./ticketViews');
const { getTicketByChannelId, getTicketById } = require('./ticketRepository');
const { hasStaffAccess } = require('../../utils/permissions');
const {
  addTicketMemberForActor,
  claimTicketForActor,
  closeTicketForActor,
  createTicketForActor,
  getTicketContext,
  publishTicketPanel,
  removeTicketMemberForActor
} = require('./ticketAppService');

async function createTicketFromPanel(interaction, categoryKey) {
  return createTicketForActor({
    guild: interaction.guild,
    actor: interaction.user,
    categoryKey
  });
}

async function claimTicket(interaction, ticketId) {
  const { updatedTicket } = await claimTicketForActor({
    guild: interaction.guild,
    member: interaction.member,
    actorUser: interaction.user,
    ticketId,
    channel: interaction.channel
  });

  return updatedTicket;
}

async function showAddUserModal(interaction, ticketId) {
  const { guildConfig } = await getTicketContext(interaction.guild, ticketId);
  if (!interaction.member || !guildConfig) {
    throw new Error('Nao foi possivel validar o ticket.');
  }

  if (!hasStaffAccess(interaction.member, guildConfig)) {
    throw new Error('Apenas a staff pode adicionar usuarios ao ticket.');
  }

  await interaction.showModal(buildMemberModal(ticketId, 'add_user'));
}

async function showRemoveUserModal(interaction, ticketId) {
  const { guildConfig } = await getTicketContext(interaction.guild, ticketId);
  if (!interaction.member || !guildConfig) {
    throw new Error('Nao foi possivel validar o ticket.');
  }

  if (!hasStaffAccess(interaction.member, guildConfig)) {
    throw new Error('Apenas a staff pode remover usuarios do ticket.');
  }

  await interaction.showModal(buildMemberModal(ticketId, 'remove_user'));
}

async function addUserToTicket(interaction, ticketId, input) {
  const result = await addTicketMemberForActor({
    guild: interaction.guild,
    member: interaction.member,
    actorUser: interaction.user,
    ticketId,
    input,
    channel: interaction.channel
  });

  return result.member;
}

async function removeUserFromTicket(interaction, ticketId, input) {
  const result = await removeTicketMemberForActor({
    guild: interaction.guild,
    member: interaction.member,
    actorUser: interaction.user,
    ticketId,
    input,
    channel: interaction.channel
  });

  return result.member;
}

async function showCloseModal(interaction, ticketId) {
  await interaction.showModal(buildCloseModal(ticketId));
}

async function closeTicket(interaction, ticketId, reason) {
  const { updatedTicket } = await closeTicketForActor({
    guild: interaction.guild,
    member: interaction.member,
    actorUser: interaction.user,
    ticketId,
    channel: interaction.channel,
    reason
  });

  return updatedTicket;
}

module.exports = {
  addUserToTicket,
  buildCloseModal,
  buildMemberModal,
  closeTicket,
  claimTicket,
  createTicketFromPanel,
  getTicketByChannelId,
  getTicketById,
  publishTicketPanel,
  removeUserFromTicket,
  showAddUserModal,
  showCloseModal,
  showRemoveUserModal,
  claimTicketForActor,
  closeTicketForActor
};
