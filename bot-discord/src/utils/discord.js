function normalizeDiscordId(input) {
  if (!input) return null;
  const cleaned = String(input).trim().replace(/[<@!>]/g, '');
  return /^\d{10,25}$/.test(cleaned) ? cleaned : null;
}

async function resolveMemberFromInput(guild, input) {
  const userId = normalizeDiscordId(input);
  if (!userId) return null;

  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    return null;
  }
}

function slugifyForChannel(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildTicketChannelName(categoryPrefix, username, userId) {
  const safeName = slugifyForChannel(username || 'usuario');
  const suffix = String(userId).slice(-4);
  return `ticket-${categoryPrefix}-${safeName || 'usuario'}-${suffix}`.slice(0, 95);
}

module.exports = {
  buildTicketChannelName,
  normalizeDiscordId,
  resolveMemberFromInput,
  slugifyForChannel
};
