const env = require('../../config/env');
const { pool } = require('../../database/mysql');
const { safeParseJson, safeStringifyJson } = require('../../utils/json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultPortalSettings(guildId) {
  return {
    guildId,
    serverName: env.fivem.serverName || 'Cidade RP',
    shortName: env.botShortName || 'Projeto RP',
    logoUrl: env.botLogoUrl || null,
    heroTitle: 'Sua vida nova comeca aqui.',
    heroSubtitle:
      'Entre no portal oficial, acompanhe a whitelist, abra suporte e conecte-se a uma cidade feita para historias memoraveis.',
    heroImageUrl: null,
    discordUrl: null,
    connectUrl: env.fivem.connectUrl || null,
    primaryColor: '#0f1117',
    accentColor: '#c3ff27',
    socialLinks: {
      discord: null,
      instagram: null,
      youtube: null,
      twitch: null
    },
    landingSections: {
      heroTag: 'Portal oficial',
      serversTitle: 'Cidades em destaque',
      newsTitle: 'Noticias e atualizacoes',
      packagesTitle: 'Pacotes de diamantes',
      howToJoinTitle: 'Como fazer parte?',
      howToJoinSteps: [
        'Entre com sua conta do Discord.',
        'Conclua sua whitelist e acompanhe o status pelo portal.',
        'Use suporte, acompanhe novidades e conecte-se ao servidor.'
      ]
    },
    footerText: 'Todos os direitos reservados.'
  };
}

const DEFAULT_NEWS_ITEMS = [
  {
    title: 'Nova temporada pronta para comecar',
    category: 'Atualizacao',
    descriptionText:
      'A cidade recebeu ajustes de economia, ritmo de policiamento e novos pontos de encontro para fortalecer o RP.',
    imageUrl: null,
    isPublished: true,
    publishedAt: new Date()
  },
  {
    title: 'Whitelist com fluxo revisado',
    category: 'Comunicado',
    descriptionText:
      'As perguntas iniciais foram ajustadas para deixar a aprovacao mais clara e o acompanhamento mais transparente.',
    imageUrl: null,
    isPublished: true,
    publishedAt: new Date()
  }
];

const DEFAULT_SERVER_ITEMS = [
  {
    name: 'Cidade Principal',
    descriptionText:
      'Economia viva, faccoes ativas e historias urbanas em um mapa pensado para RP serio.',
    imageUrl: null,
    statusLabel: 'Online',
    connectUrl: env.fivem.connectUrl || null,
    permissionRequired: 'Whitelist',
    isActive: true,
    isPrimary: true,
    displayOrder: 1
  }
];

const DEFAULT_PACKAGE_ITEMS = [
  {
    name: 'Pacote Neon',
    descriptionText: 'Diamantes para impulsionar a conta e liberar conveniencias do portal.',
    diamondAmount: 550,
    bonusAmount: 50,
    priceCents: 2490,
    checkoutUrl: null,
    highlightLabel: 'Entrada',
    isActive: true,
    displayOrder: 1
  },
  {
    name: 'Pacote Skyline',
    descriptionText: 'Pacote recomendado para quem quer acelerar a progressao com folga.',
    diamondAmount: 1200,
    bonusAmount: 200,
    priceCents: 4990,
    checkoutUrl: null,
    highlightLabel: 'Mais pedido',
    isActive: true,
    displayOrder: 2
  },
  {
    name: 'Pacote Midnight',
    descriptionText: 'Saldo premium para temporadas longas, com bonus maior e destaque.',
    diamondAmount: 2500,
    bonusAmount: 500,
    priceCents: 8990,
    checkoutUrl: null,
    highlightLabel: 'Elite',
    isActive: true,
    displayOrder: 3
  }
];

