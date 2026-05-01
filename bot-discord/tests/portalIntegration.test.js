const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPortalSessionResponse
} = require('../apps/api/src/lib/portalPayloads');
const {
  linkDiscordToAccount
} = require('../src/modules/players/playerRepository');
const {
  syncApplicationWithFiveM
} = require('../src/modules/whitelist/whitelistFiveMService');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildPlayerDetailRow(account, characters, banneds) {
  if (!account) {
    return null;
  }

  const activeCharacters = characters
    .filter((entry) => entry.license === account.license && Number(entry.deleted || 0) === 0)
    .sort((left, right) => Number(left.id) - Number(right.id));

  const characterNames = activeCharacters
    .map((entry) => [entry.name, entry.name2].filter(Boolean).join(' ').trim())
    .filter(Boolean);
  const characterDiscords = activeCharacters
    .map((entry) => String(entry.discord || '').trim())
    .filter(Boolean);
  const primaryCharacter = activeCharacters[0] || null;
  const isBanned = banneds.some((entry) => entry.license === account.license);

  return {
    account_id: account.id,
    whitelist: account.whitelist || 0,
    gems: account.gems || 0,
    premium: account.premium || 0,
    account_discord: account.discord || null,
    license: account.license,
    primary_character_id: primaryCharacter ? primaryCharacter.id : null,
    primary_character_name: primaryCharacter
      ? [primaryCharacter.name, primaryCharacter.name2].filter(Boolean).join(' ').trim()
      : null,
    character_names: characterNames.length > 0 ? characterNames.join(' | ') : null,
    character_discords: characterDiscords.length > 0 ? characterDiscords.join(' | ') : null,
    bank: primaryCharacter?.bank ?? null,
    fines: primaryCharacter?.fines ?? null,
    prison: primaryCharacter?.prison ?? null,
    is_banned: isBanned ? 1 : 0
  };
}

function createExecutor(seed) {
  const state = {
    accounts: clone(seed.accounts || []),
    characters: clone(seed.characters || []),
    banneds: clone(seed.banneds || [])
  };

  return {
    state,
    async execute(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('SELECT id, whitelist, license, discord FROM accounts WHERE id = ?')) {
        const accountId = Number(params[0]);
        const account = state.accounts.find((entry) => Number(entry.id) === accountId);
        return [account ? [clone(account)] : []];
      }

      if (normalized.startsWith('SELECT id, license, discord FROM characters WHERE id = ?')) {
        const characterId = Number(params[0]);
        const character = state.characters.find((entry) => Number(entry.id) === characterId);
        return [character ? [clone(character)] : []];
      }

      if (normalized.startsWith('SELECT 1 FROM banneds WHERE license = ?')) {
        const license = String(params[0]);
        const row = state.banneds.find((entry) => entry.license === license);
        return [row ? [{ 1: 1 }] : []];
      }

      if (
        normalized.includes(
          'SELECT a.id AS account_id, a.license, a.discord AS account_discord, c.id AS character_id, c.discord AS character_discord'
        )
      ) {
        const accountId = Number(params[0]);
        const account = state.accounts.find((entry) => Number(entry.id) === accountId);
        if (!account) {
          return [[]];
        }

        const characters = state.characters
          .filter((entry) => entry.license === account.license)
          .sort((left, right) => Number(left.id) - Number(right.id));
        const rows =
          characters.length > 0
            ? characters.map((entry) => ({
                account_id: account.id,
                license: account.license,
                account_discord: account.discord || null,
                character_id: entry.id,
                character_discord: entry.discord || null
              }))
            : [
                {
                  account_id: account.id,
                  license: account.license,
                  account_discord: account.discord || null,
                  character_id: null,
                  character_discord: null
                }
              ];

        return [rows];
      }

      if (normalized.startsWith('SELECT id FROM accounts WHERE discord IN')) {
        const identifiers = new Set(params.map((value) => String(value)));
        const account = [...state.accounts]
          .sort((left, right) => Number(right.id) - Number(left.id))
          .find((entry) => identifiers.has(String(entry.discord || '')));
        return [account ? [{ id: account.id }] : []];
      }

      if (
        normalized.startsWith(
          'SELECT a.id FROM characters c INNER JOIN accounts a ON a.license = c.license WHERE c.discord IN'
        )
      ) {
        const identifiers = new Set(params.map((value) => String(value)));
        const character = [...state.characters]
          .sort((left, right) => Number(right.id) - Number(left.id))
          .find((entry) => identifiers.has(String(entry.discord || '')));

        if (!character) {
          return [[]];
        }

        const account = state.accounts.find((entry) => entry.license === character.license);
        return [account ? [{ id: account.id }] : []];
      }

      if (
        normalized.includes('SELECT a.id AS account_id, a.whitelist, a.gems, a.premium, a.discord AS account_discord')
      ) {
        const accountId = Number(params[0]);
        const account = state.accounts.find((entry) => Number(entry.id) === accountId);
        const row = buildPlayerDetailRow(account, state.characters, state.banneds);
        return [row ? [row] : []];
      }

      if (normalized === 'UPDATE accounts SET discord = ? WHERE id = ?') {
        const discord = params[0];
        const accountId = Number(params[1]);
        const account = state.accounts.find((entry) => Number(entry.id) === accountId);
        if (account) {
          account.discord = discord;
        }
        return [{ affectedRows: account ? 1 : 0 }];
      }

      if (normalized === 'UPDATE characters SET discord = ? WHERE license = ?') {
        const discord = params[0];
        const license = String(params[1]);
        let affectedRows = 0;
        for (const character of state.characters) {
          if (character.license === license) {
            character.discord = discord;
            affectedRows += 1;
          }
        }
        return [{ affectedRows }];
      }

      if (normalized === 'UPDATE accounts SET whitelist = 1 WHERE id = ?') {
        const accountId = Number(params[0]);
        const account = state.accounts.find((entry) => Number(entry.id) === accountId);
        if (account) {
          account.whitelist = 1;
        }
        return [{ affectedRows: account ? 1 : 0 }];
      }

      throw new Error(`Query nao tratada no teste: ${normalized}`);
    }
  };
}

