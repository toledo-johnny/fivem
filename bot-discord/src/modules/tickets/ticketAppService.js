const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { COPY } = require('../../config/copy');
const { PANEL_TYPES, TICKET_STATUS } = require('../../config/constants');
const { withLockedConnection } = require('../../database/locks');
const { buildTicketChannelName, resolveMemberFromInput } = require('../../utils/discord');
const { blockField, inlineField, successEmbed } = require('../../utils/embeds');
const { canManageTicket, getStaffRoleIds, hasStaffAccess } = require('../../utils/permissions');
const { createTranscriptAttachments } = require('../../utils/transcript');
const { ensureGuildConfig } = require('../config/configRepository');
const { logAction } = require('../logs/logService');
const {
  addOrReactivateTicketMember,
  createTicket,
  deactivateTicketMember,
  getOpenTicketByUser,
  getTicketById,
  updateTicket
} = require('./ticketRepository');
const {
  buildTicketActionRows,
  buildTicketEmbed,
  buildTicketOwnerClosedEmbed,
  buildTicketPanelPayload,
  buildTicketTranscriptEmbed,
  getTicketCategory
} = require('./ticketViews');
const { publishPanel } = require('../../services/discord/panelPublisher');

async function publishTicketPanel(channel, guildConfig) {
  return publishPanel({
    guildConfig,
    panelType: PANEL_TYPES.TICKET,
    channel,
    payload: buildTicketPanelPayload(channel.guild)
  });
}

async function getTicketContext(guild, ticketId, executor) {
  const [guildConfig, ticket] = await Promise.all([
    ensureGuildConfig(guild.id),
    getTicketById(ticketId, executor)
  ]);

  if (!ticket) {
    throw new Error('Ticket nao encontrado.');
  }

  return { guildConfig, ticket };
}

async function resolveTicketChannel(guild, ticket, preferredChannel = null) {
  if (preferredChannel?.id === ticket.channelId) {
    return preferredChannel;
  }

  return guild.channels.fetch(ticket.channelId).catch(() => null);
}

async function createTicketForActor({ guild, actor, categoryKey }) {
  const guildConfig = await ensureGuildConfig(guild.id);
  if (!guildConfig.ticketCategoryId) {
    throw new Error('A categoria de tickets ainda nao foi configurada. Use /setup-ticket.');
  }

  const staffRoleIds = getStaffRoleIds(guildConfig);
  if (staffRoleIds.length === 0) {
    throw new Error('Nenhum cargo operacional da equipe foi configurado para os tickets.');
  }

  const category = getTicketCategory(categoryKey);
  if (!category) {
    throw new Error('Categoria de ticket invalida.');
  }

  return withLockedConnection(`ticket-open:${guild.id}:${actor.id}`, async (connection) => {
    const existingTicket = await getOpenTicketByUser(guild.id, actor.id, connection);
    if (existingTicket) {
      const existingChannel = await guild.channels.fetch(existingTicket.channelId).catch(() => null);
      throw new Error(
        existingChannel
          ? `Voce ja possui um ticket aberto em ${existingChannel}.`
          : 'Voce ja possui um ticket aberto aguardando finalizacao.'
      );
    }

    const channel = await guild.channels.create({
      name: buildTicketChannelName(category.channelPrefix, actor.username, actor.id),
      type: ChannelType.GuildText,
      parent: guildConfig.ticketCategoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: actor.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        ...staffRoleIds.map((roleId) => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels
          ]
        }))
      ]
    });

    let ticket;
    try {
      ticket = await createTicket(
        {
          guildId: guild.id,
          channelId: channel.id,
          ownerId: actor.id,
          categoryKey,
          metadata: {
            createdFrom: 'panel'
          }
        },
        connection
      );
    } catch (error) {
      await channel.delete('Falha ao persistir ticket no banco.').catch(() => null);
      throw error;
    }

    await channel.send({
      content: `${actor} ${staffRoleIds.map((roleId) => `<@&${roleId}>`).join(' ')}`.trim(),
      embeds: [buildTicketEmbed(guild, ticket)],
      components: buildTicketActionRows(ticket)
    });

    await logAction({
      guild,
      guildId: guild.id,
      type: 'tickets_created',
      title: 'Ticket criado',
      description: `${actor} abriu um ticket de ${category.label}.`,
      actorId: actor.id,
      entityType: 'ticket',
      entityId: String(ticket.id),
      details: {
        ticketId: ticket.id,
        channelId: channel.id,
        categoryKey
      },
      fields: [
        inlineField('Canal', `<#${channel.id}>`),
        inlineField('Categoria', category.label)
      ]
    });

    return { ticket, channel, category, guildConfig };
  });
}

