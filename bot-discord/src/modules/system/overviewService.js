const { PANEL_TYPES } = require('../../config/constants');
const { getBotClient } = require('../../bot/runtime');
const { pingDatabase } = require('../../database/mysql');
const { countConfiguredLogs } = require('../../utils/configViews');
const {
  getApiServer,
  getLastReconciliation,
  getSchedulerHeartbeat
} = require('../../bot/runtime');
const {
  countPanelsForGuild,
  ensureGuildConfig,
  getPanel
} = require('../config/configRepository');
const { ensureDefaultContentBlocks, listContentBlocks } = require('../onboarding/contentRepository');
const {
  countPlayers,
  countWhitelistedPlayers,
  getPlayerDiamondTotals
} = require('../players/playerRepository');
const { countOpenTickets } = require('../tickets/ticketRepository');
const { countPendingApplications } = require('../whitelist/whitelistRepository');
const { getFinanceSummary } = require('../finance/financeRepository');
const { getFiveMStatus } = require('../fivem/fivemService');
const { listSystemJobs } = require('./jobRepository');

function computeAgeSeconds(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
}

async function getSystemOverview(client, guildId) {
  const runtimeClient = client || getBotClient();
  const discordReady = Boolean(runtimeClient?.isReady?.());
  const guildConfig = await ensureGuildConfig(guildId);
  await ensureDefaultContentBlocks(guildId);

  let databaseStatus = 'OK';
  try {
    await pingDatabase();
  } catch (error) {
    databaseStatus = 'Falha';
  }

  const [
    panelCount,
    statusPanel,
    openTickets,
    pendingWhitelists,
    contentBlocks,
    jobs,
    totalPlayers,
    totalWhitelistedPlayers,
    diamondTotals,
    financeSummary,
    fivemStatus
  ] = await Promise.all([
    countPanelsForGuild(guildId),
    getPanel(guildId, PANEL_TYPES.FIVEM_STATUS),
    countOpenTickets(guildId),
    countPendingApplications(guildId),
    listContentBlocks(guildId),
    listSystemJobs(),
    countPlayers(),
    countWhitelistedPlayers(),
    getPlayerDiamondTotals(),
    getFinanceSummary(),
    getFiveMStatus()
  ]);

  const schedulerHeartbeatAt = getSchedulerHeartbeat();
  const lastReconciliationAt = getLastReconciliation();
  const apiServer = getApiServer();

  return {
    guildConfig,
    statusPanel,
    health: {
      discord: discordReady ? 'Online' : 'Offline',
      database: databaseStatus,
      api: apiServer?.listening ? 'Online' : 'Offline',
      schedulerHeartbeatAt,
      schedulerHeartbeatAgeSeconds: computeAgeSeconds(schedulerHeartbeatAt),
      lastReconciliationAt,
      lastReconciliationAgeSeconds: computeAgeSeconds(lastReconciliationAt)
    },
    counts: {
      commands: runtimeClient?.commands?.size || 0,
      buttons: runtimeClient?.buttons?.length || 0,
      modals: runtimeClient?.modals?.length || 0,
      logsConfigured: countConfiguredLogs(guildConfig),
      panels: panelCount,
      openTickets,
      pendingWhitelists,
      contentBlocks: contentBlocks.length,
      totalPlayers,
      whitelistedPlayers: totalWhitelistedPlayers,
      diamondsInCirculation: diamondTotals
    },
    runtime: {
      uptimeSeconds: Math.floor(((runtimeClient?.uptime || 0) / 1000))
    },
    finance: financeSummary.totals,
    fivem: fivemStatus,
    jobs
  };
}

module.exports = {
  getSystemOverview
};
