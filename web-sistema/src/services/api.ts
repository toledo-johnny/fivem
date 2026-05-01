import type {
  AdminDatabaseSnapshot,
  AdminOverviewPayload,
  AdminPlayerRecord,
  AdminPortalResponse,
  AuditLogRecord,
  DashboardConfigResponse,
  FinanceSummary,
  PaymentOrderRecord,
  PortalSessionPayload,
  PortalNewsItem,
  PortalPackage,
  PortalServer,
  PublicPortalData,
  PurchaseSummary,
  StaffSnapshotRecord,
  TicketRecord,
  WhitelistApplication,
  WhitelistState,
} from '../types';

const REQUEST_TIMEOUT_MS = 8_000;

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3050';
}

const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

function parseResponsePayload(text: string, fallbackStatusCode = 502) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError('A API retornou uma resposta invalida.', fallbackStatusCode);
  }
}

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return new URL(path, `${API_BASE_URL}/`).toString();
  }

  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function toAbsoluteReturnTo(target?: string) {
  if (!target) {
    return `${window.location.origin}/dashboard`;
  }

  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  return new URL(target, window.location.origin).toString();
}

async function request<T>(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('A API do bot demorou demais para responder.', 504);
    }

    throw error;
  }

  window.clearTimeout(timeoutId);

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  const payload = parseResponsePayload(text, response.status);

  if (!response.ok) {
    throw new ApiError(payload?.error || `Falha HTTP ${response.status}`, response.status);
  }

  return payload as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getLoginUrl(returnTo?: string) {
  const target = encodeURIComponent(toAbsoluteReturnTo(returnTo));
  return `${API_BASE_URL}/auth/discord/login?return_to=${target}`;
}

export async function logoutRequest() {
  await request('/auth/logout', {
    method: 'POST',
  });
}

export async function getPublicPortalData() {
  return request<PublicPortalData>('/api/public/portal');
}

export async function getPortalSession() {
  return request<PortalSessionPayload>('/api/portal/session');
}

export async function getPortalTickets(limit = 20) {
  return request<{ items: TicketRecord[] }>(`/api/portal/tickets?limit=${limit}`);
}

export async function createPortalTicket(categoryKey: string) {
  return request<{
    item: TicketRecord;
    channel: {
      id: string;
      name: string;
      url: string | null;
    } | null;
  }>('/api/portal/tickets', {
    method: 'POST',
    body: JSON.stringify({ categoryKey }),
  });
}

export async function getPortalWhitelist() {
  return request<WhitelistState>('/api/portal/whitelist');
}

export async function getOverview() {
  return request<AdminOverviewPayload>('/api/overview');
}

export async function getTickets() {
  return request<{ items: TicketRecord[] }>('/api/tickets?limit=50');
}

export async function getWhitelists() {
  return request<{ items: WhitelistApplication[] }>('/api/whitelists?limit=50');
}

