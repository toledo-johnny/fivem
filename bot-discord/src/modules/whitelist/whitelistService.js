const { COPY } = require('../../config/copy');
const { PANEL_TYPES, WHITELIST_STATUS } = require('../../config/constants');
const { withLockedConnection, withLockedTransaction } = require('../../database/locks');
const { inlineField } = require('../../utils/embeds');
const { ensureGuildConfig } = require('../config/configRepository');
const { logAction } = require('../logs/logService');
const {
  createOrResetDraftApplication,
  getApplicationById,
  getAttemptState,
  getLatestApplicationForUser,
  saveAttemptState,
  updateApplication
} = require('./whitelistRepository');
const {
  approveApplicationByActor,
  rejectApplicationByActor
} = require('./whitelistModerationService');
const {
  buildContinueButton,
  buildModerationButtons,
  buildRejectModal,
  buildWhitelistModal,
  buildWhitelistPanelPayload,
  buildWhitelistReviewEmbed,
  hydrateWhitelistSettings,
  normalizeQuestionsInput,
  paginateQuestions
} = require('./whitelistViews');
const { publishPanel } = require('../../services/discord/panelPublisher');

async function publishWhitelistPanel(channel, guildConfig) {
  return publishPanel({
    guildConfig,
    panelType: PANEL_TYPES.WHITELIST,
    channel,
    payload: buildWhitelistPanelPayload(channel.guild)
  });
}

async function startWhitelistApplication(interaction) {
  const guildConfig = await ensureGuildConfig(interaction.guild.id);
  const settings = hydrateWhitelistSettings(guildConfig.whitelistSettings);

  if (!guildConfig.whitelistReviewChannelId) {
    throw new Error('O canal de analise da whitelist ainda nao foi configurado. Use /setup-whitelist.');
  }

  const application = await withLockedConnection(
    `whitelist-user:${interaction.guild.id}:${interaction.user.id}`,
    async (connection) => {
      const latestDecision = await getLatestApplicationForUser(
        interaction.guild.id,
        interaction.user.id,
        [WHITELIST_STATUS.PENDING, WHITELIST_STATUS.APPROVED],
        connection
      );

      if (latestDecision?.status === WHITELIST_STATUS.PENDING) {
        throw new Error('Voce ja possui uma whitelist pendente de analise.');
      }

      if (latestDecision?.status === WHITELIST_STATUS.APPROVED) {
        throw new Error('Sua whitelist ja foi aprovada.');
      }

      const attempts = await getAttemptState(
        interaction.guild.id,
        interaction.user.id,
        connection
      );
      const now = new Date();
      if (attempts.cooldownUntil && new Date(attempts.cooldownUntil) > now) {
        throw new Error(
          `Voce precisa aguardar ate ${new Date(attempts.cooldownUntil).toLocaleString('pt-BR')} para tentar novamente.`
        );
      }

      if (!settings.allowRetry && attempts.attemptsUsed > 0) {
        throw new Error('Novas tentativas estao desativadas para esta whitelist.');
      }

      if (settings.attemptLimit > 0 && attempts.attemptsUsed >= settings.attemptLimit) {
        throw new Error('Voce atingiu o limite de tentativas configurado pela staff.');
      }

      return createOrResetDraftApplication(
        {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          questionVersion: 1
        },
        connection
      );
    }
  );

  await interaction.showModal(
    buildWhitelistModal(application.id, 0, settings.questions, application.answers)
  );
}

async function continueWhitelistApplication(interaction, applicationId, page) {
  const application = await getApplicationById(applicationId);
  if (!application || application.userId !== interaction.user.id) {
    throw new Error('Solicitacao de whitelist nao encontrada.');
  }

  if (application.status !== WHITELIST_STATUS.DRAFT) {
    throw new Error('Esta whitelist nao esta mais em etapa de preenchimento.');
  }

  const guildConfig = await ensureGuildConfig(interaction.guild.id);
  const settings = hydrateWhitelistSettings(guildConfig.whitelistSettings);
  await interaction.showModal(
    buildWhitelistModal(application.id, page, settings.questions, application.answers)
  );
}

