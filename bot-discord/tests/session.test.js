const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCookies,
  readSessionCookie,
  setSessionCookie
} = require('../apps/api/src/lib/session');

test('dashboard session cookie is serialized and parsed', async () => {
  const headers = {};
  const responseLike = {
    setHeader(name, value) {
      headers[name] = value;
    }
  };

  setSessionCookie(responseLike, {
    userId: '123',
    username: 'tester',
    guildId: '456',
    issuedAt: new Date().toISOString()
  });

  const cookieHeader = headers['Set-Cookie'];
  const reqLike = {
    headers: {
      cookie: Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader
    }
  };

  const parsed = parseCookies(reqLike);
  assert.ok(parsed.bot_dashboard_session);

  const session = readSessionCookie(reqLike);
  assert.equal(session.userId, '123');
  assert.equal(session.guildId, '456');
});
