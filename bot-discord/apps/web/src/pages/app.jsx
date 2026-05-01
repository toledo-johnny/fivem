import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { PanelSection } from '../components/PanelSection';
import { StatCard } from '../components/StatCard';
import {
  approveWhitelist,
  createDiamondPackage,
  createNews,
  createPortalTicket,
  createServerCard,
  deleteDiamondPackage,
  deleteNews,
  deleteServerCard,
  getAdminFinance,
  getAdminPlayers,
  getAdminPortal,
  getAdminStaff,
  getConfig,
  getContent,
  getLogs,
  getOverview,
  getPortalTickets,
  getTicketById,
  getTickets,
  getWhitelistById,
  getWhitelists,
  patchConfig,
  rejectWhitelist,
  updateAdminPlayerGems,
  updateAdminPlayerWhitelist,
  updateAdminPortalSettings,
  updateContent,
  updateDiamondPackage,
  updateNews,
  updateServerCard
} from '../lib/api';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  NewsCard,
  ServerCard,
  Textarea,
  DiamondPackageCard
} from '../components/PortalUI';

const TICKET_CATEGORIES = [
  { key: 'support', label: 'Suporte' },
  { key: 'bugs', label: 'Bugs' },
  { key: 'reports', label: 'Denuncias' },
  { key: 'ban_review', label: 'Revisao de ban' },
  { key: 'donation_vip', label: 'Doacoes / VIP' }
];

function formatDate(value) {
  if (!value) {
    return 'Nao informado';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatWhitelistStatus(status) {
  const map = {
    pending: 'Pendente',
    rejected: 'Reprovada',
    approved: 'Aprovada',
    draft: 'Rascunho',
    not_started: 'Nao iniciada'
  };

  return map[status] || status;
}

function formatTicketStatus(status) {
  return status === 'open' ? 'Aberto' : 'Fechado';
}

function toneFromStatus(status) {
  if (status === 'approved' || status === 'open' || status === true) {
    return 'success';
  }

  if (status === 'pending') {
    return 'warning';
  }

  if (status === 'rejected' || status === false || status === 'closed') {
    return 'danger';
  }

  return 'muted';
}

function getContentBlockLines(block) {
  return String(block?.bodyText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function useRemoteResource(loader, deps = []) {
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: ''
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({
      status: current.data ? 'refreshing' : 'loading',
      data: current.data,
      error: ''
    }));

    loader()
      .then((data) => {
        if (!cancelled) {
          setState({
            status: 'ready',
            data,
            error: ''
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error: error.message
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [...deps, version]);

  return [
    state,
    () => {
      setVersion((current) => current + 1);
    },
    setState
  ];
}

function FormGrid({ fields, form, setForm }) {
  return (
    <div className="form-grid">
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.type === 'textarea' ? (
            <Textarea
              rows={field.rows || 4}
              value={form[field.key] ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field.key]: event.target.value
                }))
              }
            />
          ) : field.type === 'checkbox' ? (
            <label className="checkbox-row">
              <input
                checked={Boolean(form[field.key])}
                type="checkbox"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: event.target.checked
                  }))
                }
              />
              <span>{field.checkboxLabel || 'Ativo'}</span>
            </label>
          ) : (
            <Input
              type={field.type || 'text'}
              value={form[field.key] ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field.key]: event.target.value
                }))
              }
            />
          )}
        </Field>
      ))}
    </div>
  );
}

