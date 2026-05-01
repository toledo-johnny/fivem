function normalizeStoredDiscord(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = String(value).trim();
  if (
    !normalized ||
    normalized === '0' ||
    /^discord:0$/i.test(normalized) ||
    /^<@!?0>$/.test(normalized)
  ) {
    return '';
  }

  return normalized;
}

function hasDiscordIdentifier(value) {
  const normalized = normalizeStoredDiscord(value);
  return Boolean(normalized && normalized !== '0');
}

function buildDiscordIdentifier(userId) {
  const normalized = normalizeStoredDiscord(userId);
  return normalized ? `discord:${normalized}` : '';
}

function getDiscordIdentifiers(userId) {
  const normalized = normalizeStoredDiscord(userId);
  if (!normalized) {
    return [];
  }

  return [
    normalized,
    buildDiscordIdentifier(normalized),
    `<@${normalized}>`,
    `<@!${normalized}>`
  ];
}

function matchesDiscordIdentifier(storedValue, userId) {
  const normalized = normalizeStoredDiscord(storedValue);
  if (!hasDiscordIdentifier(normalized)) {
    return false;
  }

  return new Set(getDiscordIdentifiers(userId)).has(normalized);
}

function extractDiscordUserId(storedValue) {
  const normalized = normalizeStoredDiscord(storedValue);
  if (!hasDiscordIdentifier(normalized)) {
    return null;
  }

  const prefixed = normalized.match(/^discord:(\d{6,})$/i);
  if (prefixed) {
    return prefixed[1];
  }

  const mention = normalized.match(/^<@!?(\d{6,})>$/);
  if (mention) {
    return mention[1];
  }

  if (/^\d{6,}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

module.exports = {
  buildDiscordIdentifier,
  extractDiscordUserId,
  getDiscordIdentifiers,
  hasDiscordIdentifier,
  matchesDiscordIdentifier,
  normalizeStoredDiscord
};
