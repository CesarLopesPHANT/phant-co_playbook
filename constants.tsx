import { PlaybookModule, ScriptDefinition } from './types';

export const PLAYBOOK_STRUCTURE: PlaybookModule[] = [
  {
    id: 'dashboard',
    category: 'SISTEMA',
    title: 'Meu Dia',
    description: 'Suas atividades recentes, atalhos e o jeito Phant de trabalhar.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'dashboard',
    icon: 'home',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'copilot',
    category: 'FERRAMENTAS',
    title: 'Copiloto Comercial',
    description: 'Assistente de reuniões em tempo real com transcrição e IA.',
    status: 'ATIVA',
    version: 'MVP 1.0',
    source: 'IA',
    type: 'copilot',
    icon: 'mic',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'fichario',
    category: 'SISTEMA',
    title: 'Fichário',
    description: 'Biblioteca central de documentos e materiais de apoio.',
    status: 'ATIVA',
    version: '',
    source: 'Drive',
    type: 'fichario',
    icon: 'solutions',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'cultura',
    category: 'BASE',
    title: 'Nossa Essência',
    description: 'Fundamentos e o jeito PHANT de encantar clientes.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'page',
    icon: 'culture',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'playbook_guia',
    category: 'BASE',
    title: 'O Playbook',
    description: 'Manual de uso, governança e mentalidade comercial.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'page',
    icon: 'scripts',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'treinamento',
    category: 'BASE',
    title: 'Treinamento',
    description: 'Trilhas de aprendizado por área da empresa com acesso por perfil.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'learning_path',
    icon: 'scripts',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'sla_metas',
    category: 'BASE',
    title: 'SLA e Metas',
    description: 'Alinhamento de Marketing, Vendas e Perfil de Cliente Ideal.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'page',
    icon: 'scripts',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'catalogo',
    category: 'PRODUTIZACAO',
    title: 'Minhas Soluções',
    description: 'Catálogo de ofertas pronto para ser apresentado.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'database',
    icon: 'solutions',
    permissions: ['MASTER', 'USER'],
    schema: ['solucao', 'promessa', 'ideal_for', 'dica_venda'],
    data: [] 
  },
  {
    id: 'calculadora',
    category: 'PRODUTIZACAO',
    title: 'Simular Proposta',
    description: 'Construa uma oferta personalizada em poucos cliques.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'calculator',
    icon: 'scripts',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'pdf_builder',
    category: 'PRODUTIZACAO',
    title: 'Gerar Propostas',
    description: 'Crie propostas executivas de alto impacto visual.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'pdf_builder',
    icon: 'share',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'scripts',
    category: 'EXECUCAO',
    title: 'Falas Prontas',
    description: 'Roteiros e quebra de objeções para facilitar seu dia.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'script',
    icon: 'scripts',
    permissions: ['MASTER', 'USER'],
    data: [] 
  },
  {
    id: 'clientes',
    category: 'SISTEMA',
    title: 'Gestão de Clientes',
    description: 'Visão 360° dos seus clientes: saúde, financeiro, risco e expansão.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'client_management',
    icon: 'clients',
    permissions: ['MASTER', 'USER'],
    subModules: [
      {
        id: 'clientes_dashboard',
        category: 'SISTEMA',
        title: 'Dashboard',
        description: 'Painel de indicadores e saúde da carteira.',
        status: 'ATIVA',
        version: '1.0',
        source: 'Manual',
        type: 'client_management',
        icon: 'home',
        permissions: ['MASTER', 'USER']
      },
      {
        id: 'clientes_cadastro',
        category: 'SISTEMA',
        title: 'Cadastro Geral',
        description: 'Base de dados completa dos clientes.',
        status: 'ATIVA',
        version: '1.0',
        source: 'Manual',
        type: 'client_management',
        icon: 'clients',
        permissions: ['MASTER', 'USER']
      },
      {
        id: 'clientes_risco',
        category: 'SISTEMA',
        title: 'Ger. Risco',
        description: 'Gerenciamento de risco e saúde dos clientes.',
        status: 'ATIVA',
        version: '1.0',
        source: 'Manual',
        type: 'client_management',
        icon: 'shield',
        permissions: ['MASTER', 'USER']
      },
      {
        id: 'clientes_planning',
        category: 'SISTEMA',
        title: 'Planning',
        description: 'Pipeline comercial e oportunidades.',
        status: 'ATIVA',
        version: '1.0',
        source: 'Manual',
        type: 'client_management',
        icon: 'target',
        permissions: ['MASTER', 'USER']
      },
      {
        id: 'clientes_backlog',
        category: 'SISTEMA',
        title: 'Backlog Receita',
        description: 'Previsão de receita por período.',
        status: 'ATIVA',
        version: '1.0',
        source: 'Manual',
        type: 'client_management',
        icon: 'chart',
        permissions: ['MASTER', 'USER']
      }
    ]
  },
  {
    id: 'admin',
    category: 'SISTEMA',
    title: 'Configurações',
    description: 'Gestão de chaves API, Google Drive e governança.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'admin',
    icon: 'settings',
    permissions: ['MASTER', 'USER']
  }
];

