
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
  is_favorite?: boolean; 
  
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
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MonthlyGoal {
  month: string; // Formato "YYYY-MM"
  target: number;
}

export interface AppCustomization {
  companyName: string;
  systemLogoUrl: string;
  proposalLogoUrl: string;
  primaryColor: string;
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
  temperature: number;
  maxOutputTokens: number;
  thinkingBudget: number;
}

// --- FICHARIO TYPES ---

export interface FicharioFolder {
  id: string;
  name: string;
  icon: string;
  file_types: string[];
  is_system?: boolean;
}

export interface FicharioFile {
  id: string; // drive_file_id
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

// --- COPILOT TYPES ---

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
  checklist: Record<string, boolean>; // phaseId_checkIndex -> true
  transcript: TranscriptSegment[];
  suggestions: string[];
  isRecording: boolean;
}
