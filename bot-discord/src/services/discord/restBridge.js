const { Blob } = require('node:buffer');
const {
  AttachmentBuilder,
  ChannelType,
  Collection,
  PermissionFlagsBits,
  PermissionsBitField
} = require('discord.js');
const env = require('../../config/env');

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
const TEXT_BASED_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
  ChannelType.GuildForum,
  ChannelType.GuildMedia
]);

class DiscordRestError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'DiscordRestError';
    this.statusCode = statusCode;
  }
}

function buildDiscordApiUrl(path, query = null) {
  const url = new URL(`${DISCORD_API_BASE_URL}${path}`);
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || typeof value === 'undefined' || value === '') {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function discordApiRequest(method, path, options = {}) {
  const url = buildDiscordApiUrl(path, options.query);
  const headers = {
    Authorization: `Bot ${env.botToken}`,
    ...(options.headers || {})
  };

  let body = null;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (typeof options.body !== 'undefined' && options.body !== null) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (options.reason) {
    headers['X-Audit-Log-Reason'] = options.reason;
  }

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  if (options.raw) {
    return response;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const details = payload?.message || `Discord REST ${response.status}`;
    throw new DiscordRestError(details, response.status);
  }

  return payload;
}

function normalizeDiscordPayloadValue(value) {
  if (value === null || typeof value === 'undefined') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeDiscordPayloadValue);
  }

  if (typeof value?.toJSON === 'function') {
    return value.toJSON();
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return value;
  }

  if (typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([key, innerValue]) => [key, normalizeDiscordPayloadValue(innerValue)])
    );
  }

  return value;
}

function resolveAttachmentInput(file, index) {
  if (file instanceof AttachmentBuilder) {
    return {
      name: file.name || `file-${index}.bin`,
      attachment: file.attachment,
      description: file.description || null
    };
  }

  return {
    name: file.name || `file-${index}.bin`,
    attachment: file.attachment,
    description: file.description || null
  };
}

async function createMessageRequestBody(payload = {}) {
  const normalized = normalizeDiscordPayloadValue(payload);
  const files = Array.isArray(normalized.files) ? normalized.files : [];
  const { files: ignoredFiles, ...jsonPayload } = normalized;

  if (files.length === 0) {
    return {
      body: jsonPayload,
      headers: {}
    };
  }

  const form = new FormData();
  const attachments = [];

  files.forEach((entry, index) => {
    const resolved = resolveAttachmentInput(entry, index);
    if (!resolved.attachment) {
      return;
    }

    const buffer =
      Buffer.isBuffer(resolved.attachment) || resolved.attachment instanceof Uint8Array
        ? resolved.attachment
        : Buffer.from(String(resolved.attachment), 'utf8');

    form.append(`files[${index}]`, new Blob([buffer]), resolved.name);
    attachments.push({
      id: index,
      filename: resolved.name,
      ...(resolved.description ? { description: resolved.description } : {})
    });
  });

  form.append(
    'payload_json',
    JSON.stringify({
      ...jsonPayload,
      ...(attachments.length > 0 ? { attachments } : {})
    })
  );

  return {
    body: form,
    headers: {}
  };
}

function buildGuildIconUrl(guildId, iconHash, size = 256) {
  if (!guildId || !iconHash) {
    return null;
  }

  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=${size}`;
}

function buildUserAvatarUrl(userId, avatarHash, size = 256) {
  if (!userId) {
    return null;
  }

  if (avatarHash) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=${size}`;
  }

  return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
}

function createUserBridge(user) {
  const username = user?.username || 'usuario';
  const discriminator = user?.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : '';

  return {
    id: user.id,
    username,
    globalName: user.global_name || null,
    avatar: user.avatar || null,
    tag: `${username}${discriminator}`,
    displayAvatarURL(options = {}) {
      return buildUserAvatarUrl(user.id, user.avatar, options.size || 256);
    },
    toString() {
      return `<@${user.id}>`;
    }
  };
}

function createRoleBridge(guild, role) {
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions,
    position: Number(role.position || 0),
    comparePositionTo(otherRole) {
      return Number(this.position || 0) - Number(otherRole?.position || 0);
    },
    toString() {
      return `<@&${role.id}>`;
    },
    guild
  };
}

function getBigIntPermissionValue(value) {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    return BigInt(value);
  }

  if (typeof value === 'string') {
    return BigInt(value);
  }

  return 0n;
}

function buildPermissionsFromRoles(guild, roleIds) {
  let value = 0n;

  const ids = new Set([guild.id, ...(roleIds || [])]);
  for (const roleId of ids) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      continue;
    }

    value |= getBigIntPermissionValue(role.permissions || 0);
  }

  return value;
}

