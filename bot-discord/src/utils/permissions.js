const { PermissionFlagsBits } = require('discord.js');

function isAdministrator(member) {
  return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator));
}

function hasRole(member, roleId) {
  return Boolean(roleId) && Boolean(member?.roles?.cache?.has?.(roleId));
}

function getConfiguredRoleIds(guildConfig = {}) {
  return {
    supportRoleId: guildConfig.supportRoleId || guildConfig.staffRoleId || null,
    adminRoleId: guildConfig.adminRoleId || guildConfig.staffRoleId || null,
    ownerRoleId: guildConfig.ownerRoleId || null
  };
}

function getStaffRoleIds(guildConfig = {}) {
  const { supportRoleId, adminRoleId, ownerRoleId } = getConfiguredRoleIds(guildConfig);

  return [...new Set([supportRoleId, adminRoleId, ownerRoleId].filter(Boolean))];
}

function getAccessLevel(member, guildConfig = {}) {
  if (!member) {
    return 'player';
  }

  if (member.guild?.ownerId === member.id || isAdministrator(member)) {
    return 'owner';
  }

  const { supportRoleId, adminRoleId, ownerRoleId } = getConfiguredRoleIds(guildConfig);

  if (hasRole(member, ownerRoleId)) {
    return 'owner';
  }

  if (hasRole(member, adminRoleId)) {
    return 'admin';
  }

  if (hasRole(member, supportRoleId)) {
    return 'support';
  }

  return 'player';
}

function buildAccessCapabilities(level) {
  return {
    canManageTickets: ['support', 'admin', 'owner'].includes(level),
    canManageWhitelists: ['support', 'admin', 'owner'].includes(level),
    canReadLogs: ['support', 'admin', 'owner'].includes(level),
    canManagePlayers: ['admin', 'owner'].includes(level),
    canManagePortal: ['admin', 'owner'].includes(level),
    canViewFinance: ['admin', 'owner'].includes(level),
    canViewDatabase: ['admin', 'owner'].includes(level),
    canManageSettings: level === 'owner',
    canManageStaff: level === 'owner',
    canManagePayments: level === 'owner',
    canMapRoles: level === 'owner'
  };
}

function getAccessSummary(member, guildConfig = {}) {
  const level = getAccessLevel(member, guildConfig);
  return {
    level,
    isStaff: ['support', 'admin', 'owner'].includes(level),
    isAdmin: ['admin', 'owner'].includes(level),
    isOwner: level === 'owner',
    capabilities: buildAccessCapabilities(level)
  };
}

function hasStaffAccess(member, guildConfig) {
  return getAccessSummary(member, guildConfig).isStaff;
}

function hasAdminAccess(member, guildConfig) {
  return getAccessSummary(member, guildConfig).isAdmin;
}

function hasOwnerAccess(member, guildConfig) {
  return getAccessSummary(member, guildConfig).isOwner;
}

function canManageTicket(member, guildConfig, ticket) {
  return hasStaffAccess(member, guildConfig) || member.id === ticket.ownerId;
}

module.exports = {
  buildAccessCapabilities,
  canManageTicket,
  getAccessLevel,
  getAccessSummary,
  getStaffRoleIds,
  hasAdminAccess,
  hasOwnerAccess,
  hasRole,
  hasStaffAccess,
  isAdministrator
};
