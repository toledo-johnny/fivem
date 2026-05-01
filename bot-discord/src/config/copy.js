const COPY = {
  common: {
    notConfigured: 'Nao configurado',
    notInformed: 'Nao informado',
    published: 'Publicado',
    pending: 'Pendente',
    healthy: 'OK',
    saveSuccess: 'Alteracoes salvas com sucesso.',
    accessDeniedTitle: 'Acesso negado',
    accessDeniedDescription:
      'Voce precisa de permissao administrativa ou do cargo principal de staff configurado.',
    genericErrorTitle: 'Acao nao concluida',
    genericErrorDescription:
      'Ocorreu um erro inesperado ao processar esta interacao.',
    permissionCheckTitle: 'Permissoes do bot',
    permissionCheckDescription:
      'O bot precisa de acesso adequado ao canal, categoria e cargos selecionados.'
  },
  admin: {
    setupTitle: 'Central administrativa pronta',
    setupDescription:
      'A base do bot foi validada. Use os comandos de setup para publicar paineis, conectar canais e finalizar a operacao do servidor.',
    statusTitle: 'Saude do bot',
    statusDescription:
      'Resumo operacional do bot, da API, dos paineis carregados e dos pontos principais de configuracao.',
    ticketConfigTitle: 'Configuracao de tickets',
    whitelistConfigTitle: 'Configuracao de whitelist',
    fivemConfigTitle: 'Configuracao de status FiveM',
    onboardingConfigTitle: 'Configuracao de onboarding',
    logUpdateTitle: 'Canal de log atualizado',
    setupTicketSuccess: 'Painel de tickets publicado',
    setupWhitelistSuccess: 'Painel de whitelist publicado',
    setupStatusSuccess: 'Painel de status publicado',
    setupOnboardingSuccess: 'Paineis de onboarding publicados'
  },
  tickets: {
    panelTitle: 'Central de atendimento',
    panelDescription:
      'Selecione o assunto do atendimento. O bot vai abrir um canal privado e encaminhar a equipe responsavel.',
    panelFooter:
      'Use o canal criado apenas para o tema selecionado e envie as informacoes com objetividade.',
    openDescription:
      'Explique o caso com clareza para agilizar o atendimento da equipe.',
    claimNotice: (user) => `${user} assumiu este atendimento.`,
    claimReply: (ticketId) => `Voce assumiu o ticket #${ticketId} com sucesso.`,
    createdReply: (categoryLabel, channel) =>
      `Seu ticket de **${categoryLabel}** foi criado em ${channel}.`,
    ownerClosedTitle: 'Atendimento finalizado',
    ownerClosedDescription: (ticketId, closer) =>
      `O ticket #${ticketId} foi finalizado por ${closer}.`,
    transcriptTitle: 'Transcript do ticket',
    transcriptDescription: (ticketId, closer) =>
      `Transcript do ticket #${ticketId}, finalizado por ${closer}.`
  },
  whitelist: {
    panelTitle: 'Central de whitelist',
    panelDescription:
      'Inicie sua whitelist para enviar as respostas da analise inicial do servidor.',
    panelFlow:
      '1. Inicie o processo.\n2. Responda com atencao.\n3. Aguarde a revisao da staff.',
    panelHint: 'Tenha seu ID do servidor e o nome do personagem em maos.',
    pendingTitle: 'Nova whitelist pendente',
    pendingDescription: (user) => `${user} enviou uma whitelist para analise.`,
    pendingReply:
      'Sua whitelist foi enviada com sucesso e agora esta aguardando a analise da staff.',
    pageSaved:
      'Suas respostas foram salvas. Use o botao abaixo para continuar o formulario.',
    approvedDmTitle: 'Whitelist aprovada',
    approvedDmDescription: (reviewer) =>
      `Sua whitelist foi aprovada por ${reviewer}. Voce ja pode acessar o servidor.`,
    rejectedDmTitle: 'Whitelist reprovada',
    rejectedDmDescription: (reviewer) =>
      `Sua whitelist foi reprovada por ${reviewer}. Revise o motivo e tente novamente quando permitido.`,
    approvedLogTitle: 'Whitelist aprovada',
    rejectedLogTitle: 'Whitelist reprovada'
  },
  onboarding: {
    rulesTitle: 'Regras do servidor',
    faqTitle: 'Perguntas frequentes',
    changelogTitle: 'Changelog do servidor',
    helpCenterTitle: 'Central de ajuda',
    helpCommandTitle: 'Atalhos do servidor',
    helpCommandDescription:
      'Aqui voce encontra os caminhos principais para status, whitelist, tickets e onboarding.',
    announceTitle: 'Comunicado',
    announceTypes: {
      announcement: 'Comunicado',
      update: 'Atualizacao',
      emergency: 'Aviso urgente'
    }
  },
  fivem: {
    statusTitle: 'Status FiveM',
    configuredOnline: 'Painel automatico do servidor FiveM.',
    configuredOffline: 'Servidor configurado, mas sem resposta no momento.',
    notConfigured: 'Modulo FiveM ainda nao configurado no .env.',
    connectLabel: 'IP FiveM / Connect',
    updateLine: (minutes, updatedAt) =>
      `Atualizado a cada ${minutes} minuto${minutes === 1 ? '' : 's'} | Ultima atualizacao: ${updatedAt}`,
    buttonLabel: 'Conectar FiveM'
  },
  api: {
    authUnavailable: 'Autenticacao OAuth do Discord ainda nao configurada.',
    unauthorized: 'Sessao invalida ou expirada.',
    forbidden: 'Seu usuario nao possui acesso ao dashboard.'
  }
};

module.exports = {
  COPY
};