function CollectionEditor({
  title,
  description,
  items,
  renderPreview,
  fields,
  form,
  setForm,
  selectedId,
  setSelectedId,
  onCreate,
  onUpdate,
  onDelete,
  createLabel
}) {
  const isEditing = Boolean(selectedId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setBusy(true);
    setError('');

    try {
      if (isEditing) {
        await onUpdate(selectedId, form);
      } else {
        await onCreate(form);
      }
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError('');

    try {
      await onDelete(selectedId);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelSection
      title={title}
      description={description}
      actions={
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedId(null);
            setForm({});
          }}
        >
          Novo
        </Button>
      }
    >
      <div className="editor-grid">
        <div className="editor-list">
          {items.length ? (
            items.map((item) => (
              <button
                className={`editor-item ${selectedId === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setForm(item);
                }}
                type="button"
              >
                {renderPreview(item)}
              </button>
            ))
          ) : (
            <EmptyState
              title="Nenhum registro"
              description="Crie o primeiro item para preencher esta secao."
            />
          )}
        </div>
        <Card className="editor-form-card">
          <div className="editor-form-head">
            <div>
              <span className="eyebrow">{isEditing ? 'Editando' : 'Criando'}</span>
              <h3>{isEditing ? 'Atualizar item' : createLabel}</h3>
            </div>
            {isEditing ? (
              <Button disabled={busy} variant="danger" onClick={handleRemove}>
                Excluir
              </Button>
            ) : null}
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <FormGrid fields={fields} form={form} setForm={setForm} />
          <div className="form-actions">
            <Button disabled={busy} onClick={handleSubmit}>
              {busy ? 'Salvando...' : isEditing ? 'Salvar alteracoes' : createLabel}
            </Button>
          </div>
        </Card>
      </div>
    </PanelSection>
  );
}

function PageState({ state, loadingLabel, emptyTitle, emptyDescription, children }) {
  if (state.status === 'loading' && !state.data) {
    return <LoadingState label={loadingLabel} />;
  }

  if (state.status === 'error' && !state.data) {
    return <EmptyState title={emptyTitle} description={state.error || emptyDescription} />;
  }

  return children;
}

function ContentBlockCard({ block, fallbackTitle, fallbackText }) {
  const lines = getContentBlockLines(block);

  return (
    <Card className="content-editor-card">
      <span className="eyebrow">{block?.title || fallbackTitle}</span>
      <h3>{block?.title || fallbackTitle}</h3>
      <div className="bullet-stack">
        {lines.length ? lines.map((line) => <span key={line}>{line}</span>) : <span>{fallbackText}</span>}
      </div>
    </Card>
  );
}

export function PlayerHomePage() {
  const { authState } = usePortal();
  const data = authState.data;
  const contentBlocks = data?.contentBlocks || {};

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard label="Diamantes" value={data?.player?.gems ?? 0} tone="lime" />
        <StatCard
          label="Whitelist"
          value={formatWhitelistStatus(data?.whitelist?.status || 'not_started')}
          tone={toneFromStatus(data?.whitelist?.status)}
        />
        <StatCard label="Tickets recentes" value={data?.tickets?.length ?? 0} />
        <StatCard
          label="FiveM"
          value={data?.fivemStatus?.online ? 'Online' : 'Offline'}
          hint={`${data?.fivemStatus?.playersOnline ?? 0}/${data?.fivemStatus?.playerLimit || '?'} players`}
          tone={data?.fivemStatus?.online ? 'success' : 'danger'}
        />
      </section>

      <PanelSection
        eyebrow="Minha conta"
        title={`Bem-vindo, ${data?.session?.globalName || data?.session?.username}`}
        description="Seu resumo rapido com dados reais do Discord, do banco do servidor e do historico do bot."
      >
        <div className="profile-hero">
          <Card className="profile-highlight">
            <img alt={data?.session?.username} src={data?.session?.avatarUrl} />
            <div>
              <strong>{data?.session?.globalName || data?.session?.username}</strong>
              <span>Discord ID: {data?.session?.userId}</span>
              {data?.player?.primaryCharacterName ? (
                <small>Personagem: {data.player.primaryCharacterName}</small>
              ) : null}
            </div>
          </Card>
          <Card className="connect-card">
            <span className="eyebrow">Conexao</span>
            <h3>{data?.settings?.serverName}</h3>
            <p>{data?.settings?.heroSubtitle}</p>
            {data?.settings?.connectUrl ? (
              <Button href={data.settings.connectUrl}>Conectar agora</Button>
            ) : null}
          </Card>
        </div>
      </PanelSection>

      <PanelSection
        title="Servidores e cidades"
        description="Cards ativos do portal compartilhados entre landing publica e area logada."
      >
        <div className="showcase-grid">
          {(data?.servers || []).map((item) => (
            <ServerCard
              key={item.id}
              item={item}
              liveStatus={item.isPrimary ? data?.fivemStatus : null}
              action={
                item.connectUrl ? (
                  <Button href={item.connectUrl} variant="ghost">
                    Conectar
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Tickets recentes" description="Historico mais recente do seu suporte.">
        <DataTable
          columns={[
            { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
            { key: 'categoria', label: 'Categoria', render: (row) => row.categoryKey },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <Badge tone={toneFromStatus(row.status)}>{formatTicketStatus(row.status)}</Badge>
            },
            { key: 'updatedAt', label: 'Atualizado', render: (row) => formatDate(row.updatedAt) }
          ]}
          rows={(data?.tickets || []).map((item) => ({ key: item.id, ...item }))}
          empty={
            <EmptyState
              title="Nenhum ticket por enquanto"
              description="Abra um atendimento na aba de suporte quando precisar."
            />
          }
        />
      </PanelSection>

      <PanelSection
        title="Diretrizes e atualizacoes"
        description="Blocos reais do onboarding reaproveitados dentro da area logada."
      >
        <div className="detail-grid">
          <ContentBlockCard
            block={contentBlocks.rules}
            fallbackTitle="Regras"
            fallbackText="As regras principais ainda nao foram publicadas."
          />
          <ContentBlockCard
            block={contentBlocks.changelog}
            fallbackTitle="Changelog"
            fallbackText="Nenhum changelog publicado no momento."
          />
          <ContentBlockCard
            block={contentBlocks.help_center}
            fallbackTitle="Central de ajuda"
            fallbackText="A central de ajuda ainda nao foi publicada."
          />
        </div>
      </PanelSection>
    </div>
  );
}

export function AccessPage() {
  const { authState } = usePortal();
  const data = authState.data;
  const player = data?.player;
  const contentBlocks = data?.contentBlocks || {};

  return (
    <div className="page-stack">
      <PanelSection title="Meus acessos" description="Tudo que ja foi vinculado ao seu Discord no ecossistema atual.">
        <div className="detail-grid">
          <Card>
            <span className="eyebrow">Whitelist</span>
            <h3>{formatWhitelistStatus(data?.whitelist?.status || 'not_started')}</h3>
            <p>
              {data?.whitelist?.application?.rejectionReason ||
                'Acompanhe aqui o status da sua whitelist e os proximos passos.'}
            </p>
          </Card>
          <Card>
            <span className="eyebrow">Passaporte</span>
            <h3>{player?.passaporte || 'Nao vinculado'}</h3>
            <p>O passaporte e identificado automaticamente quando o Discord bate com o banco.</p>
          </Card>
          <Card>
            <span className="eyebrow">Perfil RP</span>
            <h3>{player?.primaryCharacterName || 'Sem personagem'}</h3>
            <p>{player?.characterNames?.join(' | ') || 'Nenhum personagem relacionado no momento.'}</p>
          </Card>
        </div>
      </PanelSection>

      <PanelSection title="Como seguir" description="Use os pontos abaixo para concluir sua entrada no servidor.">
        <div className="step-grid">
          {(data?.settings?.landingSections?.howToJoinSteps || []).map((step, index) => (
            <Card className="step-card" key={step}>
              <span className="step-index">0{index + 1}</span>
              <p>{step}</p>
            </Card>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Base de conhecimento"
        description="Resumo das informacoes oficiais sincronizadas com os paineis de onboarding."
      >
        <div className="detail-grid">
          <ContentBlockCard
            block={contentBlocks.rules}
            fallbackTitle="Regras"
            fallbackText="Nenhum bloco de regras encontrado."
          />
          <ContentBlockCard
            block={contentBlocks.faq}
            fallbackTitle="FAQ"
            fallbackText="Nenhum FAQ publicado."
          />
          <ContentBlockCard
            block={contentBlocks.help_center}
            fallbackTitle="Ajuda"
            fallbackText="Nenhuma central de ajuda publicada."
          />
        </div>
      </PanelSection>
    </div>
  );
}

export function DiamondsPage() {
  const { authState } = usePortal();
  const data = authState.data;

  return (
    <div className="page-stack">
      <PanelSection title="Diamantes" description="Saldo real do banco e catalogo atual do portal.">
        <div className="stats-grid">
          <StatCard label="Saldo atual" value={data?.player?.gems ?? 0} tone="lime" />
          <StatCard label="Pacotes ativos" value={data?.packages?.length ?? 0} />
          <StatCard label="Historico" value="Sem backend" hint="Ainda nao existe compra registrada pela API." tone="muted" />
        </div>
      </PanelSection>

      <PanelSection title="Pacotes disponiveis" description="Catalogo publico reaproveitado aqui dentro da area do player.">
        <div className="showcase-grid">
          {(data?.packages || []).map((item) => (
            <DiamondPackageCard
              key={item.id}
              item={item}
              action={
                item.checkoutUrl ? (
                  <Button href={item.checkoutUrl} variant="ghost">
                    Comprar
                  </Button>
                ) : (
                  <Button disabled variant="ghost">
                    Checkout indisponivel
                  </Button>
                )
              }
            />
          ))}
        </div>
      </PanelSection>
    </div>
  );
}

export function SupportPage() {
  const [ticketState, reloadTickets] = useRemoteResource(() => getPortalTickets(), []);
  const [actionState, setActionState] = useState({
    busy: '',
    error: '',
    success: ''
  });

  async function handleCreateTicket(categoryKey) {
    setActionState({
      busy: categoryKey,
      error: '',
      success: ''
    });

    try {
      const response = await createPortalTicket(categoryKey);
      reloadTickets();
      setActionState({
        busy: '',
        error: '',
        success: response.channel?.url
          ? `Ticket criado com sucesso: ${response.channel.url}`
          : 'Ticket criado com sucesso.'
      });
    } catch (error) {
      setActionState({
        busy: '',
        error: error.message,
        success: ''
      });
    }
  }

  return (
    <div className="page-stack">
      <PanelSection title="Abrir suporte" description="O bot cria o canal no Discord usando o mesmo fluxo atual do servidor.">
        <div className="quick-actions">
          {TICKET_CATEGORIES.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              disabled={actionState.busy === item.key}
              onClick={() => handleCreateTicket(item.key)}
            >
              {actionState.busy === item.key ? 'Abrindo...' : item.label}
            </Button>
          ))}
        </div>
        {actionState.error ? <div className="alert error">{actionState.error}</div> : null}
        {actionState.success ? <div className="alert success">{actionState.success}</div> : null}
      </PanelSection>

      <PanelSection title="Seus tickets" description="Lista pessoal vinda da API do portal.">
        <PageState
          state={ticketState}
          loadingLabel="Carregando seus tickets..."
          emptyTitle="Falha ao carregar tickets"
          emptyDescription="Nao foi possivel carregar seus tickets."
        >
          <DataTable
            columns={[
              { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
              { key: 'cat', label: 'Categoria', render: (row) => row.categoryKey },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <Badge tone={toneFromStatus(row.status)}>{formatTicketStatus(row.status)}</Badge>
              },
              { key: 'updated', label: 'Atualizado', render: (row) => formatDate(row.updatedAt) }
            ]}
            rows={(ticketState.data?.items || []).map((item) => ({ key: item.id, ...item }))}
          />
        </PageState>
      </PanelSection>
    </div>
  );
}

export function ProfilePage() {
  const { authState } = usePortal();
  const data = authState.data;
  const player = data?.player;

  return (
    <div className="page-stack">
      <PanelSection title="Perfil" description="Dados consolidados de Discord, banco do FiveM e permissao de portal.">
        <div className="detail-grid">
          <Card>
            <span className="eyebrow">Discord</span>
            <h3>{data?.session?.globalName || data?.session?.username}</h3>
            <p>ID {data?.session?.userId}</p>
          </Card>
          <Card>
            <span className="eyebrow">Conta FiveM</span>
            <h3>{player?.passaporte || 'Nao vinculada'}</h3>
            <p>Banco: {player?.bank ?? 0} | Multas: {player?.fines ?? 0}</p>
          </Card>
          <Card>
            <span className="eyebrow">Permissoes</span>
            <h3>{data?.access?.isAdmin ? 'Staff / Admin' : 'Player'}</h3>
            <p>{data?.access?.isAdmin ? 'Acesso administrativo habilitado.' : 'Sem secao administrativa.'}</p>
          </Card>
        </div>
      </PanelSection>
    </div>
  );
}

export function AdminOverviewPage() {
  const [state] = useRemoteResource(
    async () => {
      const [overview, logs, finance] = await Promise.all([getOverview(), getLogs(), getAdminFinance()]);
      return { overview, logs, finance };
    },
    []
  );

  return (
    <PageState
      state={state}
      loadingLabel="Carregando overview administrativo..."
      emptyTitle="Falha ao carregar overview"
      emptyDescription="Nao foi possivel carregar a visao geral administrativa."
    >
      <div className="page-stack">
        <section className="stats-grid">
          <StatCard label="Players online" value={state.data?.overview?.overview?.fivem?.playersOnline ?? 0} tone="success" />
          <StatCard label="Usuarios cadastrados" value={state.data?.overview?.overview?.counts?.totalPlayers ?? 0} />
          <StatCard label="Whitelists pendentes" value={state.data?.overview?.overview?.counts?.pendingWhitelists ?? 0} tone="warning" />
          <StatCard label="Tickets abertos" value={state.data?.overview?.overview?.counts?.openTickets ?? 0} />
          <StatCard label="Receita do mes" value={formatCurrency(state.data?.finance?.totals?.revenueMonth ?? 0)} tone="lime" />
          <StatCard label="Diamantes em contas" value={state.data?.overview?.overview?.counts?.diamondsInCirculation ?? 0} />
        </section>

        <PanelSection title="Saude operacional" description="Bot, API, banco e jobs monitorados em runtime.">
          <div className="detail-grid">
            <Card>
              <span className="eyebrow">API</span>
              <h3>{state.data?.overview?.overview?.health?.api}</h3>
              <p>Banco: {state.data?.overview?.overview?.health?.database}</p>
            </Card>
            <Card>
              <span className="eyebrow">Heartbeat</span>
              <h3>{formatDate(state.data?.overview?.overview?.health?.schedulerHeartbeatAt)}</h3>
              <p>Ultima reconciliacao: {formatDate(state.data?.overview?.overview?.health?.lastReconciliationAt)}</p>
            </Card>
            <Card>
              <span className="eyebrow">FiveM</span>
              <h3>{state.data?.overview?.overview?.fivem?.online ? 'Online' : 'Offline'}</h3>
              <p>
                {state.data?.overview?.overview?.fivem?.playersOnline ?? 0}/
                {state.data?.overview?.overview?.fivem?.playerLimit || '?'} players
              </p>
            </Card>
          </div>
        </PanelSection>

        <PanelSection title="Ultimos logs administrativos" description="Auditoria recente reaproveitada do sistema atual.">
          <div className="log-list">
            {(state.data?.logs?.items || []).slice(0, 8).map((item) => (
              <Card className="log-card" key={item.id}>
                <div className="log-topline">
                  <strong>{item.eventType}</strong>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <small>
                  actor: {item.actorId || '-'} | entity: {item.entityType || '-'}:{' '}
                  {item.entityId || '-'}
                </small>
              </Card>
            ))}
          </div>
        </PanelSection>
      </div>
    </PageState>
  );
}

export function AdminPlayersPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [modalState, setModalState] = useState({
    open: false,
    player: null,
    gems: 0
  });
  const [actionError, setActionError] = useState('');
  const [state, reload] = useRemoteResource(() => getAdminPlayers(deferredSearch), [deferredSearch]);

  async function handleWhitelistToggle(player) {
    setActionError('');
    try {
      await updateAdminPlayerWhitelist(player.accountId, !player.whitelist);
      reload();
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function handleSaveGems() {
    try {
      await updateAdminPlayerGems(modalState.player.accountId, Number(modalState.gems));
      setModalState({
        open: false,
        player: null,
        gems: 0
      });
      reload();
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando players..."
      emptyTitle="Falha ao carregar players"
      emptyDescription="Nao foi possivel carregar a lista de players."
    >
      <div className="page-stack">
        <PanelSection
          title="Players"
          description="Busca por nome, Discord ou passaporte usando dados reais de accounts e characters."
          actions={
            <Input
              placeholder="Buscar por nome, Discord ID ou passaporte"
              value={search}
              onChange={(event) =>
                startTransition(() => {
                  setSearch(event.target.value);
                })
              }
            />
          }
        >
          {actionError ? <div className="alert error">{actionError}</div> : null}
          <DataTable
            columns={[
              { key: 'account', label: 'Passaporte', render: (row) => row.passaporte },
              { key: 'name', label: 'Nome', render: (row) => row.primaryCharacterName || 'Sem personagem' },
              { key: 'discord', label: 'Discord', render: (row) => row.discord || '-' },
              {
                key: 'whitelist',
                label: 'Whitelist',
                render: (row) => <Badge tone={toneFromStatus(row.whitelist)}>{row.whitelist ? 'Liberado' : 'Pendente'}</Badge>
              },
              { key: 'gems', label: 'Diamantes', render: (row) => row.gems },
              { key: 'last', label: 'Ultimo login', render: () => 'Nao disponivel' },
              {
                key: 'actions',
                label: 'Acoes',
                render: (row) => (
                  <div className="action-row">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setModalState({
                          open: true,
                          player: row,
                          gems: row.gems
                        })
                      }
                    >
                      Ajustar diamantes
                    </Button>
                    <Button variant="ghost" onClick={() => handleWhitelistToggle(row)}>
                      {row.whitelist ? 'Remover WL' : 'Liberar WL'}
                    </Button>
                  </div>
                )
              }
            ]}
            rows={(state.data?.items || []).map((item) => ({ key: item.accountId, ...item }))}
          />
        </PanelSection>

        <Modal
          open={modalState.open}
          title="Ajustar diamantes"
          description={modalState.player ? `Passaporte ${modalState.player.passaporte}` : ''}
          onClose={() => setModalState({ open: false, player: null, gems: 0 })}
          actions={<Button onClick={handleSaveGems}>Salvar</Button>}
        >
          <Field label="Novo saldo">
            <Input
              type="number"
              min="0"
              value={modalState.gems}
              onChange={(event) =>
                setModalState((current) => ({
                  ...current,
                  gems: event.target.value
                }))
              }
            />
          </Field>
        </Modal>
      </div>
    </PageState>
  );
}

export function AdminWhitelistPage() {
  const [state, reload] = useRemoteResource(() => getWhitelists(), []);
  const [selected, setSelected] = useState(null);
  const [actionError, setActionError] = useState('');

  async function openDetails(id) {
    try {
      const response = await getWhitelistById(id);
      setSelected(response.item);
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function handleApprove(id) {
    try {
      await approveWhitelist(id);
      reload();
      if (selected?.id === id) {
        setSelected(null);
      }
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function handleReject(id) {
    const reason = window.prompt('Informe o motivo da reprovacao:');
    if (!reason) {
      return;
    }

    try {
      await rejectWhitelist(id, reason);
      reload();
      if (selected?.id === id) {
        setSelected(null);
      }
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando whitelists..."
      emptyTitle="Falha ao carregar whitelists"
      emptyDescription="Nao foi possivel carregar a fila de whitelist."
    >
      <div className="page-stack">
        <PanelSection title="Whitelist" description="Fila real de solicitacoes com aprovacao e reprovacao manual.">
          {actionError ? <div className="alert error">{actionError}</div> : null}
          <DataTable
            columns={[
              { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
              { key: 'user', label: 'Usuario', render: (row) => row.applicant?.displayName || row.userId },
              { key: 'serverId', label: 'ID servidor', render: (row) => row.userServerId || '-' },
              { key: 'char', label: 'Personagem', render: (row) => row.characterName || '-' },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <Badge tone={toneFromStatus(row.status)}>{formatWhitelistStatus(row.status)}</Badge>
              },
              {
                key: 'actions',
                label: 'Acoes',
                render: (row) => (
                  <div className="action-row">
                    <Button variant="ghost" onClick={() => openDetails(row.id)}>
                      Ver respostas
                    </Button>
                    <Button disabled={row.status !== 'pending'} onClick={() => handleApprove(row.id)}>
                      Aprovar
                    </Button>
                    <Button
                      variant="danger"
                      disabled={row.status !== 'pending'}
                      onClick={() => handleReject(row.id)}
                    >
                      Reprovar
                    </Button>
                  </div>
                )
              }
            ]}
            rows={(state.data?.items || []).map((item) => ({ key: item.id, ...item }))}
          />
        </PanelSection>

        {selected ? (
          <PanelSection title={`Whitelist #${selected.id}`} description="Detalhes completos da solicitacao selecionada.">
            <Card>
              <pre>{JSON.stringify(selected.answers, null, 2)}</pre>
            </Card>
          </PanelSection>
        ) : null}
      </div>
    </PageState>
  );
}

export function AdminTicketsPage() {
  const [state] = useRemoteResource(() => getTickets(), []);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  async function openDetails(id) {
    try {
      const response = await getTicketById(id);
      setSelected(response.item);
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando tickets..."
      emptyTitle="Falha ao carregar tickets"
      emptyDescription="Nao foi possivel carregar os tickets."
    >
      <div className="page-stack">
        <PanelSection title="Tickets" description="Visao administrativa dos tickets salvos pelo bot.">
          {error ? <div className="alert error">{error}</div> : null}
          <DataTable
            columns={[
              { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
              { key: 'category', label: 'Categoria', render: (row) => row.categoryKey },
              { key: 'owner', label: 'Player', render: (row) => row.owner?.displayName || row.ownerId },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <Badge tone={toneFromStatus(row.status)}>{formatTicketStatus(row.status)}</Badge>
              },
              { key: 'staff', label: 'Staff', render: (row) => row.claimedByUser?.displayName || '-' },
              { key: 'time', label: 'Atualizacao', render: (row) => formatDate(row.updatedAt) },
              {
                key: 'action',
                label: 'Detalhes',
                render: (row) => (
                  <Button variant="ghost" onClick={() => openDetails(row.id)}>
                    Ver
                  </Button>
                )
              }
            ]}
            rows={(state.data?.items || []).map((item) => ({ key: item.id, ...item }))}
          />
        </PanelSection>

        {selected ? (
          <PanelSection title={`Ticket #${selected.id}`} description="Detalhamento do ticket selecionado.">
            <div className="detail-grid">
              <Card>
                <span className="eyebrow">Status</span>
                <h3>{formatTicketStatus(selected.status)}</h3>
                <p>Responsavel: {selected.claimedByUser?.displayName || 'Nao assumido'}</p>
              </Card>
              <Card>
                <span className="eyebrow">Membros</span>
                <h3>{selected.members?.length || 0}</h3>
                <p>{(selected.members || []).map((entry) => entry.user?.displayName || entry.userId).join(' | ') || 'Sem membros adicionais.'}</p>
              </Card>
            </div>
          </PanelSection>
        ) : null}
      </div>
    </PageState>
  );
}

export function AdminFinancePage() {
  const [state] = useRemoteResource(
    async () => {
      const [finance, portal] = await Promise.all([getAdminFinance(), getAdminPortal()]);
      return { finance, portal };
    },
    []
  );

  return (
    <PageState
      state={state}
      loadingLabel="Carregando financeiro..."
      emptyTitle="Falha ao carregar financeiro"
      emptyDescription="Nao foi possivel carregar a visao financeira."
    >
      <div className="page-stack">
        <section className="stats-grid">
          <StatCard label="Receita total" value={formatCurrency(state.data?.finance?.totals?.totalRevenue)} tone="lime" />
          <StatCard label="Receita do mes" value={formatCurrency(state.data?.finance?.totals?.revenueMonth)} />
          <StatCard label="Pagamentos" value={state.data?.finance?.totals?.totalPayments ?? 0} />
          <StatCard label="Pacotes ativos" value={state.data?.portal?.packages?.filter((item) => item.isActive).length ?? 0} />
        </section>

        <PanelSection title="Top compradores" description="Baseado na tabela real smartphone_paypal_transactions.">
          <DataTable
            columns={[
              { key: 'user', label: 'Usuario', render: (row) => row.player?.primaryCharacterName || `ID ${row.userId}` },
              { key: 'purchases', label: 'Compras', render: (row) => row.purchases },
              { key: 'spent', label: 'Total gasto', render: (row) => formatCurrency(row.totalSpent) }
            ]}
            rows={(state.data?.finance?.topBuyers || []).map((item) => ({ key: item.userId, ...item }))}
          />
        </PanelSection>

        <PanelSection title="Pagamentos recentes" description="Se a tabela estiver vazia, o painel mostra um estado real de falta de registros.">
          <DataTable
            columns={[
              { key: 'id', label: 'ID', render: (row) => row.id },
              { key: 'user', label: 'Usuario', render: (row) => row.userId },
              { key: 'type', label: 'Tipo', render: (row) => row.type || '-' },
              { key: 'value', label: 'Valor', render: (row) => formatCurrency(row.value) },
              { key: 'created', label: 'Data', render: (row) => formatDate(row.createdAt) }
            ]}
            rows={(state.data?.finance?.recentPayments || []).map((item) => ({ key: item.id, ...item }))}
            empty={
              <EmptyState
                title="Sem pagamentos registrados"
                description="A API financeira esta conectada, mas a tabela atual nao possui movimentos."
              />
            }
          />
        </PanelSection>
      </div>
    </PageState>
  );
}

export function AdminDiamondsPage() {
  const [state, reload] = useRemoteResource(
    async () => {
      const [players, portal] = await Promise.all([getAdminPlayers(), getAdminPortal()]);
      return { players, portal };
    },
    []
  );
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});

  async function handleCreate(payload) {
    await createDiamondPackage(payload);
    setSelectedId(null);
    setForm({});
    reload();
  }

  async function handleUpdate(id, payload) {
    await updateDiamondPackage(id, payload);
    reload();
  }

  async function handleDelete(id) {
    await deleteDiamondPackage(id);
    setSelectedId(null);
    setForm({});
    reload();
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando diamantes..."
      emptyTitle="Falha ao carregar diamantes"
      emptyDescription="Nao foi possivel carregar a gestao de diamantes."
    >
      <div className="page-stack">
        <PanelSection title="Distribuicao atual" description="Saldo de diamantes por conta, usando accounts.gems.">
          <DataTable
            columns={[
              { key: 'passaporte', label: 'Passaporte', render: (row) => row.passaporte },
              { key: 'nome', label: 'Player', render: (row) => row.primaryCharacterName || 'Sem personagem' },
              { key: 'gems', label: 'Diamantes', render: (row) => row.gems }
            ]}
            rows={(state.data?.players?.items || []).map((item) => ({ key: item.accountId, ...item }))}
          />
        </PanelSection>

        <CollectionEditor
          title="Pacotes de diamantes"
          description="CRUD do catalogo visivel na landing e na area do player."
          items={state.data?.portal?.packages || []}
          renderPreview={(item) => <DiamondPackageCard item={item} />}
          fields={[
            { key: 'name', label: 'Nome' },
            { key: 'descriptionText', label: 'Descricao', type: 'textarea', rows: 4 },
            { key: 'diamondAmount', label: 'Diamantes', type: 'number' },
            { key: 'bonusAmount', label: 'Bonus', type: 'number' },
            { key: 'priceCents', label: 'Preco em centavos', type: 'number' },
            { key: 'checkoutUrl', label: 'URL de checkout' },
            { key: 'highlightLabel', label: 'Selo' },
            { key: 'displayOrder', label: 'Ordem', type: 'number' },
            { key: 'isActive', label: 'Ativo', type: 'checkbox', checkboxLabel: 'Pacote ativo' }
          ]}
          form={form}
          setForm={setForm}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          createLabel="Criar pacote"
        />
      </div>
    </PageState>
  );
}

export function AdminNewsPage() {
  const [state, reload] = useRemoteResource(() => getAdminPortal(), []);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});

  async function handleCreate(payload) {
    await createNews(payload);
    setSelectedId(null);
    setForm({});
    reload();
  }

  async function handleUpdate(id, payload) {
    await updateNews(id, payload);
    reload();
  }

  async function handleDelete(id) {
    await deleteNews(id);
    setSelectedId(null);
    setForm({});
    reload();
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando noticias..."
      emptyTitle="Falha ao carregar noticias"
      emptyDescription="Nao foi possivel carregar as noticias."
    >
      <CollectionEditor
        title="Noticias"
        description="Noticias publicadas aqui aparecem na landing publica do portal."
        items={state.data?.news || []}
        renderPreview={(item) => <NewsCard item={item} />}
        fields={[
          { key: 'title', label: 'Titulo' },
          { key: 'category', label: 'Categoria' },
          { key: 'descriptionText', label: 'Descricao', type: 'textarea', rows: 5 },
          { key: 'imageUrl', label: 'Imagem (URL)' },
          { key: 'publishedAt', label: 'Data de publicacao' },
          { key: 'isPublished', label: 'Publicado', type: 'checkbox', checkboxLabel: 'Publicar noticia' }
        ]}
        form={form}
        setForm={setForm}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        createLabel="Criar noticia"
      />
    </PageState>
  );
}

