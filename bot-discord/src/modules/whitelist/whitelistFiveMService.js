const { pool } = require('../../database/mysql');
const { normalizeStoredDiscord } = require('../../utils/discordLink');
const { linkDiscordToAccount } = require('../players/playerRepository');

async function resolveAccountRecord(executor, requestedId) {
  const [accountRows] = await executor.execute(
    'SELECT id, whitelist, license, discord FROM accounts WHERE id = ? LIMIT 1',
    [requestedId]
  );

  if (accountRows.length > 0) {
    return {
      ...accountRows[0],
      source: 'accounts.id',
      characterId: null,
      characterDiscord: null
    };
  }

  const [characterRows] = await executor.execute(
    'SELECT id, license, discord FROM characters WHERE id = ? LIMIT 1',
    [requestedId]
  );

  if (characterRows.length === 0) {
    return null;
  }

  const character = characterRows[0];
  const [licenseRows] = await executor.execute(
    'SELECT id, whitelist, license, discord FROM accounts WHERE license = ? LIMIT 1',
    [character.license]
  );

  if (licenseRows.length === 0) {
    return null;
  }

  return {
    ...licenseRows[0],
    source: 'characters.id',
    characterId: Number(character.id),
    characterDiscord: character.discord
  };
}

async function syncWithExecutor(application, executor) {
  const requestedId = Number(application.userServerId);
  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    return {
      ok: false,
      message: 'O ID informado pelo usuario e invalido.'
    };
  }

  const account = await resolveAccountRecord(executor, requestedId);
  if (!account) {
    return {
      ok: false,
      message: 'O ID informado nao foi encontrado nas tabelas accounts ou characters.'
    };
  }

  const [banRows] = await executor.execute(
    'SELECT 1 FROM banneds WHERE license = ? AND (time = 0 OR time > UNIX_TIMESTAMP()) LIMIT 1',
    [account.license]
  );

  if (banRows.length > 0) {
    return {
      ok: false,
      message: 'O usuario possui banimento ativo na tabela banneds.'
    };
  }

  const linkResult = await linkDiscordToAccount(
    account.id,
    normalizeStoredDiscord(application.userId),
    { allowReplace: false },
    executor
  );
  if (!linkResult.ok) {
    return {
      ok: false,
      message: linkResult.message
    };
  }

  const alreadyWhitelisted = Number(account.whitelist) === 1;
  if (!alreadyWhitelisted) {
    await executor.execute('UPDATE accounts SET whitelist = 1 WHERE id = ?', [account.id]);
  }

  return {
    ok: true,
    linkedUserId: requestedId,
    accountId: Number(account.id),
    alreadyWhitelisted,
    source: account.source,
    linkedDiscord: linkResult.linkedDiscord,
    discordLinkReplaced: linkResult.replaced
  };
}

async function syncApplicationWithFiveM(application, executor = null) {
  if (executor) {
    return syncWithExecutor(application, executor);
  }

  const connection = await pool.getConnection();

  try {
    return await syncWithExecutor(application, connection);
  } finally {
    connection.release();
  }
}

module.exports = {
  syncApplicationWithFiveM
};