export async function approveWhitelist(id: number) {
  return request<{
    item: WhitelistApplication;
    syncResult: Record<string, unknown> | null;
  }>(`/api/whitelists/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectWhitelist(id: number, reason: string) {
  return request<{ item: WhitelistApplication }>(`/api/whitelists/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getLogs() {
  return request<{ items: AuditLogRecord[] }>('/api/logs?limit=50');
}

export async function getConfig() {
  return request<DashboardConfigResponse>('/api/config');
}

export async function patchConfig(payload: Partial<DashboardConfigResponse['guildConfig']>) {
  return request<{ guildConfig: DashboardConfigResponse['guildConfig'] }>('/api/config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getAdminPlayers(search = '') {
  const params = new URLSearchParams();
  params.set('limit', '100');
  if (search.trim()) {
    params.set('search', search.trim());
  }

  return request<{
    items: AdminPlayerRecord[];
    summary: {
      totalPlayers: number;
      totalWhitelisted: number;
    };
  }>(`/api/portal/admin/players?${params.toString()}`);
}

export async function updateAdminPlayerGems(accountId: number, gems: number) {
  return request<{ item: AdminPlayerRecord }>(`/api/portal/admin/players/${accountId}/gems`, {
    method: 'PATCH',
    body: JSON.stringify({ gems }),
  });
}

export async function updateAdminPlayerWhitelist(accountId: number, whitelist: boolean) {
  return request<{ item: AdminPlayerRecord }>(
    `/api/portal/admin/players/${accountId}/whitelist`,
    {
      method: 'PATCH',
      body: JSON.stringify({ whitelist }),
    },
  );
}

export async function updateAdminPlayerDiscordLink(
  accountId: number,
  payload: { discordUserId: string; force?: boolean },
) {
  return request<{
    item: AdminPlayerRecord;
    linkResult: {
      linkedDiscord: string;
      replaced: boolean;
    };
  }>(`/api/portal/admin/players/${accountId}/discord-link`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getAdminFinance() {
  return request<FinanceSummary>('/api/portal/admin/finance');
}

export async function getAdminDatabaseSnapshot() {
  return request<AdminDatabaseSnapshot>('/api/portal/admin/database');
}

export async function getAdminPortal() {
  return request<AdminPortalResponse>('/api/portal/admin/portal');
}

export async function updateAdminPortalSettings(payload: Partial<AdminPortalResponse['settings']>) {
  return request<{ settings: AdminPortalResponse['settings'] }>('/api/portal/admin/portal/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getContent() {
  return request<{ items: DashboardConfigResponse['contentBlocks'] }>('/api/content');
}

export async function updateContent(contentKey: string, payload: { title: string; bodyText: string; metadata?: Record<string, unknown> }) {
  return request<{ item: DashboardConfigResponse['contentBlocks'][number] }>(`/api/content/${contentKey}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getAdminStaff() {
  return request<{ items: StaffSnapshotRecord[] }>('/api/portal/admin/staff');
}

export async function createNews(payload: Partial<PortalNewsItem>) {
  return request<{ item: PortalNewsItem }>('/api/portal/admin/portal/news', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateNews(id: number, payload: Partial<PortalNewsItem>) {
  return request<{ item: PortalNewsItem }>(`/api/portal/admin/portal/news/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteNews(id: number) {
  return request<{ item: PortalNewsItem }>(`/api/portal/admin/portal/news/${id}`, {
    method: 'DELETE',
  });
}

export async function createServerCard(payload: Partial<PortalServer>) {
  return request<{ item: PortalServer }>('/api/portal/admin/portal/servers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateServerCard(id: number, payload: Partial<PortalServer>) {
  return request<{ item: PortalServer }>(`/api/portal/admin/portal/servers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteServerCard(id: number) {
  return request<{ item: PortalServer }>(`/api/portal/admin/portal/servers/${id}`, {
    method: 'DELETE',
  });
}

export async function createDiamondPackage(payload: Partial<PortalPackage>) {
  return request<{ item: PortalPackage }>('/api/portal/admin/portal/packages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDiamondPackage(id: number, payload: Partial<PortalPackage>) {
  return request<{ item: PortalPackage }>(`/api/portal/admin/portal/packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDiamondPackage(id: number) {
  return request<{ item: PortalPackage }>(`/api/portal/admin/portal/packages/${id}`, {
    method: 'DELETE',
  });
}

export async function createPortalOrder(packageId: number, quantity = 1) {
  return request<{ item: PaymentOrderRecord }>('/api/portal/orders', {
    method: 'POST',
    body: JSON.stringify({ packageId, quantity }),
  });
}

export async function syncPortalOrderCheckout(payload: {
  paymentId?: string | null;
  externalReference?: string | null;
}) {
  return request<{
    ok: boolean;
    code: string;
    item: PaymentOrderRecord | null;
  }>('/api/portal/orders/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPortalOrders(limit = 20) {
  return request<{ items: PaymentOrderRecord[]; summary: PurchaseSummary }>(`/api/portal/orders?limit=${limit}`);
}

export async function getAdminOrders(params?: {
  limit?: number;
  paymentStatus?: string;
  deliveryStatus?: string;
}) {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  if (params?.paymentStatus) {
    query.set('paymentStatus', params.paymentStatus);
  }
  if (params?.deliveryStatus) {
    query.set('deliveryStatus', params.deliveryStatus);
  }

  return request<{ items: PaymentOrderRecord[]; summary: PurchaseSummary }>(
    `/api/portal/admin/orders${query.toString() ? `?${query.toString()}` : ''}`,
  );
}

export async function reconcileAdminPayments(limit = 50) {
  return request<{
    processed: number;
    pendingCandidates: number;
    results: Array<Record<string, unknown>>;
  }>('/api/portal/admin/payments/reconcile', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}
