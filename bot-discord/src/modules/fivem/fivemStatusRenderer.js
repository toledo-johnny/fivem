const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBrandContext } = require('../../config/brand');
const { COPY } = require('../../config/copy');
const { blockField, buildEmbed, inlineField } = require('../../utils/embeds');

function getPlayersDisplay(status) {
  return `${status.playersOnline} / ${status.playerLimit || '?'}`;
}

function getStatusDisplay(status) {
  return status.online ? 'ONLINE' : 'OFFLINE';
}

function formatUpdatedAt(updatedAt) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(updatedAt);
}

function buildDescription(status) {
  const summary = !status.configured
    ? COPY.fivem.notConfigured
    : status.online
      ? COPY.fivem.configuredOnline
      : COPY.fivem.configuredOffline;

  return [
    summary,
    COPY.fivem.updateLine(status.refreshMinutes, formatUpdatedAt(status.updatedAt))
  ].join('\n');
}

function buildFiveMStatusFields(status) {
  return [
    inlineField('Status', `\`${getStatusDisplay(status)}\``),
    inlineField('Jogadores', `\`${getPlayersDisplay(status)}\``),
    blockField(
      COPY.fivem.connectLabel,
      `\`\`\`txt\n${status.connectUrl || 'Nao configurado'}\n\`\`\``
    )
  ];
}

function buildFiveMStatusEmbed(guild, status, options = {}) {
  const brand = getBrandContext(guild);
  const embed = buildEmbed(guild, {
    title: status.name,
    description: buildDescription(status),
    fields: buildFiveMStatusFields(status),
    thumbnail: status.logoUrl || brand.logoUrl || null,
    image: status.bannerUrl || null,
    footerText: `${brand.footerName} | ${COPY.fivem.statusTitle}`
  });

  if (options.includeDiagnostics && status.error) {
    embed.addFields(
      blockField('Detalhe do erro', String(status.error.message || status.error).slice(0, 1024))
    );
  }

  return embed;
}

function buildFiveMStatusComponents(status) {
  if (!status.buttonUrl) {
    return [];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(COPY.fivem.buttonLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(status.buttonUrl)
    )
  ];
}

function buildFiveMStatusPayload(guild, status, options = {}) {
  return {
    embeds: [buildFiveMStatusEmbed(guild, status, options)],
    components: buildFiveMStatusComponents(status)
  };
}

module.exports = {
  buildFiveMStatusEmbed,
  buildFiveMStatusPayload
};
