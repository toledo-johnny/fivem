function buildAvatarUrl(session) {
  if (!session?.userId) {
    return null;
  }

  if (session.avatar) {
    return `https://cdn.discordapp.com/avatars/${session.userId}/${session.avatar}.png?size=256`;
  }

  return `https://cdn.discordapp.com/embed/avatars/${Number(session.userId) % 5}.png`;
}

function buildDiscordChannelUrl(guildId, channelId) {
  if (!guildId || !channelId) {
    return null;
  }

  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function mapContentBlocks(items) {
  return Object.fromEntries((items || []).map((item) => [item.contentKey, item]));
}

function buildWhitelistState(player, application) {
  if (application) {
    return {
      status: application.status,
      application
    };
  }

  if (player?.whitelist) {
    return {
      status: 'approved',
      application: null
    };
  }

  return {
    status: 'not_started',
    application: null
  };
}

function buildPortalSessionResponse(context, data) {
  const guildId = context.guild.id;
  const settings = data.settings || {};

  return {
    session: {
      ...context.session,
      avatarUrl: buildAvatarUrl(context.session)
    },
    guild: {
      id: context.guild.id,
      name: context.guild.name,
      iconUrl: context.guild.iconURL({ size: 256 }) || null
    },
    access: context.access,
    player: data.player || null,
    whitelist: buildWhitelistState(data.player, data.latestWhitelist),
    tickets: data.tickets || [],
    servers: data.servers || [],
    packages: data.packages || [],
    contentBlocks: mapContentBlocks(data.contentBlocks),
    settings,
    fivemStatus: data.fivemStatus || null,
    links: {
      discordUrl: settings.discordUrl || null,
      connectUrl: settings.connectUrl || null,
      whitelistPanelUrl: buildDiscordChannelUrl(guildId, context.guildConfig.whitelistPanelChannelId),
      supportPanelUrl: buildDiscordChannelUrl(guildId, context.guildConfig.ticketPanelChannelId),
      discordLinked: Boolean(data.player?.discordLink?.hasAny)
    },
    capabilities: {
      whitelistWebForm: false,
      ticketCreationWeb: true,
      purchaseHistory: Array.isArray(data.paymentOrders),
      adminArea: Boolean(context.access.isStaff)
    },
    paymentOrders: data.paymentOrders || [],
    purchaseSummary: data.purchaseSummary || {
      totalOrders: 0,
      approvedOrders: 0,
      deliveredOrders: 0
    }
  };
}

module.exports = {
  buildAvatarUrl,
  buildDiscordChannelUrl,
  buildPortalSessionResponse,
  buildWhitelistState,
  mapContentBlocks
};
