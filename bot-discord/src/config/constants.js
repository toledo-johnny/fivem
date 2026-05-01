const TICKET_CATEGORIES = [
  {
    key: 'support',
    label: 'Suporte',
    emoji: '\u{1F3AB}',
    description: 'Duvidas gerais, ajuda tecnica e suporte operacional.',
    channelPrefix: 'support'
  },
  {
    key: 'reports',
    label: 'Denuncias',
    emoji: '\u{1F6A8}',
    description: 'Denuncias contra jogadores ou situacoes ocorridas no servidor.',
    channelPrefix: 'report'
  },
  {
    key: 'ban_review',
    label: 'Revisao de banimento',
    emoji: '\u{1F6E1}\uFE0F',
    description: 'Solicitacoes de revisao de punicoes e bloqueios.',
    channelPrefix: 'ban-review'
  },
  {
    key: 'bugs',
    label: 'Bugs',
    emoji: '\u{1F41E}',
    description: 'Relatos tecnicos sobre bugs, falhas e comportamentos anormais.',
    channelPrefix: 'bug'
  },
  {
    key: 'donation_vip',
    label: 'Doacoes e VIP',
    emoji: '\u{1F48E}',
    description: 'Atendimento relacionado a pagamentos, doacoes, VIP e recompensas.',
    channelPrefix: 'vip'
  },
  {
    key: 'staff',
    label: 'Atendimento staff',
    emoji: '\u{1F46E}',
    description: 'Contato direto com a equipe para casos internos ou sensiveis.',
    channelPrefix: 'staff'
  }
];

const LOG_TYPES = [
  { key: 'tickets_created', label: 'Tickets criados' },
  { key: 'tickets_closed', label: 'Tickets fechados' },
  { key: 'tickets_transcripts', label: 'Transcripts de tickets' },
  { key: 'tickets_claimed', label: 'Tickets assumidos' },
  { key: 'tickets_members', label: 'Membros de tickets' },
  { key: 'whitelist_submitted', label: 'Whitelists enviadas' },
  { key: 'whitelist_approved', label: 'Whitelists aprovadas' },
  { key: 'whitelist_rejected', label: 'Whitelists reprovadas' },
  { key: 'admin_commands', label: 'Comandos administrativos' },
  { key: 'errors', label: 'Erros importantes' }
];

const TICKET_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed'
};

const WHITELIST_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const PANEL_TYPES = {
  TICKET: 'ticket',
  WHITELIST: 'whitelist',
  FIVEM_STATUS: 'fivem_status',
  RULES: 'rules',
  FAQ: 'faq',
  CHANGELOG: 'changelog',
  HELP_CENTER: 'help_center'
};

const CONTENT_BLOCK_TYPES = {
  RULES: 'rules',
  FAQ: 'faq',
  CHANGELOG: 'changelog',
  HELP_CENTER: 'help_center'
};

const SYSTEM_JOB_TYPES = {
  FIVEM_STATUS: 'fivem_status_scheduler',
  RECONCILIATION: 'state_reconciliation',
  PAYMENTS_RECONCILIATION: 'payments_reconciliation'
};

const DEFAULT_TICKET_SETTINGS = {
  closeDeletesChannel: true
};

const DEFAULT_WHITELIST_QUESTIONS = [
  {
    key: 'server_id',
    label: 'Qual e o seu ID no servidor?',
    placeholder: 'Ex.: 304',
    style: 'short',
    required: true,
    maxLength: 10
  },
  {
    key: 'character_name',
    label: 'Qual e o nome do seu personagem?',
    placeholder: 'Ex.: Dani Dev',
    style: 'short',
    required: true,
    maxLength: 32
  },
  {
    key: 'character_story',
    label: 'Conte a historia do seu personagem.',
    placeholder: 'Explique a origem, motivacao e objetivo do personagem.',
    style: 'paragraph',
    required: true,
    maxLength: 1000
  },
  {
    key: 'rdm_definition',
    label: 'Explique o que e RDM.',
    placeholder: 'Descreva com suas palavras.',
    style: 'paragraph',
    required: true,
    maxLength: 500
  },
  {
    key: 'vdm_definition',
    label: 'Explique o que e VDM.',
    placeholder: 'Descreva com suas palavras.',
    style: 'paragraph',
    required: true,
    maxLength: 500
  },
  {
    key: 'powergaming_example',
    label: 'Diga um exemplo de Power Gaming.',
    placeholder: 'Mostre que voce entende a regra.',
    style: 'paragraph',
    required: true,
    maxLength: 600
  }
];

const DEFAULT_WHITELIST_SETTINGS = {
  attemptLimit: 3,
  cooldownMinutes: 30,
  allowRetry: true,
  nicknameOnApproval: true,
  nicknameTemplate: '{character_name} | {user_id}',
  questions: DEFAULT_WHITELIST_QUESTIONS
};

const DEFAULT_CONTENT_BLOCKS = {
  [CONTENT_BLOCK_TYPES.RULES]: {
    title: 'Regras principais',
    body:
      '1. Respeite a imersao do servidor.\n2. Evite atitudes que prejudiquem a experiencia coletiva.\n3. Siga as orientacoes da staff e os canais oficiais.'
  },
  [CONTENT_BLOCK_TYPES.FAQ]: {
    title: 'FAQ da comunidade',
    body:
      'Como entrar: conclua a whitelist.\nComo pedir ajuda: use o painel de tickets.\nOnde ver o status do servidor: use /status ou o painel FiveM.'
  },
  [CONTENT_BLOCK_TYPES.CHANGELOG]: {
    title: 'Ultimas atualizacoes',
    body:
      'Registre aqui as atualizacoes do servidor, mudancas de regras, patches e novidades da temporada.'
  },
  [CONTENT_BLOCK_TYPES.HELP_CENTER]: {
    title: 'Central de ajuda',
    body:
      'Use este canal como ponto de entrada para whitelist, tickets, status do servidor e duvidas frequentes.'
  }
};

module.exports = {
  CONTENT_BLOCK_TYPES,
  DEFAULT_CONTENT_BLOCKS,
  DEFAULT_TICKET_SETTINGS,
  DEFAULT_WHITELIST_SETTINGS,
  DEFAULT_WHITELIST_QUESTIONS,
  LOG_TYPES,
  PANEL_TYPES,
  SYSTEM_JOB_TYPES,
  TICKET_CATEGORIES,
  TICKET_STATUS,
  WHITELIST_STATUS
};
