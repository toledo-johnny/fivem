const { COPY } = require('../../config/copy');
const { WHITELIST_STATUS } = require('../../config/constants');
const { withLockedTransaction } = require('../../database/locks');
const { blockField, buildEmbed, successEmbed } = require('../../utils/embeds');
const { hasStaffAccess } = require('../../utils/permissions');
const { ensureGuildConfig } = require('../config/configRepository');
const { logAction } = require('../logs/logService');
const {
  getApplicationById,
  updateApplication
} = require('./whitelistRepository');
const {
  buildModerationButtons,
  buildWhitelistReviewEmbed,
  hydrateWhitelistSettings
} = require('./whitelistViews');
const { syncApplicationWithFiveM } = require('./whitelistFiveMService');

async function updateReviewMessage(guild, application, statusLabel) {
  if (!application.reviewChannelId || !application.reviewMessageId) {
    return;
  }

  const guildConfig = await ensureGuildConfig(guild.id);
  const settings = hydrateWhitelistSettings(guildConfig.whitelistSettings);
  const channel = await guild.channels.fetch(application.reviewChannelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(application.reviewMessageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit({
    embeds: [
      buildWhitelistReviewEmbed(guild, application, settings, {
        title: `Whitelist ${statusLabel}`,
        description: `<@${application.userId}> teve a whitelist marcada como **${statusLabel.toLowerCase()}**.`
      })
    ],
    components: [buildModerationButtons(application.id, true)]
  });
}

async function approveApplicationByActor({ guild, member, actorUser, applicationId }) {
  const guildConfig = await ensureGuildConfig(guild.id);
  if (!hasStaffAccess(member, guildConfig)) {
    throw new Error('Apenas a staff pode aprovar whitelists.');
  }

  const result = await withLockedTransaction(`whitelist:${applicationId}`, async (connection) => {
    const application = await getApplicationById(applicationId, connection, { forUpdate: true });
    if (!application || application.guildId !== guild.id) {
      throw new Error('Solicitacao de whitelist nao encontrada.');
    }

    if (application.status !== WHITELIST_STATUS.PENDING) {
      throw new Error('Esta whitelist nao esta pendente.');
    }

    const syncResult = await syncApplicationWithFiveM(application, connection);
    if (!syncResult.ok) {
      throw new Error(syncResult.message);
    }

    const approvedApplication = await updateApplication(
      application.id,
      {
        status: WHITELIST_STATUS.APPROVED,
        linkedUserId: syncResult.linkedUserId,
        reviewerId: actorUser.id,
        reviewedAt: new Date(),
        rejectionReason: null
      },
      connection
    );

    return {
      application,
      approvedApplication,
      syncResult
    };
  });

  const settings = hydrateWhitelistSettings(guildConfig.whitelistSettings);
  const memberTarget = await guild.members.fetch(result.application.userId).catch(() => null);

  if (memberTarget) {
    if (guildConfig.unverifiedRoleId) {
      await memberTarget.roles.remove(guildConfig.unverifiedRoleId).catch(() => null);
    }

    if (guildConfig.whitelistRoleId) {
      await memberTarget.roles.add(guildConfig.whitelistRoleId).catch(() => null);
    }

    if (settings.nicknameOnApproval) {
      const nickname = settings.nicknameTemplate
        .replace('{character_name}', result.application.characterName || 'Player')
        .replace('{user_id}', String(result.syncResult.linkedUserId));

      await memberTarget.setNickname(nickname.slice(0, 32)).catch(() => null);
    }

    await memberTarget
      .send({
        embeds: [
          successEmbed(
            guild,
            COPY.whitelist.approvedDmTitle,
            COPY.whitelist.approvedDmDescription(actorUser)
          )
        ]
      })
      .catch(() => null);
  }

  await updateReviewMessage(guild, result.approvedApplication, 'Aprovada');

  await logAction({
    guild,
    guildId: guild.id,
    type: 'whitelist_approved',
    title: COPY.whitelist.approvedLogTitle,
    description: `${actorUser} aprovou a whitelist de <@${result.application.userId}>.`,
    actorId: actorUser.id,
    targetId: result.application.userId,
    entityType: 'whitelist_application',
    entityId: String(result.application.id),
    details: {
      linkedUserId: result.syncResult.linkedUserId,
      accountId: result.syncResult.accountId || null,
      source: result.syncResult.source || 'accounts',
      alreadyWhitelisted: result.syncResult.alreadyWhitelisted
    }
  });

  return {
    application: result.approvedApplication,
    syncResult: result.syncResult
  };
}

async function rejectApplicationByActor({ guild, member, actorUser, applicationId, reason }) {
  const guildConfig = await ensureGuildConfig(guild.id);
  if (!hasStaffAccess(member, guildConfig)) {
    throw new Error('Apenas a staff pode reprovar whitelists.');
  }

  const rejectedApplication = await withLockedTransaction(
    `whitelist:${applicationId}`,
    async (connection) => {
      const application = await getApplicationById(applicationId, connection, { forUpdate: true });
      if (!application || application.guildId !== guild.id) {
        throw new Error('Solicitacao de whitelist nao encontrada.');
      }

      if (application.status !== WHITELIST_STATUS.PENDING) {
        throw new Error('Esta whitelist nao esta pendente.');
      }

      return updateApplication(
        application.id,
        {
          status: WHITELIST_STATUS.REJECTED,
          reviewerId: actorUser.id,
          reviewedAt: new Date(),
          rejectionReason: reason
        },
        connection
      );
    }
  );

  await updateReviewMessage(guild, rejectedApplication, 'Reprovada');

  const memberTarget = await guild.members.fetch(rejectedApplication.userId).catch(() => null);
  if (memberTarget) {
    await memberTarget
      .send({
        embeds: [
          buildEmbed(guild, {
            title: COPY.whitelist.rejectedDmTitle,
            description: COPY.whitelist.rejectedDmDescription(actorUser),
            fields: [blockField('Motivo', reason)]
          })
        ]
      })
      .catch(() => null);
  }

  await logAction({
    guild,
    guildId: guild.id,
    type: 'whitelist_rejected',
    title: COPY.whitelist.rejectedLogTitle,
    description: `${actorUser} reprovou a whitelist de <@${rejectedApplication.userId}>.`,
    actorId: actorUser.id,
    targetId: rejectedApplication.userId,
    entityType: 'whitelist_application',
    entityId: String(rejectedApplication.id),
    details: {
      reason
    },
    fields: [blockField('Motivo', reason)]
  });

  return rejectedApplication;
}

module.exports = {
  approveApplicationByActor,
  rejectApplicationByActor,
  updateReviewMessage
};
