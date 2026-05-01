const { pool } = require('../../database/mysql');
const { safeParseJson } = require('../../utils/json');

const TABLE_METADATA = {
  accounts: {
    category: 'players',
    siteArea: 'Dashboard player/admin',
    description: 'Contas base do FiveM com whitelist, gems, premium e identificadores.',
  },
  banneds: {
    category: 'moderation',
    siteArea: 'Punicoes',
    description: 'Bans persistidos do servidor.',
  },
  characters: {
    category: 'characters',
    siteArea: 'Dashboard player/admin',
    description: 'Personagens com nome, banco, multas, prisao e dados de identidade.',
  },
  chests: {
    category: 'storage',
    siteArea: 'Logistica/faccoes',
    description: 'Baus com peso, permissao e controle de logs.',
  },
  discord_bot_audit_logs: {
    category: 'operations',
    siteArea: 'Auditoria',
    description: 'Logs administrativos e operacionais do bot/dashboard.',
  },
  discord_bot_content_blocks: {
    category: 'portal',
    siteArea: 'Landing/regras',
    description: 'Blocos editaveis de conteudo reaproveitados no portal.',
  },
  discord_bot_guild_configs: {
    category: 'config',
    siteArea: 'Configuracoes',
    description: 'Configuracao principal da guild para tickets, whitelist e cargos.',
  },
  discord_bot_panels: {
    category: 'operations',
    siteArea: 'Painel bot',
    description: 'Mensagens/paineis persistidos do bot.',
  },
  discord_bot_portal_news: {
    category: 'portal',
    siteArea: 'Noticias',
    description: 'Noticias oficiais exibidas no portal.',
  },
  discord_bot_portal_packages: {
    category: 'portal',
    siteArea: 'Loja',
    description: 'Pacotes de diamantes exibidos no portal.',
  },
  discord_bot_portal_servers: {
    category: 'portal',
    siteArea: 'Landing/cidades',
    description: 'Cards de cidades/servidores usados na landing e dashboard.',
  },
  discord_bot_portal_settings: {
    category: 'portal',
    siteArea: 'Identidade visual',
    description: 'Identidade visual e institucional do portal.',
  },
  discord_bot_schema_migrations: {
    category: 'operations',
    siteArea: 'Infra',
    description: 'Controle de migracoes do bot.',
  },
  discord_bot_system_jobs: {
    category: 'operations',
    siteArea: 'Scheduler',
    description: 'Historico dos jobs internos do bot.',
  },
  discord_bot_tickets: {
    category: 'support',
    siteArea: 'Suporte',
    description: 'Tickets abertos pelo bot e pelo portal.',
  },
  discord_bot_whitelist_applications: {
    category: 'whitelist',
    siteArea: 'Whitelist',
    description: 'Aplicacoes de whitelist e seus estados.',
  },
  discord_bot_whitelist_attempts: {
    category: 'whitelist',
    siteArea: 'Whitelist',
    description: 'Tentativas e cooldowns de whitelist.',
  },
  entitydata: {
    category: 'permissions',
    siteArea: 'Permissoes especiais',
    description: 'Chaves globais com permissoes persistidas no servidor.',
  },
  organizations: {
    category: 'factions',
    siteArea: 'Faccoes/empresas',
    description: 'Organizacoes do servidor com banco, premium e buff.',
  },
  playerdata: {
    category: 'profiles',
    siteArea: 'Perfil/inventario',
    description: 'Persistencia de barber, roupas e datatable do personagem.',
  },
  propertys: {
    category: 'properties',
    siteArea: 'Imoveis',
    description: 'Propriedades persistidas do servidor.',
  },
  races: {
    category: 'events',
    siteArea: 'Rankings/eventos',
    description: 'Ranking de corridas e pontuacoes persistidas.',
  },
  smartphone_paypal_transactions: {
    category: 'finance',
    siteArea: 'Financeiro/compras',
    description: 'Historico de pagamentos e transacoes de carteira.',
  },
  vehicles: {
    category: 'garage',
    siteArea: 'Garagem/frota',
    description: 'Veiculos persistidos dos jogadores.',
  },
  warehouse: {
    category: 'warehouse',
    siteArea: 'Depositos/estoque',
    description: 'Estoques persistidos para empresas ou armazens.',
  },
};

