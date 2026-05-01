const { pool } = require('../../database/mysql');
const {
  buildDiscordIdentifier,
  extractDiscordUserId,
  getDiscordIdentifiers,
  hasDiscordIdentifier,
  matchesDiscordIdentifier,
  normalizeStoredDiscord
} = require('../../utils/discordLink');

function getExecutor(executor) {
  return executor || pool;
}

function buildDiscordLink(row) {
  const account = normalizeStoredDiscord(row.account_discord) || null;
  const characters = row.character_discords
    ? String(row.character_discords)
        .split(' | ')
        .map((value) => normalizeStoredDiscord(value))
        .filter(Boolean)
    : [];
  const primary = account || characters[0] || null;

  return {
    account,
    characters,
    hasAny: Boolean(account || characters.length > 0),
    primary,
    linkedUserId: extractDiscordUserId(primary)
  };
}

function mapPlayerRow(row) {
  if (!row) {
    return null;
  }

  const discordLink = buildDiscordLink(row);

  return {
    accountId: Number(row.account_id),
    passaporte: Number(row.account_id),
    whitelist: Number(row.whitelist || 0) === 1,
    gems: Number(row.gems || 0),
    premium: Number(row.premium || 0),
    discord: discordLink.primary,
    discordLink,
    license: row.license,
    primaryCharacterId: row.primary_character_id ? Number(row.primary_character_id) : null,
    primaryCharacterName: row.primary_character_name || null,
    characterNames: row.character_names ? String(row.character_names).split(' | ').filter(Boolean) : [],
    bank: row.bank === null || row.bank === undefined ? null : Number(row.bank),
    fines: row.fines === null || row.fines === undefined ? null : Number(row.fines),
    prison: row.prison === null || row.prison === undefined ? null : Number(row.prison),
    isBanned: Boolean(Number(row.is_banned || 0)),
    lastLoginAt: null
  };
}

