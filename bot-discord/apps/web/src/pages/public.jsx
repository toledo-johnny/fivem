import { Navigate, useLocation } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  DiamondPackageCard,
  NewsCard,
  ServerCard
} from '../components/PortalUI';

function resolveDiscordUrl(publicData) {
  return publicData?.settings?.discordUrl || publicData?.settings?.socialLinks?.discord || '#';
}

function splitBlockText(block) {
  return String(block?.bodyText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildHeroStyle(settings) {
  if (!settings?.heroImageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(4, 7, 10, 0.16), rgba(4, 7, 10, 0.82)), url("${settings.heroImageUrl}")`
  };
}

export function LandingPage() {
  const { publicState, authState } = usePortal();
  const data = publicState.data;

  if (publicState.status === 'loading' && !data) {
    return (
      <div className="fullscreen-state">
        <LoadingState label="Montando a experiencia publica..." />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="public-main">
        <EmptyState
          title="Portal indisponivel"
          description={publicState.error || 'Nao foi possivel carregar a pagina publica.'}
        />
      </main>
    );
  }

  const settings = data.settings || {};
  const contentBlocks = data.contentBlocks || {};
  const howToJoinSteps = settings?.landingSections?.howToJoinSteps || [];
  const discordUrl = resolveDiscordUrl(data);
  const hasDiscordUrl = discordUrl !== '#';
  const heroTitle = settings.heroTitle || 'Sua vida nova comeca aqui.';
  const rulesLines = splitBlockText(contentBlocks.rules);
  const faqLines = splitBlockText(contentBlocks.faq);
  const helpLines = splitBlockText(contentBlocks.help_center);

  return (
    <main className="public-main">
      <section className="hero-stage">
        <div className="hero-grid hero-grid-premium">
          <div className="hero-copy hero-copy-premium">
            <Badge tone="lime">{settings?.landingSections?.heroTag || 'Portal oficial'}</Badge>
            <h1>{heroTitle}</h1>
            <p>{settings.heroSubtitle}</p>

            <div className="hero-actions">
              {authState.status === 'authenticated' ? (
                <Button to="/app">Abrir portal</Button>
              ) : (
                <Button to="/login">Entrar com Discord</Button>
              )}
              {settings.connectUrl ? (
                <Button href={settings.connectUrl} variant="ghost">
                  Jogar agora
                </Button>
              ) : null}
              {hasDiscordUrl ? (
                <Button href={discordUrl} target="_blank" rel="noreferrer" variant="ghost">
                  Discord oficial
                </Button>
              ) : null}
            </div>

            <div className="hero-metrics">
              <div className="hero-metric">
                <span>Status</span>
                <strong>{data.fivemStatus?.online ? 'Online' : 'Offline'}</strong>
              </div>
              <div className="hero-metric">
                <span>Players</span>
                <strong>
                  {data.fivemStatus?.playersOnline ?? 0}/{data.fivemStatus?.playerLimit || '?'}
                </strong>
              </div>
              <div className="hero-metric">
                <span>Cidades</span>
                <strong>{data.servers?.length || 0}</strong>
              </div>
              <div className="hero-metric">
                <span>Noticias</span>
                <strong>{data.news?.length || 0}</strong>
              </div>
            </div>
          </div>

          <Card className="hero-feature hero-feature-premium">
            <div
              className={settings.heroImageUrl ? 'hero-visual hero-visual-image' : 'hero-feature-visual'}
              style={buildHeroStyle(settings)}
            />
            <div className="hero-feature-copy">
              <span className="eyebrow">Ecossistema integrado</span>
              <strong>{settings.serverName || 'Cidade conectada'}</strong>
              <p>
                Landing publica, login com Discord, area do player e dashboard admin vivendo
                no mesmo fluxo do sistema real.
              </p>
              <div className="hero-pills">
                <span>Login com Discord</span>
                <span>Suporte centralizado</span>
                <span>FiveM + portal</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="section-stack" id="servidores">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Cidades</span>
            <h2>{settings?.landingSections?.serversTitle || 'Cidades em destaque'}</h2>
            <p>Servidores, status e permissao de acesso vindos da configuracao real do portal.</p>
          </div>
          {settings.connectUrl ? (
            <Button href={settings.connectUrl} variant="ghost">
              Conectar no FiveM
            </Button>
          ) : null}
        </div>
        <div className="showcase-grid">
          {data.servers.map((item) => (
            <ServerCard
              key={item.id}
              item={item}
              liveStatus={item.isPrimary ? data.fivemStatus : null}
              action={
                item.connectUrl ? (
                  <Button href={item.connectUrl} variant="ghost">
                    Entrar na cidade
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      </section>

      <section className="section-stack" id="experiencia">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Experiencia</span>
            <h2>Fluxo unificado para visitante, player e staff</h2>
            <p>
              Estrutura inspirada no prototipo e alimentada pelo backend real que ja existe no
              sistema.
            </p>
          </div>
        </div>

        <div className="detail-grid">
          <Card className="feature-card">
            <span className="eyebrow">Onboarding</span>
            <h3>{contentBlocks.help_center?.title || 'Central de ajuda'}</h3>
            <p>{helpLines[0] || 'Painel central com acesso a whitelist, tickets e informacoes oficiais.'}</p>
          </Card>
          <Card className="feature-card">
            <span className="eyebrow">Whitelist</span>
            <h3>{contentBlocks.rules?.title || 'Regras principais'}</h3>
            <p>{rulesLines[0] || 'O portal publica regras e passos de entrada reaproveitando os blocos do onboarding.'}</p>
          </Card>
          <Card className="feature-card">
            <span className="eyebrow">Suporte</span>
            <h3>{publicState.data?.features?.loginEnabled ? 'Discord habilitado' : 'Aguardando OAuth'}</h3>
            <p>
              Tickets, login e permissoes continuam usando o mesmo fluxo seguro entre web,
              Discord e banco.
            </p>
          </Card>
        </div>
      </section>

      <section className="section-stack" id="noticias">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Atualizacoes</span>
            <h2>{settings?.landingSections?.newsTitle || 'Noticias e atualizacoes'}</h2>
            <p>
              Conteudo administrativo compartilhado com a area logada e com os blocos oficiais
              do onboarding.
            </p>
          </div>
        </div>
        <div className="showcase-grid">
          {data.news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="section-stack" id="diamantes">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Economia premium</span>
            <h2>{settings?.landingSections?.packagesTitle || 'Pacotes de diamantes'}</h2>
            <p>Catalogo publico reaproveitado tambem dentro da area do player.</p>
          </div>
        </div>
        <div className="showcase-grid">
          {data.packages.map((item) => (
            <DiamondPackageCard
              key={item.id}
              item={item}
              action={
                item.checkoutUrl ? (
                  <Button href={item.checkoutUrl} variant="ghost">
                    Comprar agora
                  </Button>
                ) : (
                  <Button to="/login" variant="ghost">
                    Ver no portal
                  </Button>
                )
              }
            />
          ))}
        </div>
      </section>

      <section className="section-stack" id="acesso">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Acesso</span>
            <h2>{settings?.landingSections?.howToJoinTitle || 'Como fazer parte?'}</h2>
            <p>Fluxo esperado: visitante, login Discord, portal player e administracao por permissao.</p>
          </div>
        </div>

        <div className="step-grid">
          {howToJoinSteps.map((step, index) => (
            <Card className="step-card" key={step}>
              <span className="step-index">0{index + 1}</span>
              <p>{step}</p>
            </Card>
          ))}
        </div>

        <div className="detail-grid">
          <Card className="content-editor-card">
            <span className="eyebrow">{contentBlocks.rules?.title || 'Regras'}</span>
            <h3>Diretrizes essenciais</h3>
            <div className="bullet-stack">
              {rulesLines.length ? rulesLines.map((line) => <span key={line}>{line}</span>) : <span>Sem regras publicadas.</span>}
            </div>
          </Card>
          <Card className="content-editor-card">
            <span className="eyebrow">{contentBlocks.faq?.title || 'FAQ'}</span>
            <h3>Perguntas frequentes</h3>
            <div className="bullet-stack">
              {faqLines.length ? faqLines.map((line) => <span key={line}>{line}</span>) : <span>Sem FAQ publicada.</span>}
            </div>
          </Card>
          <Card className="content-editor-card">
            <span className="eyebrow">{contentBlocks.help_center?.title || 'Ajuda'}</span>
            <h3>Canal oficial de entrada</h3>
            <div className="bullet-stack">
              {helpLines.length ? helpLines.map((line) => <span key={line}>{line}</span>) : <span>Sem central de ajuda publicada.</span>}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

export function LoginPage() {
  const { authState, publicState, getLoginUrl } = usePortal();
  const location = useLocation();

  if (authState.status === 'authenticated') {
    return <Navigate to="/app" replace />;
  }

  const params = new URLSearchParams(location.search);
  const returnTo = params.get('returnTo')
    ? decodeURIComponent(params.get('returnTo'))
    : `${window.location.origin}/app`;
  const loginEnabled = Boolean(publicState.data?.features?.loginEnabled);
  const settings = publicState.data?.settings;

  return (
    <main className="login-shell login-shell-premium">
      <Card className="login-card login-card-premium">
        <div className="login-visual login-visual-premium">
          <div className="login-visual-copy">
            <Badge tone="lime">Autenticacao oficial</Badge>
            <h2>{settings?.serverName || 'Portal RP'}</h2>
            <p>
              O acesso usa Discord OAuth e reaproveita a mesma validacao de membros,
              permissoes e sessao do sistema atual.
            </p>
            <div className="bullet-stack">
              <span>Whitelist, tickets e diamantes no mesmo painel</span>
              <span>Area administrativa exibida somente para usuarios autorizados</span>
              <span>Integracao real com API, Discord e FiveM</span>
            </div>
          </div>
        </div>

        <div className="login-copy login-copy-premium">
          <span className="eyebrow">Entrar com Discord</span>
          <h1>{settings?.shortName || 'Portal'}</h1>
          <p>
            Entre para acompanhar sua conta, conectar na cidade, usar o suporte e acessar
            as areas liberadas para o seu perfil.
          </p>

          {loginEnabled ? (
            <Button href={getLoginUrl(returnTo)}>Continuar com Discord</Button>
          ) : (
            <Button type="button" disabled>
              OAuth indisponivel
            </Button>
          )}

          <div className="login-notes">
            <small>
              {loginEnabled
                ? 'Voce sera redirecionado ao Discord e retornara diretamente para /app.'
                : 'O segredo OAuth do Discord ainda nao foi configurado neste ambiente.'}
            </small>
            {settings?.connectUrl ? (
              <Button href={settings.connectUrl} variant="ghost">
                Ver conexao FiveM
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </main>
  );
}
