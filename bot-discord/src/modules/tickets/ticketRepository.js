const { TICKET_STATUS } = require('../../config/constants');
const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function getExecutor(executor) {
  return executor || pool;
}

function mapTicketRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    channelId: row.channel_id,
    ownerId: row.owner_id,
    categoryKey: row.category_key,
    status: row.status,
    claimedBy: row.claimed_by,
    closeReason: row.close_reason,
    transcriptLogChannelId: row.transcript_log_channel_id,
    transcriptMessageId: row.transcript_message_id,
    closedBy: row.closed_by,
    openedAt: row.opened_at,
    claimedAt: row.claimed_at,
    closedAt: row.closed_at,
    metadata: safeParseJson(row.metadata_text, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createTicket(
  { guildId, channelId, ownerId, categoryKey, metadata = {} },
  executor = pool
) {
  const queryExecutor = getExecutor(executor);
  const [result] = await queryExecutor.execute(
    `
      INSERT INTO discord_bot_tickets (
        guild_id,
        channel_id,
        owner_id,
        category_key,
        status,
        opened_at,
        metadata_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      guildId,
      channelId,
      ownerId,
      categoryKey,
      TICKET_STATUS.OPEN,
      new Date(),
      safeStringifyJson(metadata, {})
    ]
  );

  return getTicketById(result.insertId, queryExecutor);
}

async function getTicketById(ticketId, executor = pool, options = {}) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `SELECT * FROM discord_bot_tickets WHERE id = ? LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`,
    [ticketId]
  );
  return mapTicketRow(rows[0] || null);
}

async function getTicketByChannelId(channelId, executor = pool, options = {}) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_tickets
      WHERE channel_id = ?
      LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}
    `,
    [channelId]
  );
  return mapTicketRow(rows[0] || null);
}

async function getOpenTicketByUser(guildId, userId, executor = pool, options = {}) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_tickets
      WHERE guild_id = ? AND owner_id = ? AND status = ?
      ORDER BY id DESC
      LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}
    `,
    [guildId, userId, TICKET_STATUS.OPEN]
  );

  return mapTicketRow(rows[0] || null);
}

async function updateTicket(ticketId, updates, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const current = await getTicketById(ticketId, queryExecutor, { forUpdate: false });
  if (!current) return null;

  const next = {
    ...current,
    ...updates,
    metadata: {
      ...current.metadata,
      ...(updates.metadata || {})
    }
  };

  await queryExecutor.execute(
    `
      UPDATE discord_bot_tickets
      SET
        channel_id = ?,
        owner_id = ?,
        category_key = ?,
        status = ?,
        claimed_by = ?,
        close_reason = ?,
        transcript_log_channel_id = ?,
        transcript_message_id = ?,
        closed_by = ?,
        opened_at = ?,
        claimed_at = ?,
        closed_at = ?,
        metadata_text = ?
      WHERE id = ?
    `,
    [
      next.channelId,
      next.ownerId,
      next.categoryKey,
      next.status,
      next.claimedBy,
      next.closeReason,
      next.transcriptLogChannelId,
      next.transcriptMessageId,
      next.closedBy,
      next.openedAt,
      next.claimedAt,
      next.closedAt,
      safeStringifyJson(next.metadata, {}),
      ticketId
    ]
  );

  return getTicketById(ticketId, queryExecutor);
}

async function addOrReactivateTicketMember(ticketId, userId, addedBy, executor = pool) {
  const queryExecutor = getExecutor(executor);
  await queryExecutor.execute(
    `
      INSERT INTO discord_bot_ticket_members (
        ticket_id,
        user_id,
        added_by,
        removed_by,
        is_active
      )
      VALUES (?, ?, ?, NULL, 1)
      ON DUPLICATE KEY UPDATE
        added_by = VALUES(added_by),
        removed_by = NULL,
        is_active = 1
    `,
    [ticketId, userId, addedBy]
  );
}

async function deactivateTicketMember(ticketId, userId, removedBy, executor = pool) {
  const queryExecutor = getExecutor(executor);
  await queryExecutor.execute(
    `
      UPDATE discord_bot_ticket_members
      SET is_active = 0, removed_by = ?
      WHERE ticket_id = ? AND user_id = ?
    `,
    [removedBy, ticketId, userId]
  );
}

async function listActiveTicketMembers(ticketId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_ticket_members
      WHERE ticket_id = ? AND is_active = 1
      ORDER BY created_at ASC
    `,
    [ticketId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    userId: row.user_id,
    addedBy: row.added_by,
    removedBy: row.removed_by,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

async function listTickets(guildId, options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const params = [guildId];
  const clauses = ['guild_id = ?'];

  if (options.status) {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const limit = Math.max(1, Math.min(Number(options.limit || 50), 200));
  const offset = Math.max(0, Number(options.offset || 0));
  params.push(limit, offset);

  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_tickets
      WHERE ${clauses.join(' AND ')}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    params
  );

  return rows.map(mapTicketRow).filter(Boolean);
}

async function listTicketsByOwner(guildId, ownerId, options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const params = [guildId, ownerId];
  const clauses = ['guild_id = ?', 'owner_id = ?'];

  if (options.status) {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const limit = Math.max(1, Math.min(Number(options.limit || 20), 200));
  const offset = Math.max(0, Number(options.offset || 0));
  params.push(limit, offset);

  const [rows] = await queryExecutor.execute(
    `
      SELECT *
      FROM discord_bot_tickets
      WHERE ${clauses.join(' AND ')}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    params
  );

  return rows.map(mapTicketRow).filter(Boolean);
}

async function countOpenTickets(guildId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT COUNT(*) AS total
      FROM discord_bot_tickets
      WHERE guild_id = ? AND status = ?
    `,
    [guildId, TICKET_STATUS.OPEN]
  );

  return Number(rows[0]?.total || 0);
}

async function listOpenTickets(guildId, executor = pool) {
  return listTickets(guildId, { status: TICKET_STATUS.OPEN, limit: 500, offset: 0 }, executor);
}

module.exports = {
  addOrReactivateTicketMember,
  countOpenTickets,
  createTicket,
  deactivateTicketMember,
  getOpenTicketByUser,
  getTicketByChannelId,
  getTicketById,
  listActiveTicketMembers,
  listOpenTickets,
  listTicketsByOwner,
  listTickets,
  updateTicket
};