export function AdminCitiesPage() {
  const [state, reload] = useRemoteResource(() => getAdminPortal(), []);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({});

  async function handleCreate(payload) {
    await createServerCard(payload);
    setSelectedId(null);
    setForm({});
    reload();
  }

  async function handleUpdate(id, payload) {
    await updateServerCard(id, payload);
    reload();
  }

  async function handleDelete(id) {
    await deleteServerCard(id);
    setSelectedId(null);
    setForm({});
    reload();
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando cidades..."
      emptyTitle="Falha ao carregar cidades"
      emptyDescription="Nao foi possivel carregar os cards de cidade."
    >
      <CollectionEditor
        title="Cidades / Servidores"
        description="Cards administraveis usados na landing e na area do player."
        items={state.data?.servers || []}
        renderPreview={(item) => <ServerCard item={item} />}
        fields={[
          { key: 'name', label: 'Nome' },
          { key: 'descriptionText', label: 'Descricao', type: 'textarea', rows: 5 },
          { key: 'statusLabel', label: 'Status' },
          { key: 'connectUrl', label: 'Link de conexao' },
          { key: 'permissionRequired', label: 'Permissao necessaria' },
          { key: 'imageUrl', label: 'Imagem (URL)' },
          { key: 'displayOrder', label: 'Ordem', type: 'number' },
          { key: 'isPrimary', label: 'Servidor principal', type: 'checkbox', checkboxLabel: 'Usar status live do FiveM' },
          { key: 'isActive', label: 'Ativo', type: 'checkbox', checkboxLabel: 'Exibir no portal' }
        ]}
        form={form}
        setForm={setForm}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        createLabel="Criar servidor"
      />
    </PageState>
  );
}

