const express = require('express');
const { pool } = require('../../../../src/database/mysql');
const { getFiveMStatus } = require('../../../../src/modules/fivem/fivemService');
const { getFinanceSummary } = require('../../../../src/modules/finance/financeRepository');
const { logAction } = require('../../../../src/modules/logs/logService');
const { getOnboardingSummary } = require('../../../../src/modules/onboarding/onboardingService');
const {
  countPlayers,
  countWhitelistedPlayers,
  findPlayerByDiscordId,
  getPlayerByAccountId,
  linkDiscordToAccount,
  listPlayers,
  updatePlayerGems,
  updatePlayerWhitelist
} = require('../../../../src/modules/players/playerRepository');
const { getDatabaseInsights } = require('../../../../src/modules/database/databaseInsightsRepository');
const {
  createPortalNews,
  createPortalPackage,
  createPortalServer,
  deletePortalNews,
  deletePortalPackage,
  deletePortalServer,
  ensurePortalData,
  ensurePortalSettings,
  getPortalSettings,
  listPortalNews,
  listPortalPackages,
  listPortalServers,
  persistPortalSettings,
  updatePortalNews,
  updatePortalPackage,
  updatePortalServer
} = require('../../../../src/modules/portal/portalRepository');
const {
  createPortalPaymentOrder,
  listGuildPaymentOrders,
  listPlayerPaymentOrders,
  reconcilePendingPaymentOrders,
  syncPortalPaymentOrder
} = require('../../../../src/modules/payments/paymentService');
const { createTicketForActor } = require('../../../../src/modules/tickets/ticketAppService');
const { listTicketsByOwner } = require('../../../../src/modules/tickets/ticketRepository');
const { getLatestApplicationForUser } = require('../../../../src/modules/whitelist/whitelistRepository');
const { hasStaffAccess } = require('../../../../src/utils/permissions');
const {
  assertAccessCapability,
  createHttpError,
  getPortalAccessContext
} = require('../lib/dashboardAccess');
const {
  buildDiscordChannelUrl,
  buildPortalSessionResponse,
  buildWhitelistState,
  mapContentBlocks
} = require('../lib/portalPayloads');
const { readSessionCookie } = require('../lib/session');

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'sim', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'nao', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function parseInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.trunc(parsed);
}

function parseOptionalDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function sanitizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

async function requirePortalAuth(req, res, next) {
  try {
    const session = readSessionCookie(req);
    if (!session?.userId) {
      throw createHttpError(401, 'Sessao invalida ou expirada.');
    }

    const access = await getPortalAccessContext(session.userId);
    req.portal = {
      ...access,
      session
    };
    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({
      error: error.message || 'Sessao invalida ou expirada.'
    });
  }
}

async function requirePortalAdmin(req, res, next) {
  try {
    const session = readSessionCookie(req);
    if (!session?.userId) {
      throw createHttpError(401, 'Sessao invalida ou expirada.');
    }

    const context = await getPortalAccessContext(session.userId);
    if (!context.access.isStaff) {
      throw createHttpError(403, 'Acesso administrativo negado.');
    }

    req.portal = {
      ...context,
      session
    };
    next();
  } catch (error) {
    res.status(error.statusCode || 403).json({
      error: error.message || 'Acesso administrativo negado.'
    });
  }
}

function assertPortalCapability(req, capabilityKey, message) {
  return assertAccessCapability(req.portal, capabilityKey, message);
}

async function buildPortalSessionPayload(context) {
  const guildId = context.guild.id;
  await ensurePortalData(guildId);

  const [
    settings,
    contentBlocks,
    player,
    latestWhitelist,
    tickets,
    fivemStatus,
    servers,
    packages,
    orderSnapshot
  ] =
    await Promise.all([
      getPortalSettings(guildId),
      getOnboardingSummary(guildId),
      findPlayerByDiscordId(context.session.userId),
      getLatestApplicationForUser(guildId, context.session.userId),
      listTicketsByOwner(guildId, context.session.userId, { limit: 10 }),
      getFiveMStatus(),
      listPortalServers(guildId, { onlyActive: true }),
      listPortalPackages(guildId, { onlyActive: true }),
      listPlayerPaymentOrders(context.session.userId, 10)
    ]);

  return buildPortalSessionResponse(context, {
    settings,
    contentBlocks,
    player,
    latestWhitelist,
    tickets,
    fivemStatus,
    servers,
    packages,
    paymentOrders: orderSnapshot.items,
    purchaseSummary: orderSnapshot.summary
  });
}