function mapPortalSettingsRow(row) {
  if (!row) {
    return null;
  }

  return {
    guildId: row.guild_id,
    serverName: row.server_name,
    shortName: row.short_name,
    logoUrl: row.logo_url,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    heroImageUrl: row.hero_image_url,
    discordUrl: row.discord_url,
    connectUrl: row.connect_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    socialLinks: safeParseJson(row.social_links_text, createDefaultPortalSettings(row.guild_id).socialLinks),
    landingSections: safeParseJson(
      row.landing_sections_text,
      createDefaultPortalSettings(row.guild_id).landingSections
    ),
    footerText: row.footer_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNewsRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    title: row.title,
    category: row.category,
    descriptionText: row.description_text,
    imageUrl: row.image_url,
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapServerRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    name: row.name,
    descriptionText: row.description_text,
    imageUrl: row.image_url,
    statusLabel: row.status_label,
    connectUrl: row.connect_url,
    permissionRequired: row.permission_required,
    isActive: Boolean(row.is_active),
    isPrimary: Boolean(row.is_primary),
    displayOrder: Number(row.display_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPackageRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    guildId: row.guild_id,
    name: row.name,
    descriptionText: row.description_text,
    diamondAmount: Number(row.diamond_amount || 0),
    bonusAmount: Number(row.bonus_amount || 0),
    priceCents: Number(row.price_cents || 0),
    checkoutUrl: row.checkout_url,
    highlightLabel: row.highlight_label,
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getPortalSettings(guildId) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_portal_settings WHERE guild_id = ? LIMIT 1',
    [guildId]
  );

  return mapPortalSettingsRow(rows[0] || null);
}

async function persistPortalSettings(settings) {
  const defaults = createDefaultPortalSettings(settings.guildId);
  const next = {
    ...defaults,
    ...settings,
    socialLinks: {
      ...defaults.socialLinks,
      ...(settings.socialLinks || {})
    },
    landingSections: {
      ...defaults.landingSections,
      ...(settings.landingSections || {})
    }
  };

  await pool.execute(
    `
      INSERT INTO discord_bot_portal_settings (
        guild_id,
        server_name,
        short_name,
        logo_url,
        hero_title,
        hero_subtitle,
        hero_image_url,
        discord_url,
        connect_url,
        primary_color,
        accent_color,
        social_links_text,
        landing_sections_text,
        footer_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        server_name = VALUES(server_name),
        short_name = VALUES(short_name),
        logo_url = VALUES(logo_url),
        hero_title = VALUES(hero_title),
        hero_subtitle = VALUES(hero_subtitle),
        hero_image_url = VALUES(hero_image_url),
        discord_url = VALUES(discord_url),
        connect_url = VALUES(connect_url),
        primary_color = VALUES(primary_color),
        accent_color = VALUES(accent_color),
        social_links_text = VALUES(social_links_text),
        landing_sections_text = VALUES(landing_sections_text),
        footer_text = VALUES(footer_text)
    `,
    [
      next.guildId,
      next.serverName,
      next.shortName,
      next.logoUrl,
      next.heroTitle,
      next.heroSubtitle,
      next.heroImageUrl,
      next.discordUrl,
      next.connectUrl,
      next.primaryColor,
      next.accentColor,
      safeStringifyJson(next.socialLinks, defaults.socialLinks),
      safeStringifyJson(next.landingSections, defaults.landingSections),
      next.footerText
    ]
  );

  return getPortalSettings(next.guildId);
}

async function ensurePortalSettings(guildId) {
  const existing = await getPortalSettings(guildId);
  if (existing) {
    return existing;
  }

  return persistPortalSettings(createDefaultPortalSettings(guildId));
}

async function listPortalNews(guildId, options = {}) {
  const clauses = ['guild_id = ?'];
  const params = [guildId];

  if (typeof options.onlyPublished === 'boolean') {
    clauses.push('is_published = ?');
    params.push(options.onlyPublished ? 1 : 0);
  }

  const limit = Math.max(1, Math.min(Number(options.limit || 50), 200));
  params.push(limit);

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM discord_bot_portal_news
      WHERE ${clauses.join(' AND ')}
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC
      LIMIT ?
    `,
    params
  );

  return rows.map(mapNewsRow).filter(Boolean);
}

async function getPortalNewsItem(guildId, newsId) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_portal_news WHERE guild_id = ? AND id = ? LIMIT 1',
    [guildId, newsId]
  );

  return mapNewsRow(rows[0] || null);
}

async function createPortalNews(guildId, input) {
  const [result] = await pool.execute(
    `
      INSERT INTO discord_bot_portal_news (
        guild_id,
        title,
        category,
        description_text,
        image_url,
        is_published,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      guildId,
      input.title,
      input.category,
      input.descriptionText,
      input.imageUrl || null,
      input.isPublished ? 1 : 0,
      input.publishedAt || null
    ]
  );

  return getPortalNewsItem(guildId, result.insertId);
}

