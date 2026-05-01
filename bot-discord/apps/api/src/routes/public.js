const express = require('express');
const env = require('../../../../src/config/env');
const { getOnboardingSummary } = require('../../../../src/modules/onboarding/onboardingService');
const { ensurePortalData, getPortalSettings, listPortalNews, listPortalPackages, listPortalServers } = require('../../../../src/modules/portal/portalRepository');
const { getFiveMStatus } = require('../../../../src/modules/fivem/fivemService');
const { mapContentBlocks } = require('../lib/portalPayloads');

function resolvePortalGuildId() {
  return env.discordPrimaryGuildId || env.discordTestGuildId || null;
}

function createPublicRouter() {
  const router = express.Router();

  router.get('/portal', async (req, res, next) => {
    try {
      const guildId = resolvePortalGuildId();
      if (!guildId) {
        res.status(503).json({
          error: 'DISCORD_PRIMARY_GUILD_ID nao configurado para o portal.'
        });
        return;
      }

      await ensurePortalData(guildId);

      const [settings, news, servers, packages, contentBlocks, fivemStatus] = await Promise.all([
        getPortalSettings(guildId),
        listPortalNews(guildId, { onlyPublished: true, limit: 12 }),
        listPortalServers(guildId, { onlyActive: true }),
        listPortalPackages(guildId, { onlyActive: true }),
        getOnboardingSummary(guildId),
        getFiveMStatus()
      ]);

      res.json({
        guildId,
        settings,
        news,
        servers,
        packages,
        contentBlocks: mapContentBlocks(contentBlocks),
        fivemStatus,
        features: {
          loginEnabled: Boolean(env.discordOauthClientSecret),
          publicPortal: true
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao carregar os dados publicos do portal.'
    });
  });

  return router;
}

module.exports = {
  createPublicRouter
};