async function submitWhitelistPage(interaction, applicationId, page) {
  const guildConfig = await ensureGuildConfig(interaction.guild.id);
  const settings = hydrateWhitelistSettings(guildConfig.whitelistSettings);
  const reviewChannel = await interaction.guild.channels
    .fetch(guildConfig.whitelistReviewChannelId)
    .catch(() => null);

  if (!reviewChannel?.isTextBased()) {
    throw new Error('O canal de analise configurado para a whitelist nao foi encontrado.');
  }

  const result = await withLockedTransaction(
    `whitelist-user:${interaction.guild.id}:${interaction.user.id}`,
    async (connection) => {
      const application = await getApplicationById(applicationId, connection, { forUpdate: true });
      if (!application || application.userId !== interaction.user.id) {
        throw new Error('Solicitacao de whitelist nao encontrada.');
      }

      if (application.status !== WHITELIST_STATUS.DRAFT) {
        throw new Error('Esta whitelist nao esta mais em etapa de preenchimento.');
      }

      const pageQuestions = paginateQuestions(settings.questions, page);
      if (pageQuestions.length === 0) {
        throw new Error('Etapa invalida da whitelist.');
      }

      const mergedAnswers = {
        ...application.answers
      };

      for (const question of pageQuestions) {
        mergedAnswers[question.key] = interaction.fields
          .getTextInputValue(`answer_${question.key}`)
          .trim();
      }

      const updatedApplication = await updateApplication(
        application.id,
        {
          answers: mergedAnswers
        },
        connection
      );

      const hasNextPage = paginateQuestions(settings.questions, page + 1).length > 0;
      if (hasNextPage) {
        return {
          application: updatedApplication,
          completed: false,
          nextPage: page + 1
        };
      }

      const userServerId = String(mergedAnswers.server_id || '').trim();
      const characterName = String(mergedAnswers.character_name || '').trim();

      if (!/^\d+$/.test(userServerId)) {
        throw new Error('O campo server_id precisa conter apenas numeros.');
      }

      if (!characterName) {
        throw new Error('O nome do personagem e obrigatorio.');
      }

      const attemptState = await getAttemptState(
        interaction.guild.id,
        interaction.user.id,
        connection,
        { forUpdate: true }
      );
      const cooldownUntil = new Date(Date.now() + settings.cooldownMinutes * 60 * 1000);
      await saveAttemptState(
        {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          attemptsUsed: attemptState.attemptsUsed + 1,
          lastAttemptAt: new Date(),
          cooldownUntil
        },
        connection
      );

      const pendingApplication = await updateApplication(
        application.id,
        {
          status: WHITELIST_STATUS.PENDING,
          userServerId,
          characterName,
          submittedAt: new Date()
        },
        connection
      );

      return {
        application: pendingApplication,
        completed: true,
        nextPage: null,
        reviewChannelId: reviewChannel.id,
        userServerId,
        characterName
      };
    }
  );

  if (!result.completed) {
    return result;
  }

  const reviewMessage = await reviewChannel.send({
    embeds: [buildWhitelistReviewEmbed(interaction.guild, result.application, settings)],
    components: [buildModerationButtons(result.application.id)]
  });

  const pendingApplication = await updateApplication(result.application.id, {
    reviewChannelId: reviewChannel.id,
    reviewMessageId: reviewMessage.id
  });

  await logAction({
    guild: interaction.guild,
    guildId: interaction.guild.id,
    type: 'whitelist_submitted',
    title: 'Whitelist enviada',
    description: COPY.whitelist.pendingDescription(interaction.user),
    actorId: interaction.user.id,
    entityType: 'whitelist_application',
    entityId: String(pendingApplication.id),
    details: {
      reviewChannelId: reviewChannel.id,
      reviewMessageId: reviewMessage.id,
      userServerId: result.userServerId,
      characterName: result.characterName
    },
    fields: [
      inlineField('ID informado', result.userServerId),
      inlineField('Personagem', result.characterName)
    ]
  });

  return {
    application: pendingApplication,
    completed: true,
    nextPage: null
  };
}

async function approveApplication(interaction, applicationId) {
  return approveApplicationByActor({
    guild: interaction.guild,
    member: interaction.member,
    actorUser: interaction.user,
    applicationId
  });
}

async function rejectApplication(interaction, applicationId, reason) {
  return rejectApplicationByActor({
    guild: interaction.guild,
    member: interaction.member,
    actorUser: interaction.user,
    applicationId,
    reason
  });
}

module.exports = {
  approveApplication,
  approveApplicationByActor,
  buildContinueButton,
  buildModerationButtons,
  buildRejectModal,
  continueWhitelistApplication,
  hydrateWhitelistSettings,
  normalizeQuestionsInput,
  publishWhitelistPanel,
  rejectApplication,
  rejectApplicationByActor,
  startWhitelistApplication,
  submitWhitelistPage
};