function getExecutor(executor) {
  return executor || pool;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLimit(value, fallback = 20, max = 100) {
  return Math.max(1, Math.min(toNumber(value, fallback), max));
}

function getTableScope(tableName) {
  if (String(tableName).startsWith('discord_bot_')) {
    return 'bot';
  }

  if (tableName === 'entitydata') {
    return 'integration';
  }

  return 'fivem';
}

function getTableMetadata(tableName) {
  return (
    TABLE_METADATA[tableName] || {
      category: 'general',
      siteArea: 'Mapeamento tecnico',
      description: 'Tabela mapeada automaticamente a partir do banco compartilhado.',
    }
  );
}

function buildFeatureStatus(ready, partial) {
  if (ready) {
    return 'ready';
  }

  if (partial) {
    return 'partial';
  }

  return 'empty';
}

function buildDeliveryStatus(status, deliveryStatus) {
  if (status === 'empty') {
    return 'waiting_data';
  }

  return deliveryStatus;
}

function buildRecommendedFeatures(tableCountMap) {
  const count = (tableName) => toNumber(tableCountMap[tableName], 0);

  const features = [
    {
      key: 'portal-ops',
      label: 'Portal, whitelist e suporte',
      description:
        'Fluxo institucional do portal com noticias, cidades, tickets, whitelist e auditoria operacional.',
      sourceTables: [
        'discord_bot_portal_settings',
        'discord_bot_portal_news',
        'discord_bot_portal_servers',
        'discord_bot_portal_packages',
        'discord_bot_tickets',
        'discord_bot_whitelist_applications',
        'discord_bot_audit_logs',
      ],
      status: buildFeatureStatus(
        count('discord_bot_portal_settings') > 0 &&
          count('discord_bot_tickets') > 0 &&
          count('discord_bot_whitelist_applications') > 0,
        count('discord_bot_portal_settings') > 0 ||
          count('discord_bot_tickets') > 0 ||
          count('discord_bot_whitelist_applications') > 0
      ),
      deliveryStatus: 'live',
      nextStep: 'Continuar expandindo automacoes reais sem trocar a base atual do bot.',
    },
    {
      key: 'player-core',
      label: 'Base de players e conta FiveM',
      description:
        'Contas, personagens, whitelist, gems e vinculo Discord para painel do player e administracao.',
      sourceTables: ['accounts', 'characters'],
      status: buildFeatureStatus(
        count('accounts') > 0 && count('characters') > 0,
        count('accounts') > 0 || count('characters') > 0
      ),
      deliveryStatus: 'live',
      nextStep: 'Expandir do snapshot administrativo para historico e perfil mais profundo do player.',
    },
    {
      key: 'player-profiles',
      label: 'Perfil profundo do personagem',
      description:
        'Leitura de roupas, barber, datatable, inventario resumido e sinais de sobrevivencia persistidos.',
      sourceTables: ['playerdata'],
      status: buildFeatureStatus(count('playerdata') > 0, false),
      deliveryStatus: 'new_in_admin',
      nextStep: 'Levar parte desse snapshot para a area do usuario quando o fluxo estiver estabilizado.',
    },
    {
      key: 'factions-storage',
      label: 'Faccoes, empresas e baus',
      description:
        'Organizacoes do servidor, capacidade dos baus e permissoes operacionais para gestao staff.',
      sourceTables: ['organizations', 'chests'],
      status: buildFeatureStatus(
        count('organizations') > 0 && count('chests') > 0,
        count('organizations') > 0 || count('chests') > 0
      ),
      deliveryStatus: 'new_in_admin',
      nextStep: 'Abrir depois a etapa de controle manual, economia e logs de faccao.',
    },
    {
      key: 'permissions-special',
      label: 'Permissoes especiais',
      description:
        'Flags persistidas em entitydata, uteis para premium, admin ou regras especiais de acesso.',
      sourceTables: ['entitydata'],
      status: buildFeatureStatus(count('entitydata') > 0, false),
      deliveryStatus: 'new_in_admin',
      nextStep: 'Pode virar uma tela de controle de permissoes quando houver mais perfis alem do admin atual.',
    },
    {
      key: 'racing-events',
      label: 'Rank de corridas e eventos',
      description:
        'Pontuacoes e historico basico de corridas para leaderboard e eventos do servidor.',
      sourceTables: ['races'],
      status: buildFeatureStatus(count('races') > 0, false),
      deliveryStatus: 'new_in_admin',
      nextStep: 'Dado pronto para virar leaderboard publico ou admin quando quiser priorizar eventos.',
    },
    {
      key: 'payments-history',
      label: 'Historico de compras',
      description:
        'Financeiro mais profundo com pagamentos persistidos e conciliacao automatica da loja.',
      sourceTables: ['smartphone_paypal_transactions'],
      status: buildFeatureStatus(count('smartphone_paypal_transactions') > 0, false),
      deliveryStatus: 'waiting_data',
      nextStep: 'A tabela existe no desenho, mas precisa de registros reais para liberar um modulo util.',
    },
    {
      key: 'garage-fleet',
      label: 'Garagem e frota',
      description:
        'Listagem de veiculos, propriedade de frota e possiveis acoes administrativas futuras.',
      sourceTables: ['vehicles'],
      status: buildFeatureStatus(count('vehicles') > 0, false),
      deliveryStatus: 'waiting_data',
      nextStep: 'Assim que houver veiculos persistidos, vale abrir uma aba de garagem admin/player.',
    },
    {
      key: 'properties',
      label: 'Imoveis e patrimonio',
      description:
        'Casas, interiores e patrimonio persistido para suporte e administracao.',
      sourceTables: ['propertys', 'warehouse'],
      status: buildFeatureStatus(
        count('propertys') > 0 && count('warehouse') > 0,
        count('propertys') > 0 || count('warehouse') > 0
      ),
      deliveryStatus: 'waiting_data',
      nextStep: 'A estrutura existe no banco, mas ainda nao tem dados suficientes para painel util.',
    },
  ];

  return features.map((feature) => ({
    ...feature,
    deliveryStatus: buildDeliveryStatus(feature.status, feature.deliveryStatus),
  }));
}

async function listDatabaseTables(executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `
  );

  const tables = await Promise.all(
    rows.map(async (row) => {
      const tableName = row.table_name || row.TABLE_NAME;
      const escapedTableName = String(tableName).replace(/`/g, '``');
      const [countRows] = await queryExecutor.query(
        `SELECT COUNT(*) AS total FROM \`${escapedTableName}\``
      );
      const rowCount = toNumber(countRows[0]?.total, 0);
      const metadata = getTableMetadata(tableName);

      return {
        tableName,
        rowCount,
        populated: rowCount > 0,
        scope: getTableScope(tableName),
        category: metadata.category,
        description: metadata.description,
        siteArea: metadata.siteArea,
      };
    })
  );

  return tables.sort((left, right) => {
    if (right.rowCount !== left.rowCount) {
      return right.rowCount - left.rowCount;
    }

    return left.tableName.localeCompare(right.tableName);
  });
}