export const SALES_PERFORMANCE = [
  { date: 'Seg', leads: 40, target: 50 },
  { date: 'Ter', leads: 55, target: 50 },
  { date: 'Qua', leads: 48, target: 50 },
  { date: 'Qui', leads: 62, target: 50 },
  { date: 'Sex', leads: 70, target: 50 },
];

export const SPIN_SCRIPT_V1: ScriptDefinition = {
  id: 'spin-closer-v1',
  name: 'SPIN Selling Closer (Padrão)',
  version: '1.0',
  description: 'Roteiro focado em alto ticket, utilizando metodologia SPIN para ampliar a dor antes da oferta.',
  phases: [
    {
      id: 'abertura',
      name: 'Abertura & Conexão',
      description: 'Estabelecer autoridade e confirmar agenda.',
      objectives: ['Criar rapport rápido', 'Confirmar tempo disponível', 'Definir objetivo da call'],
      required_keywords: ['tempo', 'objetivo', 'apresentar', 'agendar'],
      checklist: [
        'Confirmou se todos os decisores estão presentes?',
        'Confirmou o tempo disponível (45min)?',
        'Fez o "Upfront Contract" (alinhamento de expectativa)?'
      ],
      duration_sec: 300,
      suggestion_templates: [
        'Pergunte: "Existe mais alguém que deveria participar hoje?"',
        'Diga: "Meu objetivo hoje é entender se podemos te ajudar..."'
      ]
    },
    {
      id: 'situacao',
      name: 'Situação (Contexto)',
      description: 'Entender o cenário atual sem entediar o lead.',
      objectives: ['Mapear estrutura atual', 'Entender faturamento/volume'],
      required_keywords: ['hoje', 'atualmente', 'equipe', 'processo'],
      checklist: [
        'Perguntou sobre o faturamento atual?',
        'Entendeu a estrutura de equipe?',
        'Identificou ferramentas já utilizadas?'
      ],
      duration_sec: 420,
      suggestion_templates: [
        'Pergunte: "Como vocês resolvem X hoje?"',
        'Pergunte: "Qual o maior desafio da operação atual?"'
      ]
    },
    {
      id: 'problema',
      name: 'Problema & Implicação',
      description: 'Aprofundar a dor e mostrar o custo da inércia.',
      objectives: ['Identificar gargalo principal', 'Calcular prejuízo financeiro'],
      required_keywords: ['problema', 'perda', 'custo', 'errado', 'falta'],
      checklist: [
        'O cliente verbalizou uma dor clara?',
        'Você explorou o impacto financeiro dessa dor?',
        'Perguntou "O que acontece se nada mudar?"'
      ],
      duration_sec: 600,
      suggestion_templates: [
        'Pergunte: "Quanto dinheiro você deixa na mesa por causa disso?"',
        'Diga: "Parece que isso está travando o crescimento em X%..."'
      ]
    },
    {
      id: 'necessidade',
      name: 'Necessidade de Solução',
      description: 'Fazer o cliente "vender" a solução para si mesmo.',
      objectives: ['Fazer o cliente visualizar o sucesso', 'Validar urgência'],
      required_keywords: ['resolver', 'ideal', 'sonho', 'meta', 'ajudar'],
      checklist: [
        'O cliente disse "Eu preciso disso"?',
        'Validou se resolver isso é prioridade agora?',
        'Perguntou como seria o cenário ideal?'
      ],
      duration_sec: 300,
      suggestion_templates: [
        'Pergunte: "Se você tivesse isso resolvido hoje, qual seria o impacto?"',
        'Pergunte: "Por que resolver isso agora e não mês que vem?"'
      ]
    },
    {
      id: 'oferta',
      name: 'Oferta & Fechamento',
      description: 'Apresentar a solução como a única ponte viável.',
      objectives: ['Apresentar pilares da solução', 'Ancorar preço', 'Pedir o fechamento'],
      required_keywords: ['investimento', 'proposta', 'fechar', 'iniciar', 'pagamento'],
      checklist: [
        'Apresentou os 3 pilares da solução?',
        'Ancorou o valor antes de falar o preço?',
        'Fez uma pergunta de fechamento direto?'
      ],
      duration_sec: 600,
      suggestion_templates: [
        'Diga: "Com base no que você me disse, recomendo o plano..."',
        'Pergunte: "Faz sentido iniciarmos esse movimento essa semana?"'
      ]
    }
  ]
};