async function updatePortalNews(guildId, newsId, input) {
  const current = await getPortalNewsItem(guildId, newsId);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...input
  };

  await pool.execute(
    `
      UPDATE discord_bot_portal_news
      SET
        title = ?,
        category = ?,
        description_text = ?,
        image_url = ?,
        is_published = ?,
        published_at = ?
      WHERE guild_id = ? AND id = ?
    `,
    [
      next.title,
      next.category,
      next.descriptionText,
      next.imageUrl || null,
      next.isPublished ? 1 : 0,
      next.publishedAt || null,
      guildId,
      newsId
    ]
  );

  return getPortalNewsItem(guildId, newsId);
}

async function deletePortalNews(guildId, newsId) {
  const item = await getPortalNewsItem(guildId, newsId);
  if (!item) {
    return null;
  }

  await pool.execute('DELETE FROM discord_bot_portal_news WHERE guild_id = ? AND id = ?', [
    guildId,
    newsId
  ]);

  return item;
}

async function listPortalServers(guildId, options = {}) {
  const clauses = ['guild_id = ?'];
  const params = [guildId];

  if (typeof options.onlyActive === 'boolean') {
    clauses.push('is_active = ?');
    params.push(options.onlyActive ? 1 : 0);
  }

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM discord_bot_portal_servers
      WHERE ${clauses.join(' AND ')}
      ORDER BY display_order ASC, id ASC
    `,
    params
  );

  return rows.map(mapServerRow).filter(Boolean);
}

async function getPortalServer(guildId, serverId) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_portal_servers WHERE guild_id = ? AND id = ? LIMIT 1',
    [guildId, serverId]
  );

  return mapServerRow(rows[0] || null);
}

async function createPortalServer(guildId, input) {
  const [result] = await pool.execute(
    `
      INSERT INTO discord_bot_portal_servers (
        guild_id,
        name,
        description_text,
        image_url,
        status_label,
        connect_url,
        permission_required,
        is_active,
        is_primary,
        display_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      guildId,
      input.name,
      input.descriptionText,
      input.imageUrl || null,
      input.statusLabel || null,
      input.connectUrl || null,
      input.permissionRequired || null,
      input.isActive ? 1 : 0,
      input.isPrimary ? 1 : 0,
      Number(input.displayOrder || 0)
    ]
  );

  return getPortalServer(guildId, result.insertId);
}

async function updatePortalServer(guildId, serverId, input) {
  const current = await getPortalServer(guildId, serverId);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...input
  };

  await pool.execute(
    `
      UPDATE discord_bot_portal_servers
      SET
        name = ?,
        description_text = ?,
        image_url = ?,
        status_label = ?,
        connect_url = ?,
        permission_required = ?,
        is_active = ?,
        is_primary = ?,
        display_order = ?
      WHERE guild_id = ? AND id = ?
    `,
    [
      next.name,
      next.descriptionText,
      next.imageUrl || null,
      next.statusLabel || null,
      next.connectUrl || null,
      next.permissionRequired || null,
      next.isActive ? 1 : 0,
      next.isPrimary ? 1 : 0,
      Number(next.displayOrder || 0),
      guildId,
      serverId
    ]
  );

  return getPortalServer(guildId, serverId);
}

async function deletePortalServer(guildId, serverId) {
  const item = await getPortalServer(guildId, serverId);
  if (!item) {
    return null;
  }

  await pool.execute('DELETE FROM discord_bot_portal_servers WHERE guild_id = ? AND id = ?', [
    guildId,
    serverId
  ]);

  return item;
}

async function listPortalPackages(guildId, options = {}) {
  const clauses = ['guild_id = ?'];
  const params = [guildId];

  if (typeof options.onlyActive === 'boolean') {
    clauses.push('is_active = ?');
    params.push(options.onlyActive ? 1 : 0);
  }

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM discord_bot_portal_packages
      WHERE ${clauses.join(' AND ')}
      ORDER BY display_order ASC, id ASC
    `,
    params
  );

  return rows.map(mapPackageRow).filter(Boolean);
}

async function getPortalPackage(guildId, packageId) {
  const [rows] = await pool.execute(
    'SELECT * FROM discord_bot_portal_packages WHERE guild_id = ? AND id = ? LIMIT 1',
    [guildId, packageId]
  );

  return mapPackageRow(rows[0] || null);
}

async function createPortalPackage(guildId, input) {
  const [result] = await pool.execute(
    `
      INSERT INTO discord_bot_portal_packages (
        guild_id,
        name,
        description_text,
        diamond_amount,
        bonus_amount,
        price_cents,
        checkout_url,
        highlight_label,
        is_active,
        display_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      guildId,
      input.name,
      input.descriptionText,
      Number(input.diamondAmount || 0),
      Number(input.bonusAmount || 0),
      Number(input.priceCents || 0),
      input.checkoutUrl || null,
      input.highlightLabel || null,
      input.isActive ? 1 : 0,
      Number(input.displayOrder || 0)
    ]
  );

  return getPortalPackage(guildId, result.insertId);
}