test('manual discord relink updates account and characters when force is enabled', async () => {
  const executor = createExecutor({
    accounts: [
      {
        id: 42,
        license: 'license:42',
        whitelist: 0,
        gems: 150,
        premium: 0,
        discord: 'discord:111111'
      }
    ],
    characters: [
      {
        id: 4201,
        license: 'license:42',
        name: 'Johnny',
        name2: 'Toledo',
        deleted: 0,
        discord: '<@111111>',
        bank: 0,
        fines: 0,
        prison: 0
      }
    ]
  });

  const result = await linkDiscordToAccount(42, '222222', { allowReplace: true }, executor);

  assert.equal(result.ok, true);
  assert.equal(result.replaced, true);
  assert.equal(result.linkedDiscord, 'discord:222222');
  assert.equal(result.item.discordLink.linkedUserId, '222222');
  assert.equal(executor.state.accounts[0].discord, 'discord:222222');
  assert.equal(executor.state.characters[0].discord, 'discord:222222');
});

test('whitelist sync auto-links discord before approving account access', async () => {
  const executor = createExecutor({
    accounts: [
      {
        id: 10,
        license: 'license:10',
        whitelist: 0,
        gems: 75,
        premium: 0,
        discord: ''
      }
    ],
    characters: [
      {
        id: 1001,
        license: 'license:10',
        name: 'Alex',
        name2: 'Silva',
        deleted: 0,
        discord: '',
        bank: 200,
        fines: 10,
        prison: 0
      }
    ]
  });

  const result = await syncApplicationWithFiveM(
    {
      userId: '987654321',
      userServerId: '10'
    },
    executor
  );

  assert.equal(result.ok, true);
  assert.equal(result.accountId, 10);
  assert.equal(result.linkedDiscord, 'discord:987654321');
  assert.equal(executor.state.accounts[0].whitelist, 1);
  assert.equal(executor.state.accounts[0].discord, 'discord:987654321');
  assert.equal(executor.state.characters[0].discord, 'discord:987654321');
});

test('whitelist sync blocks approval when discord is already linked to another account', async () => {
  const executor = createExecutor({
    accounts: [
      {
        id: 10,
        license: 'license:10',
        whitelist: 0,
        gems: 0,
        premium: 0,
        discord: ''
      },
      {
        id: 77,
        license: 'license:77',
        whitelist: 1,
        gems: 900,
        premium: 1,
        discord: 'discord:333333'
      }
    ],
    characters: [
      {
        id: 1001,
        license: 'license:10',
        name: 'Novo',
        name2: 'Player',
        deleted: 0,
        discord: '',
        bank: 0,
        fines: 0,
        prison: 0
      },
      {
        id: 7701,
        license: 'license:77',
        name: 'Conta',
        name2: 'Ocupada',
        deleted: 0,
        discord: 'discord:333333',
        bank: 0,
        fines: 0,
        prison: 0
      }
    ]
  });

  const result = await syncApplicationWithFiveM(
    {
      userId: '333333',
      userServerId: '10'
    },
    executor
  );

  assert.equal(result.ok, false);
  assert.match(result.message, /passaporte 77/i);
  assert.equal(executor.state.accounts[0].whitelist, 0);
  assert.equal(executor.state.accounts[0].discord, '');
});

test('portal session payload exposes discord link status and shared content blocks', async () => {
  const response = buildPortalSessionResponse(
    {
      session: {
        userId: '123456',
        username: 'johnny',
        globalName: 'Johnny',
        avatar: 'avatarhash'
      },
      guild: {
        id: 'guild-1',
        name: 'Base RP',
        iconURL() {
          return 'https://cdn.example/guild.png';
        }
      },
      guildConfig: {
        whitelistPanelChannelId: 'chan-whitelist',
        ticketPanelChannelId: 'chan-ticket'
      },
      access: {
        isAdmin: true,
        isStaff: true
      }
    },
    {
      settings: {
        serverName: 'Base RP',
        discordUrl: 'https://discord.gg/base',
        connectUrl: 'cfx.re/join/teste'
      },
      contentBlocks: [
        { contentKey: 'rules', title: 'Regras' },
        { contentKey: 'changelog', title: 'Changelog' }
      ],
      player: {
        accountId: 10,
        discordLink: {
          hasAny: true
        }
      },
      latestWhitelist: null,
      tickets: [{ id: 1 }],
      fivemStatus: {
        online: true
      },
      servers: [{ id: 1 }],
      packages: [{ id: 9 }]
    }
  );

  assert.equal(response.session.avatarUrl.includes('/avatars/123456/avatarhash'), true);
  assert.equal(response.links.discordLinked, true);
  assert.equal(response.links.whitelistPanelUrl, 'https://discord.com/channels/guild-1/chan-whitelist');
  assert.equal(response.contentBlocks.rules.title, 'Regras');
  assert.equal(response.capabilities.adminArea, true);
});
