const { COPY } = require('../../config/copy');
const { CONTENT_BLOCK_TYPES } = require('../../config/constants');
const { blockField, buildEmbed, inlineField } = require('../../utils/embeds');

function splitBodyIntoFields(bodyText, chunkSize = 900) {
  const text = String(bodyText || '').trim();
  if (!text) {
    return [blockField('Conteudo', 'Nenhum conteudo configurado.')];
  }

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + '\n' + line).trim().length > chunkSize) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = line;
      continue;
    }

    current = current ? `${current}\n${line}` : line;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.slice(0, 10).map((chunk, index) =>
    blockField(index === 0 ? 'Conteudo' : `Continua${index + 1}`, chunk)
  );
}

function resolveDefaultTitle(panelType) {
  switch (panelType) {
    case CONTENT_BLOCK_TYPES.RULES:
      return COPY.onboarding.rulesTitle;
    case CONTENT_BLOCK_TYPES.FAQ:
      return COPY.onboarding.faqTitle;
    case CONTENT_BLOCK_TYPES.CHANGELOG:
      return COPY.onboarding.changelogTitle;
    case CONTENT_BLOCK_TYPES.HELP_CENTER:
      return COPY.onboarding.helpCenterTitle;
    default:
      return 'Painel';
  }
}

function buildOnboardingPanelPayload(guild, panelType, block) {
  const embed = buildEmbed(guild, {
    title: block?.title || resolveDefaultTitle(panelType),
    description:
      panelType === CONTENT_BLOCK_TYPES.HELP_CENTER
        ? COPY.onboarding.helpCommandDescription
        : undefined,
    fields: splitBodyIntoFields(block?.bodyText)
  });

  return {
    embeds: [embed],
    components: []
  };
}

function buildHelpCommandEmbed(guild, options = {}) {
  return buildEmbed(guild, {
    title: COPY.onboarding.helpCommandTitle,
    description: COPY.onboarding.helpCommandDescription,
    fields: [
      inlineField('Status FiveM', options.statusPanel || 'Use /status'),
      inlineField('Whitelist', options.whitelistPanel || 'Use o painel de whitelist'),
      inlineField('Tickets', options.ticketPanel || 'Use o painel de tickets'),
      blockField('Onboarding', options.helpCenter || 'Consulte os paineis publicos de onboarding.')
    ]
  });
}

function buildAnnouncementEmbed(guild, title, description, tone = 'announcement') {
  const resolvedTitle =
    COPY.onboarding.announceTypes[tone] || COPY.onboarding.announceTitle;

  return buildEmbed(guild, {
    title: title || resolvedTitle,
    description
  });
}

module.exports = {
  buildAnnouncementEmbed,
  buildHelpCommandEmbed,
  buildOnboardingPanelPayload
};
