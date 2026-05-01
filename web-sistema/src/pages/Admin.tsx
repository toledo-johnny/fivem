import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  approveWhitelist,
  createDiamondPackage,
  createNews,
  createServerCard,
  deleteDiamondPackage,
  deleteNews,
  deleteServerCard,
  getAdminDatabaseSnapshot,
  getAdminFinance,
  getAdminOrders,
  getAdminPlayers,
  getAdminPortal,
  getAdminStaff,
  getConfig,
  getContent,
  getLogs,
  getOverview,
  getTickets,
  getWhitelists,
  patchConfig,
  reconcileAdminPayments,
  rejectWhitelist,
  updateAdminPlayerDiscordLink,
  updateAdminPlayerGems,
  updateAdminPlayerWhitelist,
  updateAdminPortalSettings,
  updateContent,
  updateDiamondPackage,
  updateNews,
  updateServerCard,
} from '../services/api';
import {
  formatCurrency,
  formatCurrencyFromCents,
  formatDateTime,
  formatTicketCategory,
  formatWhitelistStatus,
} from '../lib/portal';
import type {
  AdminDatabaseSnapshot,
  AdminOverviewPayload,
  AdminPlayerRecord,
  AdminPortalResponse,
  AuditLogRecord,
  ContentBlock,
  DashboardConfigResponse,
  FinanceSummary,
  PaymentOrderRecord,
  PortalPackage,
  PortalNewsItem,
  PortalServer,
  StaffSnapshotRecord,
  TicketRecord,
  WhitelistApplication,
} from '../types';

type SectionKey =
  | 'overview'
  | 'players'
  | 'whitelists'
  | 'tickets'
  | 'content'
  | 'portal'
  | 'staff'
  | 'orders'
  | 'finance'
  | 'database'
  | 'logs'
  | 'settings';

type FeedbackTone = 'default' | 'error';

type NewsDraft = {
  title: string;
  category: string;
  descriptionText: string;
  imageUrl: string;
  isPublished: boolean;
};

type ServerDraft = {
  name: string;
  descriptionText: string;
  imageUrl: string;
  statusLabel: string;
  connectUrl: string;
  permissionRequired: string;
  isActive: boolean;
  isPrimary: boolean;
  displayOrder: string;
};

type PackageDraft = {
  name: string;
  descriptionText: string;
  diamondAmount: string;
  bonusAmount: string;
  priceCents: string;
  highlightLabel: string;
  isActive: boolean;
  displayOrder: string;
};

type ConfigDraft = {
  supportRoleId: string;
  adminRoleId: string;
  ownerRoleId: string;
  whitelistRoleId: string;
  unverifiedRoleId: string;
  ticketCategoryId: string;
  ticketPanelChannelId: string;
  whitelistPanelChannelId: string;
  whitelistReviewChannelId: string;
  attemptLimit: string;
  cooldownMinutes: string;
  allowRetry: boolean;
};

type PortalSettingsDraft = {
  serverName: string;
  shortName: string;
  heroTitle: string;
  heroSubtitle: string;
  discordUrl: string;
  connectUrl: string;
  footerText: string;
  primaryColor: string;
  accentColor: string;
};

function createEmptyNewsDraft(): NewsDraft {
  return {
    title: '',
    category: 'Comunicado',
    descriptionText: '',
    imageUrl: '',
    isPublished: true,
  };
}

function createEmptyServerDraft(): ServerDraft {
  return {
    name: '',
    descriptionText: '',
    imageUrl: '',
    statusLabel: 'Online',
    connectUrl: '',
    permissionRequired: 'Whitelist',
    isActive: true,
    isPrimary: false,
    displayOrder: '0',
  };
}

function createEmptyPackageDraft(): PackageDraft {
  return {
    name: '',
    descriptionText: '',
    diamondAmount: '0',
    bonusAmount: '0',
    priceCents: '0',
    highlightLabel: '',
    isActive: true,
    displayOrder: '0',
  };
}

function toNewsDraft(item?: PortalNewsItem | null): NewsDraft {
  return {
    title: item?.title || '',
    category: item?.category || 'Comunicado',
    descriptionText: item?.descriptionText || '',
    imageUrl: item?.imageUrl || '',
    isPublished: Boolean(item?.isPublished ?? true),
  };
}

function toServerDraft(item?: PortalServer | null): ServerDraft {
  return {
    name: item?.name || '',
    descriptionText: item?.descriptionText || '',
    imageUrl: item?.imageUrl || '',
    statusLabel: item?.statusLabel || '',
    connectUrl: item?.connectUrl || '',
    permissionRequired: item?.permissionRequired || '',
    isActive: Boolean(item?.isActive ?? true),
    isPrimary: Boolean(item?.isPrimary ?? false),
    displayOrder: String(item?.displayOrder ?? 0),
  };
}

function toPackageDraft(item?: PortalPackage | null): PackageDraft {
  return {
    name: item?.name || '',
    descriptionText: item?.descriptionText || '',
    diamondAmount: String(item?.diamondAmount ?? 0),
    bonusAmount: String(item?.bonusAmount ?? 0),
    priceCents: String(item?.priceCents ?? 0),
    highlightLabel: item?.highlightLabel || '',
    isActive: Boolean(item?.isActive ?? true),
    displayOrder: String(item?.displayOrder ?? 0),
  };
}

function toConfigDraft(config?: DashboardConfigResponse | null): ConfigDraft {
  return {
    supportRoleId: config?.guildConfig.supportRoleId || '',
    adminRoleId: config?.guildConfig.adminRoleId || '',
    ownerRoleId: config?.guildConfig.ownerRoleId || '',
    whitelistRoleId: config?.guildConfig.whitelistRoleId || '',
    unverifiedRoleId: config?.guildConfig.unverifiedRoleId || '',
    ticketCategoryId: config?.guildConfig.ticketCategoryId || '',
    ticketPanelChannelId: config?.guildConfig.ticketPanelChannelId || '',
    whitelistPanelChannelId: config?.guildConfig.whitelistPanelChannelId || '',
    whitelistReviewChannelId: config?.guildConfig.whitelistReviewChannelId || '',
    attemptLimit: String(config?.guildConfig.whitelistSettings.attemptLimit || 3),
    cooldownMinutes: String(config?.guildConfig.whitelistSettings.cooldownMinutes || 30),
    allowRetry: Boolean(config?.guildConfig.whitelistSettings.allowRetry ?? true),
  };
}

