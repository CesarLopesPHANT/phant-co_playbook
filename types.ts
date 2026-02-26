
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
  meetingNotesPains?: string;
  meetingNotesDesires?: string;
  observations?: string;
  date: string;
  consultant: string;
  headline?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
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
}

export type ContentType = 'page' | 'database' | 'template' | 'asset' | 'calculator' | 'script' | 'sla_rule' | 'learning_path' | 'admin' | 'dashboard' | 'fichario' | 'pdf_builder' | 'presentation' | 'copilot';

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
