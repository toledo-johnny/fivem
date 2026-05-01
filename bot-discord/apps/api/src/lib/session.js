const crypto = require('node:crypto');
const cookie = require('cookie');
const env = require('../../../../src/config/env');

const SESSION_COOKIE = 'bot_dashboard_session';
const OAUTH_STATE_COOKIE = 'bot_dashboard_state';

function isSecureCookie() {
  return env.dashboard.baseUrl.startsWith('https://');
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', env.dashboard.sessionSecret)
    .update(payload)
    .digest('base64url');
}

function encodePayload(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function serializeCookie(name, value, options = {}) {
  return cookie.serialize(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isSecureCookie(),
    ...options
  });
}

function parseCookies(req) {
  return cookie.parse(req.headers.cookie || '');
}

function createSignedToken(payload) {
  const encoded = encodePayload(payload);
  return `${encoded}.${signPayload(encoded)}`;
}

function readSignedToken(rawToken) {
  if (!rawToken || !rawToken.includes('.')) {
    return null;
  }

  const [encoded, signature] = rawToken.split('.', 2);
  if (!encoded || !signature) {
    return null;
  }

  const expected = signPayload(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return decodePayload(encoded);
  } catch (error) {
    return null;
  }
}

function setSessionCookie(res, payload) {
  const serialized = serializeCookie(SESSION_COOKIE, createSignedToken(payload), {
    maxAge: 60 * 60 * 8
  });

  if (typeof res.append === 'function') {
    res.append('Set-Cookie', serialized);
    return;
  }

  res.setHeader('Set-Cookie', serialized);
}

function clearSessionCookie(res) {
  res.append(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, '', {
      maxAge: 0
    })
  );
}

function readSessionCookie(req) {
  const cookies = parseCookies(req);
  return readSignedToken(cookies[SESSION_COOKIE]);
}

function setOAuthStateCookie(res, payload) {
  res.append(
    'Set-Cookie',
    serializeCookie(OAUTH_STATE_COOKIE, createSignedToken(payload), {
      maxAge: 60 * 10
    })
  );
}

function clearOAuthStateCookie(res) {
  res.append(
    'Set-Cookie',
    serializeCookie(OAUTH_STATE_COOKIE, '', {
      maxAge: 0
    })
  );
}

function readOAuthStateCookie(req) {
  const cookies = parseCookies(req);
  return readSignedToken(cookies[OAUTH_STATE_COOKIE]);
}

module.exports = {
  clearOAuthStateCookie,
  clearSessionCookie,
  parseCookies,
  readOAuthStateCookie,
  readSessionCookie,
  setOAuthStateCookie,
  setSessionCookie
};
