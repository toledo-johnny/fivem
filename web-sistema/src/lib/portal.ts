import type {
  ContentBlock,
  PortalNewsItem,
  PortalPackage,
  PortalServer,
  WhitelistState,
} from '../types';

export function slugify(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildNewsSlug(item: PortalNewsItem) {
  return `${item.id}-${slugify(item.title)}`;
}

export function getNewsImage(item: PortalNewsItem) {
  return (
    item.imageUrl ||
    `https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80&sig=${item.id}`
  );
}

export function getServerImage(item: PortalServer) {
  return (
    item.imageUrl ||
    `https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1200&q=80&sig=${item.id}`
  );
}

export function getPackageImage(item: PortalPackage) {
  return `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=900&q=80&sig=${item.id}`;
}

export function splitTextLines(value?: string | null) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitParagraphs(value?: string | null) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function formatDateShort(value?: string | null) {
  if (!value) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateLong(value?: string | null) {
  if (!value) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((Number(value) || 0) / 100);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

export function formatTicketCategory(categoryKey: string) {
  const map: Record<string, string> = {
    support: 'Suporte',
    bugs: 'Bugs',
    reports: 'Denuncias',
    ban_review: 'Revisao de ban',
    donation_vip: 'Doacoes / VIP',
    staff: 'Staff',
  };

  return map[categoryKey] || categoryKey;
}

export function formatWhitelistStatus(status: WhitelistState['status']) {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    pending: 'Em analise',
    approved: 'Aprovada',
    rejected: 'Reprovada',
    not_started: 'Nao iniciada',
  };

  return map[status] || status;
}

export function getWhitelistTone(status: WhitelistState['status']) {
  if (status === 'approved') {
    return 'text-green-400 border-green-500/20 bg-green-500/10';
  }

  if (status === 'pending') {
    return 'text-amber-300 border-amber-500/20 bg-amber-500/10';
  }

  if (status === 'rejected') {
    return 'text-red-300 border-red-500/20 bg-red-500/10';
  }

  return 'text-white/60 border-white/10 bg-white/[0.03]';
}

export function getConnectLabel(connectUrl?: string | null) {
  if (!connectUrl) {
    return 'Connect indisponivel';
  }

  return connectUrl.startsWith('cfx.re')
    ? connectUrl
    : connectUrl.replace(/^connect\s+/i, '').replace(/^https?:\/\//i, '');
}

export function getPrimaryServer(servers: PortalServer[]) {
  return servers.find((item) => item.isPrimary) || servers[0] || null;
}

export function getContentSummary(block?: ContentBlock | null, fallback = 'Nenhum conteudo publicado.') {
  const lines = splitTextLines(block?.bodyText);
  return lines.length > 0 ? lines : [fallback];
}