async function listOrganizations(limit = 20, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT id, name, bank, premium, buff
      FROM organizations
      ORDER BY name ASC
      LIMIT ?
    `,
    [normalizeLimit(limit, 20)]
  );

  return rows.map((row) => ({
    id: toNumber(row.id, 0),
    name: row.name,
    bank: toNumber(row.bank, 0),
    premium: toNumber(row.premium, 0),
    buff: Boolean(toNumber(row.buff, 0)),
  }));
}

async function listChests(limit = 30, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT id, name, weight, perm, logs
      FROM chests
      ORDER BY weight DESC, name ASC
      LIMIT ?
    `,
    [normalizeLimit(limit, 30)]
  );

  return rows.map((row) => ({
    id: toNumber(row.id, 0),
    name: row.name,
    weight: toNumber(row.weight, 0),
    permission: row.perm || null,
    logs: Boolean(toNumber(row.logs, 0)),
  }));
}

async function listPermissionSnapshots(executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT dkey, dvalue
      FROM entitydata
      WHERE dkey LIKE 'Permissions:%'
      ORDER BY dkey ASC
    `
  );

  return rows.map((row) => {
    const values = safeParseJson(row.dvalue, {});
    const enabledPassports = Object.entries(values)
      .filter(([, value]) => {
        if (typeof value === 'boolean') {
          return value;
        }

        return toNumber(value, 0) > 0;
      })
      .map(([passport]) => toNumber(passport, 0))
      .filter((passport) => passport > 0)
      .sort((left, right) => left - right);

    return {
      key: row.dkey,
      label: String(row.dkey || '').replace(/^Permissions:/, '') || 'Permission',
      totalEntries: Object.keys(values || {}).length,
      enabledCount: enabledPassports.length,
      enabledPassports,
    };
  });
}

async function listRaceLeaderboard(limit = 20, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT id, Race, Passport, Name, Vehicle, Points
      FROM races
      ORDER BY Points DESC, id DESC
      LIMIT ?
    `,
    [normalizeLimit(limit, 20)]
  );

  return rows.map((row) => ({
    id: toNumber(row.id, 0),
    raceId: toNumber(row.Race, 0),
    passaporte: toNumber(row.Passport, 0),
    name: row.Name || 'Sem nome',
    vehicle: row.Vehicle || null,
    points: toNumber(row.Points, 0),
  }));
}

