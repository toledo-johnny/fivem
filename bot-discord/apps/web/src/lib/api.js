const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3050';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.error || `Falha HTTP ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getLoginUrl(returnTo = `${window.location.origin}/app`) {
  const target = encodeURIComponent(returnTo);
  return `${API_BASE_URL}/auth/discord/login?return_to=${target}`;
}

export async function logout() {
  await request('/auth/logout', {
    method: 'POST'
  });
}

export async function getPublicPortalData() {
  return request('/api/public/portal');
}

export async function getPortalSession() {
  return request('/api/portal/session');
}

export async function getPortalTickets() {
  return request('/api/portal/tickets?limit=20');
}

export async function createPortalTicket(categoryKey) {
  return request('/api/portal/tickets', {
    method: 'POST',
    body: JSON.stringify({ categoryKey })
  });
}

export async function getPortalWhitelist() {
  return request('/api/portal/whitelist');
}

export async function getOverview() {
  return request('/api/overview');
}

export async function getTickets() {
  return request('/api/tickets?limit=50');
}

export async function getTicketById(id) {
  return request(`/api/tickets/${id}`);
}

export async function getWhitelists() {
  return request('/api/whitelists?limit=50');
}

export async function getWhitelistById(id) {
  return request(`/api/whitelists/${id}`);
}

export async function getConfig() {
  return request('/api/config');
}

export async function patchConfig(payload) {
  return request('/api/config', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function getLogs() {
  return request('/api/logs?limit=50');
}

export async function getContent() {
  return request('/api/content');
}

export async function updateContent(key, payload) {
  return request(`/api/content/${key}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function approveWhitelist(id) {
  return request(`/api/whitelists/${id}/approve`, {
    method: 'POST'
  });
}

export async function rejectWhitelist(id, reason) {
  return request(`/api/whitelists/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function getAdminPlayers(search = '') {
  const params = new URLSearchParams();
  params.set('limit', '100');
  if (search) {
    params.set('search', search);
  }

  return request(`/api/portal/admin/players?${params.toString()}`);
}

export async function updateAdminPlayerGems(accountId, gems) {
  return request(`/api/portal/admin/players/${accountId}/gems`, {
    method: 'PATCH',
    body: JSON.stringify({ gems })
  });
}

export async function updateAdminPlayerWhitelist(accountId, whitelist) {
  return request(`/api/portal/admin/players/${accountId}/whitelist`, {
    method: 'PATCH',
    body: JSON.stringify({ whitelist })
  });
}

export async function getAdminStaff() {
  return request('/api/portal/admin/staff');
}

export async function getAdminFinance() {
  return request('/api/portal/admin/finance');
}

export async function getAdminPortal() {
  return request('/api/portal/admin/portal');
}

export async function updateAdminPortalSettings(payload) {
  return request('/api/portal/admin/portal/settings', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function createNews(payload) {
  return request('/api/portal/admin/portal/news', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateNews(id, payload) {
  return request(`/api/portal/admin/portal/news/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteNews(id) {
  return request(`/api/portal/admin/portal/news/${id}`, {
    method: 'DELETE'
  });
}

export async function createServerCard(payload) {
  return request('/api/portal/admin/portal/servers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateServerCard(id, payload) {
  return request(`/api/portal/admin/portal/servers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteServerCard(id) {
  return request(`/api/portal/admin/portal/servers/${id}`, {
    method: 'DELETE'
  });
}

export async function createDiamondPackage(payload) {
  return request('/api/portal/admin/portal/packages', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateDiamondPackage(id, payload) {
  return request(`/api/portal/admin/portal/packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteDiamondPackage(id) {
  return request(`/api/portal/admin/portal/packages/${id}`, {
    method: 'DELETE'
  });
}
