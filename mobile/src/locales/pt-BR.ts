export const ptBR = {
  // Autenticação
  auth: {
    login: 'Entrar',
    logout: 'Sair',
    username: 'Usuário',
    password: 'Senha',
    loginFailed: 'Falha no login',
    invalidCredentials: 'Usuário ou senha inválidos',
    welcomeBack: 'Bem-vindo de volta',
    signOut: 'Desconectar',
    signOutConfirm: 'Tem certeza que deseja sair?',
    cancel: 'Cancelar',
  },

  // Dashboard
  dashboard: {
    title: 'Engefil Connect',
    welcomeBack: 'Bem-vindo de volta,',
    noStations: 'Nenhum Posto Encontrado',
    noStationsAdmin: 'Nenhum posto foi criado ainda.',
    noStationsClient: 'Você ainda não tem acesso a nenhum posto.',
    refresh: 'Atualizar',
    lastUpdated: 'Última atualização:',
    factory: '🏭 Fábrica',
    panels: 'painel',
    panelsPlural: 'painéis',
    lastSync: 'Última sincronização:',
    currentPrices: 'Preços Atuais:',
    online: 'Online',
    offline: 'Offline',
    never: 'Nunca',
  },

  // Estação
  station: {
    details: 'Detalhes do Posto',
    status: 'Status',
    location: 'Localização',
    panels: 'Painéis LED',
    updatePrices: 'Atualizar Preços',
    lastUpdate: 'Última Atualização',
    noLocation: 'Localização não informada',
    noPanels: 'Nenhum painel configurado',
  },

  // Preços
  prices: {
    regular: 'Comum',
    premium: 'Aditivada',
    diesel: 'Diesel',
    update: 'Atualizar Preços',
    updating: 'Atualizando...',
    updateSuccess: 'Preços atualizados com sucesso!',
    updateError: 'Erro ao atualizar preços',
    invalidPrice: 'Preço inválido',
    priceRequired: 'Preço obrigatório',
    priceMin: 'Preço deve ser maior que R$ 0,00',
    priceMax: 'Preço deve ser menor que R$ 99,99',
    currency: 'R$',
  },

  // Provisionamento de Fábrica
  factory: {
    title: '🏭 Provisionamento de Fábrica',
    step1: 'Informações do Cliente',
    step2: 'Configuração de Locais',
    step3: 'Finalizar Provisionamento',
    
    // Informações do Cliente
    companyName: 'Nome da Empresa *',
    contactName: 'Nome do Contato',
    email: 'E-mail',
    phone: 'Telefone',
    address: 'Endereço',
    itemsPurchased: 'Itens Comprados',
    
    // Locais
    locationSetup: 'Configuração de Locais',
    location: 'Local',
    stationName: 'Nome do Posto *',
    stationAddress: 'Endereço do Posto',
    addLocation: '+ Adicionar Outro Local',
    
    // Dispositivos
    mikrotikDevice: 'Dispositivo MikroTik',
    huiduDevice: 'Dispositivo Huidu',
    serialNumber: 'Número de Série *',
    macAddress: 'Endereço MAC *',
    
    // Navegação
    next: 'Próximo',
    back: 'Voltar',
    testDevices: 'Testar Dispositivos',
    completeProvisioning: 'Finalizar Provisionamento',
    
    // Resumo
    summary: 'Resumo:',
    company: 'Empresa:',
    locations: 'Locais:',
    totalDevices: 'Total de Dispositivos:',
    readyToProvision: 'Pronto para provisionar',
    
    // Mensagens
    testing: 'Testando dispositivos...',
    provisioning: 'Provisionando...',
    deviceTestSuccess: 'Todos os dispositivos testados com sucesso!',
    deviceTestFailed: 'Falha no teste dos dispositivos',
    provisioningComplete: 'Provisionamento Concluído!',
    clientCreated: 'Cliente criado com sucesso!',
    username: 'Usuário:',
    password: 'Senha:',
    provisioningFailed: 'Falha no provisionamento',
    
    // Notas
    deviceNote: 'Cada local requer um roteador MikroTik e um controlador Huidu LED',
    multiLocationNote: 'Sistema multi-local - adicione quantos locais precisar',
  },

  // Geral
  common: {
    ok: 'OK',
    cancel: 'Cancelar',
    save: 'Salvar',
    delete: 'Excluir',
    edit: 'Editar',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    warning: 'Aviso',
    info: 'Informação',
    yes: 'Sim',
    no: 'Não',
    required: 'Obrigatório',
    optional: 'Opcional',
    name: 'Nome',
    description: 'Descrição',
    status: 'Status',
    active: 'Ativo',
    inactive: 'Inativo',
    online: 'Online',
    offline: 'Offline',
    connected: 'Conectado',
    disconnected: 'Desconectado',
  },

  // Erros
  errors: {
    networkError: 'Erro de conexão',
    serverError: 'Erro do servidor',
    unknownError: 'Erro desconhecido',
    validationError: 'Erro de validação',
    authError: 'Erro de autenticação',
    notFound: 'Não encontrado',
    forbidden: 'Acesso negado',
    timeout: 'Tempo limite excedido',
    offline: 'Sem conexão com a internet',
  },

  // Status
  status: {
    connecting: 'Conectando...',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    syncing: 'Sincronizando...',
    synced: 'Sincronizado',
    error: 'Erro',
    pending: 'Pendente',
    processing: 'Processando...',
    completed: 'Concluído',
    failed: 'Falhou',
  },
};