async function getPlayerByAccountId(accountId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT
        a.id AS account_id,
        a.whitelist,
        a.gems,
        a.premium,
        a.discord AS account_discord,
        a.license,
        MIN(CASE WHEN c.deleted = 0 THEN c.id END) AS primary_character_id,
        MIN(CASE WHEN c.deleted = 0 THEN CONCAT_WS(' ', NULLIF(c.name, ''), NULLIF(c.name2, '')) END) AS primary_character_name,
        GROUP_CONCAT(
          DISTINCT CASE
            WHEN c.deleted = 0 THEN CONCAT_WS(' ', NULLIF(c.name, ''), NULLIF(c.name2, ''))
            ELSE NULL
          END
          ORDER BY c.id ASC SEPARATOR ' | '
        ) AS character_names,
        GROUP_CONCAT(
          DISTINCT CASE
            WHEN c.deleted = 0 AND c.discord IS NOT NULL AND c.discord <> '' THEN c.discord
            ELSE NULL
          END
          ORDER BY c.id ASC SEPARATOR ' | '
        ) AS character_discords,
        MAX(CASE WHEN c.deleted = 0 THEN c.bank END) AS bank,
        MAX(CASE WHEN c.deleted = 0 THEN c.fines END) AS fines,
        MAX(CASE WHEN c.deleted = 0 THEN c.prison END) AS prison,
        EXISTS(
          SELECT 1
          FROM banneds b
          WHERE b.license = a.license
            AND (b.time = 0 OR b.time > UNIX_TIMESTAMP())
          LIMIT 1
        ) AS is_banned
      FROM accounts a
      LEFT JOIN characters c ON c.license = a.license
      WHERE a.id = ?
      GROUP BY a.id, a.whitelist, a.gems, a.premium, a.discord, a.license
      LIMIT 1
    `,
    [accountId]
  );

  return mapPlayerRow(rows[0] || null);
}

async function findPlayerByDiscordId(userId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const identifiers = getDiscordIdentifiers(userId);
  if (identifiers.length === 0) {
    return null;
  }

  const placeholders = identifiers.map(() => '?').join(', ');
  const [accountRows] = await queryExecutor.execute(
    `
      SELECT id
      FROM accounts
      WHERE discord IN (${placeholders})
      ORDER BY id DESC
      LIMIT 1
    `,
    identifiers
  );

  if (accountRows.length > 0) {
    return getPlayerByAccountId(accountRows[0].id, queryExecutor);
  }

  const [characterRows] = await queryExecutor.execute(
    `
      SELECT a.id
      FROM characters c
      INNER JOIN accounts a ON a.license = c.license
      WHERE c.discord IN (${placeholders})
      ORDER BY a.id DESC
      LIMIT 1
    `,
    identifiers
  );

  if (characterRows.length === 0) {
    return null;
  }

  return getPlayerByAccountId(characterRows[0].id, queryExecutor);
}

async function listPlayers(options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const clauses = ['1 = 1'];
  const params = [];
  const search = String(options.search || '').trim();

  if (search) {
    const like = `%${search}%`;
    clauses.push(
      `(
        CAST(a.id AS CHAR) LIKE ?
        OR a.discord LIKE ?
        OR a.license LIKE ?
        OR CONCAT_WS(' ', c.name, c.name2) LIKE ?
      )`
    );
    params.push(like, like, like, like);
  }

  if (typeof options.onlyWhitelisted === 'boolean') {
    clauses.push('a.whitelist = ?');
    params.push(options.onlyWhitelisted ? 1 : 0);
  }

  if (typeof options.onlyBanned === 'boolean') {
    clauses.push(
      `EXISTS(
        SELECT 1
        FROM banneds b
        WHERE b.license = a.license
          AND (b.time = 0 OR b.time > UNIX_TIMESTAMP())
        LIMIT 1
      ) = ?`
    );
    params.push(options.onlyBanned ? 1 : 0);
  }

  const limit = Math.max(1, Math.min(Number(options.limit || 50), 200));
  const offset = Math.max(0, Number(options.offset || 0));
  params.push(limit, offset);

  const [rows] = await queryExecutor.execute(
    `
      SELECT
        a.id AS account_id,
        a.whitelist,
        a.gems,
        a.premium,
        a.discord AS account_discord,
        a.license,
        MIN(CASE WHEN c.deleted = 0 THEN c.id END) AS primary_character_id,
        MIN(CASE WHEN c.deleted = 0 THEN CONCAT_WS(' ', NULLIF(c.name, ''), NULLIF(c.name2, '')) END) AS primary_character_name,
        GROUP_CONCAT(
          DISTINCT CASE
            WHEN c.deleted = 0 THEN CONCAT_WS(' ', NULLIF(c.name, ''), NULLIF(c.name2, ''))
            ELSE NULL
          END
          ORDER BY c.id ASC SEPARATOR ' | '
        ) AS character_names,
        GROUP_CONCAT(
          DISTINCT CASE
            WHEN c.deleted = 0 AND c.discord IS NOT NULL AND c.discord <> '' THEN c.discord
            ELSE NULL
          END
          ORDER BY c.id ASC SEPARATOR ' | '
        ) AS character_discords,
        MAX(CASE WHEN c.deleted = 0 THEN c.bank END) AS bank,
        MAX(CASE WHEN c.deleted = 0 THEN c.fines END) AS fines,
        MAX(CASE WHEN c.deleted = 0 THEN c.prison END) AS prison,
        EXISTS(
          SELECT 1
          FROM banneds b
          WHERE b.license = a.license
            AND (b.time = 0 OR b.time > UNIX_TIMESTAMP())
          LIMIT 1
        ) AS is_banned
      FROM accounts a
      LEFT JOIN characters c ON c.license = a.license
      WHERE ${clauses.join(' AND ')}
      GROUP BY a.id, a.whitelist, a.gems, a.premium, a.discord, a.license
      ORDER BY a.id DESC
      LIMIT ? OFFSET ?
    `,
    params
  );

  return rows.map(mapPlayerRow).filter(Boolean);
}

async function getPlayerDiscordLinkSnapshot(accountId, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT
        a.id AS account_id,
        a.license,
        a.discord AS account_discord,
        c.id AS character_id,
        c.discord AS character_discord
      FROM accounts a
      LEFT JOIN characters c ON c.license = a.license
      WHERE a.id = ?
      ORDER BY c.id ASC
    `,
    [accountId]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    accountId: Number(rows[0].account_id),
    license: rows[0].license,
    accountDiscord: normalizeStoredDiscord(rows[0].account_discord) || null,
    characters: rows
      .filter((row) => row.character_id !== null && row.character_id !== undefined)
      .map((row) => ({
        id: Number(row.character_id),
        discord: normalizeStoredDiscord(row.character_discord) || null
      }))
  };
}