async function claimTicketForActor({ guild, member, actorUser, ticketId, channel = null }) {
  const { updatedTicket, guildConfig } = await withLockedConnection(
    `ticket:${ticketId}`,
    async (connection) => {
      const { guildConfig: config, ticket } = await getTicketContext(guild, ticketId, connection);

      if (!hasStaffAccess(member, config)) {
        throw new Error('Apenas a staff pode assumir tickets.');
      }

      if (ticket.status !== TICKET_STATUS.OPEN) {
        throw new Error('Este ticket ja foi finalizado.');
      }

      if (ticket.claimedBy && ticket.claimedBy !== actorUser.id) {
        throw new Error(`Este ticket ja foi assumido por <@${ticket.claimedBy}>.`);
      }

      const updatedTicket =
        ticket.claimedBy === actorUser.id
          ? ticket
          : await updateTicket(
              ticket.id,
              {
                claimedBy: actorUser.id,
                claimedAt: new Date()
              },
              connection
            );

      return {
        updatedTicket,
        guildConfig: config
      };
    }
  );

  const resolvedChannel = await resolveTicketChannel(guild, updatedTicket, channel);
  if (resolvedChannel?.isTextBased()) {
    await resolvedChannel.send({
      embeds: [
        successEmbed(guild, 'Ticket assumido', COPY.tickets.claimNotice(actorUser))
      ]
    });
  }

  await logAction({
    guild,
    guildId: guild.id,
    type: 'tickets_claimed',
    title: 'Ticket assumido',
    description: `${actorUser} assumiu o ticket #${updatedTicket.id}.`,
    actorId: actorUser.id,
    targetId: updatedTicket.ownerId,
    entityType: 'ticket',
    entityId: String(updatedTicket.id),
    details: {
      channelId: updatedTicket.channelId
    },
    fields: [inlineField('Canal', `<#${updatedTicket.channelId}>`)]
  });

  return { updatedTicket, guildConfig };
}

async function addTicketMemberForActor({ guild, member, actorUser, ticketId, input, channel = null }) {
  const { ticket, guildConfig } = await getTicketContext(guild, ticketId);
  if (!hasStaffAccess(member, guildConfig)) {
    throw new Error('Apenas a staff pode adicionar usuarios ao ticket.');
  }

  const targetMember = await resolveMemberFromInput(guild, input);
  if (!targetMember) {
    throw new Error('Nao foi possivel localizar o usuario informado.');
  }

  if (targetMember.id === ticket.ownerId) {
    throw new Error('O dono do ticket ja possui acesso ao canal.');
  }

  const resolvedChannel = await resolveTicketChannel(guild, ticket, channel);
  if (!resolvedChannel) {
    throw new Error('O canal deste ticket nao foi encontrado no Discord.');
  }

  await resolvedChannel.permissionOverwrites.edit(targetMember.id, {
    ViewChannel: true,
    SendMessages: true,
    AttachFiles: true,
    ReadMessageHistory: true
  });

  await withLockedConnection(`ticket:${ticketId}:members`, async (connection) => {
    await addOrReactivateTicketMember(ticket.id, targetMember.id, actorUser.id, connection);
  });

  await logAction({
    guild,
    guildId: guild.id,
    type: 'tickets_members',
    title: 'Usuario adicionado ao ticket',
    description: `${actorUser} adicionou ${targetMember} ao ticket #${ticket.id}.`,
    actorId: actorUser.id,
    targetId: targetMember.id,
    entityType: 'ticket',
    entityId: String(ticket.id),
    details: {
      action: 'add',
      channelId: ticket.channelId
    }
  });

  return { member: targetMember, ticket };
}

