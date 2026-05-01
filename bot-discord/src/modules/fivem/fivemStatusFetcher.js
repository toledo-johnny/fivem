const env = require('../../config/env');

const DEFAULT_REFRESH_MINUTES = 2;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getRefreshMinutes() {
  const value = Number(env.fivem.statusRefreshMinutes || DEFAULT_REFRESH_MINUTES);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_REFRESH_MINUTES;
  }

  return Math.floor(value);
}

function normalizeButtonUrl(rawUrl) {
  if (!rawUrl) {
    return null;
  }

  let candidate = String(rawUrl).trim();
  if (!candidate) {
    return null;
  }

  if (!/^[a-z]+:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch (error) {
    return null;
  }
}

async function getFiveMStatus() {
  const refreshMinutes = getRefreshMinutes();
  const shared = {
    buttonUrl: normalizeButtonUrl(env.fivem.statusButtonUrl),
    connectUrl: env.fivem.connectUrl || 'Nao configurado',
    logoUrl: env.fivem.statusLogoUrl,
    bannerUrl: env.fivem.statusBannerUrl,
    name: env.fivem.serverName,
    refreshMinutes,
    updatedAt: new Date()
  };

  if (!env.fivem.statusBaseUrl) {
    return {
      configured: false,
      online: false,
      playersOnline: 0,
      playerLimit: 0,
      ...shared
    };
  }

  const baseUrl = env.fivem.statusBaseUrl.replace(/\/+$/, '');

  try {
    const [dynamic, info, players] = await Promise.all([
      fetchJson(`${baseUrl}/dynamic.json`),
      fetchJson(`${baseUrl}/info.json`).catch(() => null),
      fetchJson(`${baseUrl}/players.json`).catch(() => [])
    ]);

    return {
      ...shared,
      configured: true,
      online: true,
      name: dynamic?.hostname || info?.vars?.sv_projectName || shared.name,
      playersOnline: Array.isArray(players) ? players.length : Number(dynamic?.clients || 0),
      playerLimit: Number(dynamic?.sv_maxclients || info?.vars?.sv_maxclients || 0),
      connectUrl: env.fivem.connectUrl || `connect ${baseUrl.replace(/^https?:\/\//, '')}`,
      raw: {
        dynamic,
        info,
        players
      }
    };
  } catch (error) {
    return {
      configured: true,
      online: false,
      playersOnline: 0,
      playerLimit: 0,
      error,
      ...shared
    };
  }
}

module.exports = {
  getFiveMStatus,
  getRefreshMinutes,
  normalizeButtonUrl
};