function toPortalSettingsDraft(portal?: AdminPortalResponse | null): PortalSettingsDraft {
  return {
    serverName: portal?.settings.serverName || '',
    shortName: portal?.settings.shortName || '',
    heroTitle: portal?.settings.heroTitle || '',
    heroSubtitle: portal?.settings.heroSubtitle || '',
    discordUrl: portal?.settings.discordUrl || '',
    connectUrl: portal?.settings.connectUrl || '',
    footerText: portal?.settings.footerText || '',
    primaryColor: portal?.settings.primaryColor || '#0f1117',
    accentColor: portal?.settings.accentColor || '#c3ff27',
  };
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toneClass(tone: FeedbackTone) {
  return tone === 'error'
    ? 'border-red-500/20 bg-red-500/10 text-red-100'
    : 'border-white/10 bg-white/5 text-white/80';
}

function statusBadgeClass(ok: boolean) {
  return ok
    ? 'bg-green-500/10 text-green-300 border-green-500/20'
    : 'bg-white/10 text-white/70 border-white/10';
}

function orderStatusClass(status: string) {
  if (status === 'approved' || status === 'delivered') {
    return 'bg-green-500/10 text-green-300 border-green-500/20';
  }

  if (status === 'failed' || status === 'error') {
    return 'bg-red-500/10 text-red-200 border-red-500/20';
  }

  return 'bg-amber-500/10 text-amber-200 border-amber-500/20';
}

export default function Admin() {
  const { canAccessAdmin, isOwner, refreshSession, sessionData } = useAuth();
  const access = sessionData?.access;
  const capabilities = access?.capabilities;

  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('default');
  const [busyKey, setBusyKey] = useState('');

  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [players, setPlayers] = useState<AdminPlayerRecord[]>([]);
  const [playerSummary, setPlayerSummary] = useState<{
    totalPlayers: number;
    totalWhitelisted: number;
  } | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [playerDraft, setPlayerDraft] = useState({
    gems: '',
    discordUserId: '',
    force: false,
  });
  const [playerSearch, setPlayerSearch] = useState('');
  const [whitelists, setWhitelists] = useState<WhitelistApplication[]>([]);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [contentDrafts, setContentDrafts] = useState<Record<string, { title: string; bodyText: string }>>({});
  const [portal, setPortal] = useState<AdminPortalResponse | null>(null);
  const [portalSettingsDraft, setPortalSettingsDraft] = useState<PortalSettingsDraft>(toPortalSettingsDraft(null));
  const [newsDrafts, setNewsDrafts] = useState<Record<number, NewsDraft>>({});
  const [serverDrafts, setServerDrafts] = useState<Record<number, ServerDraft>>({});
  const [packageDrafts, setPackageDrafts] = useState<Record<number, PackageDraft>>({});
  const [newNewsDraft, setNewNewsDraft] = useState<NewsDraft>(createEmptyNewsDraft());
  const [newServerDraft, setNewServerDraft] = useState<ServerDraft>(createEmptyServerDraft());
  const [newPackageDraft, setNewPackageDraft] = useState<PackageDraft>(createEmptyPackageDraft());
  const [staffItems, setStaffItems] = useState<StaffSnapshotRecord[]>([]);
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([]);
  const [orderSummary, setOrderSummary] = useState<{
    totalOrders: number;
    approvedOrders: number;
    deliveredOrders: number;
  } | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [database, setDatabase] = useState<AdminDatabaseSnapshot | null>(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [config, setConfig] = useState<DashboardConfigResponse | null>(null);
  const [configDraft, setConfigDraft] = useState<ConfigDraft>(toConfigDraft(null));

  const sectionOptions = useMemo(() => {
    const options: Array<{ key: SectionKey; label: string; visible: boolean }> = [
      { key: 'overview', label: 'Overview', visible: Boolean(canAccessAdmin) },
      { key: 'players', label: 'Players', visible: Boolean(capabilities?.canManagePlayers) },
      { key: 'whitelists', label: 'Whitelists', visible: Boolean(capabilities?.canManageWhitelists) },
      { key: 'tickets', label: 'Tickets', visible: Boolean(capabilities?.canManageTickets) },
      { key: 'content', label: 'Conteudo', visible: Boolean(capabilities?.canManagePortal) },
      { key: 'portal', label: 'Portal', visible: Boolean(capabilities?.canManagePortal) },
      { key: 'staff', label: 'Staff', visible: Boolean(capabilities?.canReadLogs) },
      { key: 'orders', label: 'Pedidos', visible: Boolean(capabilities?.canManagePayments) },
      { key: 'finance', label: 'Financeiro', visible: Boolean(capabilities?.canViewFinance) },
      { key: 'database', label: 'Banco', visible: Boolean(capabilities?.canViewDatabase) },
      { key: 'logs', label: 'Logs', visible: Boolean(capabilities?.canReadLogs) },
      { key: 'settings', label: 'Configuracoes', visible: Boolean(capabilities?.canManagePortal || capabilities?.canManageSettings) },
    ];

    return options.filter((option) => option.visible);
  }, [canAccessAdmin, capabilities]);

  const selectedPlayer = useMemo(
    () => players.find((item) => item.accountId === selectedPlayerId) || null,
    [players, selectedPlayerId],
  );

  function pushFeedback(message: string, tone: FeedbackTone = 'default') {
    setFeedback(message);
    setFeedbackTone(tone);
  }

  async function loadPlayers(search = '') {
    if (!capabilities?.canManagePlayers) {
      return;
    }

    const response = await getAdminPlayers(search);
    setPlayers(response.items);
    setPlayerSummary(response.summary);

    const nextSelectedId =
      selectedPlayerId && response.items.some((item) => item.accountId === selectedPlayerId)
        ? selectedPlayerId
        : response.items[0]?.accountId || null;
    setSelectedPlayerId(nextSelectedId);
  }

  async function loadDatabase() {
    if (!capabilities?.canViewDatabase) {
      return;
    }

    setDatabaseLoading(true);
    try {
      const response = await getAdminDatabaseSnapshot();
      setDatabase(response);
    } finally {
      setDatabaseLoading(false);
    }
  }

  function hydratePortalState(nextPortal: AdminPortalResponse) {
    setPortal(nextPortal);
    setPortalSettingsDraft(toPortalSettingsDraft(nextPortal));
    setNewsDrafts(
      Object.fromEntries(nextPortal.news.map((item) => [item.id, toNewsDraft(item)])),
    );
    setServerDrafts(
      Object.fromEntries(nextPortal.servers.map((item) => [item.id, toServerDraft(item)])),
    );
    setPackageDrafts(
      Object.fromEntries(nextPortal.packages.map((item) => [item.id, toPackageDraft(item)])),
    );
  }

  function hydrateContentState(items: ContentBlock[]) {
    setContentBlocks(items);
    setContentDrafts(
      Object.fromEntries(
        items.map((item) => [
          item.contentKey,
          {
            title: item.title,
            bodyText: item.bodyText,
          },
        ]),
      ),
    );
  }

  async function loadAll(showRefreshMessage = false) {
    if (!canAccessAdmin) {
      return;
    }

    if (showRefreshMessage) {
      setBusyKey('refresh');
      pushFeedback('Atualizando painel...');
    }

    setLoading(true);
    setPageError('');

    try {
      const tasks: Array<Promise<void>> = [];

      tasks.push(
        getOverview().then((response) => {
          setOverview(response);
        }),
      );

      if (capabilities?.canManagePlayers) {
        tasks.push(loadPlayers(playerSearch));
      }

      if (capabilities?.canManageWhitelists) {
        tasks.push(
          getWhitelists().then((response) => {
            setWhitelists(response.items);
          }),
        );
      }

      if (capabilities?.canManageTickets) {
        tasks.push(
          getTickets().then((response) => {
            setTickets(response.items);
          }),
        );
      }

      if (capabilities?.canReadLogs) {
        tasks.push(
          getLogs().then((response) => {
            setLogs(response.items);
          }),
        );
        tasks.push(
          getAdminStaff().then((response) => {
            setStaffItems(response.items);
          }),
        );
      }

      if (capabilities?.canViewFinance) {
        tasks.push(
          getAdminFinance().then((response) => {
            setFinance(response);
          }),
        );
      }

      if (capabilities?.canManagePortal) {
        tasks.push(
          getAdminPortal().then((response) => {
            hydratePortalState(response);
          }),
        );
        tasks.push(
          getContent().then((response) => {
            hydrateContentState(response.items);
          }),
        );
      }

      if (capabilities?.canManagePortal || capabilities?.canManageSettings) {
        tasks.push(
          getConfig().then((response) => {
            setConfig(response);
            setConfigDraft(toConfigDraft(response));
          }),
        );
      }

      if (capabilities?.canManagePayments) {
        tasks.push(
          getAdminOrders({ limit: 50 }).then((response) => {
            setOrders(response.items);
            setOrderSummary(response.summary);
          }),
        );
      }

      if (capabilities?.canViewDatabase && activeSection === 'database') {
        tasks.push(loadDatabase());
      }

      const results = await Promise.allSettled(tasks);
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') {
        throw failed.reason;
      }

      if (showRefreshMessage) {
        await refreshSession();
        pushFeedback('Painel atualizado com sucesso.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar o painel administrativo.';
      setPageError(message);
      pushFeedback(message, 'error');
    } finally {
      setBusyKey('');
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
  }, [canAccessAdmin]);

  useEffect(() => {
    if (selectedPlayer) {
      setPlayerDraft({
        gems: String(selectedPlayer.gems),
        discordUserId: selectedPlayer.discordLink.linkedUserId || '',
        force: false,
      });
    }
  }, [selectedPlayer]);

  useEffect(() => {
    if (activeSection === 'database' && !database && !databaseLoading) {
      void loadDatabase().catch((error) => {
        pushFeedback(error instanceof Error ? error.message : 'Falha ao carregar o banco.', 'error');
      });
    }
  }, [activeSection, database, databaseLoading, capabilities?.canViewDatabase]);

  useEffect(() => {
    if (!capabilities?.canManagePlayers) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPlayers(playerSearch).catch((error) => {
        pushFeedback(error instanceof Error ? error.message : 'Falha ao pesquisar players.', 'error');
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [playerSearch, capabilities?.canManagePlayers]);

  async function handleSaveGems() {
    if (!selectedPlayer) {
      return;
    }

    setBusyKey('save-gems');
    try {
      await updateAdminPlayerGems(selectedPlayer.accountId, parseNumber(playerDraft.gems, selectedPlayer.gems));
      await Promise.all([loadPlayers(playerSearch), getOverview().then(setOverview)]);
      pushFeedback(`Diamantes do passaporte ${selectedPlayer.accountId} atualizados.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao salvar diamantes.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleToggleWhitelist() {
    if (!selectedPlayer) {
      return;
    }

    if (!window.confirm(`Confirma alterar a whitelist do passaporte ${selectedPlayer.accountId}?`)) {
      return;
    }

    setBusyKey('save-whitelist');
    try {
      await updateAdminPlayerWhitelist(selectedPlayer.accountId, !selectedPlayer.whitelist);
      await Promise.all([loadPlayers(playerSearch), getOverview().then(setOverview)]);
      pushFeedback(`Whitelist do passaporte ${selectedPlayer.accountId} atualizada.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao atualizar whitelist.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleSaveDiscordLink() {
    if (!selectedPlayer) {
      return;
    }

    setBusyKey('save-discord');
    try {
      await updateAdminPlayerDiscordLink(selectedPlayer.accountId, {
        discordUserId: playerDraft.discordUserId.trim(),
        force: playerDraft.force,
      });
      await loadPlayers(playerSearch);
      pushFeedback(`Vinculo Discord do passaporte ${selectedPlayer.accountId} atualizado.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao salvar vinculo Discord.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleApproveWhitelist(applicationId: number) {
    if (!window.confirm(`Confirma aprovar a whitelist #${applicationId}?`)) {
      return;
    }

    setBusyKey(`approve-${applicationId}`);
    try {
      await approveWhitelist(applicationId);
      await loadAll();
      pushFeedback(`Whitelist #${applicationId} aprovada.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao aprovar whitelist.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleRejectWhitelist(applicationId: number) {
    const reason = String(rejectReasons[applicationId] || '').trim();
    if (!reason) {
      pushFeedback('Informe o motivo da reprovacao.', 'error');
      return;
    }

    if (!window.confirm(`Confirma reprovar a whitelist #${applicationId}?`)) {
      return;
    }

    setBusyKey(`reject-${applicationId}`);
    try {
      await rejectWhitelist(applicationId, reason);
      await loadAll();
      pushFeedback(`Whitelist #${applicationId} reprovada.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao reprovar whitelist.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleSaveContent(contentKey: string) {
    const draft = contentDrafts[contentKey];
    if (!draft) {
      return;
    }

    setBusyKey(`content-${contentKey}`);
    try {
      await updateContent(contentKey, draft);
      const response = await getContent();
      hydrateContentState(response.items);
      pushFeedback(`Bloco ${contentKey} atualizado.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao salvar conteudo.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleSavePortalSettings() {
    setBusyKey('portal-settings');
    try {
      await updateAdminPortalSettings({
        serverName: portalSettingsDraft.serverName,
        shortName: portalSettingsDraft.shortName || null,
        heroTitle: portalSettingsDraft.heroTitle,
        heroSubtitle: portalSettingsDraft.heroSubtitle,
        discordUrl: portalSettingsDraft.discordUrl || null,
        connectUrl: portalSettingsDraft.connectUrl || null,
        footerText: portalSettingsDraft.footerText,
        primaryColor: portalSettingsDraft.primaryColor,
        accentColor: portalSettingsDraft.accentColor,
      });
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback('Configuracoes do portal atualizadas.');
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao salvar portal.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleCreateNews() {
    setBusyKey('create-news');
    try {
      await createNews(newNewsDraft);
      const response = await getAdminPortal();
      hydratePortalState(response);
      setNewNewsDraft(createEmptyNewsDraft());
      pushFeedback('Noticia criada com sucesso.');
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao criar noticia.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleUpdateNews(id: number) {
    setBusyKey(`news-${id}`);
    try {
      await updateNews(id, newsDrafts[id]);
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback(`Noticia #${id} atualizada.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao atualizar noticia.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleDeleteNews(id: number) {
    if (!window.confirm(`Confirma remover a noticia #${id}?`)) {
      return;
    }

    setBusyKey(`delete-news-${id}`);
    try {
      await deleteNews(id);
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback(`Noticia #${id} removida.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao remover noticia.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleCreateServer() {
    setBusyKey('create-server');
    try {
      await createServerCard({
        ...newServerDraft,
        displayOrder: parseNumber(newServerDraft.displayOrder, 0),
      });
      const response = await getAdminPortal();
      hydratePortalState(response);
      setNewServerDraft(createEmptyServerDraft());
      pushFeedback('Servidor criado com sucesso.');
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao criar servidor.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleUpdateServer(id: number) {
    setBusyKey(`server-${id}`);
    try {
      await updateServerCard(id, {
        ...serverDrafts[id],
        displayOrder: parseNumber(serverDrafts[id].displayOrder, 0),
      });
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback(`Servidor #${id} atualizado.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao atualizar servidor.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleDeleteServer(id: number) {
    if (!window.confirm(`Confirma remover o servidor #${id}?`)) {
      return;
    }

    setBusyKey(`delete-server-${id}`);
    try {
      await deleteServerCard(id);
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback(`Servidor #${id} removido.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao remover servidor.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleCreatePackage() {
    setBusyKey('create-package');
    try {
      await createDiamondPackage({
        ...newPackageDraft,
        diamondAmount: parseNumber(newPackageDraft.diamondAmount, 0),
        bonusAmount: parseNumber(newPackageDraft.bonusAmount, 0),
        priceCents: parseNumber(newPackageDraft.priceCents, 0),
        displayOrder: parseNumber(newPackageDraft.displayOrder, 0),
      });
      const response = await getAdminPortal();
      hydratePortalState(response);
      setNewPackageDraft(createEmptyPackageDraft());
      pushFeedback('Pacote criado com sucesso.');
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao criar pacote.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleUpdatePackage(id: number) {
    setBusyKey(`package-${id}`);
    try {
      await updateDiamondPackage(id, {
        ...packageDrafts[id],
        diamondAmount: parseNumber(packageDrafts[id].diamondAmount, 0),
        bonusAmount: parseNumber(packageDrafts[id].bonusAmount, 0),
        priceCents: parseNumber(packageDrafts[id].priceCents, 0),
        displayOrder: parseNumber(packageDrafts[id].displayOrder, 0),
      });
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback(`Pacote #${id} atualizado.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao atualizar pacote.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleDeletePackage(id: number) {
    if (!window.confirm(`Confirma remover o pacote #${id}?`)) {
      return;
    }

    setBusyKey(`delete-package-${id}`);
    try {
      await deleteDiamondPackage(id);
      const response = await getAdminPortal();
      hydratePortalState(response);
      pushFeedback(`Pacote #${id} removido.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao remover pacote.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleSaveConfig() {
    setBusyKey('config');
    try {
      await patchConfig({
        supportRoleId: configDraft.supportRoleId || null,
        adminRoleId: configDraft.adminRoleId || null,
        ownerRoleId: configDraft.ownerRoleId || null,
        whitelistRoleId: configDraft.whitelistRoleId || null,
        unverifiedRoleId: configDraft.unverifiedRoleId || null,
        ticketCategoryId: configDraft.ticketCategoryId || null,
        ticketPanelChannelId: configDraft.ticketPanelChannelId || null,
        whitelistPanelChannelId: configDraft.whitelistPanelChannelId || null,
        whitelistReviewChannelId: configDraft.whitelistReviewChannelId || null,
        whitelistSettings: {
          attemptLimit: parseNumber(configDraft.attemptLimit, 3),
          cooldownMinutes: parseNumber(configDraft.cooldownMinutes, 30),
          allowRetry: configDraft.allowRetry,
        },
      });
      const response = await getConfig();
      setConfig(response);
      setConfigDraft(toConfigDraft(response));
      pushFeedback('Configuracoes operacionais atualizadas.');
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao salvar configuracoes.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function handleReconcilePayments() {
    setBusyKey('reconcile-payments');
    try {
      const result = await reconcileAdminPayments(50);
      const ordersResponse = await getAdminOrders({ limit: 50 });
      setOrders(ordersResponse.items);
      setOrderSummary(ordersResponse.summary);
      pushFeedback(`Reconciliacao executada. ${result.processed} item(ns) processados.`);
    } catch (error) {
      pushFeedback(error instanceof Error ? error.message : 'Falha ao reconciliar pagamentos.', 'error');
    } finally {
      setBusyKey('');
    }
  }

  const content = (
    <>
      {feedback ? (
        <div className={cn('rounded-2xl border px-4 py-3 text-sm', toneClass(feedbackTone))}>
          {feedback}
        </div>
      ) : null}

      {activeSection === 'overview' ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Players', String(playerSummary?.totalPlayers || overview?.overview.counts.totalPlayers || 0)],
            ['Whitelist', String(playerSummary?.totalWhitelisted || overview?.overview.counts.whitelistedPlayers || 0)],
            ['Tickets abertos', String(overview?.overview.counts.openTickets || 0)],
            ['Paineis', String(overview?.overview.counts.panels || 0)],
            ['Receita total', formatCurrency(finance?.totals.totalRevenue || overview?.overview.finance.totalRevenue || 0)],
            ['Receita mes', formatCurrency(finance?.totals.revenueMonth || overview?.overview.finance.revenueMonth || 0)],
            ['Pedidos', String(orderSummary?.totalOrders || sessionData?.purchaseSummary.totalOrders || 0)],
            ['Entregues', String(orderSummary?.deliveredOrders || sessionData?.purchaseSummary.deliveredOrders || 0)],
          ].map(([label, value]) => (
            <Card key={label} className="glass-dark border-white/5 rounded-[1.75rem]">
              <CardContent className="p-6">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-black">{label}</div>
                <div className="mt-3 text-2xl font-display font-black">{value}</div>
              </CardContent>
            </Card>
          ))}

          <Card className="glass-dark border-white/5 rounded-[1.75rem] md:col-span-2 xl:col-span-4">
            <CardHeader>
              <CardTitle>Saude operacional</CardTitle>
              <CardDescription>Runtime do bot, API e banco compartilhado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Discord', overview?.overview.health.discord || 'Indisponivel'],
                ['Banco', overview?.overview.health.database || 'Indisponivel'],
                ['API', overview?.overview.health.api || 'Indisponivel'],
                ['Acesso', access?.level || 'player'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">{label}</div>
                  <div className="mt-2 text-lg font-bold">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === 'players' ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Busca de players</CardTitle>
              <CardDescription>Passaporte, Discord, license e personagem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Pesquisar player..."
                className="bg-white/5 border-white/10"
              />
              <div className="space-y-3 max-h-[30rem] overflow-y-auto">
                {players.map((item) => (
                  <button
                    key={item.accountId}
                    onClick={() => setSelectedPlayerId(item.accountId)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-colors',
                      item.accountId === selectedPlayerId
                        ? 'border-neon/30 bg-neon/10'
                        : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]',
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-black">#{item.passaporte} • {item.primaryCharacterName || 'Sem personagem'}</div>
                        <div className="mt-1 text-xs text-white/55 break-all">{item.discordLink.primary || item.license}</div>
                      </div>
                      <Badge className={cn('text-[10px] uppercase border', statusBadgeClass(item.whitelist))}>
                        {item.whitelist ? 'Whitelist' : 'Sem whitelist'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Edicao operacional</CardTitle>
              <CardDescription>Ajustes auditados em `accounts.gems`, whitelist e vinculo Discord.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedPlayer ? (
                <>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="text-xl font-display font-black">#{selectedPlayer.passaporte}</div>
                    <div className="mt-2 text-sm text-white/60">{selectedPlayer.primaryCharacterName || 'Sem personagem ativo'}</div>
                    <div className="mt-2 text-xs text-white/40 break-all">{selectedPlayer.discordLink.primary || selectedPlayer.license}</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Diamantes</label>
                    <Input
                      value={playerDraft.gems}
                      onChange={(event) => setPlayerDraft((current) => ({ ...current, gems: event.target.value }))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Discord ID</label>
                    <Input
                      value={playerDraft.discordUserId}
                      onChange={(event) => setPlayerDraft((current) => ({ ...current, discordUserId: event.target.value }))}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={playerDraft.force}
                      onChange={(event) => setPlayerDraft((current) => ({ ...current, force: event.target.checked }))}
                    />
                    Forcar substituicao de vinculo existente
                  </label>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Button onClick={() => void handleSaveGems()} disabled={busyKey === 'save-gems'} className="bg-neon text-black hover:bg-neon/90">
                      Salvar diamantes
                    </Button>
                    <Button onClick={() => void handleToggleWhitelist()} disabled={busyKey === 'save-whitelist'} variant="outline" className="border-white/10 bg-white/5">
                      Alternar whitelist
                    </Button>
                    <Button onClick={() => void handleSaveDiscordLink()} disabled={busyKey === 'save-discord'} variant="outline" className="border-white/10 bg-white/5">
                      Salvar Discord
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-white/60">Selecione um player para editar.</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === 'whitelists' ? (
        <div className="grid gap-4">
          {whitelists.map((item) => (
            <Card key={item.id} className="glass-dark border-white/5 rounded-[1.75rem]">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-display font-black">Whitelist #{item.id}</div>
                    <div className="text-sm text-white/60">{item.applicant?.displayName || item.userId}</div>
                  </div>
                  <Badge className="border border-white/10 bg-white/10 text-white">{formatWhitelistStatus(item.status)}</Badge>
                </div>

                <div className="text-sm text-white/70">
                  Passaporte informado: {item.userServerId || 'Nao informado'} • Personagem: {item.characterName || 'Nao informado'}
                </div>

                <textarea
                  rows={3}
                  value={rejectReasons[item.id] || ''}
                  onChange={(event) => setRejectReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Motivo da reprovacao"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
                />

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void handleApproveWhitelist(item.id)} disabled={busyKey === `approve-${item.id}`} className="bg-neon text-black hover:bg-neon/90">
                    Aprovar
                  </Button>
                  <Button onClick={() => void handleRejectWhitelist(item.id)} disabled={busyKey === `reject-${item.id}`} variant="outline" className="border-white/10 bg-white/5">
                    Reprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {whitelists.length === 0 ? <EmptyState message="Nenhuma whitelist encontrada." /> : null}
        </div>
      ) : null}

      {activeSection === 'tickets' ? (
        <div className="grid gap-4">
          {tickets.map((item) => (
            <Card key={item.id} className="glass-dark border-white/5 rounded-[1.75rem]">
              <CardContent className="p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-display font-black">Ticket #{item.id}</div>
                    <div className="text-sm text-white/60">
                      {formatTicketCategory(item.categoryKey)} • owner {item.ownerId}
                    </div>
                  </div>
                  <Badge className={cn('border text-white', statusBadgeClass(item.status === 'open'))}>
                    {item.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-3">
                  <div>Canal: {item.channelId || 'Nao encontrado'}</div>
                  <div>Claimed by: {item.claimedBy || 'Ninguem'}</div>
                  <div>Atualizado: {formatDateTime(item.updatedAt)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tickets.length === 0 ? <EmptyState message="Nenhum ticket encontrado." /> : null}
        </div>
      ) : null}

      {activeSection === 'content' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {contentBlocks.map((item) => (
            <Card key={item.contentKey} className="glass-dark border-white/5 rounded-[1.75rem]">
              <CardHeader>
                <CardTitle>{item.contentKey}</CardTitle>
                <CardDescription>Bloco compartilhado entre portal, onboarding e dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={contentDrafts[item.contentKey]?.title || ''}
                  onChange={(event) =>
                    setContentDrafts((current) => ({
                      ...current,
                      [item.contentKey]: {
                        ...current[item.contentKey],
                        title: event.target.value,
                      },
                    }))
                  }
                  className="bg-white/5 border-white/10"
                />
                <textarea
                  rows={8}
                  value={contentDrafts[item.contentKey]?.bodyText || ''}
                  onChange={(event) =>
                    setContentDrafts((current) => ({
                      ...current,
                      [item.contentKey]: {
                        ...current[item.contentKey],
                        bodyText: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
                />
                <Button onClick={() => void handleSaveContent(item.contentKey)} disabled={busyKey === `content-${item.contentKey}`} className="bg-neon text-black hover:bg-neon/90">
                  Salvar bloco
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {activeSection === 'portal' ? (
        <div className="space-y-8">
          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Configuracoes do portal</CardTitle>
              <CardDescription>Identidade publica, links oficiais e hero.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <InputBox label="Nome do servidor" value={portalSettingsDraft.serverName} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, serverName: value }))} />
              <InputBox label="Nome curto" value={portalSettingsDraft.shortName} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, shortName: value }))} />
              <InputBox label="Hero title" value={portalSettingsDraft.heroTitle} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, heroTitle: value }))} />
              <InputBox label="Discord URL" value={portalSettingsDraft.discordUrl} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, discordUrl: value }))} />
              <InputBox label="Connect URL" value={portalSettingsDraft.connectUrl} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, connectUrl: value }))} />
              <InputBox label="Footer" value={portalSettingsDraft.footerText} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, footerText: value }))} />
              <InputBox label="Primary color" value={portalSettingsDraft.primaryColor} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, primaryColor: value }))} />
              <InputBox label="Accent color" value={portalSettingsDraft.accentColor} onChange={(value) => setPortalSettingsDraft((current) => ({ ...current, accentColor: value }))} />
              <div className="lg:col-span-2 space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Hero subtitle</label>
                <textarea
                  rows={5}
                  value={portalSettingsDraft.heroSubtitle}
                  onChange={(event) => setPortalSettingsDraft((current) => ({ ...current, heroSubtitle: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
                />
              </div>
              <div className="lg:col-span-2">
                <Button onClick={() => void handleSavePortalSettings()} disabled={busyKey === 'portal-settings'} className="bg-neon text-black hover:bg-neon/90">
                  Salvar configuracoes do portal
                </Button>
              </div>
            </CardContent>
          </Card>

          <CrudSection title="Noticias" description="Comunicados e updates publicados no portal.">
            <CreateNewsForm draft={newNewsDraft} setDraft={setNewNewsDraft} onSubmit={() => void handleCreateNews()} busy={busyKey === 'create-news'} />
            {(portal?.news || []).map((item) => (
              <EditableNewsCard
                key={item.id}
                item={item}
                draft={newsDrafts[item.id] || toNewsDraft(item)}
                onChange={(next) => setNewsDrafts((current) => ({ ...current, [item.id]: next }))}
                onSave={() => void handleUpdateNews(item.id)}
                onDelete={() => void handleDeleteNews(item.id)}
                busy={busyKey === `news-${item.id}` || busyKey === `delete-news-${item.id}`}
              />
            ))}
          </CrudSection>

          <CrudSection title="Servidores" description="Cards publicos para cidade principal e ambientes secundarios.">
            <CreateServerForm draft={newServerDraft} setDraft={setNewServerDraft} onSubmit={() => void handleCreateServer()} busy={busyKey === 'create-server'} />
            {(portal?.servers || []).map((item) => (
              <EditableServerCard
                key={item.id}
                item={item}
                draft={serverDrafts[item.id] || toServerDraft(item)}
                onChange={(next) => setServerDrafts((current) => ({ ...current, [item.id]: next }))}
                onSave={() => void handleUpdateServer(item.id)}
                onDelete={() => void handleDeleteServer(item.id)}
                busy={busyKey === `server-${item.id}` || busyKey === `delete-server-${item.id}`}
              />
            ))}
          </CrudSection>

          <CrudSection title="Pacotes" description="Catalogo oficial da loja com diamantes e bonus.">
            <CreatePackageForm draft={newPackageDraft} setDraft={setNewPackageDraft} onSubmit={() => void handleCreatePackage()} busy={busyKey === 'create-package'} />
            {(portal?.packages || []).map((item) => (
              <EditablePackageCard
                key={item.id}
                item={item}
                draft={packageDrafts[item.id] || toPackageDraft(item)}
                onChange={(next) => setPackageDrafts((current) => ({ ...current, [item.id]: next }))}
                onSave={() => void handleUpdatePackage(item.id)}
                onDelete={() => void handleDeletePackage(item.id)}
                busy={busyKey === `package-${item.id}` || busyKey === `delete-package-${item.id}`}
              />
            ))}
          </CrudSection>
        </div>
      ) : null}

      {activeSection === 'staff' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {staffItems.map((item) => (
            <Card key={item.id} className="glass-dark border-white/5 rounded-[1.75rem]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <img src={item.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt={item.displayName} className="h-14 w-14 rounded-2xl border border-white/10 object-cover" />
                  <div>
                    <div className="font-display text-lg font-black">{item.displayName}</div>
                    <div className="text-xs text-white/45">{item.username}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.roles.map((role) => (
                    <Badge key={role.id} className="border border-white/10 bg-white/10 text-white/80">
                      {role.name}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                  <MetricBox label="Claims" value={String(item.metrics.ticketsClaimed)} />
                  <MetricBox label="Fechados" value={String(item.metrics.ticketsClosed)} />
                  <MetricBox label="Whitelist" value={String(item.metrics.whitelistsReviewed)} />
                  <MetricBox label="Ultima acao" value={item.metrics.lastActionAt ? formatDateTime(item.metrics.lastActionAt) : 'Sem dados'} />
                </div>
              </CardContent>
            </Card>
          ))}
          {staffItems.length === 0 ? <EmptyState message="Nenhum membro staff encontrado." /> : null}
        </div>
      ) : null}

      {activeSection === 'orders' ? (
        <div className="space-y-6">
          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Pedidos e entregas</CardTitle>
              <CardDescription>Monitoramento da loja Mercado Pago e credito automatico de diamantes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Badge className="border border-white/10 bg-white/10 text-white">Total {orderSummary?.totalOrders || 0}</Badge>
              <Badge className="border border-green-500/20 bg-green-500/10 text-green-300">Aprovados {orderSummary?.approvedOrders || 0}</Badge>
              <Badge className="border border-neon/20 bg-neon/10 text-neon">Entregues {orderSummary?.deliveredOrders || 0}</Badge>
              <Button onClick={() => void handleReconcilePayments()} disabled={busyKey === 'reconcile-payments'} className="bg-neon text-black hover:bg-neon/90">
                {busyKey === 'reconcile-payments' ? 'Reconciliando...' : 'Rodar reconciliacao'}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {orders.map((item) => (
              <Card key={item.id} className="glass-dark border-white/5 rounded-[1.75rem]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-lg font-display font-black">Pedido #{item.id} • {item.packageSnapshot.name || `Pacote ${item.packageId}`}</div>
                      <div className="text-sm text-white/60">Discord {item.discordUserId} • Passaporte {item.playerAccountId || 'pendente'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={cn('border', orderStatusClass(item.paymentStatus))}>{item.paymentStatus}</Badge>
                      <Badge className={cn('border', orderStatusClass(item.deliveryStatus))}>{item.deliveryStatus}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm text-white/70 md:grid-cols-4">
                    <div>Valor: {formatCurrencyFromCents(item.totalPriceCents)}</div>
                    <div>Diamantes: {item.totalDiamonds}</div>
                    <div>Bonus: {item.totalBonus}</div>
                    <div>Criado: {formatDateTime(item.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {orders.length === 0 ? <EmptyState message="Nenhum pedido encontrado." /> : null}
          </div>
        </div>
      ) : null}

      {activeSection === 'finance' ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Resumo financeiro</CardTitle>
              <CardDescription>Leitura do banco compartilhado e historico legado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <MetricBox label="Receita total" value={formatCurrency(finance?.totals.totalRevenue || 0)} />
              <MetricBox label="Receita do mes" value={formatCurrency(finance?.totals.revenueMonth || 0)} />
              <MetricBox label="Pagamentos" value={String(finance?.totals.totalPayments || 0)} />
            </CardContent>
          </Card>
          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Top compradores</CardTitle>
              <CardDescription>Maior movimentacao na tabela historica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(finance?.topBuyers || []).map((entry) => (
                <div key={entry.userId} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="font-black">#{entry.player?.passaporte || entry.userId}</div>
                  <div className="mt-1 text-sm text-white/60">{entry.player?.primaryCharacterName || 'Sem personagem'}</div>
                  <div className="mt-2 text-sm text-neon">{formatCurrency(entry.totalSpent)} • {entry.purchases} compra(s)</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === 'database' ? (
        <div className="space-y-6">
          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Snapshot do banco</CardTitle>
              <CardDescription>Somente leitura para diagnostico do ecossistema compartilhado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <MetricBox label="Tabelas" value={String(database?.summary.totalTables || 0)} />
              <MetricBox label="Populadas" value={String(database?.summary.populatedTables || 0)} />
              <MetricBox label="Bot" value={String(database?.summary.botTablesWithData || 0)} />
              <MetricBox label="FiveM" value={String(database?.summary.fivemTablesWithData || 0)} />
              <MetricBox label="Integracao" value={String(database?.summary.integrationTablesWithData || 0)} />
              <MetricBox label="Estado" value={databaseLoading ? 'Carregando' : 'Pronto'} />
            </CardContent>
          </Card>

          <Card className="glass-dark border-white/5 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Tabelas mapeadas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(database?.tables || []).map((table) => (
                <div key={table.tableName} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-black">{table.tableName}</div>
                      <div className="text-sm text-white/55">{table.description}</div>
                    </div>
                    <div className="text-sm text-white/70">
                      {table.scope} • {table.rowCount} registro(s)
                    </div>
                  </div>
                </div>
              ))}
              {!database && !databaseLoading ? <EmptyState message="Nenhum snapshot carregado." /> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeSection === 'logs' ? (
        <div className="grid gap-4">
          {logs.map((item) => (
            <Card key={item.id} className="glass-dark border-white/5 rounded-[1.75rem]">
              <CardContent className="p-6 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Badge className="w-fit border border-white/10 bg-white/10 text-white">{item.eventType}</Badge>
                  <div className="text-xs text-white/45">{formatDateTime(item.createdAt)}</div>
                </div>
                <div className="text-sm text-white/60">
                  actor {item.actorId || '-'} • entity {item.entityType || '-'}:{item.entityId || '-'}
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-white/5 bg-black/30 p-4 text-xs text-white/75">
                  {JSON.stringify(item.details, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
          {logs.length === 0 ? <EmptyState message="Nenhum log encontrado." /> : null}
        </div>
      ) : null}

      {activeSection === 'settings' ? (
        <Card className="glass-dark border-white/5 rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Configuracoes operacionais</CardTitle>
            <CardDescription>Hierarquia de cargos, canais e regras da whitelist.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <InputBox label="Cargo suporte" value={configDraft.supportRoleId} onChange={(value) => setConfigDraft((current) => ({ ...current, supportRoleId: value }))} />
            <InputBox label="Cargo admin" value={configDraft.adminRoleId} onChange={(value) => setConfigDraft((current) => ({ ...current, adminRoleId: value }))} />
            <InputBox label="Cargo owner" value={configDraft.ownerRoleId} onChange={(value) => setConfigDraft((current) => ({ ...current, ownerRoleId: value }))} />
            <InputBox label="Cargo whitelist" value={configDraft.whitelistRoleId} onChange={(value) => setConfigDraft((current) => ({ ...current, whitelistRoleId: value }))} />
            <InputBox label="Cargo nao verificado" value={configDraft.unverifiedRoleId} onChange={(value) => setConfigDraft((current) => ({ ...current, unverifiedRoleId: value }))} />
            <InputBox label="Categoria tickets" value={configDraft.ticketCategoryId} onChange={(value) => setConfigDraft((current) => ({ ...current, ticketCategoryId: value }))} />
            <InputBox label="Canal painel tickets" value={configDraft.ticketPanelChannelId} onChange={(value) => setConfigDraft((current) => ({ ...current, ticketPanelChannelId: value }))} />
            <InputBox label="Canal painel whitelist" value={configDraft.whitelistPanelChannelId} onChange={(value) => setConfigDraft((current) => ({ ...current, whitelistPanelChannelId: value }))} />
            <InputBox label="Canal revisao whitelist" value={configDraft.whitelistReviewChannelId} onChange={(value) => setConfigDraft((current) => ({ ...current, whitelistReviewChannelId: value }))} />
            <InputBox label="Limite de tentativas" value={configDraft.attemptLimit} onChange={(value) => setConfigDraft((current) => ({ ...current, attemptLimit: value }))} />
            <InputBox label="Cooldown (minutos)" value={configDraft.cooldownMinutes} onChange={(value) => setConfigDraft((current) => ({ ...current, cooldownMinutes: value }))} />
            <label className="flex items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={configDraft.allowRetry}
                onChange={(event) => setConfigDraft((current) => ({ ...current, allowRetry: event.target.checked }))}
              />
              Permitir nova tentativa de whitelist
            </label>
            <div className="lg:col-span-2">
              <Button onClick={() => void handleSaveConfig()} disabled={busyKey === 'config' || !isOwner} className="bg-neon text-black hover:bg-neon/90">
                Salvar configuracoes
              </Button>
              {!isOwner ? (
                <div className="mt-3 text-sm text-white/45">
                  Apenas contas owner podem alterar configuracoes criticas e mapeamento de cargos.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-background px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl">
          <Card className="glass-dark border-white/5 rounded-[2rem]">
            <CardContent className="p-8 text-center text-white/70">Carregando painel administrativo...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (pageError && !overview) {
    return (
      <div className="min-h-screen bg-background px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl">
          <Card className="glass-dark border-white/5 rounded-[2rem]">
            <CardContent className="space-y-5 p-8 text-center">
              <div className="text-2xl font-display font-black uppercase">Falha ao abrir o admin</div>
              <div className="text-white/60">{pageError}</div>
              <Button onClick={() => void loadAll(true)} className="bg-neon text-black hover:bg-neon/90">
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-16 pt-24 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="glass-dark border-white/5 rounded-[2rem] overflow-hidden">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Dashboard staff</div>
              <div className="mt-2 text-3xl font-display font-black uppercase tracking-tight">
                Command Center
              </div>
              <div className="mt-3 text-sm text-white/60">
                Nivel atual: <span className="font-black uppercase text-white">{access?.level || 'player'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void loadAll(true)} disabled={busyKey === 'refresh'} className="bg-neon text-black hover:bg-neon/90">
                {busyKey === 'refresh' ? 'Atualizando...' : 'Atualizar painel'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
          <Card className="glass-dark border-white/5 rounded-[1.75rem] h-fit">
            <CardContent className="p-4">
              <div className="grid gap-2">
                {sectionOptions.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-left text-sm font-black uppercase tracking-[0.16em] transition-colors',
                      activeSection === section.key
                        ? 'bg-neon text-black'
                        : 'bg-white/5 text-white/72 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">{content}</div>
        </div>
      </div>
    </div>
  );
}

function InputBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="bg-white/5 border-white/10" />
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-black">{label}</div>
      <div className="mt-2 text-sm font-black text-white">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="glass-dark border-white/5 rounded-[1.75rem]">
      <CardContent className="p-8 text-center text-white/60">{message}</CardContent>
    </Card>
  );
}

function CrudSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass-dark border-white/5 rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function CreateNewsForm({
  draft,
  setDraft,
  onSubmit,
  busy,
}: {
  draft: NewsDraft;
  setDraft: React.Dispatch<React.SetStateAction<NewsDraft>>;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-white/45">Nova noticia</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InputBox label="Titulo" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
        <InputBox label="Categoria" value={draft.category} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} />
        <InputBox label="Imagem URL" value={draft.imageUrl} onChange={(value) => setDraft((current) => ({ ...current, imageUrl: value }))} />
        <label className="flex items-center gap-3 text-sm text-white/70">
          <input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft((current) => ({ ...current, isPublished: event.target.checked }))} />
          Publicar imediatamente
        </label>
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Descricao</label>
          <textarea
            rows={4}
            value={draft.descriptionText}
            onChange={(event) => setDraft((current) => ({ ...current, descriptionText: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
          />
        </div>
      </div>
      <Button onClick={onSubmit} disabled={busy} className="mt-4 bg-neon text-black hover:bg-neon/90">
        {busy ? 'Criando...' : 'Criar noticia'}
      </Button>
    </div>
  );
}

function EditableNewsCard({
  item,
  draft,
  onChange,
  onSave,
  onDelete,
  busy,
}: {
  item: PortalNewsItem;
  draft: NewsDraft;
  onChange: (next: NewsDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="font-black">Noticia #{item.id}</div>
        <Badge className="border border-white/10 bg-white/10 text-white">{item.isPublished ? 'Publicada' : 'Rascunho'}</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InputBox label="Titulo" value={draft.title} onChange={(value) => onChange({ ...draft, title: value })} />
        <InputBox label="Categoria" value={draft.category} onChange={(value) => onChange({ ...draft, category: value })} />
        <InputBox label="Imagem URL" value={draft.imageUrl} onChange={(value) => onChange({ ...draft, imageUrl: value })} />
        <label className="flex items-center gap-3 text-sm text-white/70">
          <input type="checkbox" checked={draft.isPublished} onChange={(event) => onChange({ ...draft, isPublished: event.target.checked })} />
          Publicada
        </label>
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Descricao</label>
          <textarea
            rows={4}
            value={draft.descriptionText}
            onChange={(event) => onChange({ ...draft, descriptionText: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onSave} disabled={busy} className="bg-neon text-black hover:bg-neon/90">Salvar</Button>
        <Button onClick={onDelete} disabled={busy} variant="outline" className="border-white/10 bg-white/5">Excluir</Button>
      </div>
    </div>
  );
}

function CreateServerForm({
  draft,
  setDraft,
  onSubmit,
  busy,
}: {
  draft: ServerDraft;
  setDraft: React.Dispatch<React.SetStateAction<ServerDraft>>;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-white/45">Novo servidor</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InputBox label="Nome" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
        <InputBox label="Status" value={draft.statusLabel} onChange={(value) => setDraft((current) => ({ ...current, statusLabel: value }))} />
        <InputBox label="Connect URL" value={draft.connectUrl} onChange={(value) => setDraft((current) => ({ ...current, connectUrl: value }))} />
        <InputBox label="Permissao" value={draft.permissionRequired} onChange={(value) => setDraft((current) => ({ ...current, permissionRequired: value }))} />
        <InputBox label="Imagem URL" value={draft.imageUrl} onChange={(value) => setDraft((current) => ({ ...current, imageUrl: value }))} />
        <InputBox label="Ordem" value={draft.displayOrder} onChange={(value) => setDraft((current) => ({ ...current, displayOrder: value }))} />
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Descricao</label>
          <textarea
            rows={4}
            value={draft.descriptionText}
            onChange={(event) => setDraft((current) => ({ ...current, descriptionText: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-white/70">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} />
          Ativo
        </label>
        <label className="flex items-center gap-3 text-sm text-white/70">
          <input type="checkbox" checked={draft.isPrimary} onChange={(event) => setDraft((current) => ({ ...current, isPrimary: event.target.checked }))} />
          Principal
        </label>
      </div>
      <Button onClick={onSubmit} disabled={busy} className="mt-4 bg-neon text-black hover:bg-neon/90">
        {busy ? 'Criando...' : 'Criar servidor'}
      </Button>
    </div>
  );
}

function EditableServerCard({
  item,
  draft,
  onChange,
  onSave,
  onDelete,
  busy,
}: {
  item: PortalServer;
  draft: ServerDraft;
  onChange: (next: ServerDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="font-black">Servidor #{item.id}</div>
        <Badge className="border border-white/10 bg-white/10 text-white">{item.isPrimary ? 'Principal' : 'Secundario'}</Badge>
      </div>
      <CreateServerForm draft={draft} setDraft={(value) => onChange(typeof value === 'function' ? value(draft) : value)} onSubmit={onSave} busy={busy} />
      <div className="mt-4">
        <Button onClick={onDelete} disabled={busy} variant="outline" className="border-white/10 bg-white/5">Excluir servidor</Button>
      </div>
    </div>
  );
}

function CreatePackageForm({
  draft,
  setDraft,
  onSubmit,
  busy,
}: {
  draft: PackageDraft;
  setDraft: React.Dispatch<React.SetStateAction<PackageDraft>>;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-white/45">Novo pacote</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InputBox label="Nome" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
        <InputBox label="Highlight" value={draft.highlightLabel} onChange={(value) => setDraft((current) => ({ ...current, highlightLabel: value }))} />
        <InputBox label="Diamantes" value={draft.diamondAmount} onChange={(value) => setDraft((current) => ({ ...current, diamondAmount: value }))} />
        <InputBox label="Bonus" value={draft.bonusAmount} onChange={(value) => setDraft((current) => ({ ...current, bonusAmount: value }))} />
        <InputBox label="Preco em centavos" value={draft.priceCents} onChange={(value) => setDraft((current) => ({ ...current, priceCents: value }))} />
        <InputBox label="Ordem" value={draft.displayOrder} onChange={(value) => setDraft((current) => ({ ...current, displayOrder: value }))} />
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Descricao</label>
          <textarea
            rows={4}
            value={draft.descriptionText}
            onChange={(event) => setDraft((current) => ({ ...current, descriptionText: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none"
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-white/70">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} />
          Ativo
        </label>
      </div>
      <Button onClick={onSubmit} disabled={busy} className="mt-4 bg-neon text-black hover:bg-neon/90">
        {busy ? 'Criando...' : 'Criar pacote'}
      </Button>
    </div>
  );
}

function EditablePackageCard({
  item,
  draft,
  onChange,
  onSave,
  onDelete,
  busy,
}: {
  item: PortalPackage;
  draft: PackageDraft;
  onChange: (next: PackageDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="font-black">Pacote #{item.id}</div>
        <Badge className="border border-white/10 bg-white/10 text-white">{formatCurrencyFromCents(item.priceCents)}</Badge>
      </div>
      <CreatePackageForm draft={draft} setDraft={(value) => onChange(typeof value === 'function' ? value(draft) : value)} onSubmit={onSave} busy={busy} />
      <div className="mt-4">
        <Button onClick={onDelete} disabled={busy} variant="outline" className="border-white/10 bg-white/5">Excluir pacote</Button>
      </div>
    </div>
  );
}