function buildInventoryPreview(rawInventory) {
  if (!rawInventory || typeof rawInventory !== 'object') {
    return {
      slots: 0,
      items: [],
    };
  }

  const entries = Object.entries(rawInventory)
    .map(([slot, value]) => ({
      slot,
      item: value?.item ? String(value.item) : 'item-desconhecido',
      amount: toNumber(value?.amount, 0),
    }))
    .filter((entry) => entry.amount > 0 || entry.item !== 'item-desconhecido')
    .sort((left, right) => left.slot.localeCompare(right.slot));

  return {
    slots: entries.length,
    items: entries.slice(0, 6),
  };
}

function buildPosition(rawPosition) {
  if (!rawPosition || typeof rawPosition !== 'object') {
    return null;
  }

  return {
    x: toNullableNumber(rawPosition.x),
    y: toNullableNumber(rawPosition.y),
    z: toNullableNumber(rawPosition.z),
  };
}

async function listPlayerProfiles(limit = 20, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const [rows] = await queryExecutor.execute(
    `
      SELECT
        a.id AS account_id,
        a.license,
        a.whitelist,
        a.gems,
        a.premium,
        a.discord AS account_discord,
        MIN(CASE WHEN c.deleted = 0 THEN c.id END) AS primary_character_id,
        MIN(CASE WHEN c.deleted = 0 THEN CONCAT_WS(' ', NULLIF(c.name, ''), NULLIF(c.name2, '')) END) AS primary_character_name,
        MAX(CASE WHEN c.deleted = 0 THEN c.bank END) AS bank,
        MAX(CASE WHEN c.deleted = 0 THEN c.fines END) AS fines,
        MAX(CASE WHEN c.deleted = 0 THEN c.prison END) AS prison,
        GROUP_CONCAT(DISTINCT pd.dkey ORDER BY pd.dkey ASC SEPARATOR ' | ') AS playerdata_keys,
        MAX(CASE WHEN pd.dkey = 'Datatable' THEN pd.dvalue END) AS datatable_json,
        MAX(CASE WHEN pd.dkey = 'Clothings' THEN pd.dvalue END) AS clothings_json,
        MAX(CASE WHEN pd.dkey = 'Barbershop' THEN pd.dvalue END) AS barbershop_json
      FROM accounts a
      LEFT JOIN characters c ON c.license = a.license
      LEFT JOIN playerdata pd ON pd.Passport = a.id
      GROUP BY a.id, a.license, a.whitelist, a.gems, a.premium, a.discord
      ORDER BY a.id DESC
      LIMIT ?
    `,
    [normalizeLimit(limit, 20)]
  );

  return rows.map((row) => {
    const datatable = safeParseJson(row.datatable_json, {});
    const inventory = buildInventoryPreview(datatable?.Inventory);

    return {
      accountId: toNumber(row.account_id, 0),
      passaporte: toNumber(row.account_id, 0),
      license: row.license || null,
      whitelist: Boolean(toNumber(row.whitelist, 0)),
      gems: toNumber(row.gems, 0),
      premium: toNumber(row.premium, 0),
      discord: row.account_discord || null,
      primaryCharacterId: toNullableNumber(row.primary_character_id),
      primaryCharacterName: row.primary_character_name || null,
      bank: toNullableNumber(row.bank),
      fines: toNullableNumber(row.fines),
      prison: toNullableNumber(row.prison),
      playerDataKeys: row.playerdata_keys
        ? String(row.playerdata_keys)
            .split(' | ')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
      appearance: {
        hasBarbershop: Boolean(row.barbershop_json),
        hasClothings: Boolean(row.clothings_json),
      },
      survival: row.datatable_json
        ? {
            health: toNullableNumber(datatable?.Health),
            armour: toNullableNumber(datatable?.Armour),
            hunger: toNullableNumber(datatable?.Hunger),
            thirst: toNullableNumber(datatable?.Thirst),
            stress: toNullableNumber(datatable?.Stress),
            weight: toNullableNumber(datatable?.Weight),
          }
        : null,
      inventory,
      position: buildPosition(datatable?.Pos),
    };
  });
}