async function createMemberBridge(guild, rawMember) {
  await guild.loadRoles();

  const user = createUserBridge(rawMember.user);
  const roleCache = new Collection();
  const roleIds = new Set([guild.id, ...(rawMember.roles || [])]);

  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId);
    if (role) {
      roleCache.set(role.id, role);
    }
  }

  const highestRole =
    roleCache.sort((left, right) => right.comparePositionTo(left)).first() || null;
  const bitfield =
    guild.ownerId === user.id
      ? BigInt(PermissionFlagsBits.Administrator)
      : buildPermissionsFromRoles(guild, rawMember.roles);

  const member = {
    id: user.id,
    guild,
    user,
    nick: rawMember.nick || null,
    displayName: rawMember.nick || user.globalName || user.username,
    roles: {
      cache: roleCache,
      highest: highestRole,
      add: async (roleId, reason = null) => {
        await discordApiRequest(
          'PUT',
          `/guilds/${guild.id}/members/${user.id}/roles/${roleId}`,
          { reason }
        );
        const nextRole = guild.roles.cache.get(roleId);
        if (nextRole) {
          roleCache.set(roleId, nextRole);
        }
      },
      remove: async (roleId, reason = null) => {
        await discordApiRequest(
          'DELETE',
          `/guilds/${guild.id}/members/${user.id}/roles/${roleId}`,
          { reason }
        );
        roleCache.delete(roleId);
      }
    },
    permissions: new PermissionsBitField(bitfield),
    displayAvatarURL(options = {}) {
      return user.displayAvatarURL(options);
    },
    async send(payload) {
      const dmChannel = await discordApiRequest('POST', '/users/@me/channels', {
        body: {
          recipient_id: user.id
        }
      });

      const messageRequest = await createMessageRequestBody(payload);
      return createMessageBridge(
        guild,
        dmChannel,
        await discordApiRequest('POST', `/channels/${dmChannel.id}/messages`, messageRequest)
      );
    },
    async setNickname(nickname, reason = null) {
      await discordApiRequest('PATCH', `/guilds/${guild.id}/members/${user.id}`, {
        reason,
        body: {
          nick: nickname
        }
      });

      member.nick = nickname || null;
      member.displayName = nickname || user.globalName || user.username;
      return member;
    },
    toString() {
      return `<@${user.id}>`;
    }
  };

  return member;
}

function createAttachmentCollection(rawAttachments = []) {
  return new Collection(
    rawAttachments.map((attachment) => [
      attachment.id,
      {
        id: attachment.id,
        url: attachment.url,
        proxyURL: attachment.proxy_url || attachment.url,
        name: attachment.filename || attachment.name || attachment.id
      }
    ])
  );
}

function createMessageBridge(guild, channel, rawMessage) {
  const author = rawMessage.author ? createUserBridge(rawMessage.author) : null;
  return {
    id: rawMessage.id,
    channel,
    guild,
    author,
    content: rawMessage.content || '',
    attachments: createAttachmentCollection(rawMessage.attachments || []),
    createdTimestamp: rawMessage.timestamp
      ? new Date(rawMessage.timestamp).getTime()
      : Date.now(),
    async edit(payload) {
      const messageRequest = await createMessageRequestBody(payload);
      const updated = await discordApiRequest(
        'PATCH',
        `/channels/${channel.id}/messages/${rawMessage.id}`,
        messageRequest
      );
      return createMessageBridge(guild, channel, updated);
    }
  };
}

async function createChannelBridge(guild, rawChannel) {
  const channel = {
    id: rawChannel.id,
    guild,
    name: rawChannel.name,
    type: rawChannel.type,
    parentId: rawChannel.parent_id || null,
    isTextBased() {
      return TEXT_BASED_CHANNEL_TYPES.has(rawChannel.type);
    },
    messages: {
      fetch: async (value) => {
        if (typeof value === 'string' || typeof value === 'number') {
          const message = await discordApiRequest(
            'GET',
            `/channels/${rawChannel.id}/messages/${value}`
          );
          return createMessageBridge(guild, channel, message);
        }

        const batch = await discordApiRequest('GET', `/channels/${rawChannel.id}/messages`, {
          query: value || {}
        });

        return new Collection(
          batch.map((message) => [
            message.id,
            createMessageBridge(guild, channel, message)
          ])
        );
      }
    },
    permissionOverwrites: {
      edit: async (targetId, permissions, reason = null) => {
        await guild.loadRoles();

        let allow = 0n;
        let deny = 0n;
        for (const [permissionName, permissionValue] of Object.entries(permissions || {})) {
          const flag = PermissionFlagsBits[permissionName];
          if (!flag) {
            continue;
          }

          if (permissionValue === true) {
            allow |= BigInt(flag);
          }

          if (permissionValue === false) {
            deny |= BigInt(flag);
          }
        }

        const type = targetId === guild.id || guild.roles.cache.has(targetId) ? 0 : 1;
        await discordApiRequest(
          'PUT',
          `/channels/${rawChannel.id}/permissions/${targetId}`,
          {
            reason,
            body: {
              allow: allow.toString(),
              deny: deny.toString(),
              type
            }
          }
        );
      }
    },
    async send(payload) {
      const messageRequest = await createMessageRequestBody(payload);
      const message = await discordApiRequest(
        'POST',
        `/channels/${rawChannel.id}/messages`,
        messageRequest
      );
      return createMessageBridge(guild, channel, message);
    },
    async delete(reason = null) {
      await discordApiRequest('DELETE', `/channels/${rawChannel.id}`, {
        reason
      });
    }
  };

  return channel;
}