function buildPortalSettingsPayload(current, body) {
  return {
    ...current,
    serverName: sanitizeText(body.serverName, current.serverName),
    shortName: sanitizeText(body.shortName, current.shortName || ''),
    logoUrl: sanitizeText(body.logoUrl, current.logoUrl || '') || null,
    heroTitle: sanitizeText(body.heroTitle, current.heroTitle),
    heroSubtitle: sanitizeText(body.heroSubtitle, current.heroSubtitle),
    heroImageUrl: sanitizeText(body.heroImageUrl, current.heroImageUrl || '') || null,
    discordUrl: sanitizeText(body.discordUrl, current.discordUrl || '') || null,
    connectUrl: sanitizeText(body.connectUrl, current.connectUrl || '') || null,
    primaryColor: sanitizeText(body.primaryColor, current.primaryColor),
    accentColor: sanitizeText(body.accentColor, current.accentColor),
    socialLinks: {
      ...(current.socialLinks || {}),
      ...(body.socialLinks || {})
    },
    landingSections: {
      ...(current.landingSections || {}),
      ...(body.landingSections || {})
    },
    footerText: sanitizeText(body.footerText, current.footerText)
  };
}

function normalizeNewsInput(body = {}) {
  const isPublished = parseBoolean(body.isPublished, true);
  return {
    title: sanitizeText(body.title),
    category: sanitizeText(body.category, 'Comunicado'),
    descriptionText: sanitizeText(body.descriptionText || body.description),
    imageUrl: sanitizeText(body.imageUrl, '') || null,
    isPublished,
    publishedAt: isPublished ? parseOptionalDate(body.publishedAt) || new Date() : null
  };
}

function normalizeServerInput(body = {}) {
  return {
    name: sanitizeText(body.name),
    descriptionText: sanitizeText(body.descriptionText || body.description),
    imageUrl: sanitizeText(body.imageUrl, '') || null,
    statusLabel: sanitizeText(body.statusLabel, '') || null,
    connectUrl: sanitizeText(body.connectUrl, '') || null,
    permissionRequired: sanitizeText(body.permissionRequired, '') || null,
    isActive: parseBoolean(body.isActive, true),
    isPrimary: parseBoolean(body.isPrimary, false),
    displayOrder: parseInteger(body.displayOrder, 0)
  };
}

function normalizePackageInput(body = {}) {
  return {
    name: sanitizeText(body.name),
    descriptionText: sanitizeText(body.descriptionText || body.description),
    diamondAmount: parseInteger(body.diamondAmount, 0),
    bonusAmount: parseInteger(body.bonusAmount, 0),
    priceCents: parseInteger(body.priceCents, 0),
    checkoutUrl: sanitizeText(body.checkoutUrl, '') || null,
    highlightLabel: sanitizeText(body.highlightLabel, '') || null,
    isActive: parseBoolean(body.isActive, true),
    displayOrder: parseInteger(body.displayOrder, 0)
  };
}

