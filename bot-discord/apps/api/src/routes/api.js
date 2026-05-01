const express = require('express');
const { COPY } = require('../../../../src/config/copy');
const { CONTENT_BLOCK_TYPES } = require('../../../../src/config/constants');
const { getSystemOverview } = require('../../../../src/modules/system/overviewService');
const {
  ensureGuildConfig,
  listPanelsForGuild,
  updateGuildConfig
} = require('../../../../src/modules/config/configRepository');
const { listAuditLogs, logAction } = require('../../../../src/modules/logs/logService');
const {
  getOnboardingSummary,
  updateContentAndRepublish
} = require('../../../../src/modules/onboarding/onboardingService');
const {
  getTicketById,
  listActiveTicketMembers,
  listTickets
} = require('../../../../src/modules/tickets/ticketRepository');
const {
  getApplicationById,
  listApplications
} = require('../../../../src/modules/whitelist/whitelistRepository');
const {
  approveApplicationByActor,
  normalizeQuestionsInput,
  rejectApplicationByActor
} = require('../../../../src/modules/whitelist/whitelistService');
const {
  assertAccessCapability,
  createHttpError,
  getPortalAccessContext
} = require('../lib/dashboardAccess');
const { readSessionCookie } = require('../lib/session');

async function requireDashboardAuth(req, res, next) {
  try {
    const session = readSessionCookie(req);
    if (!session?.userId) {
      throw createHttpError(401, COPY.api.unauthorized);
    }

    const context = await getPortalAccessContext(session.userId);
    if (!context.access.isStaff) {
      throw createHttpError(403, 'Seu usuario nao possui permissao para acessar o dashboard.');
    }

    req.dashboard = {
      ...context,
      session
    };
    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({
      error: error.message || COPY.api.unauthorized
    });
  }
}

function assertDashboardCapability(req, capabilityKey, message) {
  return assertAccessCapability(req.dashboard, capabilityKey, message);
}

async function decorateUsers(guild, userIds) {
  const distinctUserIds = [...new Set((userIds || []).filter(Boolean))];
  const map = {};

  await Promise.all(
    distinctUserIds.map(async (userId) => {
      const member = await guild.members.fetch(userId).catch(() => null);
      map[userId] = member
        ? {
            id: member.id,
            username: member.user.username,
            displayName: member.displayName
          }
        : {
            id: userId,
            username: null,
            displayName: null
          };
    })
  );

  return map;
}

function buildConfigPatch(body) {
  const next = {};

  const stringFields = [
    'supportRoleId',
    'adminRoleId',
    'ownerRoleId',
    'staffRoleId',
    'whitelistRoleId',
    'unverifiedRoleId',
    'ticketCategoryId',
    'ticketPanelChannelId',
    'whitelistPanelChannelId',
    'whitelistReviewChannelId'
  ];

  for (const field of stringFields) {
    if (field in body) {
      next[field] = body[field] ? String(body[field]).trim() : null;
    }
  }

  if (body.logChannels && typeof body.logChannels === 'object') {
    next.logChannels = body.logChannels;
  }

  if (body.whitelistSettings && typeof body.whitelistSettings === 'object') {
    next.whitelistSettings = {
      ...body.whitelistSettings
    };

    if (Array.isArray(body.whitelistSettings.questions)) {
      next.whitelistSettings.questions = normalizeQuestionsInput(body.whitelistSettings.questions);
    }
  }

  return next;
}

