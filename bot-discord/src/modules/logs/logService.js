const { COPY } = require('../../config/copy');
const { pool } = require('../../database/mysql');
const { blockField, buildEmbed, inlineField } = require('../../utils/embeds');
const { getStaffRoleIds } = require('../../utils/permissions');
const { ensureGuildConfig } = require('../config/configRepository');

async function recordAuditLog({
  guildId = null,
  eventType,
  actorId = null,
  targetId = null,
  entityType = null,
  entityId = null,
  details = {}
}) {
  await pool.execute(
    `
      INSERT INTO discord_bot_audit_logs (
        guild_id,
        event_type,
        actor_id,
        target_id,
        entity_type,
        entity_id,
        details_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [guildId, eventType, actorId, targetId, entityType, entityId, JSON.stringify(details || {})]
  );
}

async function listAuditLogs({
  guildId = null,
  eventType = null,
  limit = 50,
  offset = 0
} = {}) {
  const clauses = [];
  const params = [];

  if (guildId) {
    clauses.push('guild_id = ?');
    params.push(guildId);
  }

  if (eventType) {
    clauses.push('event_type = ?');
    params.push(eventType);
  }

  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200));
  const safeOffset = Math.max(0, Number(offset || 0));
  params.push(safeLimit, safeOffset);

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM discord_bot_audit_logs
      ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    params
  );

  return rows.map((row) => ({
    id: Number(row.id),
    guildId: row.guild_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    targetId: row.target_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: JSON.parse(row.details_text || '{}'),
    createdAt: row.created_at
  }));
}

async function resolveLogChannel(guild, guildId, logType) {
  if (!guild || !guildId) return null;

  const guildConfig = await ensureGuildConfig(guildId);
  const channelId = guildConfig.logChannels?.[logType];
  if (!channelId) return null;

  try {
    const channel = await guild.channels.fetch(channelId);
    return channel?.isTextBased() ? channel : null;
  } catch (error) {
    return null;
  }
}

async function sendLogMessage({ guild, guildId, type, embeds = [], files = [], components = [] }) {
  const channel = await resolveLogChannel(guild, guildId, type);
  if (!channel) return null;

  return channel.send({
    embeds,
    files,
    components
  });
}

async function logAction({
  guild,
  guildId,
  type,
  title,
  description,
  actorId = null,
  targetId = null,
  entityType = null,
  entityId = null,
  details = {},
  fields = [],
  files = []
}) {
  await recordAuditLog({
    guildId,
    eventType: type,
    actorId,
    targetId,
    entityType,
    entityId,
    details
  });

  if (!guild) return null;

  const embed = buildEmbed(guild, {
    title,
    description,
    fields
  });

  return sendLogMessage({
    guild,
    guildId,
    type,
    embeds: [embed],
    files
  });
}

async function logAdministrativeCommand({
  interaction,
  guildConfig,
  commandName,
  details = {}
}) {
  const staffRolesLabel =
    getStaffRoleIds(guildConfig)
      .map((roleId) => `<@&${roleId}>`)
      .join(', ') || COPY.common.notConfigured;

  return logAction({
    guild: interaction.guild,
    guildId: interaction.guild.id,
    type: 'admin_commands',
    title: 'Comando administrativo executado',
    description: `/${commandName} foi utilizado por ${interaction.user}.`,
    actorId: interaction.user.id,
    entityType: 'command',
    entityId: commandName,
    details,
    fields: [
      inlineField('Comando', `/${commandName}`),
      inlineField('Cargos operacionais', staffRolesLabel)
    ]
  });
}

async function logError({ guild, guildId, actorId = null, context, error }) {
  const description = error?.message || String(error);
  const stack = error?.stack ? String(error.stack).slice(0, 1000) : 'Stack indisponivel';

  await recordAuditLog({
    guildId,
    eventType: 'errors',
    actorId,
    entityType: 'error',
    entityId: context,
    details: {
      message: description,
      stack
    }
  });

  if (!guild) return null;

  const embed = buildEmbed(guild, {
    title: 'Erro importante registrado',
    description: `${context}: ${description}`,
    fields: [blockField('Stack resumida', `\`\`\`\n${stack}\n\`\`\``)]
  });

  return sendLogMessage({
    guild,
    guildId,
    type: 'errors',
    embeds: [embed]
  });
}

module.exports = {
  logAction,
  logAdministrativeCommand,
  logError,
  listAuditLogs,
  recordAuditLog,
  sendLogMessage
};