async function linkDiscordToAccount(accountId, userId, options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const normalizedUserId = normalizeStoredDiscord(userId);
  const allowReplace = Boolean(options.allowReplace);

  if (!/^\d+$/.test(normalizedUserId)) {
    return {
      ok: false,
      code: 'discord_link_invalid',
      message: 'Informe um Discord ID valido.'
    };
  }

  const snapshot = await getPlayerDiscordLinkSnapshot(accountId, queryExecutor);
  if (!snapshot) {
    return {
      ok: false,
      code: 'discord_link_missing_account',
      message: 'Conta nao encontrada para vincular o Discord.'
    };
  }

  const existingLinkedPlayer = await findPlayerByDiscordId(normalizedUserId, queryExecutor);
  if (existingLinkedPlayer && existingLinkedPlayer.accountId !== Number(accountId)) {
    return {
      ok: false,
      code: 'discord_link_taken',
      message: `Este Discord ja esta vinculado ao passaporte ${existingLinkedPlayer.accountId}.`,
      existingAccountId: existingLinkedPlayer.accountId
    };
  }

  const conflictingValues = [snapshot.accountDiscord, ...snapshot.characters.map((entry) => entry.discord)]
    .filter(hasDiscordIdentifier)
    .filter((value) => !matchesDiscordIdentifier(value, normalizedUserId));

  if (conflictingValues.length > 0 && !allowReplace) {
    return {
      ok: false,
      code: 'discord_link_conflict',
      message: 'A conta ja esta vinculada a outro Discord.',
      conflictingValue: conflictingValues[0]
    };
  }

  const canonicalDiscord = buildDiscordIdentifier(normalizedUserId);
  await queryExecutor.execute('UPDATE accounts SET discord = ? WHERE id = ?', [
    canonicalDiscord,
    accountId
  ]);
  await queryExecutor.execute('UPDATE characters SET discord = ? WHERE license = ?', [
    canonicalDiscord,
    snapshot.license
  ]);

  return {
    ok: true,
    code: conflictingValues.length > 0 ? 'discord_link_replaced' : 'discord_link_created',
    linkedDiscord: canonicalDiscord,
    replaced: conflictingValues.length > 0,
    item: await getPlayerByAccountId(accountId, queryExecutor)
  };
}

async function countPlayers(executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute('SELECT COUNT(*) AS total FROM accounts');
  return Number(rows[0]?.total || 0);
}

async function countWhitelistedPlayers(executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    'SELECT COUNT(*) AS total FROM accounts WHERE whitelist = 1'
  );
  return Number(rows[0]?.total || 0);
}

async function getPlayerDiamondTotals(executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute('SELECT COALESCE(SUM(gems), 0) AS total FROM accounts');
  return Number(rows[0]?.total || 0);
}

async function updatePlayerGems(accountId, gems, executor = pool) {
  const queryExecutor = getExecutor(executor);
  await queryExecutor.execute('UPDATE accounts SET gems = ? WHERE id = ?', [gems, accountId]);
  return getPlayerByAccountId(accountId, queryExecutor);
}

async function updatePlayerWhitelist(accountId, whitelist, executor = pool) {
  const queryExecutor = getExecutor(executor);
  await queryExecutor.execute('UPDATE accounts SET whitelist = ? WHERE id = ?', [
    whitelist ? 1 : 0,
    accountId
  ]);
  return getPlayerByAccountId(accountId, queryExecutor);
}

module.exports = {
  countPlayers,
  countWhitelistedPlayers,
  findPlayerByDiscordId,
  getDiscordIdentifiers,
  getPlayerDiscordLinkSnapshot,
  getPlayerByAccountId,
  getPlayerDiamondTotals,
  linkDiscordToAccount,
  listPlayers,
  updatePlayerGems,
  updatePlayerWhitelist
};
