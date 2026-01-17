
export type ModuleStatus = 'ATIVA' | 'EM CONSTRUÇÃO' | 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type SourceType = 'Drive' | 'Manual' | 'IA';
export type UserRole = 'MASTER' | 'USER';

export type SolutionCategory = 'Direção' | 'Propagação' | 'Aceleração';
export type SolutionSubCategory = 'Marca & Cultura' | 'Crescimento (Growth)' | 'Tecnologia' | 'Cursos & Mentorias';
export type SolutionDuration = '30 dias' | '90 dias' | '6 meses' | '12 meses' | 'Recorrente';
export type SolutionMaturity = 'Base' | 'Pro' | 'Advanced';

export interface PriceOption {
  label: string;
  valor: number;
}

export interface SolutionItem {
  id: string | number;
  solucao: string;
  descricao?: string;
  promessa: string;
  categoria: SolutionCategory;
  subcategoria: SolutionSubCategory;
  duracao: SolutionDuration;
  maturidade: SolutionMaturity;
  
  // Precificação
  fee_mensal: string; 
  valor_base_num: number;
  variaveis_opcionais: PriceOption[]; 
  
  publico_alvo?: string;
  resultado_esperado?: string;
  diferenciais?: string[]; 
  dica_venda: string;
  link?: string;
  entregaveis?: string[];
}

export interface ProposalItem {
  instanceId: string; 
  solutionId: string | number;
  name: string;
  basePrice: number;
  selectedOptions: PriceOption[];
  totalPrice: number;
  duration: string;
  description?: string;
  deliverables?: string[];
}

export interface StrategicMapItem {
  current: string;
  desired: string;
}

export interface ProposalMetadata {
  clientName: string;
  industry: string;
  website?: string;
  instagram?: string;
  meetingNotesPains?: string;
  meetingNotesDesires?: string;
  observations?: string;
  date: string;
  consultant: string;
  headline?: string;
}

export interface ProposalRecord {
  id: string;
  client_name: string;
  industry: string;
  total_value: number;
  consultant: string;
  items: ProposalItem[];
  metadata: ProposalMetadata;
  created_at: string;
}

export interface AppCustomization {
  companyName: string;
  systemLogoUrl: string;
  proposalLogoUrl: string;
  primaryColor: string;
}

export interface PlaybookModule {
  id: string;
  category: 'BASE' | 'PRODUTIZACAO' | 'EXECUCAO' | 'SISTEMA';
  title: string;
  description: string;
  status: ModuleStatus;
  version: string;
  source: SourceType;
  type: ContentType;
  icon: string;
  permissions: UserRole[];
  content?: string;
  schema?: string[];
  data?: any[];
}

export type ContentType = 'page' | 'database' | 'template' | 'asset' | 'calculator' | 'script' | 'sla_rule' | 'learning_path' | 'admin' | 'dashboard' | 'fichario' | 'pdf_builder' | 'presentation';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget: number;
}
