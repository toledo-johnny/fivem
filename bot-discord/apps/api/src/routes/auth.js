const crypto = require('node:crypto');
const express = require('express');
const env = require('../../../../src/config/env');
const { COPY } = require('../../../../src/config/copy');
const { getPortalAccessContext } = require('../lib/dashboardAccess');
const {
  clearOAuthStateCookie,
  clearSessionCookie,
  readOAuthStateCookie,
  setOAuthStateCookie,
  setSessionCookie
} = require('../lib/session');
const DEFAULT_RETURN_TO = `${env.dashboard.webOrigin.replace(/\/+$/, '')}/dashboard`;
const LOGIN_ERROR_URL = `${env.dashboard.webOrigin.replace(/\/+$/, '')}/login`;

function sanitizeReturnTo(input) {
  if (!input) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const target = new URL(input);
    const allowedOrigins = (env.dashboard.webOrigins || [env.dashboard.webOrigin]).map(
      (origin) => new URL(origin).origin
    );
    if (!allowedOrigins.includes(target.origin)) {
      return DEFAULT_RETURN_TO;
    }

    return target.toString();
  } catch (error) {
    return DEFAULT_RETURN_TO;
  }
}

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: env.discordClientId,
    client_secret: env.discordOauthClientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.discordOauthRedirectUri
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Falha ao trocar codigo OAuth (${response.status}).`);
  }

  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao obter usuario do Discord (${response.status}).`);
  }

  return response.json();
}

function createAuthRouter() {
  const router = express.Router();

  router.get('/discord/login', async (req, res) => {
    if (!env.discordOauthClientSecret) {
      res.status(503).json({
        error: COPY.api.authUnavailable
      });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    const returnTo = sanitizeReturnTo(req.query.return_to || req.query.returnTo);
    setOAuthStateCookie(res, {
      state,
      returnTo
    });

    const params = new URLSearchParams({
      client_id: env.discordClientId,
      redirect_uri: env.discordOauthRedirectUri,
      response_type: 'code',
      scope: 'identify',
      state
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  });

  router.get('/discord/callback', async (req, res) => {
    const oauthState = readOAuthStateCookie(req);
    clearOAuthStateCookie(res);

    if (!oauthState || oauthState.state !== req.query.state) {
      clearSessionCookie(res);
      res.redirect(`${LOGIN_ERROR_URL}?error=oauth_state_invalid`);
      return;
    }

    try {
      const token = await exchangeCodeForToken(req.query.code);
      const discordUser = await fetchDiscordUser(token.access_token);
      const access = await getPortalAccessContext(discordUser.id);

      setSessionCookie(res, {
        userId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name || null,
        avatar: discordUser.avatar || null,
        guildId: access.guild.id,
        issuedAt: new Date().toISOString()
      });

      res.redirect(oauthState.returnTo || env.dashboard.webOrigin);
    } catch (error) {
      clearSessionCookie(res);
      res.redirect(`${LOGIN_ERROR_URL}?error=dashboard_access_denied`);
    }
  });

  router.all('/logout', (req, res) => {
    clearSessionCookie(res);
    clearOAuthStateCookie(res);
    res.status(204).end();
  });

  return router;
}

module.exports = {
  createAuthRouter
};
