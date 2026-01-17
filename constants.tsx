
import { PlaybookModule } from './types';

export const PLAYBOOK_STRUCTURE: PlaybookModule[] = [
  {
    id: 'dashboard',
    category: 'SISTEMA',
    title: 'Meu Dia',
    description: 'Suas recomendações, metas e ritmo comercial hoje.',
    status: 'ATIVA',
    version: '',
    source: 'Manual',
    type: 'dashboard',
    icon: 'home',
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
    id: 'privacy_policy',
    category: 'BASE',
    title: 'Privacidade',
    description: 'Como protegemos seus dados e sua estratégia.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'page',
    icon: 'scripts',
    permissions: ['MASTER', 'USER']
  },
  {
    id: 'terms_of_service',
    category: 'BASE',
    title: 'Termos de Uso',
    description: 'Contrato de utilização da plataforma.',
    status: 'ATIVA',
    version: '1.0',
    source: 'Manual',
    type: 'page',
    icon: 'scripts',
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
    title: 'Gerador de PDF',
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
