const { DEFAULT_CONTENT_BLOCKS } = require('../../config/constants');
const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function mapContentRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    contentKey: row.content_key,
    title: row.title,
    bodyText: row.body_text,
    metadata: safeParseJson(row.metadata_text, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getContentBlock(guildId, contentKey) {
  const [rows] = await pool.execute(
    `
      SELECT * FROM discord_bot_content_blocks
      WHERE guild_id = ? AND content_key = ?
      LIMIT 1
    `,
    [guildId, contentKey]
  );

  return mapContentRow(rows[0] || null);
}

async function listContentBlocks(guildId) {
  const [rows] = await pool.execute(
    `
      SELECT * FROM discord_bot_content_blocks
      WHERE guild_id = ?
      ORDER BY content_key ASC
    `,
    [guildId]
  );

  return rows.map(mapContentRow).filter(Boolean);
}

async function upsertContentBlock(guildId, contentKey, input) {
  await pool.execute(
    `
      INSERT INTO discord_bot_content_blocks (
        guild_id,
        content_key,
        title,
        body_text,
        metadata_text
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        body_text = VALUES(body_text),
        metadata_text = VALUES(metadata_text)
    `,
    [
      guildId,
      contentKey,
      input.title,
      input.bodyText,
      safeStringifyJson(input.metadata || {}, {})
    ]
  );

  return getContentBlock(guildId, contentKey);
}

async function ensureDefaultContentBlocks(guildId) {
  for (const [contentKey, defaults] of Object.entries(DEFAULT_CONTENT_BLOCKS)) {
    const existing = await getContentBlock(guildId, contentKey);
    if (existing) {
      continue;
    }

    await upsertContentBlock(guildId, contentKey, {
      title: defaults.title,
      bodyText: defaults.body,
      metadata: {}
    });
  }

  return listContentBlocks(guildId);
}

module.exports = {
  ensureDefaultContentBlocks,
  getContentBlock,
  listContentBlocks,
  upsertContentBlock
};
