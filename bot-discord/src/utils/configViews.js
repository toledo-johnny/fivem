const { COPY } = require('../config/copy');
const { LOG_TYPES } = require('../config/constants');

function formatChannelReference(channelId) {
  return channelId ? `<#${channelId}>` : COPY.common.notConfigured;
}

function formatRoleReference(roleId) {
  return roleId ? `<@&${roleId}>` : COPY.common.notConfigured;
}

function formatMessageReference(messageId) {
  return messageId || COPY.common.notConfigured;
}

function formatPanelState(panel) {
  if (!panel) {
    return COPY.common.notConfigured;
  }

  if (panel.messageId) {
    return COPY.common.published;
  }

  if (panel.metadata?.needsRepublish) {
    return 'Requer republicacao';
  }

  return COPY.common.pending;
}

function buildTicketConfigFields(guildConfig) {
  return [
    {
      name: 'Categoria de tickets',
      value: formatChannelReference(guildConfig.ticketCategoryId),
      inline: true
    },
    {
      name: 'Canal do painel',
      value: formatChannelReference(guildConfig.ticketPanelChannelId),
      inline: true
    },
    {
      name: 'Mensagem do painel',
      value: formatMessageReference(guildConfig.ticketPanelMessageId),
      inline: true
    },
    {
      name: 'Cargo suporte',
      value: formatRoleReference(guildConfig.supportRoleId || guildConfig.staffRoleId),
      inline: true
    },
    {
      name: 'Cargo admin',
      value: formatRoleReference(guildConfig.adminRoleId || guildConfig.staffRoleId),
      inline: true
    },
    {
      name: 'Cargo owner',
      value: formatRoleReference(guildConfig.ownerRoleId),
      inline: true
    }
  ];
}

function buildWhitelistConfigFields(guildConfig) {
  const settings = guildConfig.whitelistSettings;

  return [
    {
      name: 'Canal do painel',
      value: formatChannelReference(guildConfig.whitelistPanelChannelId),
      inline: true
    },
    {
      name: 'Canal de revisao',
      value: formatChannelReference(guildConfig.whitelistReviewChannelId),
      inline: true
    },
    {
      name: 'Cargo aprovado',
      value: formatRoleReference(guildConfig.whitelistRoleId),
      inline: true
    },
    {
      name: 'Cargo nao verificado',
      value: formatRoleReference(guildConfig.unverifiedRoleId),
      inline: true
    },
    {
      name: 'Cooldown',
      value: `${settings.cooldownMinutes} minuto(s)`,
      inline: true
    },
    {
      name: 'Limite de tentativas',
      value: `${settings.attemptLimit}`,
      inline: true
    },
    {
      name: 'Nova tentativa',
      value: settings.allowRetry ? 'Permitida' : 'Bloqueada',
      inline: true
    },
    {
      name: 'Perguntas configuradas',
      value: `${settings.questions.length}`,
      inline: true
    }
  ];
}

function buildFiveMPanelFields(panel) {
  return [
    {
      name: 'Painel FiveM',
      value: formatPanelState(panel),
      inline: true
    },
    {
      name: 'Canal do painel',
      value: formatChannelReference(panel?.channelId),
      inline: true
    },
    {
      name: 'Mensagem do painel',
      value: formatMessageReference(panel?.messageId),
      inline: true
    }
  ];
}

function buildOnboardingPanelFields(panels) {
  return [
    {
      name: 'Regras',
      value: formatPanelState(panels?.rules),
      inline: true
    },
    {
      name: 'FAQ',
      value: formatPanelState(panels?.faq),
      inline: true
    },
    {
      name: 'Changelog',
      value: formatPanelState(panels?.changelog),
      inline: true
    },
    {
      name: 'Central de ajuda',
      value: formatPanelState(panels?.help_center),
      inline: true
    }
  ];
}

function buildLogFields(guildConfig) {
  return LOG_TYPES.map((logType) => ({
    name: logType.label,
    value: formatChannelReference(guildConfig.logChannels?.[logType.key]),
    inline: true
  }));
}

function buildBotHealthFields(client, guildConfig, databaseStatus) {
  return [
    {
      name: 'Discord',
      value: 'Online',
      inline: true
    },
    {
      name: 'Banco MySQL',
      value: databaseStatus,
      inline: true
    },
    {
      name: 'Comandos',
      value: String(client.commands.size),
      inline: true
    },
    {
      name: 'Botoes',
      value: String(client.buttons.length),
      inline: true
    },
    {
      name: 'Modais',
      value: String(client.modals.length),
      inline: true
    },
    {
      name: 'Logs ativos',
      value: String(countConfiguredLogs(guildConfig)),
      inline: true
    },
    {
      name: 'Uptime',
      value: `${Math.floor((client.uptime || 0) / 1000)}s`,
      inline: true
    }
  ];
}

function buildOperationalFields(overview) {
  return [
    {
      name: 'Discord',
      value: overview.health.discord,
      inline: true
    },
    {
      name: 'Banco MySQL',
      value: overview.health.database,
      inline: true
    },
    {
      name: 'API Dashboard',
      value: overview.health.api,
      inline: true
    },
    {
      name: 'Tickets abertos',
      value: String(overview.counts.openTickets),
      inline: true
    },
    {
      name: 'Whitelists pendentes',
      value: String(overview.counts.pendingWhitelists),
      inline: true
    },
    {
      name: 'Paineis ativos',
      value: String(overview.counts.panels),
      inline: true
    },
    {
      name: 'Heartbeat scheduler',
      value: overview.health.schedulerHeartbeatAt
        ? `${overview.health.schedulerHeartbeatAgeSeconds}s atras`
        : COPY.common.notConfigured,
      inline: true
    },
    {
      name: 'Ultima reconciliacao',
      value: overview.health.lastReconciliationAt
        ? `${overview.health.lastReconciliationAgeSeconds}s atras`
        : COPY.common.notConfigured,
      inline: true
    },
    {
      name: 'Blocos onboarding',
      value: String(overview.counts.contentBlocks),
      inline: true
    }
  ];
}

function countConfiguredLogs(guildConfig) {
  return LOG_TYPES.filter((type) => Boolean(guildConfig.logChannels?.[type.key])).length;
}

module.exports = {
  buildBotHealthFields,
  buildFiveMPanelFields,
  buildLogFields,
  buildOnboardingPanelFields,
  buildOperationalFields,
  buildTicketConfigFields,
  buildWhitelistConfigFields,
  countConfiguredLogs
};