export function AdminStaffPage() {
  const [state] = useRemoteResource(() => getAdminStaff(), []);

  return (
    <PageState
      state={state}
      loadingLabel="Carregando staff..."
      emptyTitle="Falha ao carregar staff"
      emptyDescription="Nao foi possivel carregar o time administrativo."
    >
      <div className="page-stack">
        <PanelSection title="Staff" description="Lista vinda do Discord com atividade recente baseada nos logs.">
          <div className="showcase-grid">
            {(state.data?.items || []).map((item) => (
              <Card key={item.id} className="staff-card">
                <div className="staff-head">
                  <img alt={item.username} src={item.avatarUrl} />
                  <div>
                    <strong>{item.displayName}</strong>
                    <span>@{item.username}</span>
                  </div>
                </div>
                <div className="staff-metrics">
                  <span>Tickets assumidos: {item.metrics.ticketsClaimed}</span>
                  <span>Tickets fechados: {item.metrics.ticketsClosed}</span>
                  <span>Whitelists revisadas: {item.metrics.whitelistsReviewed}</span>
                  <span>Ultima atividade: {formatDate(item.metrics.lastActionAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </PanelSection>
      </div>
    </PageState>
  );
}

export function AdminLogsPage() {
  const [state] = useRemoteResource(() => getLogs(), []);

  return (
    <PageState
      state={state}
      loadingLabel="Carregando logs..."
      emptyTitle="Falha ao carregar logs"
      emptyDescription="Nao foi possivel carregar a auditoria."
    >
      <PanelSection title="Logs" description="Auditoria administrativa e operacional registrada pelo sistema.">
        <div className="log-list">
          {(state.data?.items || []).map((item) => (
            <Card className="log-card" key={item.id}>
              <div className="log-topline">
                <strong>{item.eventType}</strong>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              <small>
                actor: {item.actorId || '-'} | entity: {item.entityType || '-'}:{' '}
                {item.entityId || '-'}
              </small>
              <pre>{JSON.stringify(item.details, null, 2)}</pre>
            </Card>
          ))}
        </div>
      </PanelSection>
    </PageState>
  );
}

export function AdminSettingsPage() {
  const [state, reload] = useRemoteResource(
    async () => {
      const [config, content, portal] = await Promise.all([getConfig(), getContent(), getAdminPortal()]);
      return { config, content, portal };
    },
    []
  );
  const [configForm, setConfigForm] = useState(null);
  const [portalForm, setPortalForm] = useState(null);
  const [contentDrafts, setContentDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.data) {
      return;
    }

    setConfigForm({
      staffRoleId: state.data.config.guildConfig?.staffRoleId || '',
      whitelistRoleId: state.data.config.guildConfig?.whitelistRoleId || '',
      unverifiedRoleId: state.data.config.guildConfig?.unverifiedRoleId || '',
      ticketCategoryId: state.data.config.guildConfig?.ticketCategoryId || '',
      ticketPanelChannelId: state.data.config.guildConfig?.ticketPanelChannelId || '',
      whitelistPanelChannelId: state.data.config.guildConfig?.whitelistPanelChannelId || '',
      whitelistReviewChannelId: state.data.config.guildConfig?.whitelistReviewChannelId || '',
      attemptLimit: state.data.config.guildConfig?.whitelistSettings?.attemptLimit || 3,
      cooldownMinutes: state.data.config.guildConfig?.whitelistSettings?.cooldownMinutes || 30,
      allowRetry: Boolean(state.data.config.guildConfig?.whitelistSettings?.allowRetry)
    });
    setPortalForm(state.data.portal.settings);
    setContentDrafts(
      Object.fromEntries(
        (state.data.content.items || []).map((item) => [
          item.contentKey,
          {
            title: item.title,
            bodyText: item.bodyText
          }
        ])
      )
    );
  }, [state.data]);

  async function handleSaveConfig(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await patchConfig({
        staffRoleId: configForm.staffRoleId,
        whitelistRoleId: configForm.whitelistRoleId,
        unverifiedRoleId: configForm.unverifiedRoleId,
        ticketCategoryId: configForm.ticketCategoryId,
        ticketPanelChannelId: configForm.ticketPanelChannelId,
        whitelistPanelChannelId: configForm.whitelistPanelChannelId,
        whitelistReviewChannelId: configForm.whitelistReviewChannelId,
        whitelistSettings: {
          attemptLimit: Number(configForm.attemptLimit),
          cooldownMinutes: Number(configForm.cooldownMinutes),
          allowRetry: Boolean(configForm.allowRetry)
        }
      });
      setMessage('Configuracao operacional salva com sucesso.');
      reload();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function handleSavePortal(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await updateAdminPortalSettings(portalForm);
      setMessage('Configuracao visual do portal salva com sucesso.');
      reload();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function handleSaveContent(contentKey) {
    setMessage('');
    setError('');
    try {
      await updateContent(contentKey, contentDrafts[contentKey]);
      setMessage(`Conteudo ${contentKey} salvo com sucesso.`);
      reload();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <PageState
      state={state}
      loadingLabel="Carregando configuracoes..."
      emptyTitle="Falha ao carregar configuracoes"
      emptyDescription="Nao foi possivel carregar as configuracoes."
    >
      <div className="page-stack">
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <PanelSection title="Configuracoes operacionais" description="IDs e regras reaproveitados do sistema atual.">
          <form className="form-grid" onSubmit={handleSaveConfig}>
            <Field label="Cargo staff">
              <Input value={configForm?.staffRoleId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, staffRoleId: event.target.value }))} />
            </Field>
            <Field label="Cargo whitelist">
              <Input value={configForm?.whitelistRoleId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, whitelistRoleId: event.target.value }))} />
            </Field>
            <Field label="Cargo nao verificado">
              <Input value={configForm?.unverifiedRoleId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, unverifiedRoleId: event.target.value }))} />
            </Field>
            <Field label="Categoria de tickets">
              <Input value={configForm?.ticketCategoryId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, ticketCategoryId: event.target.value }))} />
            </Field>
            <Field label="Canal painel de tickets">
              <Input value={configForm?.ticketPanelChannelId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, ticketPanelChannelId: event.target.value }))} />
            </Field>
            <Field label="Canal painel de whitelist">
              <Input value={configForm?.whitelistPanelChannelId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, whitelistPanelChannelId: event.target.value }))} />
            </Field>
            <Field label="Canal de revisao da whitelist">
              <Input value={configForm?.whitelistReviewChannelId || ''} onChange={(event) => setConfigForm((current) => ({ ...current, whitelistReviewChannelId: event.target.value }))} />
            </Field>
            <Field label="Limite de tentativas">
              <Input type="number" value={configForm?.attemptLimit || 0} onChange={(event) => setConfigForm((current) => ({ ...current, attemptLimit: event.target.value }))} />
            </Field>
            <Field label="Cooldown (minutos)">
              <Input type="number" value={configForm?.cooldownMinutes || 0} onChange={(event) => setConfigForm((current) => ({ ...current, cooldownMinutes: event.target.value }))} />
            </Field>
            <Field label="Permitir retry">
              <label className="checkbox-row">
                <input checked={Boolean(configForm?.allowRetry)} type="checkbox" onChange={(event) => setConfigForm((current) => ({ ...current, allowRetry: event.target.checked }))} />
                <span>Permitir nova tentativa de whitelist</span>
              </label>
            </Field>
            <div className="form-actions full-row">
              <Button type="submit">Salvar configuracoes operacionais</Button>
            </div>
          </form>
        </PanelSection>

        <PanelSection title="Identidade do portal" description="Nome do servidor, links, hero e cores principais.">
          <form className="form-grid" onSubmit={handleSavePortal}>
            <Field label="Nome do servidor">
              <Input value={portalForm?.serverName || ''} onChange={(event) => setPortalForm((current) => ({ ...current, serverName: event.target.value }))} />
            </Field>
            <Field label="Nome curto">
              <Input value={portalForm?.shortName || ''} onChange={(event) => setPortalForm((current) => ({ ...current, shortName: event.target.value }))} />
            </Field>
            <Field label="Hero title">
              <Input value={portalForm?.heroTitle || ''} onChange={(event) => setPortalForm((current) => ({ ...current, heroTitle: event.target.value }))} />
            </Field>
            <Field label="Hero subtitle">
              <Textarea rows={4} value={portalForm?.heroSubtitle || ''} onChange={(event) => setPortalForm((current) => ({ ...current, heroSubtitle: event.target.value }))} />
            </Field>
            <Field label="URL do Discord">
              <Input value={portalForm?.discordUrl || ''} onChange={(event) => setPortalForm((current) => ({ ...current, discordUrl: event.target.value }))} />
            </Field>
            <Field label="Connect FiveM">
              <Input value={portalForm?.connectUrl || ''} onChange={(event) => setPortalForm((current) => ({ ...current, connectUrl: event.target.value }))} />
            </Field>
            <Field label="Cor base">
              <Input value={portalForm?.primaryColor || ''} onChange={(event) => setPortalForm((current) => ({ ...current, primaryColor: event.target.value }))} />
            </Field>
            <Field label="Cor destaque">
              <Input value={portalForm?.accentColor || ''} onChange={(event) => setPortalForm((current) => ({ ...current, accentColor: event.target.value }))} />
            </Field>
            <Field label="Titulo da secao servidores">
              <Input value={portalForm?.landingSections?.serversTitle || ''} onChange={(event) => setPortalForm((current) => ({ ...current, landingSections: { ...current.landingSections, serversTitle: event.target.value } }))} />
            </Field>
            <Field label="Titulo da secao noticias">
              <Input value={portalForm?.landingSections?.newsTitle || ''} onChange={(event) => setPortalForm((current) => ({ ...current, landingSections: { ...current.landingSections, newsTitle: event.target.value } }))} />
            </Field>
            <Field label="Titulo da secao diamantes">
              <Input value={portalForm?.landingSections?.packagesTitle || ''} onChange={(event) => setPortalForm((current) => ({ ...current, landingSections: { ...current.landingSections, packagesTitle: event.target.value } }))} />
            </Field>
            <Field label="Titulo da secao onboarding">
              <Input value={portalForm?.landingSections?.howToJoinTitle || ''} onChange={(event) => setPortalForm((current) => ({ ...current, landingSections: { ...current.landingSections, howToJoinTitle: event.target.value } }))} />
            </Field>
            <div className="form-actions full-row">
              <Button type="submit">Salvar identidade do portal</Button>
            </div>
          </form>
        </PanelSection>

        <PanelSection title="Conteudos editaveis" description="Blocos de onboarding existentes e reaproveitados no novo portal.">
          <div className="content-grid">
            {(state.data?.content?.items || []).map((item) => (
              <Card className="content-editor-card" key={item.contentKey}>
                <span className="eyebrow">{item.contentKey}</span>
                <Field label="Titulo">
                  <Input
                    value={contentDrafts[item.contentKey]?.title || ''}
                    onChange={(event) =>
                      setContentDrafts((current) => ({
                        ...current,
                        [item.contentKey]: {
                          ...current[item.contentKey],
                          title: event.target.value
                        }
                      }))
                    }
                  />
                </Field>
                <Field label="Conteudo">
                  <Textarea
                    rows={8}
                    value={contentDrafts[item.contentKey]?.bodyText || ''}
                    onChange={(event) =>
                      setContentDrafts((current) => ({
                        ...current,
                        [item.contentKey]: {
                          ...current[item.contentKey],
                          bodyText: event.target.value
                        }
                      }))
                    }
                  />
                </Field>
                <Button onClick={() => handleSaveContent(item.contentKey)}>Salvar bloco</Button>
              </Card>
            ))}
          </div>
        </PanelSection>
      </div>
    </PageState>
  );
}