async function updatePortalPackage(guildId, packageId, input) {
  const current = await getPortalPackage(guildId, packageId);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...input
  };

  await pool.execute(
    `
      UPDATE discord_bot_portal_packages
      SET
        name = ?,
        description_text = ?,
        diamond_amount = ?,
        bonus_amount = ?,
        price_cents = ?,
        checkout_url = ?,
        highlight_label = ?,
        is_active = ?,
        display_order = ?
      WHERE guild_id = ? AND id = ?
    `,
    [
      next.name,
      next.descriptionText,
      Number(next.diamondAmount || 0),
      Number(next.bonusAmount || 0),
      Number(next.priceCents || 0),
      next.checkoutUrl || null,
      next.highlightLabel || null,
      next.isActive ? 1 : 0,
      Number(next.displayOrder || 0),
      guildId,
      packageId
    ]
  );

  return getPortalPackage(guildId, packageId);
}

async function deletePortalPackage(guildId, packageId) {
  const item = await getPortalPackage(guildId, packageId);
  if (!item) {
    return null;
  }

  await pool.execute('DELETE FROM discord_bot_portal_packages WHERE guild_id = ? AND id = ?', [
    guildId,
    packageId
  ]);

  return item;
}

async function seedDefaultPortalNews(guildId) {
  const items = await listPortalNews(guildId, { limit: 1 });
  if (items.length > 0) {
    return items;
  }

  for (const item of DEFAULT_NEWS_ITEMS) {
    await createPortalNews(guildId, item);
  }

  return listPortalNews(guildId, { limit: 50 });
}

async function seedDefaultPortalServers(guildId) {
  const items = await listPortalServers(guildId);
  if (items.length > 0) {
    return items;
  }

  for (const item of DEFAULT_SERVER_ITEMS) {
    await createPortalServer(guildId, item);
  }

  return listPortalServers(guildId);
}

async function seedDefaultPortalPackages(guildId) {
  const items = await listPortalPackages(guildId);
  if (items.length > 0) {
    return items;
  }

  for (const item of DEFAULT_PACKAGE_ITEMS) {
    await createPortalPackage(guildId, item);
  }

  return listPortalPackages(guildId);
}

async function ensurePortalData(guildId) {
  const settings = await ensurePortalSettings(guildId);
  const [news, servers, packages] = await Promise.all([
    seedDefaultPortalNews(guildId),
    seedDefaultPortalServers(guildId),
    seedDefaultPortalPackages(guildId)
  ]);

  return {
    settings,
    news,
    servers,
    packages
  };
}

function normalizePortalSettingsPatch(guildId, input = {}) {
  const defaults = createDefaultPortalSettings(guildId);
  return {
    guildId,
    serverName: input.serverName || defaults.serverName,
    shortName: input.shortName || defaults.shortName,
    logoUrl: input.logoUrl || null,
    heroTitle: input.heroTitle || defaults.heroTitle,
    heroSubtitle: input.heroSubtitle || defaults.heroSubtitle,
    heroImageUrl: input.heroImageUrl || null,
    discordUrl: input.discordUrl || null,
    connectUrl: input.connectUrl || null,
    primaryColor: input.primaryColor || defaults.primaryColor,
    accentColor: input.accentColor || defaults.accentColor,
    socialLinks: clone({
      ...defaults.socialLinks,
      ...(input.socialLinks || {})
    }),
    landingSections: clone({
      ...defaults.landingSections,
      ...(input.landingSections || {})
    }),
    footerText: input.footerText || defaults.footerText
  };
}

module.exports = {
  createDefaultPortalSettings,
  createPortalNews,
  createPortalPackage,
  createPortalServer,
  deletePortalNews,
  deletePortalPackage,
  deletePortalServer,
  ensurePortalData,
  ensurePortalSettings,
  getPortalNewsItem,
  getPortalPackage,
  getPortalServer,
  getPortalSettings,
  listPortalNews,
  listPortalPackages,
  listPortalServers,
  normalizePortalSettingsPatch,
  persistPortalSettings,
  seedDefaultPortalNews,
  seedDefaultPortalPackages,
  seedDefaultPortalServers,
  updatePortalNews,
  updatePortalPackage,
  updatePortalServer
};