async function buildStaffSnapshot(guild, guildConfig) {
  await guild.members.fetch();

  const members = Array.from(guild.members.cache.values()).filter((member) =>
    hasStaffAccess(member, guildConfig)
  );

  const [rows] = await pool.execute(
    `
      SELECT
        actor_id,
        SUM(CASE WHEN event_type = 'tickets_claimed' THEN 1 ELSE 0 END) AS tickets_claimed,
        SUM(CASE WHEN event_type = 'tickets_closed' THEN 1 ELSE 0 END) AS tickets_closed,
        SUM(CASE WHEN event_type IN ('whitelist_approved', 'whitelist_rejected') THEN 1 ELSE 0 END) AS whitelists_reviewed,
        MAX(created_at) AS last_action_at
      FROM discord_bot_audit_logs
      WHERE guild_id = ? AND actor_id IS NOT NULL
      GROUP BY actor_id
    `,
    [guild.id]
  );

  const metrics = Object.fromEntries(
    rows.map((row) => [
      row.actor_id,
      {
        ticketsClaimed: Number(row.tickets_claimed || 0),
        ticketsClosed: Number(row.tickets_closed || 0),
        whitelistsReviewed: Number(row.whitelists_reviewed || 0),
        lastActionAt: row.last_action_at || null
      }
    ])
  );

  return members.map((member) => ({
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    avatarUrl: member.displayAvatarURL({ size: 256 }),
    roles: member.roles.cache
      .filter((role) => role.id !== guild.id)
      .map((role) => ({
        id: role.id,
        name: role.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    metrics: metrics[member.id] || {
      ticketsClaimed: 0,
      ticketsClosed: 0,
      whitelistsReviewed: 0,
      lastActionAt: null
    }
  }));
}

function createPortalRouter() {
  const router = express.Router();

  router.get('/session', requirePortalAuth, async (req, res, next) => {
    try {
      res.json(await buildPortalSessionPayload(req.portal));
    } catch (error) {
      next(error);
    }
  });

  router.get('/tickets', requirePortalAuth, async (req, res, next) => {
    try {
      const items = await listTicketsByOwner(req.portal.guild.id, req.portal.session.userId, {
        limit: req.query.limit || 20,
        status: req.query.status || null
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tickets', requirePortalAuth, async (req, res, next) => {
    try {
      const categoryKey = sanitizeText(req.body?.categoryKey, 'support');
      const { ticket, channel } = await createTicketForActor({
        guild: req.portal.guild,
        actor: req.portal.user,
        categoryKey
      });

      res.status(201).json({
        item: ticket,
        channel: channel
          ? {
              id: channel.id,
              name: channel.name,
              url: buildDiscordChannelUrl(req.portal.guild.id, channel.id)
            }
          : null
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/whitelist', requirePortalAuth, async (req, res, next) => {
    try {
      const player = await findPlayerByDiscordId(req.portal.session.userId);
      const latest = await getLatestApplicationForUser(req.portal.guild.id, req.portal.session.userId);

      res.json(buildWhitelistState(player, latest));
    } catch (error) {
      next(error);
    }
  });

  router.get('/orders', requirePortalAuth, async (req, res, next) => {
    try {
      const snapshot = await listPlayerPaymentOrders(
        req.portal.session.userId,
        Number(req.query.limit || 20)
      );
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  router.post('/orders', requirePortalAuth, async (req, res, next) => {
    try {
      const packageId = parseInteger(req.body?.packageId, 0);
      const quantity = parseInteger(req.body?.quantity, 1);
      if (!packageId) {
        throw createHttpError(400, 'Informe um pacote valido para a compra.');
      }

      const item = await createPortalPaymentOrder({
        guildId: req.portal.guild.id,
        discordUserId: req.portal.session.userId,
        packageId,
        quantity
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.post('/orders/sync', requirePortalAuth, async (req, res, next) => {
    try {
      const paymentId = sanitizeText(req.body?.paymentId || req.body?.payment_id);
      const externalReference = sanitizeText(
        req.body?.externalReference || req.body?.external_reference
      );
      if (!paymentId && !externalReference) {
        throw createHttpError(
          400,
          'Informe o payment_id ou external_reference retornado pelo checkout.'
        );
      }

      const result = await syncPortalPaymentOrder({
        discordUserId: req.portal.session.userId,
        paymentId: paymentId || null,
        externalReference,
        headers: req.headers || {}
      });

      if (result.code === 'order_forbidden') {
        throw createHttpError(403, 'Este pedido nao pertence ao usuario autenticado.');
      }

      if (result.code === 'order_not_found') {
        throw createHttpError(404, 'Pedido de pagamento nao encontrado.');
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/players', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePlayers',
        'Seu nivel de acesso nao permite consultar players.'
      );
      const items = await listPlayers({
        search: req.query.search || '',
        limit: req.query.limit || 100,
        offset: req.query.offset || 0,
        onlyWhitelisted:
          typeof req.query.onlyWhitelisted === 'undefined'
            ? undefined
            : parseBoolean(req.query.onlyWhitelisted),
        onlyBanned:
          typeof req.query.onlyBanned === 'undefined'
            ? undefined
            : parseBoolean(req.query.onlyBanned)
      });

      res.json({
        items,
        summary: {
          totalPlayers: await countPlayers(),
          totalWhitelisted: await countWhitelistedPlayers()
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/players/:accountId/gems', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePlayers',
        'Seu nivel de acesso nao permite alterar diamantes.'
      );
      const accountId = parseInteger(req.params.accountId, 0);
      const gems = parseInteger(req.body?.gems, NaN);
      if (!accountId || !Number.isFinite(gems) || gems < 0) {
        throw createHttpError(400, 'Informe um saldo de diamantes valido.');
      }

      const before = await getPlayerByAccountId(accountId);
      if (!before) {
        res.status(404).json({ error: 'Player nao encontrado.' });
        return;
      }

      const updated = await updatePlayerGems(accountId, gems);

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Diamantes ajustados pela web',
        description: `${req.portal.user} atualizou o saldo de diamantes do passaporte ${accountId}.`,
        actorId: req.portal.user.id,
        entityType: 'player_account',
        entityId: String(accountId),
        details: {
          before: before.gems,
          after: updated.gems
        }
      });

      res.json({ item: updated });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/players/:accountId/whitelist', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePlayers',
        'Seu nivel de acesso nao permite alterar a whitelist.'
      );
      const accountId = parseInteger(req.params.accountId, 0);
      const whitelist = parseBoolean(req.body?.whitelist, false);
      if (!accountId) {
        throw createHttpError(400, 'Player invalido.');
      }

      const before = await getPlayerByAccountId(accountId);
      if (!before) {
        res.status(404).json({ error: 'Player nao encontrado.' });
        return;
      }

      const updated = await updatePlayerWhitelist(accountId, whitelist);

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Whitelist atualizada pela web',
        description: `${req.portal.user} alterou o status de whitelist do passaporte ${accountId}.`,
        actorId: req.portal.user.id,
        entityType: 'player_account',
        entityId: String(accountId),
        details: {
          before: before.whitelist,
          after: updated.whitelist
        }
      });

      res.json({ item: updated });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/players/:accountId/discord-link', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePlayers',
        'Seu nivel de acesso nao permite alterar vinculos Discord.'
      );
      const accountId = parseInteger(req.params.accountId, 0);
      const discordUserId = sanitizeText(req.body?.discordUserId || req.body?.userId);
      const force = parseBoolean(req.body?.force, false);
      if (!accountId || !discordUserId) {
        throw createHttpError(400, 'Informe o passaporte e o Discord ID desejado.');
      }

      const before = await getPlayerByAccountId(accountId);
      if (!before) {
        res.status(404).json({ error: 'Player nao encontrado.' });
        return;
      }

      const result = await linkDiscordToAccount(accountId, discordUserId, { allowReplace: force });
      if (!result.ok) {
        const statusCode =
          result.code === 'discord_link_taken' || result.code === 'discord_link_conflict' ? 409 : 400;
        res.status(statusCode).json({
          error: result.message,
          code: result.code,
          existingAccountId: result.existingAccountId || null
        });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Vinculo Discord atualizado pela web',
        description: `${req.portal.user} atualizou o vinculo Discord do passaporte ${accountId}.`,
        actorId: req.portal.user.id,
        entityType: 'player_account',
        entityId: String(accountId),
        details: {
          before: before.discordLink || null,
          after: result.item?.discordLink || null,
          linkedDiscord: result.linkedDiscord,
          replaced: result.replaced
        }
      });

      res.json({
        item: result.item,
        linkResult: {
          linkedDiscord: result.linkedDiscord,
          replaced: result.replaced
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/staff', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canReadLogs',
        'Seu nivel de acesso nao permite visualizar o snapshot de staff.'
      );
      const items = await buildStaffSnapshot(req.portal.guild, req.portal.guildConfig);
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/finance', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canViewFinance',
        'Seu nivel de acesso nao permite consultar o financeiro.'
      );
      res.json(await getFinanceSummary());
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/orders', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePayments',
        'Apenas owners podem consultar os pedidos de pagamento.'
      );
      res.json(
        await listGuildPaymentOrders(req.portal.guild.id, {
          limit: req.query.limit || 50,
          paymentStatus: req.query.paymentStatus || null,
          deliveryStatus: req.query.deliveryStatus || null
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/payments/reconcile', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePayments',
        'Apenas owners podem iniciar a reconciliacao de pagamentos.'
      );
      res.json(await reconcilePendingPaymentOrders(Number(req.body?.limit || 50)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/database', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canViewDatabase',
        'Seu nivel de acesso nao permite consultar o snapshot do banco.'
      );
      res.json(
        await getDatabaseInsights({
          tableLimit: req.query.tableLimit || 999,
          playerLimit: req.query.playerLimit || 20,
          worldLimit: req.query.worldLimit || 30,
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.get('/admin/portal', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite consultar o portal administrativo.'
      );
      const guildId = req.portal.guild.id;
      await ensurePortalData(guildId);

      const [settings, news, servers, packages, contentBlocks] = await Promise.all([
        ensurePortalSettings(guildId),
        listPortalNews(guildId, { limit: 50 }),
        listPortalServers(guildId),
        listPortalPackages(guildId),
        getOnboardingSummary(guildId)
      ]);

      res.json({
        settings,
        news,
        servers,
        packages,
        contentBlocks: mapContentBlocks(contentBlocks)
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/admin/portal/settings', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite alterar o portal.'
      );
      const current = await ensurePortalSettings(req.portal.guild.id);
      const payload = buildPortalSettingsPayload(current, req.body || {});
      const settings = await persistPortalSettings(payload);

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Portal atualizado pela web',
        description: `${req.portal.user} atualizou as configuracoes visuais e institucionais do portal.`,
        actorId: req.portal.user.id,
        entityType: 'portal_settings',
        entityId: req.portal.guild.id,
        details: {
          serverName: settings.serverName
        }
      });

      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/portal/news', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite criar noticias.'
      );
      const payload = normalizeNewsInput(req.body || {});
      if (!payload.title || !payload.descriptionText) {
        throw createHttpError(400, 'Titulo e descricao sao obrigatorios.');
      }

      const item = await createPortalNews(req.portal.guild.id, payload);

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Noticia criada pela web',
        description: `${req.portal.user} criou a noticia ${item.title}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_news',
        entityId: String(item.id),
        details: {
          category: item.category,
          isPublished: item.isPublished
        }
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/portal/news/:id', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite editar noticias.'
      );
      const item = await updatePortalNews(
        req.portal.guild.id,
        parseInteger(req.params.id, 0),
        normalizeNewsInput(req.body || {})
      );

      if (!item) {
        res.status(404).json({ error: 'Noticia nao encontrada.' });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Noticia atualizada pela web',
        description: `${req.portal.user} atualizou a noticia ${item.title}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_news',
        entityId: String(item.id),
        details: {
          category: item.category,
          isPublished: item.isPublished
        }
      });

      res.json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/portal/news/:id', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite remover noticias.'
      );
      const item = await deletePortalNews(req.portal.guild.id, parseInteger(req.params.id, 0));
      if (!item) {
        res.status(404).json({ error: 'Noticia nao encontrada.' });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Noticia removida pela web',
        description: `${req.portal.user} removeu a noticia ${item.title}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_news',
        entityId: String(item.id),
        details: {
          category: item.category
        }
      });

      res.json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/portal/servers', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite criar servidores.'
      );
      const payload = normalizeServerInput(req.body || {});
      if (!payload.name || !payload.descriptionText) {
        throw createHttpError(400, 'Nome e descricao sao obrigatorios.');
      }

      const item = await createPortalServer(req.portal.guild.id, payload);

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Servidor criado pela web',
        description: `${req.portal.user} criou o card de servidor ${item.name}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_server',
        entityId: String(item.id),
        details: {
          isActive: item.isActive,
          isPrimary: item.isPrimary
        }
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/portal/servers/:id', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite editar servidores.'
      );
      const item = await updatePortalServer(
        req.portal.guild.id,
        parseInteger(req.params.id, 0),
        normalizeServerInput(req.body || {})
      );

      if (!item) {
        res.status(404).json({ error: 'Servidor nao encontrado.' });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Servidor atualizado pela web',
        description: `${req.portal.user} atualizou o card de servidor ${item.name}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_server',
        entityId: String(item.id),
        details: {
          isActive: item.isActive,
          isPrimary: item.isPrimary
        }
      });

      res.json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/portal/servers/:id', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite remover servidores.'
      );
      const item = await deletePortalServer(req.portal.guild.id, parseInteger(req.params.id, 0));
      if (!item) {
        res.status(404).json({ error: 'Servidor nao encontrado.' });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Servidor removido pela web',
        description: `${req.portal.user} removeu o card de servidor ${item.name}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_server',
        entityId: String(item.id),
        details: {
          isPrimary: item.isPrimary
        }
      });

      res.json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/portal/packages', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite criar pacotes.'
      );
      const payload = normalizePackageInput(req.body || {});
      if (!payload.name || !payload.descriptionText) {
        throw createHttpError(400, 'Nome e descricao sao obrigatorios.');
      }

      const item = await createPortalPackage(req.portal.guild.id, payload);

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Pacote de diamantes criado pela web',
        description: `${req.portal.user} criou o pacote ${item.name}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_package',
        entityId: String(item.id),
        details: {
          diamondAmount: item.diamondAmount,
          priceCents: item.priceCents,
          isActive: item.isActive
        }
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/admin/portal/packages/:id', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite editar pacotes.'
      );
      const item = await updatePortalPackage(
        req.portal.guild.id,
        parseInteger(req.params.id, 0),
        normalizePackageInput(req.body || {})
      );

      if (!item) {
        res.status(404).json({ error: 'Pacote nao encontrado.' });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Pacote de diamantes atualizado pela web',
        description: `${req.portal.user} atualizou o pacote ${item.name}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_package',
        entityId: String(item.id),
        details: {
          diamondAmount: item.diamondAmount,
          priceCents: item.priceCents,
          isActive: item.isActive
        }
      });

      res.json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/portal/packages/:id', requirePortalAdmin, async (req, res, next) => {
    try {
      assertPortalCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite remover pacotes.'
      );
      const item = await deletePortalPackage(req.portal.guild.id, parseInteger(req.params.id, 0));
      if (!item) {
        res.status(404).json({ error: 'Pacote nao encontrado.' });
        return;
      }

      await logAction({
        guild: req.portal.guild,
        guildId: req.portal.guild.id,
        type: 'admin_commands',
        title: 'Pacote de diamantes removido pela web',
        description: `${req.portal.user} removeu o pacote ${item.name}.`,
        actorId: req.portal.user.id,
        entityType: 'portal_package',
        entityId: String(item.id),
        details: {
          diamondAmount: item.diamondAmount
        }
      });

      res.json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao processar o portal.'
    });
  });

  return router;
}

module.exports = {
  createPortalRouter,
  requirePortalAuth,
  requirePortalAdmin
};
