const { WHITELIST_STATUS } = require('../../config/constants');
const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function getExecutor(executor) {
  return executor || pool;
}

function mapApplicationRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    userId: row.user_id,
    status: row.status,
    questionVersion: Number(row.question_version || 1),
    answers: safeParseJson(row.answers_text, {}),
    userServerId: row.user_server_id,
    characterName: row.character_name,
    linkedUserId: row.linked_user_id,
    reviewChannelId: row.review_channel_id,
    reviewMessageId: row.review_message_id,
    reviewerId: row.reviewer_id,
    rejectionReason: row.rejection_reason,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createApplication(
  {
    guildId,
    userId,
    status = WHITELIST_STATUS.DRAFT,
    questionVersion = 1,
    answers = {}
  },
  executor = pool
) {
  const queryExecutor = getExecutor(executor);
  const [result] = await queryExecutor.execute(
    `
      INSERT INTO discord_bot_whitelist_applications (
        guild_id,
        user_id,
        status,
        question_version,
        answers_text
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [guildId, userId, status, questionVersion, safeStringifyJson(answers, {})]
  );

  return getApplicationById(result.insertId, queryExecutor);
}

async function getApplicationById(applicationId, executor = pool, options = {}) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_whitelist_applications
      WHERE id = ?
      LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}
    `,
    [applicationId]
  );

  return mapApplicationRow(rows[0] || null);
}

async function getLatestApplicationForUser(guildId, userId, statuses = [], executor = pool, options = {}) {
  const queryExecutor = getExecutor(executor);
  if (!Array.isArray(statuses) || statuses.length === 0) {
    const [rows] = await queryExecutor.execute(
      `
        SELECT * FROM discord_bot_whitelist_applications
        WHERE guild_id = ? AND user_id = ?
        ORDER BY id DESC
        LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}
      `,
      [guildId, userId]
    );

    return mapApplicationRow(rows[0] || null);
  }

  const placeholders = statuses.map(() => '?').join(', ');
  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_whitelist_applications
      WHERE guild_id = ? AND user_id = ? AND status IN (${placeholders})
      ORDER BY id DESC
      LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}
    `,
    [guildId, userId, ...statuses]
  );

  return mapApplicationRow(rows[0] || null);
}

async function createOrResetDraftApplication({ guildId, userId, questionVersion }, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const existingDraft = await getLatestApplicationForUser(
    guildId,
    userId,
    [WHITELIST_STATUS.DRAFT],
    queryExecutor
  );

  if (!existingDraft) {
    return createApplication(
      {
        guildId,
        userId,
        status: WHITELIST_STATUS.DRAFT,
        questionVersion,
        answers: {}
      },
      queryExecutor
    );
  }

  return updateApplication(
    existingDraft.id,
    {
      status: WHITELIST_STATUS.DRAFT,
      questionVersion,
      answers: {},
      userServerId: null,
      characterName: null,
      linkedUserId: null,
      reviewChannelId: null,
      reviewMessageId: null,
      reviewerId: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null
    },
    queryExecutor
  );
}

async function updateApplication(applicationId, updates, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const current = await getApplicationById(applicationId, queryExecutor);
  if (!current) return null;

  const next = {
    ...current,
    ...updates,
    answers: {
      ...current.answers,
      ...(updates.answers || {})
    }
  };

  await queryExecutor.execute(
    `
      UPDATE discord_bot_whitelist_applications
      SET
        status = ?,
        question_version = ?,
        answers_text = ?,
        user_server_id = ?,
        character_name = ?,
        linked_user_id = ?,
        review_channel_id = ?,
        review_message_id = ?,
        reviewer_id = ?,
        rejection_reason = ?,
        submitted_at = ?,
        reviewed_at = ?
      WHERE id = ?
    `,
    [
      next.status,
      next.questionVersion,
      safeStringifyJson(next.answers, {}),
      next.userServerId,
      next.characterName,
      next.linkedUserId,
      next.reviewChannelId,
      next.reviewMessageId,
      next.reviewerId,
      next.rejectionReason,
      next.submittedAt,
      next.reviewedAt,
      applicationId
    ]
  );

  return getApplicationById(applicationId, queryExecutor);
}

async function getAttemptState(guildId, userId, executor = pool, options = {}) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT * FROM discord_bot_whitelist_attempts
      WHERE guild_id = ? AND user_id = ?
      LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}
    `,
    [guildId, userId]
  );

  if (rows.length === 0) {
    return {
      guildId,
      userId,
      attemptsUsed: 0,
      lastAttemptAt: null,
      cooldownUntil: null
    };
  }

  return {
    guildId: rows[0].guild_id,
    userId: rows[0].user_id,
    attemptsUsed: Number(rows[0].attempts_used || 0),
    lastAttemptAt: rows[0].last_attempt_at,
    cooldownUntil: rows[0].cooldown_until
  };
}

async function saveAttemptState(
  { guildId, userId, attemptsUsed, lastAttemptAt, cooldownUntil },
  executor = pool
) {
  const queryExecutor = getExecutor(executor);
  await queryExecutor.execute(
    `
      INSERT INTO discord_bot_whitelist_attempts (
        guild_id,
        user_id,
        attempts_used,
        last_attempt_at,
        cooldown_until
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        attempts_used = VALUES(attempts_used),
        last_attempt_at = VALUES(last_attempt_at),
        cooldown_until = VALUES(cooldown_until)
    `,
    [guildId, userId, attemptsUsed, lastAttemptAt, cooldownUntil]
  );

  return getAttemptState(guildId, userId, queryExecutor);
}

async function listApplications(guildId, options = {}, executor = pool) {
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
      SELECT * FROM discord_bot_whitelist_applications
      WHERE ${clauses.join(' AND ')}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    params
  );

  return rows.map(mapApplicationRow).filter(Boolean);
}

async function countPendingApplications(guildId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT COUNT(*) AS total
      FROM discord_bot_whitelist_applications
      WHERE guild_id = ? AND status = ?
    `,
    [guildId, WHITELIST_STATUS.PENDING]
  );

  return Number(rows[0]?.total || 0);
}

async function listPendingApplications(guildId, executor = pool) {
  return listApplications(guildId, { status: WHITELIST_STATUS.PENDING, limit: 500, offset: 0 }, executor);
}

module.exports = {
  countPendingApplications,
  createApplication,
  createOrResetDraftApplication,
  getApplicationById,
  getAttemptState,
  getLatestApplicationForUser,
  listApplications,
  listPendingApplications,
  saveAttemptState,
  updateApplication
};
