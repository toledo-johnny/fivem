const env = require('./env');

function pickServerName() {
  return env.botShortName || env.botFooterName || env.fivem.serverName || 'FiveM RP';
}

const brand = {
  shortName: pickServerName(),
  footerName: env.botFooterName || pickServerName(),
  logoUrl: env.botLogoUrl || env.fivem.statusLogoUrl || null,
  presenceText: env.botPresenceText,
  palette: {
    primary: env.colors.primary,
    success: env.colors.success,
    error: env.colors.error,
    warning: env.colors.warning
  },
  labels: {
    staff: 'Staff',
    tickets: 'Tickets',
    whitelist: 'Whitelist',
    fivem: 'FiveM'
  },
  style: {
    tone: 'profissional-moderno',
    theme: 'rp-premium-limpo'
  }
};

function getBrandContext(guild) {
  return {
    guildName: guild?.name || brand.shortName,
    shortName: brand.shortName,
    footerName: brand.footerName,
    logoUrl: brand.logoUrl,
    presenceText: brand.presenceText,
    palette: brand.palette,
    labels: brand.labels
  };
}

module.exports = {
  brand,
  getBrandContext
};
