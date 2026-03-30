
export type ModuleStatus = 'ATIVA' | 'EM CONSTRUÇÃO' | 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type SourceType = 'Drive' | 'Manual' | 'IA';
export type UserRole = 'MASTER' | 'USER';

export type SolutionCategory = string; 
export type SolutionSubCategory = string;
export type SolutionDuration = string;
export type SolutionMaturity = string;

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
  is_favorite?: boolean; 
  fee_mensal: string; 
  valor_base_num: number;
  variaveis_opcionais: PriceOption[]; 
  publico_alvo?: string;
  resultado_esperado?: string;
  diferenciais?: string[]; 
  dica_venda: string;
  link?: string;
  entregaveis?: string[];
  tags?: string[];
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
  promessa?: string;
  category?: string;
  subCategory?: string; 
  maturity?: string; 
  targetAudience?: string; 
  expectedResult?: string; 
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
  clientLogo?: string;
  meetingNotesPains?: string;
  meetingNotesDesires?: string;
  observations?: string;
  date: string;
  consultant: string;
  headline?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  installments?: number;
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
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ProposalSections {
  cover: boolean;
  strategicMap: boolean;
  tacticalScope: boolean;
  finalInvestment: boolean;
  backCover: boolean;
}

export interface MonthlyGoal {
  month: string; 
  target: number;
}

export interface SystemConfig {
  categories: string[];
  subCategories: string[];
  durations: string[];
  maturities: string[];
  tags: string[];
  defaultProposalSections: ProposalSections;
  slaThreshold: number; 
  aiModelText: 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
  aiModelImage: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
  aiMaxTokens: number;
  aiThinkingBudget: number;
  geminiApiKey?: string;
  aiSystemInstruction: string; // Prompt mestre do sistema
  aiArchitectInstruction: string; // Prompt do arquiteto de catálogo
  driveFolderId?: string;
  syncJobId?: string;
  enabledModules: string[];
}

export interface AppCustomization {
  companyName: string;
  systemLogoUrl: string;
  proposalLogoUrl: string;
  primaryColor: string;
  config?: SystemConfig; 
}

export interface PlaybookModule {
  id: string;
  category: 'BASE' | 'PRODUTIZACAO' | 'EXECUCAO' | 'SISTEMA' | 'FERRAMENTAS';
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
  subModules?: PlaybookModule[];
}

export type ContentType = 'page' | 'database' | 'template' | 'asset' | 'calculator' | 'script' | 'sla_rule' | 'learning_path' | 'admin' | 'dashboard' | 'fichario' | 'pdf_builder' | 'presentation' | 'copilot' | 'client_management';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  systemInstruction: string;
  architectInstruction?: string;
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget: number;
}

export interface FicharioFolder {
  id: string;
  name: string;
  icon: string;
  file_types: string[];
  is_system?: boolean;
}

export interface FicharioFile {
  id: string; 
  name: string;
  type: string;
  url: string;
  thumbnail: string;
  size: string;
  updatedAt: string;
  virtual_folder_id?: string;
  previewUrl: string;
  downloadUrl: string;
}

export interface ScriptPhase {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  required_keywords: string[];
  checklist: string[];
  duration_sec: number;
  suggestion_templates: string[];
}

export interface ScriptDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  phases: ScriptPhase[];
}

export interface AssistSession {
  id: string;
  client_name: string;
  script_id: string;
  status: 'active' | 'completed' | 'aborted';
  started_at: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: 'seller' | 'client' | 'unknown';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface CopilotState {
  currentPhaseIndex: number;
  checklist: Record<string, boolean>;
  transcript: TranscriptSegment[];
  suggestions: string[];
  isRecording: boolean;
}

// ====== GESTÃO DE CLIENTES ======

export type ClientHealthBadge = 'safe' | 'care' | 'danger';
export type ClientHealthStatus = 'safe' | 'care' | 'danger' | 'churn' | 'implementacao';
export type ClientBrand = 'phant' | 'leadbox' | 'vivemus';
export type ConsciousnessLevel = 'inconsciente' | 'consciente_problema' | 'consciente_solucao' | 'consciente_produto' | 'totalmente_consciente';
export type RiskRating = 'Bom' | 'Normal' | 'Ruim' | 'Implementação' | 'Churn' | '';
export type PlanningStatus = 'follow_up' | 'aguardando' | 'recusado' | 'fechado';

export interface ClientContact {
  name: string;
  email: string;
  phone: string;
}

export interface ClientSquadMember {
  name: string;
  role: string;
}

export interface ClientRiskPillar {
  name: string;
  score: number;
  notes?: string;
}

export interface ClientFinancialMonth {
  month: string;
  value: number;
}

export interface ClientUpsellItem {
  product: string;
  status: 'identified' | 'proposed' | 'negotiating' | 'closed';
  value?: number;
  notes?: string;
}

export interface ClientMilestone {
  title: string;
  due_date: string;
  completed: boolean;
}

export interface ClientRecord {
  id: string;
  company_name: string;
  industry: string;
  location?: string;
  website?: string;
  instagram?: string;
  contact: ClientContact;
  squad: ClientSquadMember[];
  brands: {
    phant: { active: boolean; mrr: number; is_planning: boolean };
    leadbox: { active: boolean; has_propagation: boolean };
    vivemus: { active: boolean; has_consulting: boolean };
  };
  health: ClientHealthBadge;
  health_status: ClientHealthStatus;
  risk_pillars: ClientRiskPillar[];
  risk_resultado: RiskRating;
  risk_entregas: RiskRating;
  risk_relacionamento: RiskRating;
  delivery_score: number;
  churn_status: {
    renewal_date: string;
    contract_months: number;
  };
  mrr: number;
  fee: number;
  contract_model: string;
  squad_name: string;
  ano_fundacao?: string;
  receita_anual?: string;
  num_funcionarios?: string;
  data_entrada?: string;
  data_onboarding?: string;
  contato_trimestre?: string;
  assinatura_date?: string;
  churn_date?: string;
  lt?: number;
  nps?: number;
  ultima_nota?: number;
  recomendacao?: string;
  company_logo?: string;
  cnpj?: string;
  assinatura_descricao?: string;
  forma_pagamento?: string;
  financial_history: ClientFinancialMonth[];
  upsell_pipeline: ClientUpsellItem[];
  consciousness_level: ConsciousnessLevel;
  milestones: ClientMilestone[];
  last_report_date?: string;
  intervention_plan?: string;
  notes?: string;
  status: 'active' | 'churned' | 'onboarding';
  created_at: string;
  updated_at: string;
}

export interface PlanningItem {
  id: string;
  client_name: string;
  account: string;
  produto: string;
  farmer: string;
  milestones_triggers: string;
  consciousness_level: ConsciousnessLevel;
  previsao_entrada: string;
  mrr_value: number;
  one_time_value: number;
  variavel_value: number;
  status: PlanningStatus;
  created_at: string;
  updated_at: string;
}
