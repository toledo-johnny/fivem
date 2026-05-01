const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { COPY } = require('../../config/copy');
const { DEFAULT_WHITELIST_SETTINGS } = require('../../config/constants');
const { blockField, buildEmbed, inlineField } = require('../../utils/embeds');

function normalizeQuestion(item, index) {
  const isFirst = index === 0;
  const isSecond = index === 1;
  const defaultKey = isFirst ? 'server_id' : isSecond ? 'character_name' : `question_${index + 1}`;

  if (typeof item === 'string') {
    return {
      key: defaultKey,
      label: item,
      placeholder: '',
      style: isFirst || isSecond ? 'short' : 'paragraph',
      required: true,
      maxLength: isFirst ? 10 : isSecond ? 32 : 1000
    };
  }

  return {
    key: item.key || defaultKey,
    label: item.label || `Pergunta ${index + 1}`,
    placeholder: item.placeholder || '',
    style: item.style === 'short' ? 'short' : 'paragraph',
    required: item.required !== false,
    maxLength: Number(item.maxLength || (isFirst ? 10 : isSecond ? 32 : 1000))
  };
}

function normalizeQuestionsInput(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length < 2) {
    throw new Error('O questionario precisa ter ao menos 2 perguntas.');
  }

  if (rawQuestions.length > 15) {
    throw new Error('O limite maximo e de 15 perguntas.');
  }

  const normalized = rawQuestions.map(normalizeQuestion);
  const keys = normalized.map((question) => question.key);

  if (!keys.includes('server_id') || !keys.includes('character_name')) {
    throw new Error('O questionario precisa incluir as chaves "server_id" e "character_name".');
  }

  return normalized;
}

function hydrateWhitelistSettings(input) {
  const settings = {
    ...DEFAULT_WHITELIST_SETTINGS,
    ...(input || {})
  };

  return {
    ...settings,
    questions: normalizeQuestionsInput(settings.questions || DEFAULT_WHITELIST_SETTINGS.questions)
  };
}

function paginateQuestions(questions, page) {
  const pageSize = 5;
  return questions.slice(page * pageSize, page * pageSize + pageSize);
}

function buildWhitelistPanelPayload(guild) {
  return {
    embeds: [
      buildEmbed(guild, {
        title: COPY.whitelist.panelTitle,
        description: COPY.whitelist.panelDescription,
        fields: [
          blockField('Como funciona', COPY.whitelist.panelFlow),
          blockField('Importante', COPY.whitelist.panelHint)
        ]
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('whitelist:start')
          .setLabel('Iniciar whitelist')
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

function buildContinueButton(applicationId, nextPage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`whitelist:continue:${applicationId}:${nextPage}`)
      .setLabel('Continuar formulario')
      .setStyle(ButtonStyle.Primary)
  );
}

function buildModerationButtons(applicationId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`whitelist:approve:${applicationId}`)
      .setLabel('Aprovar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`whitelist:reject:${applicationId}`)
      .setLabel('Reprovar')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildWhitelistModal(applicationId, page, questions, existingAnswers = {}) {
  const modal = new ModalBuilder()
    .setCustomId(`whitelist:page:${applicationId}:${page}`)
    .setTitle(`Whitelist - Etapa ${page + 1}`);

  const pageQuestions = paginateQuestions(questions, page);
  if (pageQuestions.length === 0) {
    throw new Error('Nao ha perguntas nesta etapa da whitelist.');
  }

  for (const question of pageQuestions) {
    const input = new TextInputBuilder()
      .setCustomId(`answer_${question.key}`)
      .setLabel(question.label.slice(0, 45))
      .setPlaceholder(question.placeholder?.slice(0, 100) || '')
      .setRequired(question.required !== false)
      .setStyle(question.style === 'short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
      .setMaxLength(Math.min(Number(question.maxLength || 1000), 4000));

    const existingValue = existingAnswers[question.key];
    if (existingValue) {
      input.setValue(String(existingValue).slice(0, 4000));
    }

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  return modal;
}

function formatReviewFields(questions, answers) {
  return questions.map((question) => ({
    name: question.label.slice(0, 256),
    value: String(answers[question.key] || 'Nao respondido').slice(0, 1024),
    inline: false
  }));
}

function buildWhitelistReviewEmbed(guild, application, settings, options = {}) {
  return buildEmbed(guild, {
    title: options.title || COPY.whitelist.pendingTitle,
    description:
      options.description ||
      COPY.whitelist.pendingDescription(`<@${application.userId}>`),
    fields: [
      inlineField('Usuario', `<@${application.userId}>`),
      inlineField('ID informado', application.userServerId || 'Nao informado'),
      inlineField('Personagem', application.characterName || 'Nao informado'),
      inlineField('Revisor', application.reviewerId ? `<@${application.reviewerId}>` : 'Pendente'),
      ...(application.rejectionReason ? [blockField('Motivo', application.rejectionReason)] : []),
      ...formatReviewFields(settings.questions, application.answers)
    ].slice(0, 25)
  });
}

function buildRejectModal(applicationId) {
  const modal = new ModalBuilder()
    .setCustomId(`whitelist:reject_modal:${applicationId}`)
    .setTitle('Reprovar whitelist');

  const reasonInput = new TextInputBuilder()
    .setCustomId('rejection_reason')
    .setLabel('Motivo da reprovacao')
    .setPlaceholder('Explique para o usuario por que a whitelist foi reprovada.')
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

module.exports = {
  buildContinueButton,
  buildModerationButtons,
  buildRejectModal,
  buildWhitelistModal,
  buildWhitelistPanelPayload,
  buildWhitelistReviewEmbed,
  formatReviewFields,
  hydrateWhitelistSettings,
  normalizeQuestion,
  normalizeQuestionsInput,
  paginateQuestions
};