function normalizePermissionOverwriteForCreate(guild, overwrite) {
  let allow = 0n;
  let deny = 0n;

  for (const flag of overwrite.allow || []) {
    allow |= getBigIntPermissionValue(flag);
  }

  for (const flag of overwrite.deny || []) {
    deny |= getBigIntPermissionValue(flag);
  }

  const type = overwrite.id === guild.id || guild.roles.cache.has(overwrite.id) ? 0 : 1;
  return {
    id: overwrite.id,
    type,
    allow: allow.toString(),
    deny: deny.toString()
  };
}

async function createGuildBridge(rawGuild) {
  const guild = {
    id: rawGuild.id,
    name: rawGuild.name,
    ownerId: rawGuild.owner_id,
    iconHash: rawGuild.icon || null,
    roles: {
      cache: new Collection(),
      fetch: async (roleId = null) => {
        await guild.loadRoles();
        return roleId ? guild.roles.cache.get(roleId) || null : guild.roles.cache;
      }
    },
    members: {
      cache: new Collection(),
      fetch: async (userId = null) => {
        if (!userId) {
          guild.members.cache.clear();
          let after = '0';

          while (true) {
            const batch = await discordApiRequest('GET', `/guilds/${guild.id}/members`, {
              query: {
                limit: 1000,
                after
              }
            });

            for (const rawMember of batch) {
              const member = await createMemberBridge(guild, rawMember);
              guild.members.cache.set(member.id, member);
            }

            if (batch.length < 1000) {
              break;
            }

            after = batch[batch.length - 1].user.id;
          }

          return guild.members.cache;
        }

        const rawMember = await discordApiRequest(
          'GET',
          `/guilds/${guild.id}/members/${userId}`
        );
        const member = await createMemberBridge(guild, rawMember);
        guild.members.cache.set(member.id, member);
        return member;
      }
    },
    channels: {
      fetch: async (channelId) => {
        if (!channelId) {
          return null;
        }

        const rawChannel = await discordApiRequest('GET', `/channels/${channelId}`);
        return createChannelBridge(guild, rawChannel);
      },
      create: async (input) => {
        await guild.loadRoles();

        const body = {
          name: input.name,
          type: typeof input.type === 'number' ? input.type : ChannelType.GuildText,
          parent_id: input.parent || null,
          permission_overwrites: (input.permissionOverwrites || []).map((overwrite) =>
            normalizePermissionOverwriteForCreate(guild, overwrite)
          )
        };

        const rawChannel = await discordApiRequest(
          'POST',
          `/guilds/${guild.id}/channels`,
          {
            body
          }
        );

        return createChannelBridge(guild, rawChannel);
      }
    },
    iconURL(options = {}) {
      return buildGuildIconUrl(guild.id, guild.iconHash, options.size || 256);
    },
    async loadRoles() {
      if (guild.roles.cache.size > 0) {
        return guild.roles.cache;
      }

      const rawRoles = await discordApiRequest('GET', `/guilds/${guild.id}/roles`);
      guild.roles.cache = new Collection(
        rawRoles.map((role) => [role.id, createRoleBridge(guild, role)])
      );
      return guild.roles.cache;
    }
  };

  return guild;
}

async function fetchGuildBridge(guildId) {
  const rawGuild = await discordApiRequest('GET', `/guilds/${guildId}`);
  return createGuildBridge(rawGuild);
}

module.exports = {
  ChannelType,
  DiscordRestError,
  PermissionFlagsBits,
  buildGuildIconUrl,
  buildUserAvatarUrl,
  createGuildBridge,
  createMessageRequestBody,
  createUserBridge,
  discordApiRequest,
  fetchGuildBridge
};
