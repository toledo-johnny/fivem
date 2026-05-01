import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import { Badge, Button, Card, LoadingState, cn } from './PortalUI';

function resolveDiscordLink(settings) {
  return settings?.discordUrl || settings?.socialLinks?.discord || null;
}

export function PublicLayout() {
  const { publicState, authState } = usePortal();
  const settings = publicState.data?.settings;
  const fivemStatus = publicState.data?.fivemStatus;
  const discordUrl = resolveDiscordLink(settings);

  return (
    <div className="public-shell">
      <div className="city-backdrop" />
      <header className="public-header">
        <div className="brand-mark">
          <span className="brand-pill">{(settings?.shortName || 'RP').slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{settings?.shortName || 'Portal RP'}</strong>
            <small>Rede urbana integrada</small>
          </div>
        </div>

        <nav className="public-nav">
          <a href="/#servidores">Cidades</a>
          <a href="/#experiencia">Experiencia</a>
          <a href="/#noticias">Noticias</a>
          <a href="/#diamantes">Diamantes</a>
          <a href="/#acesso">Acesso</a>
        </nav>

        <div className="public-actions">
          <div className="header-status">
            <Badge tone={fivemStatus?.online ? 'success' : 'muted'}>
              {fivemStatus?.online ? 'Cidade online' : 'Cidade offline'}
            </Badge>
            <small>
              {fivemStatus?.playersOnline ?? 0}/{fivemStatus?.playerLimit || '?'} players
            </small>
          </div>
          {settings?.connectUrl ? (
            <Button href={settings.connectUrl} variant="ghost">
              Jogar agora
            </Button>
          ) : null}
          {authState.status === 'authenticated' ? (
            <Button to="/app">Abrir portal</Button>
          ) : (
            <Button to="/login">Entrar</Button>
          )}
          {discordUrl ? (
            <Button href={discordUrl} target="_blank" rel="noreferrer" variant="ghost">
              Discord
            </Button>
          ) : null}
        </div>
      </header>

      <Outlet />

      <footer className="public-footer">
        <div className="footer-brand">
          <div className="brand-mark">
            <span className="brand-pill">{(settings?.shortName || 'RP').slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{settings?.serverName || 'Portal RP'}</strong>
              <small>{settings?.footerText || 'Portal, whitelist, tickets e status em um unico lugar.'}</small>
            </div>
          </div>
          <p>
            Ambiente oficial para onboarding, suporte, noticias, diamantes e gestao da cidade.
          </p>
        </div>

        <div className="footer-grid">
          <div className="footer-column">
            <span className="eyebrow">Portal</span>
            <a href="/#servidores">Cidades</a>
            <a href="/#noticias">Noticias</a>
            <a href="/#diamantes">Diamantes</a>
            <a href="/#acesso">Como entrar</a>
          </div>

          <div className="footer-column">
            <span className="eyebrow">Acessos</span>
            <span>Login com Discord</span>
            <span>Area do player</span>
            <span>Dashboard admin por permissao</span>
          </div>

          <div className="footer-column">
            <span className="eyebrow">Redes</span>
            {settings?.socialLinks?.discord ? (
              <a href={settings.socialLinks.discord} target="_blank" rel="noreferrer">
                Discord
              </a>
            ) : null}
            {settings?.socialLinks?.instagram ? (
              <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            ) : null}
            {settings?.socialLinks?.youtube ? (
              <a href={settings.socialLinks.youtube} target="_blank" rel="noreferrer">
                YouTube
              </a>
            ) : null}
            {settings?.socialLinks?.twitch ? (
              <a href={settings.socialLinks.twitch} target="_blank" rel="noreferrer">
                Twitch
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ProtectedRoute() {
  const { authState } = usePortal();
  const location = useLocation();

  if (authState.status === 'loading' || authState.status === 'refreshing') {
    return (
      <div className="fullscreen-state">
        <LoadingState label="Validando sua sessao..." />
      </div>
    );
  }

  if (authState.status !== 'authenticated') {
    const target = encodeURIComponent(`${window.location.origin}${location.pathname}`);
    return <Navigate to={`/login?returnTo=${target}`} replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { authState } = usePortal();
  if (!authState.data?.access?.isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

function isPathActive(itemPath, currentPath) {
  if (itemPath === '/app') {
    return currentPath === '/app';
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function Sidebar({ groups }) {
  const location = useLocation();
  const { authState } = usePortal();
  const session = authState.data?.session;
  const settings = authState.data?.settings;
  const links = authState.data?.links;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="brand-pill">{(settings?.shortName || 'RP').slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{settings?.shortName || 'Portal'}</strong>
          <small>{authState.data?.access?.isAdmin ? 'Player + Admin' : 'Area do player'}</small>
        </div>
      </div>

      <div className="sidebar-user">
        {session?.avatarUrl ? <img alt={session.username} src={session.avatarUrl} /> : null}
        <div>
          <strong>{session?.globalName || session?.username}</strong>
          <small>{authState.data?.access?.isAdmin ? 'Staff / Admin' : 'Player autenticado'}</small>
        </div>
      </div>

      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          <div className="nav-group-links">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'nav-link',
                  isPathActive(item.to, location.pathname) && 'active'
                )}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      <div className="sidebar-cta-stack">
        {links?.connectUrl ? (
          <Card className="sidebar-cta">
            <span className="eyebrow">FiveM</span>
            <strong>Conexao rapida</strong>
            <p>Use o link oficial configurado no portal.</p>
            <Button href={links.connectUrl}>Conectar</Button>
          </Card>
        ) : null}

        {links?.discordUrl ? (
          <Card className="sidebar-cta subtle">
            <span className="eyebrow">Comunidade</span>
            <strong>Canal oficial</strong>
            <p>Suporte, avisos e atualizacoes do servidor.</p>
            <Button href={links.discordUrl} target="_blank" rel="noreferrer" variant="ghost">
              Abrir Discord
            </Button>
          </Card>
        ) : null}
      </div>
    </aside>
  );
}

export function Topbar() {
  const { authState, logoutUser } = usePortal();
  const data = authState.data;
  const session = data?.session;

  return (
    <Card className="topbar-card">
      <div className="topbar-intro">
        <span className="eyebrow">Portal integrado</span>
        <h1>{data?.settings?.serverName || data?.guild?.name}</h1>
        <p>
          Painel unificado para acompanhar whitelist, suporte, diamantes e operacao
          administrativa sem trocar de ambiente.
        </p>
        <div className="topbar-actions">
          {data?.links?.connectUrl ? (
            <Button href={data.links.connectUrl}>Jogar agora</Button>
          ) : null}
          {data?.links?.supportPanelUrl ? (
            <Button href={data.links.supportPanelUrl} target="_blank" rel="noreferrer" variant="ghost">
              Painel de suporte
            </Button>
          ) : null}
        </div>
      </div>

      <div className="topbar-side">
        <div className="topbar-metrics">
          <div className="profile-balance">
            <span>Diamantes</span>
            <strong>{data?.player?.gems ?? 0}</strong>
          </div>
          <div className="profile-balance">
            <span>Whitelist</span>
            <strong>{data?.whitelist?.status === 'approved' ? 'OK' : 'Pendente'}</strong>
          </div>
          <div className="profile-balance">
            <span>FiveM</span>
            <strong>{data?.fivemStatus?.online ? 'ON' : 'OFF'}</strong>
          </div>
        </div>

        <div className="profile-chip">
          {session?.avatarUrl ? <img alt={session.username} src={session.avatarUrl} /> : null}
          <div>
            <strong>{session?.globalName || session?.username}</strong>
            <span>{data?.access?.isAdmin ? 'Staff / Admin' : 'Player'}</span>
          </div>
        </div>

        <div className="topbar-actions compact">
          <Button variant="ghost" onClick={logoutUser}>
            Sair
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AppLayout({ menuGroups }) {
  return (
    <div className="app-shell">
      <div className="app-grid">
        <Sidebar groups={menuGroups} />
        <div className="app-content">
          <Topbar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