function createApiRouter(client) {
  const router = express.Router();

  router.use(requireDashboardAuth);

  router.get('/overview', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManageTickets',
        'Seu nivel de acesso nao permite abrir o overview operacional.'
      );
      const overview = await getSystemOverview(null, req.dashboard.guild.id);
      res.json({
        session: req.dashboard.session,
        guild: {
          id: req.dashboard.guild.id,
          name: req.dashboard.guild.name
        },
        overview
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tickets', async (req, res, next) => {
    try {
      assertDashboardCapability(req, 'canManageTickets', 'Apenas a equipe pode listar tickets.');
      const tickets = await listTickets(req.dashboard.guild.id, {
        status: req.query.status || null,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      });
      const users = await decorateUsers(
        req.dashboard.guild,
        tickets.flatMap((ticket) => [ticket.ownerId, ticket.claimedBy]).filter(Boolean)
      );

      res.json({
        items: tickets.map((ticket) => ({
          ...ticket,
          owner: users[ticket.ownerId] || null,
          claimedByUser: ticket.claimedBy ? users[ticket.claimedBy] || null : null
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tickets/:id', async (req, res, next) => {
    try {
      assertDashboardCapability(req, 'canManageTickets', 'Apenas a equipe pode consultar tickets.');
      const ticket = await getTicketById(Number(req.params.id));
      if (!ticket || ticket.guildId !== req.dashboard.guild.id) {
        res.status(404).json({ error: 'Ticket nao encontrado.' });
        return;
      }

      const members = await listActiveTicketMembers(ticket.id);
      const users = await decorateUsers(
        req.dashboard.guild,
        [ticket.ownerId, ticket.claimedBy, ...members.map((entry) => entry.userId)].filter(Boolean)
      );

      res.json({
        item: {
          ...ticket,
          owner: users[ticket.ownerId] || null,
          claimedByUser: ticket.claimedBy ? users[ticket.claimedBy] || null : null,
          members: members.map((entry) => ({
            ...entry,
            user: users[entry.userId] || null
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/whitelists', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManageWhitelists',
        'Apenas a equipe pode listar whitelists.'
      );
      const applications = await listApplications(req.dashboard.guild.id, {
        status: req.query.status || null,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      });
      const users = await decorateUsers(
        req.dashboard.guild,
        applications.flatMap((application) => [application.userId, application.reviewerId]).filter(Boolean)
      );

      res.json({
        items: applications.map((application) => ({
          ...application,
          applicant: users[application.userId] || null,
          reviewer: application.reviewerId ? users[application.reviewerId] || null : null
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/whitelists/:id/approve', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManageWhitelists',
        'Seu nivel de acesso nao permite aprovar whitelists.'
      );
      const result = await approveApplicationByActor({
        guild: req.dashboard.guild,
        member: req.dashboard.member,
        actorUser: req.dashboard.user,
        applicationId: Number(req.params.id)
      });

      res.json({
        item: result.application,
        syncResult: result.syncResult
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/whitelists/:id/reject', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManageWhitelists',
        'Seu nivel de acesso nao permite reprovar whitelists.'
      );
      const reason = String(req.body?.reason || '').trim();
      if (!reason) {
        throw createHttpError(400, 'Informe o motivo da reprovacao.');
      }

      const application = await rejectApplicationByActor({
        guild: req.dashboard.guild,
        member: req.dashboard.member,
        actorUser: req.dashboard.user,
        applicationId: Number(req.params.id),
        reason
      });

      res.json({
        item: application
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/config', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite visualizar as configuracoes administrativas.'
      );
      const [guildConfig, panels, contentBlocks] = await Promise.all([
        ensureGuildConfig(req.dashboard.guild.id),
        listPanelsForGuild(req.dashboard.guild.id),
        getOnboardingSummary(req.dashboard.guild.id)
      ]);

      res.json({
        guildConfig,
        panels,
        contentBlocks
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/config', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManageSettings',
        'Apenas owners podem alterar as configuracoes criticas do sistema.'
      );
      const patch = buildConfigPatch(req.body || {});
      const updatedConfig = await updateGuildConfig(req.dashboard.guild.id, patch);

      await logAction({
        guild: req.dashboard.guild,
        guildId: req.dashboard.guild.id,
        type: 'admin_commands',
        title: 'Configuracao atualizada pelo dashboard',
        description: `${req.dashboard.user} atualizou configuracoes administrativas pela web.`,
        actorId: req.dashboard.user.id,
        entityType: 'dashboard_config',
        entityId: req.dashboard.guild.id,
        details: {
          patchKeys: Object.keys(patch)
        }
      });

      res.json({
        guildConfig: updatedConfig
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/logs', async (req, res, next) => {
    try {
      assertDashboardCapability(req, 'canReadLogs', 'Seu nivel de acesso nao permite ler logs.');
      const logs = await listAuditLogs({
        guildId: req.dashboard.guild.id,
        eventType: req.query.type || null,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      });

      res.json({
        items: logs
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/content', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite visualizar o conteudo do portal.'
      );
      const items = await getOnboardingSummary(req.dashboard.guild.id);
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.put('/content/:key', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManagePortal',
        'Seu nivel de acesso nao permite editar o conteudo do portal.'
      );
      const contentKey = String(req.params.key);
      if (!Object.values(CONTENT_BLOCK_TYPES).includes(contentKey)) {
        throw createHttpError(400, 'Bloco de conteudo invalido.');
      }

      const title = String(req.body?.title || '').trim();
      const bodyText = String(req.body?.bodyText || '').trim();
      if (!title || !bodyText) {
        throw createHttpError(400, 'Titulo e conteudo sao obrigatorios.');
      }

      const item = await updateContentAndRepublish(
        req.dashboard.guild,
        contentKey,
        {
          title,
          bodyText,
          metadata: req.body?.metadata || {}
        },
        req.dashboard.user.id
      );

      res.json({
        item
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/whitelists/:id', async (req, res, next) => {
    try {
      assertDashboardCapability(
        req,
        'canManageWhitelists',
        'Seu nivel de acesso nao permite consultar esta whitelist.'
      );
      const application = await getApplicationById(Number(req.params.id));
      if (!application || application.guildId !== req.dashboard.guild.id) {
        res.status(404).json({ error: 'Whitelist nao encontrada.' });
        return;
      }

      res.json({
        item: application
      });
    } catch (error) {
      next(error);
    }
  });

  router.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha interna na API.'
    });
  });

  return router;
}

module.exports = {
  createApiRouter,
  requireDashboardAuth
};