async function getDatabaseInsights(options = {}, executor = pool) {
  const queryExecutor = getExecutor(executor);
  const tableLimit = normalizeLimit(options.tableLimit, 999, 999);
  const playerLimit = normalizeLimit(options.playerLimit, 20, 50);
  const worldLimit = normalizeLimit(options.worldLimit, 30, 100);

  const [tables, organizations, chests, permissions, races, playerProfiles] = await Promise.all([
    listDatabaseTables(queryExecutor),
    listOrganizations(worldLimit, queryExecutor),
    listChests(worldLimit, queryExecutor),
    listPermissionSnapshots(queryExecutor),
    listRaceLeaderboard(worldLimit, queryExecutor),
    listPlayerProfiles(playerLimit, queryExecutor),
  ]);

  const visibleTables = tables.slice(0, tableLimit);
  const tableCountMap = Object.fromEntries(
    tables.map((table) => [table.tableName, table.rowCount])
  );
  const populatedTables = tables.filter((table) => table.populated);

  return {
    summary: {
      totalTables: tables.length,
      populatedTables: populatedTables.length,
      emptyTables: tables.length - populatedTables.length,
      botTablesWithData: populatedTables.filter((table) => table.scope === 'bot').length,
      fivemTablesWithData: populatedTables.filter((table) => table.scope === 'fivem').length,
      integrationTablesWithData: populatedTables.filter((table) => table.scope === 'integration').length,
    },
    tables: visibleTables,
    features: buildRecommendedFeatures(tableCountMap),
    gameData: {
      organizations,
      chests,
      permissions,
      races,
      playerProfiles,
    },
  };
}

module.exports = {
  getDatabaseInsights,
};