async function removeTicketMemberForActor({ guild, member, actorUser, ticketId, input, channel = null }) {
  const { ticket, guildConfig } = await getTicketContext(guild, ticketId);
  if (!hasStaffAccess(member, guildConfig)) {
    throw new Error('Apenas a staff pode remover usuarios do ticket.');
  }

  const targetMember = await resolveMemberFromInput(guild, input);
  if (!targetMember) {
    throw new Error('Nao foi possivel localizar o usuario informado.');
  }

  if (targetMember.id === ticket.ownerId) {
    throw new Error('O dono do ticket nao pode ser removido.');
  }

  const resolvedChannel = await resolveTicketChannel(guild, ticket, channel);
  if (!resolvedChannel) {
    throw new Error('O canal deste ticket nao foi encontrado no Discord.');
  }

  await resolvedChannel.permissionOverwrites.edit(targetMember.id, {
    ViewChannel: false
  });

  await withLockedConnection(`ticket:${ticketId}:members`, async (connection) => {
    await deactivateTicketMember(ticket.id, targetMember.id, actorUser.id, connection);
  });

  await logAction({
    guild,
    guildId: guild.id,
    type: 'tickets_members',
    title: 'Usuario removido do ticket',
    description: `${actorUser} removeu ${targetMember} do ticket #${ticket.id}.`,
    actorId: actorUser.id,
    targetId: targetMember.id,
    entityType: 'ticket',
    entityId: String(ticket.id),
    details: {
      action: 'remove',
      channelId: ticket.channelId
    }
  });

  return { member: targetMember, ticket };
}

async function closeTicketForActor({ guild, member, actorUser, ticketId, channel = null, reason }) {
  const resolved = await withLockedConnection(`ticket:${ticketId}`, async (connection) => {
    const { guildConfig, ticket } = await getTicketContext(guild, ticketId, connection);
    if (!canManageTicket(member, guildConfig, ticket)) {
      throw new Error('Voce nao tem permissao para fechar este ticket.');
    }

    if (ticket.status !== TICKET_STATUS.OPEN) {
      throw new Error('Este ticket ja foi fechado anteriormente.');
    }

    const resolvedChannel = await resolveTicketChannel(guild, ticket, channel);
    let transcript = null;
    let transcriptLogChannelId =
      guildConfig.logChannels.tickets_transcripts || guildConfig.logChannels.tickets_closed || null;
    let transcriptMessageId = null;

    if (resolvedChannel?.isTextBased() && transcriptLogChannelId) {
      transcript = await createTranscriptAttachments(resolvedChannel, ticket.id);
      const transcriptChannel = await guild.channels.fetch(transcriptLogChannelId).catch(() => null);
      if (transcriptChannel?.isTextBased()) {
        const transcriptMessage = await transcriptChannel.send({
          embeds: [buildTicketTranscriptEmbed(guild, ticket, actorUser, reason)],
          files: transcript.attachments
        });
        transcriptMessageId = transcriptMessage.id;
      }
    }

    const updatedTicket = await updateTicket(
      ticket.id,
      {
        status: TICKET_STATUS.CLOSED,
        closeReason: reason,
        closedBy: actorUser.id,
        closedAt: new Date(),
        transcriptLogChannelId,
        transcriptMessageId,
        metadata: {
          ...ticket.metadata,
          transcriptParts: transcript?.attachments?.length || 0
        }
      },
      connection
    );

    return {
      updatedTicket,
      guildConfig,
      resolvedChannel
    };
  });

  await logAction({
    guild,
    guildId: guild.id,
    type: 'tickets_closed',
    title: 'Ticket fechado',
    description: `${actorUser} fechou o ticket #${resolved.updatedTicket.id}.`,
    actorId: actorUser.id,
    targetId: resolved.updatedTicket.ownerId,
    entityType: 'ticket',
    entityId: String(resolved.updatedTicket.id),
    details: {
      channelId: resolved.updatedTicket.channelId,
      reason,
      transcriptMessageId: resolved.updatedTicket.transcriptMessageId
    },
    fields: [
      inlineField('Canal', `<#${resolved.updatedTicket.channelId}>`),
      blockField('Motivo', reason)
    ]
  });

  try {
    const owner = await guild.members.fetch(resolved.updatedTicket.ownerId);
    await owner.send({
      embeds: [
        buildTicketOwnerClosedEmbed(guild, resolved.updatedTicket, actorUser, reason)
      ]
    });
  } catch (error) {
    // DM opcional.
  }

  return resolved;
}

module.exports = {
  addTicketMemberForActor,
  claimTicketForActor,
  closeTicketForActor,
  createTicketForActor,
  getTicketContext,
  publishTicketPanel,
  removeTicketMemberForActor
};
