const {
  DEFAULT_TICKET_SETTINGS,
  DEFAULT_WHITELIST_SETTINGS
} = require('../../config/constants');
const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultGuildConfig(guildId) {
  return {
    guildId,
    supportRoleId: null,
    adminRoleId: null,
    ownerRoleId: null,
    staffRoleId: null,
    whitelistRoleId: null,
    unverifiedRoleId: null,
    ticketCategoryId: null,
    ticketPanelChannelId: null,
    ticketPanelMessageId: null,
    whitelistPanelChannelId: null,
    whitelistPanelMessageId: null,
    whitelistReviewChannelId: null,
    ticketSettings: deepClone(DEFAULT_TICKET_SETTINGS),
    whitelistSettings: deepClone(DEFAULT_WHITELIST_SETTINGS),
    logChannels: {},
    createdAt: null,
    updatedAt: null
  };
}

function normalizeWhitelistSettings(input) {
  const fallback = deepClone(DEFAULT_WHITELIST_SETTINGS);
  const normalized = {
    ...fallback,
    ...(input || {})
  };

  if (!Array.isArray(normalized.questions) || normalized.questions.length === 0) {
    normalized.questions = fallback.questions;
  }

  return normalized;
}

function mapGuildConfigRow(row) {
  if (!row) return null;

  return {
    guildId: row.guild_id,
    supportRoleId: row.support_role_id || row.staff_role_id,
    adminRoleId: row.admin_role_id || row.staff_role_id,
    ownerRoleId: row.owner_role_id || null,
    staffRoleId: row.staff_role_id || row.support_role_id || row.admin_role_id,
    whitelistRoleId: row.whitelist_role_id,
    unverifiedRoleId: row.unverified_role_id,
    ticketCategoryId: row.ticket_category_id,
    ticketPanelChannelId: row.ticket_panel_channel_id,
    ticketPanelMessageId: row.ticket_panel_message_id,
    whitelistPanelChannelId: row.whitelist_panel_channel_id,
    whitelistPanelMessageId: row.whitelist_panel_message_id,
    whitelistReviewChannelId: row.whitelist_review_channel_id,
    ticketSettings: {
      ...deepClone(DEFAULT_TICKET_SETTINGS),
      ...safeParseJson(row.ticket_settings_text, DEFAULT_TICKET_SETTINGS)
    },
    whitelistSettings: normalizeWhitelistSettings(
      safeParseJson(row.whitelist_settings_text, DEFAULT_WHITELIST_SETTINGS)
    ),
    logChannels: safeParseJson(row.log_channels_text, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function persistGuildConfig(config) {
  await pool.execute(
    `
      INSERT INTO discord_bot_guild_configs (
        guild_id,
        support_role_id,
        admin_role_id,
        owner_role_id,
        staff_role_id,
        whitelist_role_id,
        unverified_role_id,
        ticket_category_id,
        ticket_panel_channel_id,
        ticket_panel_message_id,
        whitelist_panel_channel_id,
        whitelist_panel_message_id,
        whitelist_review_channel_id,
        ticket_settings_text,
        whitelist_settings_text,
        log_channels_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        support_role_id = VALUES(support_role_id),
        admin_role_id = VALUES(admin_role_id),
        owner_role_id = VALUES(owner_role_id),
        staff_role_id = VALUES(staff_role_id),
        whitelist_role_id = VALUES(whitelist_role_id),
        unverified_role_id = VALUES(unverified_role_id),
        ticket_category_id = VALUES(ticket_category_id),
        ticket_panel_channel_id = VALUES(ticket_panel_channel_id),
        ticket_panel_message_id = VALUES(ticket_panel_message_id),
        whitelist_panel_channel_id = VALUES(whitelist_panel_channel_id),
        whitelist_panel_message_id = VALUES(whitelist_panel_message_id),
        whitelist_review_channel_id = VALUES(whitelist_review_channel_id),
        ticket_settings_text = VALUES(ticket_settings_text),
        whitelist_settings_text = VALUES(whitelist_settings_text),
        log_channels_text = VALUES(log_channels_text)
    `,
    [
      config.guildId,
      config.supportRoleId || config.staffRoleId || config.adminRoleId || null,
      config.adminRoleId || config.staffRoleId || null,
      config.ownerRoleId || null,
      config.staffRoleId || config.supportRoleId || config.adminRoleId || null,
      config.whitelistRoleId,
      config.unverifiedRoleId,
      config.ticketCategoryId,
      config.ticketPanelChannelId,
      config.ticketPanelMessageId,
      config.whitelistPanelChannelId,
      config.whitelistPanelMessageId,
      config.whitelistReviewChannelId,
      safeStringifyJson(config.ticketSettings, DEFAULT_TICKET_SETTINGS),
      safeStringifyJson(config.whitelistSettings, DEFAULT_WHITELIST_SETTINGS),
      safeStringifyJson(config.logChannels, {})
    ]
  );

  return getGuildConfig(config.guildId);
}

async function getGuildConfig(guildId) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_guild_configs WHERE guild_id = ? LIMIT 1',
    [guildId]
  );

  return mapGuildConfigRow(rows[0] || null);
}

async function listGuildConfigs() {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_guild_configs ORDER BY guild_id ASC'
  );

  return rows.map(mapGuildConfigRow).filter(Boolean);
}

