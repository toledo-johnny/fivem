import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gem,
  History,
  IdCard,
  Landmark,
  MessageSquare,
  Play,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  TicketPlus,
  UserRoundCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { createPortalTicket, syncPortalOrderCheckout } from '../services/api';
import {
  formatDateShort,
  formatDateTime,
  formatTicketCategory,
  formatWhitelistStatus,
} from '../lib/portal';

const quickTicketCategories = [
  { key: 'support', label: 'Abrir suporte' },
  { key: 'bugs', label: 'Reportar bug' },
  { key: 'reports', label: 'Fazer denuncia' },
];

const accessLevelLabels = {
  player: 'Player',
  support: 'Suporte',
  admin: 'Admin',
  owner: 'Owner',
} as const;

function buildPaymentSyncMessage(
  code: string,
  item: { paymentStatus?: string; deliveryStatus?: string } | null,
  checkoutStatus: string,
) {
  if (item?.paymentStatus === 'approved' && item.deliveryStatus === 'delivered') {
    return 'Pagamento aprovado e diamantes entregues automaticamente.';
  }

  if (item?.paymentStatus === 'approved' && item.deliveryStatus === 'awaiting_link') {
    return 'Pagamento aprovado. Vincule seu passaporte para liberar a entrega dos diamantes.';
  }

  if (item?.paymentStatus === 'approved') {
    return 'Pagamento aprovado e pedido sincronizado com sucesso.';
  }

  if (
    item?.paymentStatus === 'failed' ||
    checkoutStatus === 'failed' ||
    checkoutStatus === 'rejected'
  ) {
    return 'O pagamento voltou como falho ou rejeitado. Confira o historico abaixo antes de tentar novamente.';
  }

  if (code === 'payment_not_found' || item?.paymentStatus === 'pending' || checkoutStatus === 'pending') {
    return 'Pagamento criado e aguardando confirmacao do Mercado Pago.';
  }

  return 'Retorno do checkout recebido e pedido atualizado.';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { canAccessAdmin, logout, refreshSession, sessionData } = useAuth();
  const [ticketBusy, setTicketBusy] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'default' | 'error'>('default');
  const [paymentFeedback, setPaymentFeedback] = useState('');
  const [paymentFeedbackTone, setPaymentFeedbackTone] = useState<'default' | 'error'>('default');

  const data = sessionData;
  const session = data?.session;
  const player = data?.player;
  const whitelist = data?.whitelist;
  const latestApplication = whitelist?.application || null;
  const guild = data?.guild;
  const servers = data?.servers || [];
  const tickets = data?.tickets || [];
  const paymentOrders = data?.paymentOrders || [];
  const fivemStatus = data?.fivemStatus;

  const openExternal = (url?: string | null) => {
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateTicket = async (categoryKey: string) => {
    setTicketBusy(categoryKey);
    setFeedback('');
    setFeedbackTone('default');

    try {
      const response = await createPortalTicket(categoryKey);
      await refreshSession();
      setFeedback(
        response.channel?.url
          ? `Ticket criado com sucesso. Canal liberado em ${response.channel.url}.`
          : 'Ticket criado com sucesso.',
      );
      setFeedbackTone('default');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao abrir o ticket.');
      setFeedbackTone('error');
    } finally {
      setTicketBusy('');
    }
  };

  useEffect(() => {
    if (!session?.userId) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id') || params.get('collection_id');
    const externalReference = params.get('external_reference');
    const checkoutStatus = String(
      params.get('status') || params.get('collection_status') || params.get('payment') || '',
    )
      .trim()
      .toLowerCase();

    if (!paymentId && !externalReference && !checkoutStatus) {
      return;
    }

    const cleanUrl = new URL(window.location.href);
    [
      'payment',
      'payment_id',
      'collection_id',
      'collection_status',
      'status',
      'external_reference',
      'payment_type',
      'merchant_order_id',
      'preference_id',
      'site_id',
      'processing_mode',
      'merchant_account_id',
    ].forEach((key) => cleanUrl.searchParams.delete(key));
    window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);

    let cancelled = false;

    const syncCheckoutReturn = async () => {
      try {
        if (paymentId || externalReference) {
          const response = await syncPortalOrderCheckout({
            paymentId,
            externalReference,
          });
          await refreshSession();

          if (cancelled) {
            return;
          }

          const message = buildPaymentSyncMessage(response.code, response.item, checkoutStatus);
          setPaymentFeedback(message);
          setPaymentFeedbackTone(response.item?.paymentStatus === 'failed' ? 'error' : 'default');
          return;
        }

        const message = buildPaymentSyncMessage('checkout_return', null, checkoutStatus);
        setPaymentFeedback(message);
        setPaymentFeedbackTone(
          checkoutStatus === 'failed' || checkoutStatus === 'rejected' ? 'error' : 'default',
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPaymentFeedback(
          error instanceof Error ? error.message : 'Nao foi possivel sincronizar o retorno do pagamento.',
        );
        setPaymentFeedbackTone('error');
      }
    };

    void syncCheckoutReturn();

    return () => {
      cancelled = true;
    };
  }, [refreshSession, session?.userId]);

  if (!data || !session) {
    return null;
  }

  const profileName = session.globalName || session.username;
  const profileAvatar = session.avatarUrl || undefined;
  const statusKey = whitelist?.status || 'not_started';
  const whitelistApproved = statusKey === 'approved';
  const discordLinked = data.links.discordLinked;
  const hasLinkedPlayer = Boolean(player);
  const pendingPassport = latestApplication?.userServerId || null;
  const openTickets = tickets.filter((entry) => entry.status === 'open').length;
  const ticketTimeline = [...tickets].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const recentClosedTickets = ticketTimeline.filter((entry) => entry.status === 'closed').slice(0, 3);
  const recentOrders = [...paymentOrders]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const primaryServer = servers.find((item) => item.isPrimary) || servers[0] || null;
  const secondaryServers = primaryServer ? servers.filter((item) => item.id !== primaryServer.id) : [];
  const primaryConnectUrl = primaryServer?.connectUrl || data.links.connectUrl || fivemStatus?.connectUrl || null;
  const primaryConnectEnabled =
    Boolean(primaryConnectUrl) && (whitelistApproved || !primaryServer?.permissionRequired);
  const primaryServerStatus = primaryServer?.isPrimary
    ? fivemStatus?.online
      ? `ONLINE ${fivemStatus.playersOnline}/${fivemStatus.playerLimit}`
      : 'OFFLINE'
    : primaryServer?.statusLabel || 'Disponivel';
  const roleLabel = data.access.isStaff ? accessLevelLabels[data.access.level] : 'Player';
  const cityStatus = primaryConnectEnabled ? 'Liberada' : 'Bloqueada';
  const accessHeadline = primaryConnectEnabled
    ? 'Cidade liberada'
    : statusKey === 'pending'
      ? 'Aguardando aprovacao da whitelist'
      : statusKey === 'rejected'
        ? 'Acesso bloqueado pela whitelist'
        : canAccessAdmin && !hasLinkedPlayer
          ? 'Acesso staff sem passaporte vinculado'
          : 'Aguardando liberacao da cidade';
  const accessDescription = primaryConnectEnabled
    ? `Seu Discord esta sincronizado${player?.passaporte ? ` com o passaporte #${player.passaporte}` : ''} e a entrada na cidade principal ja esta liberada.`
    : statusKey === 'pending'
      ? `Sua whitelist esta em analise${pendingPassport ? ` para o passaporte #${pendingPassport}` : ''}. Assim que ela for aprovada, o acesso sera sincronizado automaticamente.`
      : statusKey === 'rejected'
        ? `Sua ultima whitelist foi reprovada${latestApplication?.rejectionReason ? `: ${latestApplication.rejectionReason}` : '.'}`
        : canAccessAdmin && !hasLinkedPlayer
          ? 'Seu cargo staff continua ativo, mas ainda falta vincular um passaporte ao banco para completar a identidade dentro do portal.'
          : 'Ainda nao existe uma whitelist aprovada com passaporte sincronizado para liberar sua entrada na cidade.';
  const accessGuidance = primaryConnectEnabled
    ? 'Pode entrar na cidade ou usar as acoes rapidas para suporte, regras e loja.'
    : statusKey === 'pending'
      ? 'Aguarde a revisao da equipe e acompanhe as atualizacoes pelo Discord oficial.'
      : statusKey === 'rejected'
        ? latestApplication?.rejectionReason || 'Revise as regras, ajuste a whitelist e tente novamente.'
        : canAccessAdmin && !hasLinkedPlayer
          ? 'Abra o admin e vincule um passaporte para concluir a sincronizacao.'
          : 'Abra a whitelist, confira as regras e conclua o cadastro para liberar sua conta.';
  const punishmentSummary = player?.isBanned
    ? 'Ban ativo'
    : (player?.prison || 0) > 0
      ? `Prisao ${player?.prison}`
      : (player?.fines || 0) > 0
        ? `Multas ${player?.fines?.toLocaleString('pt-BR')}`
        : 'Sem pendencias';
  const identityPassport = player?.passaporte
    ? `#${player.passaporte}`
    : pendingPassport
      ? `#${pendingPassport}`
      : '--';
  const identityPassportHint = player?.passaporte
    ? 'Identidade sincronizada com o banco da cidade.'
    : pendingPassport
      ? 'Passaporte informado na ultima whitelist enviada.'
      : 'Nenhum passaporte vinculado ao seu Discord ainda.';
  const linkedDiscordIdentity =
    player?.discordLink.primary || player?.discordLink.account || 'Aguardando sincronizacao';

  const handleOpenSupport = async () => {
    if (data.links.supportPanelUrl) {
      openExternal(data.links.supportPanelUrl);
      return;
    }

    if (data.capabilities.ticketCreationWeb) {
      await handleCreateTicket('support');
    }
  };

  const accountCards = [
    {
      icon: Landmark,
      label: 'Banco',
      value:
        player?.bank !== null && player?.bank !== undefined
          ? player.bank.toLocaleString('pt-BR')
          : 'Nao informado',
      color: 'text-blue-400',
    },
    {
      icon: Gem,
      label: 'Diamantes',
      value: (player?.gems || 0).toLocaleString('pt-BR'),
      color: 'text-neon',
    },
    // {
    //   icon: UserRoundCheck,
    //   label: 'Personagem principal',
    //   value: player?.primaryCharacterName || latestApplication?.characterName || 'Nao informado',
    //   color: 'text-white',
    // },
    {
      icon: ShieldAlert,
      label: 'Punicoes',
      value: punishmentSummary,
      color: player?.isBanned ? 'text-red-400' : 'text-amber-300',
    },
    // {
    //   icon: Clock,
    //   label: 'Ultimo acesso',
    //   value: player?.lastLoginAt ? formatDateTime(player.lastLoginAt) : 'Nao informado',
    //   color: 'text-white/70',
    // },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 md:pb-20 bg-background relative bg-dot-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative mb-10 md:mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-neon/10 to-transparent rounded-[2.5rem] blur-3xl opacity-50" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative glass-dark rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-12 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon/10 blur-[100px] rounded-full -mr-32 -mt-32" />

            <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">
              <div className="relative mx-auto lg:mx-0">
                <Avatar className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 border-[6px] border-neon/20 shadow-[0_0_50px_rgba(226,232,240,0.1)] rounded-3xl">
                  <AvatarImage src={profileAvatar} />
                  <AvatarFallback>{profileName[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-[#5865F2] text-white p-2 rounded-xl shadow-lg ring-4 ring-black/50">
                  <MessageSquare className="w-5 h-5 fill-white" />
                </div>
              </div>

              <div className="flex-grow min-w-0 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tighter uppercase break-words">
                    {profileName}
                  </h1>
                  <Badge className="bg-neon text-black font-black uppercase tracking-widest text-[10px] h-6 px-3">
                    {canAccessAdmin ? 'Area staff' : 'Area player'}
                  </Badge>
                </div>

                <p className="text-white/64 leading-relaxed max-w-3xl mx-auto lg:mx-0">
                  Acompanhe seu acesso, sua conta do jogo e o suporte oficial em um painel mais direto
                  e facil de ler.
                </p>

                <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3 md:gap-4 mt-6">
                  <Badge className="bg-white/10 text-white border-white/10 font-black uppercase tracking-[0.16em]">
                    Discord {discordLinked ? 'confirmado' : 'pendente'}
                  </Badge>
                  <Badge className="bg-white/10 text-white/70 border-white/10 font-black uppercase tracking-[0.16em]">
                    {roleLabel}
                  </Badge>
                  <div className="flex items-center gap-2 text-white/52 text-sm">
                    <Clock className="w-4 h-4 text-neon" />
                    Sessao emitida em {formatDateShort(session.issuedAt)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mb-10 rounded-[2rem] border p-6 md:p-7',
            primaryConnectEnabled
              ? 'border-green-500/15 bg-green-500/[0.06]'
              : statusKey === 'pending'
                ? 'border-amber-500/15 bg-amber-500/[0.06]'
                : statusKey === 'rejected'
                  ? 'border-red-500/15 bg-red-500/[0.06]'
                  : canAccessAdmin
                    ? 'border-neon/15 bg-neon/[0.06]'
                    : 'border-white/8 bg-white/[0.03]',
          )}
        >
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Badge
                  className={cn(
                    'font-black uppercase tracking-[0.18em] text-[9px] border',
                    primaryConnectEnabled
                      ? 'bg-green-500/10 text-green-300 border-green-500/20'
                      : statusKey === 'pending'
                        ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                        : statusKey === 'rejected'
                          ? 'bg-red-500/10 text-red-200 border-red-500/20'
                          : 'bg-white/10 text-white border-white/10',
                  )}
                >
                  Status de acesso
                </Badge>
                {data.access.isStaff ? (
                  <Badge className="bg-white/10 text-white/80 border-white/10 text-[9px] uppercase tracking-[0.16em]">
                    Cargo {roleLabel}
                  </Badge>
                ) : null}
              </div>
              <h2 className="text-2xl font-display font-black uppercase tracking-tight">{accessHeadline}</h2>
              <p className="mt-3 text-sm text-white/68 leading-relaxed max-w-3xl">{accessDescription}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-white/35 text-[10px] font-black uppercase tracking-[0.24em] mb-2">Cidade</div>
                <div className="text-xl font-display font-black uppercase">{cityStatus}</div>
                <p className="mt-2 text-xs text-white/56">
                  {primaryServer?.name || guild?.name || 'Servidor principal'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-white/35 text-[10px] font-black uppercase tracking-[0.24em] mb-2">Whitelist</div>
                <div className="text-xl font-display font-black uppercase">
                  {formatWhitelistStatus(statusKey)}
                </div>
                <p className="mt-2 text-xs text-white/56">{accessGuidance}</p>
              </div>
            </div>
          </div>
        </motion.div> */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-10 min-w-0">
            <section>
              <div className="flex items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-display font-black tracking-tighter flex items-center gap-4 uppercase">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                    <Play className="w-4 h-4 text-neon fill-current" />
                  </div>
                  Cidade e acoes
                </h2>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/32 font-black">
                  Status a cada 30s
                </div>
              </div>

              <div className="grid gap-6">
                <motion.div
                  whileHover={{ y: -5, borderColor: 'rgba(226, 232, 240, 0.2)' }}
                  className="glass-dark rounded-3xl border border-white/5 overflow-hidden group"
                >
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                      <div className="p-3 bg-neon/5 rounded-2xl w-fit">
                        <Play className="w-6 h-6 text-neon" />
                      </div>
                      <Badge
                        className={cn(
                          'text-[10px] font-black w-fit border',
                          fivemStatus?.online
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-white/10 text-white/70 border-white/10',
                        )}
                      >
                        {primaryServerStatus}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-display font-black mb-1">
                      {primaryServer?.name || guild?.name || 'Cidade principal'}
                    </h3>
                    <p className="text-sm text-white/58 leading-relaxed mb-4">
                      {primaryServer?.descriptionText ||
                        'Conecte-se pela cidade principal e acompanhe aqui o acesso, a fila de suporte e suas ultimas compras.'}
                    </p>
                    <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-6">
                      {primaryServer?.permissionRequired || 'Sem restricao adicional'}
                    </p>

                    <Button
                      onClick={() => openExternal(primaryConnectUrl)}
                      disabled={!primaryConnectEnabled}
                      className="w-full h-14 bg-white/5 hover:bg-neon hover:text-black disabled:bg-white/5 disabled:text-white/35 font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      {primaryConnectEnabled ? 'ENTRAR NA CIDADE' : 'ACESSO BLOQUEADO'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>

                {/* <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                  <CardHeader className="p-6 md:p-8 pb-4">
                    <CardTitle className="text-lg uppercase tracking-tighter">Acoes rapidas</CardTitle>
                    <CardDescription className="text-white/24 text-xs">
                      Entradas principais do portal sem repetir a mesma informacao em varios blocos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 pt-0">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <Button
                        onClick={() => openExternal(primaryConnectUrl)}
                        disabled={!primaryConnectEnabled}
                        className="h-12 justify-between bg-neon text-black hover:bg-neon/90 disabled:bg-white/5 disabled:text-white/35 rounded-xl font-black uppercase tracking-[0.14em]"
                      >
                        Entrar na cidade
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openExternal(data.links.discordUrl)}
                        disabled={!data.links.discordUrl}
                        className="h-12 justify-between border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-xl font-black uppercase tracking-[0.14em]"
                      >
                        Abrir Discord
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/#shop')}
                        className="h-12 justify-between border-white/10 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-[0.14em]"
                      >
                        Comprar diamantes
                        <ShoppingBag className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleOpenSupport()}
                        disabled={
                          ticketBusy === 'support' ||
                          (!data.links.supportPanelUrl && !data.capabilities.ticketCreationWeb)
                        }
                        className="h-12 justify-between border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-xl font-black uppercase tracking-[0.14em]"
                      >
                        {ticketBusy === 'support' ? 'Abrindo...' : 'Abrir suporte'}
                        <TicketPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/rules')}
                        className="h-12 justify-between border-white/10 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-[0.14em] sm:col-span-2 xl:col-span-1"
                      >
                        Ver regras
                        <ShieldCheck className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card> */}
              </div>

              {secondaryServers.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 mt-6">
                  {secondaryServers.map((server) => {
                    const connectEnabled =
                      Boolean(server.connectUrl) && (whitelistApproved || !server.permissionRequired);

                    return (
                      <div
                        key={server.id}
                        className="rounded-3xl border border-white/5 bg-white/[0.02] p-5"
                      >
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="text-sm font-display font-black uppercase tracking-tight">
                            {server.name}
                          </div>
                          <Badge className="bg-white/10 text-white/70 border-white/10 text-[10px] font-black">
                            {server.statusLabel || 'Disponivel'}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/56 leading-relaxed mb-4">
                          {server.descriptionText}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => openExternal(server.connectUrl)}
                          disabled={!connectEnabled}
                          className="w-full border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-xl font-black uppercase tracking-[0.14em]"
                        >
                          {connectEnabled ? 'Abrir servidor' : 'Indisponivel'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-display font-black tracking-tighter flex items-center gap-4 uppercase">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                    <IdCard className="w-4 h-4 text-neon" />
                  </div>
                  Conta do jogo
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {accountCards.map((stat) => (
                  <div key={stat.label} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 min-w-0">
                    <stat.icon className={cn('w-5 h-5 mb-4', stat.color)} />
                    <div className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">
                      {stat.label}
                    </div>
                    <div className="text-sm font-bold text-white break-words">{stat.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <h2 className="text-2xl font-display font-black tracking-tighter flex items-center gap-4 uppercase">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                    <History className="w-4 h-4 text-neon" />
                  </div>
                  Tickets e suporte
                </h2>
                <div className="flex flex-wrap gap-3">
                  {quickTicketCategories.map((item) => (
                    <Button
                      key={item.key}
                      variant="outline"
                      disabled={ticketBusy === item.key || !data.capabilities.ticketCreationWeb}
                      onClick={() => handleCreateTicket(item.key)}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.18em]"
                    >
                      <TicketPlus className="w-4 h-4 mr-2 text-neon" />
                      {ticketBusy === item.key ? 'Abrindo...' : item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.22em] mb-2">
                    Tickets abertos
                  </div>
                  <div className="text-3xl font-display font-black">{openTickets}</div>
                </div>
                <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.22em] mb-2">
                    Fechados recentes
                  </div>
                  <div className="text-3xl font-display font-black">{recentClosedTickets.length}</div>
                </div>
                {/* <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-white/30 text-[10px] font-black uppercase tracking-[0.22em] mb-2">
                    Atendimento
                  </div>
                  <div className="text-sm font-bold text-white">
                    {data.links.supportPanelUrl
                      ? 'Painel publicado'
                      : data.capabilities.ticketCreationWeb
                        ? 'Tickets no portal'
                        : 'Somente Discord'}
                  </div>
                </div> */}
              </div>

              {feedback ? (
                <div
                  className={cn(
                    'mb-5 rounded-2xl px-5 py-4 text-sm leading-relaxed border',
                    feedbackTone === 'error'
                      ? 'border-red-500/20 bg-red-500/10 text-red-50/80'
                      : 'border-white/8 bg-white/[0.03] text-white/72',
                  )}
                >
                  {feedback}
                </div>
              ) : null}

              <div className="space-y-4">
                {ticketTimeline.length > 0 ? (
                  ticketTimeline.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0',
                            entry.status === 'open'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-white/10 text-white/60',
                          )}
                        >
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm group-hover:text-white transition-colors">
                            Ticket #{entry.id} - {formatTicketCategory(entry.categoryKey)}
                          </h4>
                          <p className="text-xs text-white/32 uppercase tracking-widest font-bold mt-1">
                            Atualizado em {formatDateTime(entry.updatedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <Badge
                          className={cn(
                            'font-black text-[10px] uppercase border',
                            entry.status === 'open'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-white/10 text-white/60 border-white/10',
                          )}
                        >
                          {entry.status === 'open' ? 'ABERTO' : 'FECHADO'}
                        </Badge>
                        {entry.channelId ? (
                          <Button
                            variant="ghost"
                            onClick={() => openExternal(`https://discord.com/channels/${guild.id}/${entry.channelId}`)}
                            className="text-[10px] font-black uppercase tracking-[0.18em] text-neon hover:bg-white/5"
                          >
                            Abrir canal
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-white/58">
                    Nenhum ticket recente encontrado. Use os atalhos acima para abrir atendimento pelo bot.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-display font-black tracking-tighter flex items-center gap-4 uppercase">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-neon" />
                  </div>
                  Compras recentes
                </h2>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/32 font-black">
                  {data.purchaseSummary.deliveredOrders} entrega(s) concluida(s)
                </div>
              </div>

              <div className="space-y-4">
                {paymentFeedback ? (
                  <div
                    className={cn(
                      'rounded-3xl border px-5 py-4 text-sm leading-relaxed',
                      paymentFeedbackTone === 'error'
                        ? 'border-red-500/20 bg-red-500/10 text-red-50/80'
                        : 'border-white/8 bg-white/[0.03] text-white/72',
                    )}
                  >
                    {paymentFeedback}
                  </div>
                ) : null}

                {recentOrders.length > 0 ? (
                  recentOrders.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-3xl border border-white/5 bg-white/[0.02] p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-black uppercase tracking-[0.08em]">
                            Pedido #{entry.id} - {entry.packageSnapshot.name || `Pacote ${entry.packageId}`}
                          </div>
                          <div className="mt-2 text-xs text-white/42 uppercase tracking-[0.18em] font-black">
                            {entry.totalDiamonds.toLocaleString('pt-BR')} diamantes
                            {entry.totalBonus > 0
                              ? ` + ${entry.totalBonus.toLocaleString('pt-BR')} bonus`
                              : ''}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Badge
                            className={cn(
                              'font-black text-[10px] uppercase border',
                              entry.paymentStatus === 'approved'
                                ? 'bg-green-500/10 text-green-300 border-green-500/20'
                                : entry.paymentStatus === 'failed'
                                  ? 'bg-red-500/10 text-red-200 border-red-500/20'
                                  : 'bg-white/10 text-white/70 border-white/10',
                            )}
                          >
                            {entry.paymentStatus}
                          </Badge>
                          <Badge
                            className={cn(
                              'font-black text-[10px] uppercase border',
                              entry.deliveryStatus === 'delivered'
                                ? 'bg-neon/10 text-neon border-neon/20'
                                : 'bg-white/10 text-white/70 border-white/10',
                            )}
                          >
                            {entry.deliveryStatus}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-white/64 sm:grid-cols-3">
                        <div>
                          Valor:{' '}
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(entry.totalPriceCents / 100)}
                        </div>
                        <div>Criado: {formatDateTime(entry.createdAt)}</div>
                        <div>Entregue: {entry.deliveredAt ? formatDateTime(entry.deliveredAt) : 'Pendente'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-white/58">
                    Nenhum pedido registrado ainda. Quando voce iniciar uma compra pelo portal, o historico aparece aqui.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8 min-w-0">
            <Card className="glass-dark border-white/5 rounded-[2rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8">
                <CardTitle className="text-lg uppercase tracking-tighter">Minha identidade</CardTitle>
                <CardDescription className="text-white/20 text-xs">
                  Passaporte e vinculos em um unico lugar.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-0 space-y-6">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="text-[10px] text-white/30 uppercase tracking-[0.24em] font-black">
                    Passaporte
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-neon" />
                    <div className="text-3xl font-display font-black tracking-tight">{identityPassport}</div>
                  </div>
                  <p className="mt-3 text-xs text-white/58">{identityPassportHint}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-4 text-xs">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Cargo</span>
                    <span className="text-white/70 text-right">{roleLabel}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center gap-4 text-xs">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Personagem principal</span>
                    <span className="text-white/70 text-right">
                      {player?.primaryCharacterName || latestApplication?.characterName || 'Nao informado'}
                    </span>
                  </div>
                  {/* <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center gap-4 text-xs">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Conta no banco</span>
                    <span className="text-white/70 text-right">{linkedDiscordIdentity}</span>
                  </div> */}
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center gap-4 text-xs">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Observacao</span>
                    <span className="text-white/70 text-right">
                      {latestApplication?.rejectionReason || 'Sem pendencias abertas'}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <Button
                    variant="link"
                    onClick={() => navigate('/rules')}
                    className="w-full text-neon h-auto text-[10px] font-black uppercase p-0"
                  >
                    VER REGRAS DA CIDADE
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* <Card className="glass-dark border-white/5 rounded-[2rem] overflow-hidden">
              <CardHeader className="p-6 md:p-8">
                <CardTitle className="text-lg uppercase tracking-tighter">Discord e suporte</CardTitle>
                <CardDescription className="text-white/20 text-xs">
                  Sessao oficial e atalhos da comunidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-0 space-y-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/8 bg-white/[0.02] shrink-0">
                    <img
                      src={guild?.iconUrl || profileAvatar}
                      alt={guild?.name || profileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/30 uppercase tracking-[0.24em] font-black">
                      Servidor oficial
                    </div>
                    <div className="mt-2 text-lg font-display font-black uppercase tracking-tight break-words">
                      {guild?.name || 'Nao informado'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Conta Discord</span>
                    <span className="text-white/70 break-all text-right">@{session.username}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between gap-4">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Suporte</span>
                    <span className="text-white/70 break-all text-right">
                      {data.links.supportPanelUrl
                        ? 'Painel publicado'
                        : data.capabilities.ticketCreationWeb
                          ? 'Ticket no portal'
                          : 'Somente Discord'}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between gap-4">
                    <span className="text-white/30 font-bold uppercase tracking-widest">Ultima sessao</span>
                    <span className="text-white/70 break-all text-right">
                      {formatDateShort(session.issuedAt)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => openExternal(data.links.discordUrl)}
                    disabled={!data.links.discordUrl}
                    className="h-12 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-[0.16em]"
                  >
                    DISCORD
                    <ExternalLink className="ml-2 w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleOpenSupport()}
                    disabled={
                      ticketBusy === 'support' ||
                      (!data.links.supportPanelUrl && !data.capabilities.ticketCreationWeb)
                    }
                    className="h-12 border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-[0.16em]"
                  >
                    {ticketBusy === 'support' ? 'Abrindo...' : 'SUPORTE'}
                  </Button>
                </div>
              </CardContent>
            </Card> */}

            {/* {canAccessAdmin ? (
              <Card className="glass-dark border-neon/15 bg-neon/[0.06] rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-black mb-2">
                      Painel staff
                    </div>
                    <div className="text-lg font-display font-black uppercase tracking-tight">
                      Ferramentas administrativas liberadas
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/admin')}
                    className="h-12 bg-neon text-black hover:bg-neon/90 font-black rounded-xl uppercase tracking-[0.16em]"
                  >
                    Abrir admin
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : null} */}

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/updates')}
                className="h-28 flex-col gap-3 border-white/5 bg-white/[0.02] hover:bg-white/5 rounded-3xl group"
              >
                <ShieldCheck className="w-6 h-6 text-white/20 group-hover:text-neon transition-colors" />
                <span className="text-[10px] font-black tracking-widest uppercase">Updates</span>
              </Button>
              <Button
                variant="outline"
                className="h-28 flex-col gap-3 border-white/5 bg-white/[0.02] hover:bg-red-500/10 rounded-3xl group"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
              >
                <ExternalLink className="w-6 h-6 text-white/20 group-hover:text-red-500 transition-colors" />
                <span className="text-[10px] font-black tracking-widest uppercase">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
