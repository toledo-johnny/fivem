const { ChannelType, PermissionFlagsBits } = require('discord.js');

async function getBotMember(guild) {
  return guild.members.me || guild.members.fetchMe();
}

function ensurePermissions(member, permissions, contextLabel) {
  const missing = permissions.filter((permission) => !member.permissions.has(permission));

  if (missing.length > 0) {
    throw new Error(
      `O bot nao possui as permissoes necessarias para ${contextLabel}: ${missing.join(', ')}.`
    );
  }
}

async function assertTextChannelOperational(channel, options = {}) {
  if (!channel?.isTextBased()) {
    throw new Error('O canal informado precisa ser um canal de texto valido.');
  }

  const botMember = await getBotMember(channel.guild);
  ensurePermissions(
    botMember,
    [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory,
      ...(options.needsAttachments ? [PermissionFlagsBits.AttachFiles] : [])
    ],
    `operar no canal ${channel.name}`
  );
}

async function assertCategoryOperational(category) {
  if (!category || category.type !== ChannelType.GuildCategory) {
    throw new Error('A categoria informada precisa ser valida.');
  }

  const botMember = await getBotMember(category.guild);
  ensurePermissions(
    botMember,
    [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
    `gerenciar canais na categoria ${category.name}`
  );
}

async function assertRoleOperational(guild, role) {
  const botMember = await getBotMember(guild);
  ensurePermissions(
    botMember,
    [PermissionFlagsBits.ManageRoles],
    `gerenciar o cargo ${role.name}`
  );

  if (botMember.roles.highest.comparePositionTo(role) <= 0) {
    throw new Error(
      `O cargo do bot precisa estar acima de ${role} para aplicar ou remover esse cargo.`
    );
  }
}

module.exports = {
  assertCategoryOperational,
  assertRoleOperational,
  assertTextChannelOperational
};