async function ensureGuildConfig(guildId) {
  const existing = await getGuildConfig(guildId);
  if (existing) return existing;

  const defaults = createDefaultGuildConfig(guildId);
  return persistGuildConfig(defaults);
}

async function updateGuildConfig(guildId, updates) {
  const current = await ensureGuildConfig(guildId);
  const next = {
    ...current,
    ...updates,
    ticketSettings: {
      ...current.ticketSettings,
      ...(updates.ticketSettings || {})
    },
    whitelistSettings: normalizeWhitelistSettings({
      ...current.whitelistSettings,
      ...(updates.whitelistSettings || {})
    }),
    logChannels: {
      ...current.logChannels,
      ...(updates.logChannels || {})
    }
  };

  return persistGuildConfig(next);
}

async function setLogChannel(guildId, logType, channelId) {
  const current = await ensureGuildConfig(guildId);
  return updateGuildConfig(guildId, {
    logChannels: {
      ...current.logChannels,
      [logType]: channelId
    }
  });
}

function mapPanelRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    guildId: row.guild_id,
    panelType: row.panel_type,
    channelId: row.channel_id,
    messageId: row.message_id,
    metadata: safeParseJson(row.metadata_text, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getPanel(guildId, panelType) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_panels WHERE guild_id = ? AND panel_type = ? LIMIT 1',
    [guildId, panelType]
  );

  return mapPanelRow(rows[0] || null);
}

async function listPanelsByType(panelType) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_panels WHERE panel_type = ? ORDER BY guild_id ASC',
    [panelType]
  );

  return rows.map(mapPanelRow).filter(Boolean);
}

async function listPanelsForGuild(guildId) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_panels WHERE guild_id = ? ORDER BY panel_type ASC',
    [guildId]
  );

  return rows.map(mapPanelRow).filter(Boolean);
}

async function countPanelsForGuild(guildId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM discord_bot_panels WHERE guild_id = ?',
    [guildId]
  );

  return Number(rows[0]?.total || 0);
}

async function upsertPanel(guildId, panelType, data) {
  await pool.execute(
    `
      INSERT INTO discord_bot_panels (
        guild_id,
        panel_type,
        channel_id,
        message_id,
        metadata_text
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        channel_id = VALUES(channel_id),
        message_id = VALUES(message_id),
        metadata_text = VALUES(metadata_text)
    `,
    [
      guildId,
      panelType,
      data.channelId,
      data.messageId || null,
      safeStringifyJson(data.metadata || {}, {})
    ]
  );

  return getPanel(guildId, panelType);
}

module.exports = {
  createDefaultGuildConfig,
  ensureGuildConfig,
  countPanelsForGuild,
  getGuildConfig,
  getPanel,
  listGuildConfigs,
  listPanelsByType,
  listPanelsForGuild,
  normalizeWhitelistSettings,
  setLogChannel,
  updateGuildConfig,
  upsertPanel
};
