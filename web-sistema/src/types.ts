export interface ContentBlock {
  id: number;
  guildId: string;
  contentKey: string;
  title: string;
  bodyText: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PortalSettings {
  guildId: string;
  serverName: string;
  shortName: string | null;
  logoUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  discordUrl: string | null;
  connectUrl: string | null;
  primaryColor: string;
  accentColor: string;
  socialLinks: Record<string, string | null>;
  landingSections: {
    heroTag?: string;
    serversTitle?: string;
    newsTitle?: string;
    packagesTitle?: string;
    howToJoinTitle?: string;
    howToJoinSteps?: string[];
    [key: string]: unknown;
  };
  footerText: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalNewsItem {
  id: number;
  guildId: string;
  title: string;
  category: string;
  descriptionText: string;
  imageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalServer {
  id: number;
  guildId: string;
  name: string;
  descriptionText: string;
  imageUrl: string | null;
  statusLabel: string | null;
  connectUrl: string | null;
  permissionRequired: string | null;
  isActive: boolean;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortalPackage {
  id: number;
  guildId: string;
  name: string;
  descriptionText: string;
  diamondAmount: number;
  bonusAmount: number;
  priceCents: number;
  checkoutUrl: string | null;
  highlightLabel: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem extends PortalPackage {
  quantity: number;
}

export interface FiveMStatus {
  configured: boolean;
  online: boolean;
  playersOnline: number;
  playerLimit: number;
  buttonUrl: string | null;
  connectUrl: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  name: string;
  refreshMinutes: number;
  updatedAt: string;
  raw?: unknown;
}

export interface PublicPortalData {
  guildId: string;
  settings: PortalSettings;
  news: PortalNewsItem[];
  servers: PortalServer[];
  packages: PortalPackage[];
  contentBlocks: Record<string, ContentBlock>;
  fivemStatus: FiveMStatus;
  features: {
    loginEnabled: boolean;
    publicPortal: boolean;
  };
}

export interface DiscordSessionProfile {
  userId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  avatarUrl?: string | null;
  guildId: string;
  issuedAt: string;
}

export interface PortalGuildSummary {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface PortalAccessSummary {
  level: 'player' | 'support' | 'admin' | 'owner';
  isStaff: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  capabilities: {
    canManageTickets: boolean;
    canManageWhitelists: boolean;
    canReadLogs: boolean;
    canManagePlayers: boolean;
    canManagePortal: boolean;
    canViewFinance: boolean;
    canViewDatabase: boolean;
    canManageSettings: boolean;
    canManageStaff: boolean;
    canManagePayments: boolean;
    canMapRoles: boolean;
  };
}

export interface PaymentOrderRecord {
  id: number;
  guildId: string;
  discordUserId: string;
  playerAccountId: number | null;
  packageId: number;
  provider: string;
  externalReference: string;
  packageSnapshot: {
    id?: number;
    name?: string;
    descriptionText?: string;
    diamondAmount?: number;
    bonusAmount?: number;
    highlightLabel?: string | null;
    [key: string]: unknown;
  };
  metadata: Record<string, unknown>;
  quantity: number;
  currencyId: string;
  totalPriceCents: number;
  totalDiamonds: number;
  totalBonus: number;
  paymentStatus: string;
  deliveryStatus: string;
  providerPreferenceId: string | null;
  providerCheckoutUrl: string | null;
  providerPaymentId: string | null;
  approvedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseSummary {
  totalOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
}

export interface PlayerDiscordLink {
  account: string | null;
  characters: string[];
  hasAny: boolean;
  primary: string | null;
  linkedUserId: string | null;
}

export interface AdminPlayerRecord {
  accountId: number;
  passaporte: number;
  whitelist: boolean;
  gems: number;
  premium: number;
  discord: string | null;
  discordLink: PlayerDiscordLink;
  license: string;
  primaryCharacterId: number | null;
  primaryCharacterName: string | null;
  characterNames: string[];
  bank: number | null;
  fines: number | null;
  prison: number | null;
  isBanned: boolean;
  lastLoginAt: string | null;
}

export interface WhitelistApplication {
  id: number;
  guildId: string;
  userId: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'not_started';
  questionVersion: number;
  answers: Record<string, string>;
  userServerId: string | null;
  characterName: string | null;
  linkedUserId: number | null;
  reviewChannelId: string | null;
  reviewMessageId: string | null;
  reviewerId: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicant?: {
    id: string;
    username: string | null;
    displayName: string | null;
  } | null;
  reviewer?: {
    id: string;
    username: string | null;
    displayName: string | null;
  } | null;
}

export interface TicketRecord {
  id: number;
  guildId: string;
  channelId: string | null;
  ownerId: string;
  categoryKey: string;
  status: 'open' | 'closed';
  claimedBy: string | null;
  closeReason: string | null;
  transcriptLogChannelId: string | null;
  transcriptMessageId: string | null;
  closedBy: string | null;
  openedAt: string | null;
  claimedAt: string | null;
  closedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string | null;
    displayName: string | null;
  } | null;
  claimedByUser?: {
    id: string;
    username: string | null;
    displayName: string | null;
  } | null;
}

export interface WhitelistState {
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'not_started';
  application: WhitelistApplication | null;
}

export interface PortalSessionPayload {
  session: DiscordSessionProfile;
  guild: PortalGuildSummary;
  access: PortalAccessSummary;
  player: AdminPlayerRecord | null;
  whitelist: WhitelistState;
  tickets: TicketRecord[];
  servers: PortalServer[];
  packages: PortalPackage[];
  contentBlocks: Record<string, ContentBlock>;
  settings: PortalSettings;
  fivemStatus: FiveMStatus;
  links: {
    discordUrl: string | null;
    connectUrl: string | null;
    whitelistPanelUrl: string | null;
    supportPanelUrl: string | null;
    discordLinked: boolean;
  };
  capabilities: {
    whitelistWebForm: boolean;
    ticketCreationWeb: boolean;
    purchaseHistory: boolean;
    adminArea: boolean;
  };
  paymentOrders: PaymentOrderRecord[];
  purchaseSummary: PurchaseSummary;
}

export interface AdminOverviewPayload {
  session: DiscordSessionProfile;
  guild: {
    id: string;
    name: string;
  };
  overview: {
    guildConfig: Record<string, unknown>;
    statusPanel: Record<string, unknown> | null;
    health: {
      discord: string;
      database: string;
      api: string;
      schedulerHeartbeatAt: string | null;
      schedulerHeartbeatAgeSeconds: number | null;
      lastReconciliationAt: string | null;
      lastReconciliationAgeSeconds: number | null;
    };
    counts: {
      commands: number;
      buttons: number;
      modals: number;
      logsConfigured: number;
      panels: number;
      openTickets: number;
      pendingWhitelists: number;
      contentBlocks: number;
      totalPlayers: number;
      whitelistedPlayers: number;
      diamondsInCirculation: number;
    };
    runtime: {
      uptimeSeconds: number;
    };
    finance: {
      totalPayments: number;
      totalRevenue: number;
      revenueMonth: number;
      diamondsSold: number;
    };
    fivem: FiveMStatus;
    jobs: Array<{
      jobKey: string;
      status: string;
      lastRunAt: string | null;
      updatedAt: string | null;
      details: Record<string, unknown>;
    }>;
  };
}

export interface AuditLogRecord {
  id: number;
  guildId: string | null;
  eventType: string;
  actorId: string | null;
  targetId: string | null;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface FinanceSummary {
  totals: {
    totalPayments: number;
    totalRevenue: number;
    revenueMonth: number;
    diamondsSold: number;
  };
  capabilities: {
    paymentHistory: boolean;
    diamondsSold: boolean;
  };
  recentPayments: Array<{
    id: number;
    userId: number;
    target: number;
    type: string;
    description: string;
    value: number;
    createdAt: string | null;
  }>;
  topBuyers: Array<{
    userId: number;
    purchases: number;
    totalSpent: number;
    player: AdminPlayerRecord | null;
  }>;
}

export interface AdminDatabaseTableSummary {
  tableName: string;
  rowCount: number;
  populated: boolean;
  scope: 'bot' | 'fivem' | 'integration';
  category: string;
  description: string;
  siteArea: string;
}

export interface AdminDatabaseFeature {
  key: string;
  label: string;
  status: 'ready' | 'partial' | 'empty';
  deliveryStatus: 'live' | 'new_in_admin' | 'waiting_data';
  description: string;
  sourceTables: string[];
  nextStep: string;
}

export interface AdminDatabaseOrganization {
  id: number;
  name: string;
  bank: number;
  premium: number;
  buff: boolean;
}

export interface AdminDatabaseChest {
  id: number;
  name: string;
  weight: number;
  permission: string | null;
  logs: boolean;
}

export interface AdminDatabasePermissionSnapshot {
  key: string;
  label: string;
  totalEntries: number;
  enabledCount: number;
  enabledPassports: number[];
}

export interface AdminDatabaseRaceRecord {
  id: number;
  raceId: number;
  passaporte: number;
  name: string;
  vehicle: string | null;
  points: number;
}

export interface AdminDatabasePlayerProfile {
  accountId: number;
  passaporte: number;
  license: string | null;
  whitelist: boolean;
  gems: number;
  premium: number;
  discord: string | null;
  primaryCharacterId: number | null;
  primaryCharacterName: string | null;
  bank: number | null;
  fines: number | null;
  prison: number | null;
  playerDataKeys: string[];
  appearance: {
    hasBarbershop: boolean;
    hasClothings: boolean;
  };
  survival: {
    health: number | null;
    armour: number | null;
    hunger: number | null;
    thirst: number | null;
    stress: number | null;
    weight: number | null;
  } | null;
  inventory: {
    slots: number;
    items: Array<{
      slot: string;
      item: string;
      amount: number;
    }>;
  };
  position: {
    x: number | null;
    y: number | null;
    z: number | null;
  } | null;
}

export interface AdminDatabaseSnapshot {
  summary: {
    totalTables: number;
    populatedTables: number;
    emptyTables: number;
    botTablesWithData: number;
    fivemTablesWithData: number;
    integrationTablesWithData: number;
  };
  tables: AdminDatabaseTableSummary[];
  features: AdminDatabaseFeature[];
  gameData: {
    organizations: AdminDatabaseOrganization[];
    chests: AdminDatabaseChest[];
    permissions: AdminDatabasePermissionSnapshot[];
    races: AdminDatabaseRaceRecord[];
    playerProfiles: AdminDatabasePlayerProfile[];
  };
}

export interface GuildConfig {
  guildId: string;
  supportRoleId: string | null;
  adminRoleId: string | null;
  ownerRoleId: string | null;
  staffRoleId: string | null;
  whitelistRoleId: string | null;
  unverifiedRoleId: string | null;
  ticketCategoryId: string | null;
  ticketPanelChannelId: string | null;
  ticketPanelMessageId: string | null;
  whitelistPanelChannelId: string | null;
  whitelistPanelMessageId: string | null;
  whitelistReviewChannelId: string | null;
  ticketSettings: Record<string, unknown>;
  whitelistSettings: {
    attemptLimit: number;
    cooldownMinutes: number;
    allowRetry: boolean;
    nicknameOnApproval?: boolean;
    nicknameTemplate?: string;
    questions?: Array<Record<string, unknown>>;
  };
  logChannels: Record<string, string>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DashboardConfigResponse {
  guildConfig: GuildConfig;
  panels: Array<{
    id: string;
    guildId: string;
    panelType: string;
    channelId: string;
    messageId: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
  contentBlocks: ContentBlock[];
}

export interface AdminPortalResponse {
  settings: PortalSettings;
  news: PortalNewsItem[];
  servers: PortalServer[];
  packages: PortalPackage[];
  contentBlocks: Record<string, ContentBlock>;
}

export interface StaffSnapshotRecord {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Array<{
    id: string;
    name: string;
  }>;
  metrics: {
    ticketsClaimed: number;
    ticketsClosed: number;
    whitelistsReviewed: number;
    lastActionAt: string | null;
  };
}

export interface RemoteState<T> {
  data: T | null;
  error: string;
  status: 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';
}
