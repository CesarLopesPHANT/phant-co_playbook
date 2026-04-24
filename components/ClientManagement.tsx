
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ClientRecord, ClientHealthBadge, ClientHealthStatus, ConsciousnessLevel, UserRole, PlanningItem, PlanningStatus, RiskRating, AppCustomization } from '../types';
import { SupabaseService } from '../services/api';

type BrandKey = 'phant' | 'leadbox' | 'vivemus';
type ImportRow = Omit<ClientRecord, 'id' | 'created_at' | 'updated_at'> & { __error?: string; __duplicate?: string };

// Normalização para detecção de duplicidade
const normName = (s?: string) => (s || '').toString().toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(ltda|me|eireli|s\.?a\.?|epp|mei)\b/gi, '')
  .replace(/[^a-z0-9]+/g, '');
const normCnpj = (s?: string) => (s || '').toString().replace(/\D/g, '');

// ====== PROPS ======
interface ClientManagementProps {
  currentRole: UserRole;
  initialView?: 'dashboard' | 'cadastro' | 'risco' | 'planning' | 'backlog';
  appConfig?: AppCustomization;
}

// ====== CONSTANTS ======
const EMPTY_CLIENT: Omit<ClientRecord, 'id' | 'created_at' | 'updated_at'> = {
  company_name: '', industry: '', location: '', website: '', instagram: '',
  contact: { name: '', email: '', phone: '' }, squad: [],
  brands: { phant: { active: false, mrr: 0, is_planning: false }, leadbox: { active: false, has_propagation: false }, vivemus: { active: false, has_consulting: false } },
  health: 'care', health_status: 'care',
  risk_pillars: [{ name: 'Resultado', score: 5 }, { name: 'Entregas', score: 5 }, { name: 'Relacionamento', score: 5 }],
  risk_resultado: '', risk_entregas: '', risk_relacionamento: '',
  delivery_score: 5, churn_status: { renewal_date: '', contract_months: 12 },
  mrr: 0, fee: 0, contract_model: 'Growth', squad_name: '',
  ano_fundacao: '', receita_anual: '', num_funcionarios: '', data_entrada: '', data_onboarding: '',
  contato_trimestre: '', assinatura_date: '', churn_date: '',
  lt: undefined, nps: undefined, ultima_nota: undefined, recomendacao: '', company_logo: '',
  cnpj: '', assinatura_descricao: '', forma_pagamento: '',
  financial_history: [], upsell_pipeline: [], consciousness_level: 'inconsciente',
  milestones: [], last_report_date: undefined, intervention_plan: '', notes: '', status: 'active'
};

const EMPTY_PLANNING: Omit<PlanningItem, 'id' | 'created_at' | 'updated_at'> = {
  client_name: '', account: '', produto: '', farmer: '', milestones_triggers: '',
  consciousness_level: 'inconsciente', previsao_entrada: '',
  mrr_value: 0, one_time_value: 0, variavel_value: 0, status: 'aguardando'
};

const INDUSTRIES = ['Varejo', 'Construtora', 'Construção', 'Educacao', 'Escola de Idiomas', 'Saude', 'Saúde/Clinica', 'Tecnologia', 'Alimentacao', 'Servicos', 'Industria', 'Energia Solar', 'Comunicação Visual', 'Contabilidade', 'Sistemas/ Software\'s', 'Movelaria', 'Psicologia', 'Esquadrias/Vidraçaria', 'Papelaria', 'Gestão Tributaria', 'Barbearia', 'Outro'];
const CONTRACT_MODELS = ['Growth', 'Social', 'One Time'];
const SQUAD_OPTIONS = ['Thiago', 'João', 'Mary', 'Squad 2', '-'];
const NUM_FUNC_OPTIONS = ['1-10', '11-50', '51-200', '200+'];
const RISK_OPTIONS: RiskRating[] = ['Bom', 'Normal', 'Ruim', 'Implementação', 'Churn'];

const CONSCIOUSNESS_LABELS: Record<ConsciousnessLevel, string> = {
  inconsciente: 'Inconsciente do Problema', consciente_problema: 'Consciente do Problema',
  consciente_solucao: 'Consciente da Solução', consciente_produto: 'Consciente do Produto',
  totalmente_consciente: 'Totalmente Consciente'
};
const CONSCIOUSNESS_SHORT: Record<ConsciousnessLevel, string> = {
  inconsciente: 'Inconsciente', consciente_problema: 'Consc. Problema',
  consciente_solucao: 'Consc. Solução', consciente_produto: 'Consc. Produto',
  totalmente_consciente: 'Tot. Consciente'
};
const PLANNING_STATUS_LABELS: Record<PlanningStatus, string> = {
  follow_up: 'Follow-UP', aguardando: 'Aguardando...', recusado: 'Recusado', fechado: 'Fechado'
};
const PLANNING_STATUS_COLORS: Record<PlanningStatus, string> = {
  follow_up: 'bg-blue-100 text-blue-700 border-blue-200',
  aguardando: 'bg-gray-100 text-gray-500 border-gray-200',
  recusado: 'bg-red-100 text-red-700 border-red-200',
  fechado: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};
const HEALTH_STATUS_CONFIG: Record<ClientHealthStatus, { label: string; dot: string; bg: string; text: string }> = {
  safe: { label: 'Safe', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  care: { label: 'Care', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  danger: { label: 'Danger', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  churn: { label: 'Churn', dot: 'bg-red-700', bg: 'bg-red-100', text: 'text-red-900' },
  implementacao: { label: 'Impl.', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-600' }
};
const RISK_COLORS: Record<string, string> = {
  'Bom': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Normal': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ruim': 'bg-red-50 text-red-700 border-red-200',
  'Implementação': 'bg-amber-50 text-amber-600 border-amber-200',
  'Churn': 'bg-red-100 text-red-800 border-red-300',
  '': 'bg-gray-50 text-gray-300 border-gray-100'
};

// ====== HELPERS ======
const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const fmtDate = (d?: string) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; } };
const daysBetween = (d?: string) => { if (!d) return 0; return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); };

const MONTH_ORDER = ['janeiro','fevereiro','marco','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const monthIndex = (s: string) => {
  const norm = (s || '').toLowerCase().trim();
  const idx = MONTH_ORDER.findIndex(m => norm.startsWith(m));
  return idx === -1 ? 99 : idx;
};

// ====== MICRO COMPONENTS ======
// ====== BRAND LOGO URLs (fallback — sobrescrito pela config em Configurações > Clientes > Marcas) ======
const DEFAULT_BRAND_LOGOS: Record<string, string> = {
  phant: 'https://phant.com.br/uploads/simbolo_roxo.png',
  leadbox: 'https://phant.com.br/uploads/192x192_20260210_054010_7be369d9.png',
  vivemus: 'https://phant.com.br/uploads/foto_perfil_20260228_231237_ee6c4fb3.png',
};

// ====== BRAND INLINE BADGES (ao lado do nome no dashboard) ======
const PhantTag: React.FC<{ brands?: ClientRecord['brands']; logos?: Record<string, string> }> = ({ brands, logos }) => {
  const items = [
    { active: brands?.phant?.active, logo: logos?.phant, title: 'Phant', letter: 'P', color: 'bg-purple-600' },
    { active: brands?.leadbox?.active, logo: logos?.leadbox, title: 'Leadbox', letter: 'L', color: 'bg-blue-600' },
    { active: brands?.vivemus?.active, logo: logos?.vivemus, title: 'Vivemus', letter: 'V', color: 'bg-emerald-600' },
  ];
  const activeItems = items.filter(d => d.active);
  if (activeItems.length === 0) return null;
  return (
    <>
      {activeItems.map(d => (
        d.logo ? (
          <img key={d.title} src={d.logo} alt={d.title} title={d.title} className="inline-block w-[18px] h-[18px] object-contain shrink-0 align-middle ml-1.5 rounded-full" />
        ) : (
          <span key={d.title} title={d.title} className={`inline-flex w-[18px] h-[18px] ${d.color} rounded-full items-center justify-center shrink-0 align-middle ml-1.5`}>
            <span className="text-[8px] font-black text-white leading-none">{d.letter}</span>
          </span>
        )
      ))}
    </>
  );
};

// ====== BRAND BADGES (logos na coluna Marca com sobreposição) ======
const BrandDots: React.FC<{ brands: ClientRecord['brands']; companyLogo?: string; companyName?: string; logos?: Record<string, string> }> = ({ brands, companyLogo, companyName, logos: brandLogoUrls }) => {
  const items = [
    { active: brands?.phant?.active, logo: brandLogoUrls?.phant, title: 'Phant', letter: 'P', color: 'bg-purple-600' },
    { active: brands?.leadbox?.active, logo: brandLogoUrls?.leadbox, title: 'Leadbox', letter: 'L', color: 'bg-blue-600' },
    { active: brands?.vivemus?.active, logo: brandLogoUrls?.vivemus, title: 'Vivemus', letter: 'V', color: 'bg-emerald-600' },
  ];
  const activeItems = items.filter(d => d.active);

  // Monta array: company_logo primeiro, depois marcas ativas
  const stack: { src?: string; title: string; isCompany?: boolean; letter: string; color: string }[] = [];
  if (companyLogo) {
    stack.push({ src: companyLogo, title: companyName || 'Empresa', isCompany: true, letter: (companyName || 'E').charAt(0), color: 'bg-gray-600' });
  }
  activeItems.forEach(d => stack.push({ src: d.logo, title: d.title, letter: d.letter, color: d.color }));

  if (stack.length === 0) return <span className="text-[10px] text-gray-300">-</span>;

  return (
    <div className="flex items-center" style={{ minWidth: `${28 + (stack.length - 1) * 18}px` }}>
      {stack.map((d, i) => (
        d.src ? (
          <img
            key={d.title}
            src={d.src}
            alt={d.title}
            title={d.title}
            className={`w-7 h-7 object-contain rounded-full border-2 border-white shadow-sm ${d.isCompany ? 'ring-1 ring-gray-200' : ''}`}
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: stack.length - i, position: 'relative' }}
          />
        ) : (
          <span
            key={d.title}
            title={d.title}
            className={`w-7 h-7 ${d.color} rounded-full flex items-center justify-center border-2 border-white shadow-sm`}
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: stack.length - i, position: 'relative' }}
          >
            <span className="text-[9px] font-black text-white leading-none">{d.letter}</span>
          </span>
        )
      ))}
    </div>
  );
};

const StatusBadge: React.FC<{ status: ClientHealthStatus; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const c = HEALTH_STATUS_CONFIG[status] || HEALTH_STATUS_CONFIG.care;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider border ${c.bg} ${c.text} whitespace-nowrap ${size === 'md' ? 'px-3.5 py-1.5 text-[9px]' : 'px-2.5 py-1 text-[8px]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
};

const RiskBadge: React.FC<{ rating: RiskRating }> = ({ rating }) => {
  if (!rating) return <span className="text-[10px] text-gray-300 italic">-</span>;
  return <span className={`inline-flex px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${RISK_COLORS[rating] || RISK_COLORS['']}`}>{rating}</span>;
};

const KpiCard: React.FC<{ label: string; value: string | number; sub?: string; accent?: string }> = ({ label, value, sub, accent }) => (
  <div className="p-6 bg-white rounded-[24px] border border-gray-100 hover:shadow-md transition-shadow">
    <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.15em] block mb-2">{label}</span>
    <span className={`text-2xl font-black tracking-tight ${accent || 'text-gray-900'}`}>{value}</span>
    {sub && <span className="text-[10px] font-bold text-gray-400 block mt-1">{sub}</span>}
  </div>
);

const PageHeader: React.FC<{ title: string; subtitle: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{title}</h1>
      <p className="text-gray-400 text-sm font-medium mt-1.5">{subtitle}</p>
    </div>
    {children && <div className="flex gap-3 items-center flex-wrap">{children}</div>}
  </header>
);

const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <input type="text" placeholder={placeholder || 'Buscar...'} value={value} onChange={e => onChange(e.target.value)}
      className="pl-10 pr-5 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-black/5 w-64 transition-all" />
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
  </div>
);

const BtnPrimary: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ onClick, children, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand transition-all disabled:opacity-40">
    {children}
  </button>
);

const BtnSecondary: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button onClick={onClick}
    className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-black hover:text-white transition-all">
    {children}
  </button>
);

const TrendChart: React.FC<{ data: { month: string; value: number }[] }> = ({ data }) => {
  if (data.length === 0) return <span className="text-[10px] text-gray-300 font-bold italic">Sem dados</span>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const w = 180, h = 50, p = 4;
  const pts = data.map((d, i) => `${p + (i / Math.max(data.length - 1, 1)) * (w - p * 2)},${h - p - (d.value / maxVal) * (h - p * 2)}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {data.map((d, i) => {
        const x = p + (i / Math.max(data.length - 1, 1)) * (w - p * 2);
        const y = h - p - (d.value / maxVal) * (h - p * 2);
        return <circle key={i} cx={x} cy={y} r="3" fill="#2563eb" />;
      })}
    </svg>
  );
};

const InputField: React.FC<{ value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; label?: string; className?: string }> = ({ value, onChange, placeholder, type = 'text', label, className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="px-4 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black transition-colors" />
  </div>
);

const SelectField: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; label?: string }> = ({ value, onChange, options, placeholder, label }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-4 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black cursor-pointer transition-colors">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[9px] font-black text-gray-300 uppercase tracking-[0.15em]">{children}</h3>
);

// ====== TABLE CELL STYLING ======
const th = "px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap";
const td = "px-4 py-3.5 text-[11px] font-medium text-gray-600";
const tdBold = "px-4 py-3.5 text-[11px] font-black text-gray-900";
const trHover = "border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors";

// ====== MAIN COMPONENT ======
const ClientManagement: React.FC<ClientManagementProps> = ({ currentRole, initialView = 'dashboard', appConfig }) => {
  const dynamicSquadOptions = useMemo(() => {
    const configSquads = (appConfig as any)?.clientConfig?.squads;
    return configSquads && configSquads.length > 0 ? [...configSquads, '-'] : SQUAD_OPTIONS;
  }, [appConfig]);

  // Resolve brand logos from config (AdminSettings > Clientes > Marcas)
  const brandLogos = useMemo(() => {
    const cfg = (appConfig as any)?.clientConfig?.brandLogos;
    return {
      phant: cfg?.phant?.logoUrl || DEFAULT_BRAND_LOGOS.phant,
      leadbox: cfg?.leadbox?.logoUrl || DEFAULT_BRAND_LOGOS.leadbox,
      vivemus: cfg?.vivemus?.logoUrl || DEFAULT_BRAND_LOGOS.vivemus,
    };
  }, [appConfig]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [planning, setPlanning] = useState<PlanningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<string>(initialView);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(EMPTY_CLIENT);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<PlanningItem | null>(null);
  const [planningForm, setPlanningForm] = useState<any>(EMPTY_PLANNING);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [brandFilter, setBrandFilter] = useState<Set<BrandKey | 'none'>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'churned' | 'inactive'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileChoices, setReconcileChoices] = useState<Record<string, { keepId: string; mergeFields: boolean }>>({});
  const [reconcileProgress, setReconcileProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null);
  const [manualGroups, setManualGroups] = useState<{ key: string; ids: string[] }[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, p] = await Promise.all([SupabaseService.fetchClients(), SupabaseService.fetchPlanning()]);
      setClients(c); setPlanning(p);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (view !== 'detail') setView(initialView); }, [initialView]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC fecha modais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showNewForm || isEditing) { setShowNewForm(false); setIsEditing(false); }
      if (showPlanningForm) { setShowPlanningForm(false); setEditingPlanning(null); setPlanningForm(EMPTY_PLANNING); }
      if (showImportModal && !(importProgress && importProgress.done < importProgress.total)) {
        setShowImportModal(false); resetImport();
      }
      if (showReconcileModal && !(reconcileProgress && reconcileProgress.done < reconcileProgress.total)) {
        setShowReconcileModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNewForm, isEditing, showPlanningForm, showImportModal, importProgress, showReconcileModal, reconcileProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ====== METRICS ======
  const metrics = useMemo(() => {
    const active = clients.filter(c => c.status === 'active');
    const totalMRR = active.reduce((s, c) => s + (c.mrr || 0), 0);
    const danger = active.filter(c => c.health === 'danger');
    const care = active.filter(c => c.health === 'care');
    const safe = active.filter(c => c.health === 'safe');
    const churn = clients.filter(c => c.health_status === 'churn' || c.status === 'churned');
    const impl = clients.filter(c => c.health_status === 'implementacao');
    const silent = active.filter(c => {
      // grace period: clientes que entraram há menos de 30 dias não disparam alerta
      if (c.data_entrada && daysBetween(c.data_entrada) > -30) return false;
      if (!c.last_report_date) return true;
      return daysBetween(c.last_report_date) < -30;
    });
    const lts = active.filter(c => c.lt);
    const avgLT = lts.length > 0 ? lts.reduce((s, c) => s + (c.lt || 0), 0) / lts.length : 0;
    const mrrBySquad: Record<string, number> = {};
    active.forEach(c => { const sq = c.squad_name || 'Sem Squad'; mrrBySquad[sq] = (mrrBySquad[sq] || 0) + (c.mrr || 0); });
    // Brand counts (all clients, not just active)
    const brandPhant = clients.filter(c => c.brands?.phant?.active);
    const brandLeadbox = clients.filter(c => c.brands?.leadbox?.active);
    const brandVivemus = clients.filter(c => c.brands?.vivemus?.active);
    const brandPhantActive = active.filter(c => c.brands?.phant?.active);
    const brandLeadboxActive = active.filter(c => c.brands?.leadbox?.active);
    const brandVivemusActive = active.filter(c => c.brands?.vivemus?.active);
    const mrrPhant = brandPhantActive.reduce((s, c) => s + (c.mrr || 0), 0);
    const mrrLeadbox = brandLeadboxActive.reduce((s, c) => s + (c.mrr || 0), 0);
    const mrrVivemus = brandVivemusActive.reduce((s, c) => s + (c.mrr || 0), 0);
    return { totalMRR, danger, care, safe, churn, impl, active, silent, avgLT, mrrBySquad, brandPhant, brandLeadbox, brandVivemus, brandPhantActive, brandLeadboxActive, brandVivemusActive, mrrPhant, mrrLeadbox, mrrVivemus };
  }, [clients]);

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return clients.filter(c => {
      // filtro de status do contrato
      if (statusFilter !== 'all') {
        const s = c.status || 'active';
        if (statusFilter === 'active' && s !== 'active') return false;
        if (statusFilter === 'churned' && s !== 'churned') return false;
        if (statusFilter === 'inactive' && s !== 'inactive') return false;
      }
      // filtro por marca (união — OR entre marcas selecionadas)
      if (brandFilter.size > 0) {
        const hasNone = !c.brands?.phant?.active && !c.brands?.leadbox?.active && !c.brands?.vivemus?.active;
        const matches =
          (brandFilter.has('phant') && c.brands?.phant?.active) ||
          (brandFilter.has('leadbox') && c.brands?.leadbox?.active) ||
          (brandFilter.has('vivemus') && c.brands?.vivemus?.active) ||
          (brandFilter.has('none') && hasNone);
        if (!matches) return false;
      }
      // busca textual
      if (t) {
        const haystack = [
          c.company_name, c.contact?.name, c.contact?.email, c.contact?.phone,
          c.industry, c.squad_name, c.location, c.cnpj, c.website,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(t)) return false;
      }
      return true;
    });
  }, [clients, searchTerm, brandFilter, statusFilter]);

  // Índice de duplicidade (nome normalizado e CNPJ)
  const dedupIndex = useMemo(() => {
    const byName = new Map<string, ClientRecord>();
    const byCnpj = new Map<string, ClientRecord>();
    clients.forEach(c => {
      const n = normName(c.company_name);
      if (n) byName.set(n, c);
      const cn = normCnpj(c.cnpj);
      if (cn) byCnpj.set(cn, c);
    });
    return { byName, byCnpj };
  }, [clients]);

  const findDuplicate = (name?: string, cnpj?: string, excludeId?: string): ClientRecord | null => {
    const cn = normCnpj(cnpj);
    if (cn && cn.length >= 8) {
      const hit = dedupIndex.byCnpj.get(cn);
      if (hit && hit.id !== excludeId) return hit;
    }
    const n = normName(name);
    if (n && n.length >= 3) {
      const hit = dedupIndex.byName.get(n);
      if (hit && hit.id !== excludeId) return hit;
    }
    return null;
  };

  // Grupos de duplicatas no banco (por nome normalizado ou CNPJ)
  const duplicateGroups = useMemo(() => {
    const groupMap = new Map<string, ClientRecord[]>();
    const assigned = new Map<string, string>(); // clientId -> groupKey

    const assign = (c: ClientRecord, key: string) => {
      const existingKey = assigned.get(c.id);
      if (existingKey && existingKey !== key) {
        // já está em outro grupo: funde os dois grupos usando o key existente
        const merged = groupMap.get(existingKey) || [];
        const current = groupMap.get(key) || [];
        current.forEach(x => { if (!merged.some(m => m.id === x.id)) merged.push(x); });
        groupMap.set(existingKey, merged);
        groupMap.delete(key);
        current.forEach(x => assigned.set(x.id, existingKey));
        return;
      }
      assigned.set(c.id, key);
      const arr = groupMap.get(key) || [];
      if (!arr.some(x => x.id === c.id)) arr.push(c);
      groupMap.set(key, arr);
    };

    // Agrupa por CNPJ primeiro (mais confiável)
    const cnpjBuckets = new Map<string, ClientRecord[]>();
    clients.forEach(c => {
      const cn = normCnpj(c.cnpj);
      if (cn && cn.length >= 8) {
        const arr = cnpjBuckets.get(cn) || [];
        arr.push(c); cnpjBuckets.set(cn, arr);
      }
    });
    cnpjBuckets.forEach((arr, key) => {
      if (arr.length > 1) arr.forEach(c => assign(c, `cnpj:${key}`));
    });

    // Depois por nome
    const nameBuckets = new Map<string, ClientRecord[]>();
    clients.forEach(c => {
      const n = normName(c.company_name);
      if (n && n.length >= 3) {
        const arr = nameBuckets.get(n) || [];
        arr.push(c); nameBuckets.set(n, arr);
      }
    });
    nameBuckets.forEach((arr, key) => {
      if (arr.length > 1) arr.forEach(c => assign(c, `name:${key}`));
    });

    // Retorna só grupos com 2+ clientes
    return Array.from(groupMap.entries())
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({
        key,
        reason: (key.startsWith('cnpj:') ? 'CNPJ idêntico' : 'Nome equivalente') as string,
        manual: false,
        clients: arr.sort((a, b) => {
          // Ordena por completude (mais campos preenchidos primeiro) e data
          const score = (c: ClientRecord) => {
            let s = 0;
            if (c.cnpj) s += 3; if (c.mrr) s += 2; if (c.fee) s += 1;
            if (c.contact?.email) s += 1; if (c.contact?.phone) s += 1;
            if (c.squad_name) s += 1; if (c.industry) s += 1;
            if (c.data_entrada) s += 1; if (c.company_logo) s += 1;
            return s;
          };
          const diff = score(b) - score(a);
          if (diff !== 0) return diff;
          return (b.updated_at || '').localeCompare(a.updated_at || '');
        }),
      }));
  }, [clients]);

  // Combina grupos automáticos + manuais (dedup por ID — grupos manuais sobrepostos são ignorados)
  const allGroups = useMemo(() => {
    const byId = new Map<string, ClientRecord>();
    clients.forEach(c => byId.set(c.id, c));
    const autoIds = new Set<string>();
    duplicateGroups.forEach(g => g.clients.forEach(c => autoIds.add(c.id)));
    const manual = manualGroups
      .map(mg => {
        const arr = mg.ids.map(id => byId.get(id)).filter((x): x is ClientRecord => !!x);
        // filtra IDs que já estão em grupo auto, pra evitar conflito
        const filtered = arr.filter(c => !autoIds.has(c.id));
        return { key: mg.key, reason: 'Marcado manualmente', manual: true as const, clients: filtered };
      })
      .filter(g => g.clients.length >= 2);
    return [...duplicateGroups, ...manual];
  }, [duplicateGroups, manualGroups, clients]);

  // Inicializa escolhas quando grupos mudam
  useEffect(() => {
    setReconcileChoices(prev => {
      const next: typeof prev = {};
      allGroups.forEach(g => {
        next[g.key] = prev[g.key] || { keepId: g.clients[0].id, mergeFields: true };
      });
      return next;
    });
  }, [allGroups]);

  const runReconcile = async () => {
    // Apenas complementa o cadastro principal com dados dos outros. Nenhum cadastro é excluído.
    const ops: { keep: ClientRecord; sources: ClientRecord[] }[] = [];
    allGroups.forEach(g => {
      const choice = reconcileChoices[g.key];
      if (!choice) return;
      const keep = g.clients.find(c => c.id === choice.keepId);
      if (!keep) return;
      const sources = g.clients.filter(c => c.id !== choice.keepId);
      if (sources.length === 0) return;
      ops.push({ keep, sources });
    });
    setReconcileProgress({ done: 0, total: ops.length, errors: [] });
    const errors: string[] = [];
    const isEmpty = (v: any) => v === undefined || v === null || v === '' || v === 0;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const merged: any = { ...op.keep };
      op.sources.forEach(src => {
        Object.entries(src).forEach(([k, v]) => {
          if (k === 'id' || k === 'created_at' || k === 'updated_at' || k === 'company_name') return;
          if (k === 'contact') {
            merged.contact = { ...(merged.contact || {}) };
            (['name', 'email', 'phone'] as const).forEach(f => {
              if (isEmpty(merged.contact[f]) && !isEmpty((src.contact as any)?.[f])) merged.contact[f] = (src.contact as any)[f];
            });
            return;
          }
          if (k === 'brands') {
            merged.brands = merged.brands || {};
            (['phant','leadbox','vivemus'] as const).forEach(bk => {
              const mb = merged.brands[bk] || {};
              const sb = (src.brands as any)?.[bk] || {};
              merged.brands[bk] = { ...sb, ...mb, active: mb.active || sb.active };
            });
            return;
          }
          if (isEmpty(merged[k]) && !isEmpty(v)) merged[k] = v;
        });
      });
      const upd = await SupabaseService.updateClient(op.keep.id, merged);
      if (!upd.success) errors.push(`${op.keep.company_name}: ${upd.message || 'erro'}`);
      setReconcileProgress({ done: i + 1, total: ops.length, errors });
    }
    await loadData();
    setManualGroups([]);
  };

  const addManualGroup = () => {
    if (pickerSelected.size < 2) return;
    const ids = Array.from(pickerSelected);
    const key = `manual-${Date.now()}`;
    setManualGroups(prev => [...prev, { key, ids }]);
    setPickerSelected(new Set());
    setPickerSearch('');
    setShowPicker(false);
  };

  const removeManualGroup = (key: string) => {
    setManualGroups(prev => prev.filter(g => g.key !== key));
  };

  const formDuplicate = useMemo(() => {
    if (!showNewForm && !isEditing) return null;
    return findDuplicate(editForm.company_name, editForm.cnpj, isEditing ? selectedClient?.id : undefined);
  }, [editForm.company_name, editForm.cnpj, showNewForm, isEditing, selectedClient, dedupIndex]);

  const toggleBrandFilter = (key: BrandKey | 'none') => {
    setBrandFilter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const backlogData = useMemo(() => {
    const m: Record<string, { mrr: number; ot: number; v: number }> = {};
    // exclui recusados do backlog de receita projetada
    planning.filter(p => p.status !== 'recusado').forEach(p => {
      const k = p.previsao_entrada || 'Sem data';
      if (!m[k]) m[k] = { mrr: 0, ot: 0, v: 0 };
      m[k].mrr += p.mrr_value || 0; m[k].ot += p.one_time_value || 0; m[k].v += p.variavel_value || 0;
    });
    return Object.entries(m).sort(([a], [b]) => {
      const ia = monthIndex(a), ib = monthIndex(b);
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b, 'pt-BR');
    });
  }, [planning]);

  // ====== HANDLERS ======
  const save = async () => {
    setSavingState('saving');
    try {
      if (isEditing && selectedClient) {
        const r = await SupabaseService.updateClient(selectedClient.id, editForm);
        if (r.success) { await loadData(); setIsEditing(false); setSelectedClient({ ...selectedClient, ...editForm }); }
      } else {
        const r = await SupabaseService.saveClient(editForm);
        if (r.success) { await loadData(); setShowNewForm(false); setEditForm(EMPTY_CLIENT); }
      }
      setSavingState('saved'); setTimeout(() => setSavingState('idle'), 1500);
    } catch { setSavingState('idle'); }
  };

  const del = async (id: string) => {
    if (!confirm('Remover este cliente?')) return;
    const r = await SupabaseService.deleteClient(id);
    if (r.success) { await loadData(); setSelectedClient(null); setView('cadastro'); }
  };

  const savePlan = async () => {
    setSavingState('saving');
    try {
      if (editingPlanning) await SupabaseService.updatePlanning(editingPlanning.id, planningForm);
      else await SupabaseService.savePlanning(planningForm);
      await loadData();
      setShowPlanningForm(false); setEditingPlanning(null); setPlanningForm(EMPTY_PLANNING);
      setSavingState('saved'); setTimeout(() => setSavingState('idle'), 1500);
    } catch { setSavingState('idle'); }
  };

  const delPlan = async (id: string) => {
    if (!confirm('Remover item?')) return;
    await SupabaseService.deletePlanning(id); await loadData();
  };

  const openDetail = (c: ClientRecord) => { setSelectedClient(c); setView('detail'); };
  const startEdit = () => { if (selectedClient) { setEditForm({ ...selectedClient }); setIsEditing(true); } };
  const newClient = () => { setEditForm({ ...EMPTY_CLIENT }); setShowNewForm(true); };

  // ====== IMPORT CSV / XLSX ======
  const normalizeHeader = (h: string) => (h || '')
    .toString().toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  // map de cabeçalhos aceitos → campo
  const HEADER_MAP: Record<string, string> = {
    empresa: 'company_name', nome_empresa: 'company_name', company_name: 'company_name', nome: 'company_name', razao_social: 'company_name',
    industria: 'industry', segmento: 'industry', setor: 'industry', industry: 'industry',
    localizacao: 'location', cidade: 'location', location: 'location',
    website: 'website', site: 'website',
    instagram: 'instagram',
    cnpj: 'cnpj',
    contato: 'contact_name', contato_nome: 'contact_name', nome_contato: 'contact_name', responsavel: 'contact_name',
    email: 'contact_email', e_mail: 'contact_email', contato_email: 'contact_email',
    telefone: 'contact_phone', celular: 'contact_phone', whatsapp: 'contact_phone', contato_telefone: 'contact_phone',
    mrr: 'mrr', mensalidade: 'mrr',
    fee: 'fee', setup: 'fee',
    squad: 'squad_name', squad_name: 'squad_name', time: 'squad_name',
    modelo: 'contract_model', contract_model: 'contract_model', modelo_contrato: 'contract_model',
    marca: 'brand', marcas: 'brand', empresa_contrato: 'brand', brand: 'brand',
    data_entrada: 'data_entrada', entrada: 'data_entrada',
    onboarding: 'data_onboarding', data_onboarding: 'data_onboarding',
    assinatura: 'assinatura_date', data_assinatura: 'assinatura_date',
    forma_pagamento: 'forma_pagamento', pagamento: 'forma_pagamento',
    ano_fundacao: 'ano_fundacao', fundacao: 'ano_fundacao',
    num_funcionarios: 'num_funcionarios', funcionarios: 'num_funcionarios',
    observacoes: 'notes', notes: 'notes', obs: 'notes',
    nps: 'nps', lt: 'lt',
    status: 'status',
    health_status: 'health_status', saude: 'health_status',
  };

  const parseBrands = (val: string): ClientRecord['brands'] => {
    const brands = { phant: { active: false, mrr: 0, is_planning: false }, leadbox: { active: false, has_propagation: false }, vivemus: { active: false, has_consulting: false } };
    const v = (val || '').toLowerCase();
    if (/phant/.test(v)) brands.phant.active = true;
    if (/lead.?box/.test(v)) brands.leadbox.active = true;
    if (/vivemus/.test(v)) brands.vivemus.active = true;
    return brands;
  };

  const parseDateBR = (val: string): string => {
    if (!val) return '';
    const s = val.toString().trim();
    // dd/mm/yyyy → yyyy-mm-dd
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    // yyyy-mm-dd já aceito
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    // Excel serial number
    if (/^\d+$/.test(s)) {
      const excelDate = XLSX.SSF.parse_date_code(Number(s));
      if (excelDate) return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    }
    return s;
  };

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(clean);
    return isNaN(n) ? 0 : n;
  };

  const rowToClient = (raw: Record<string, any>): ImportRow => {
    const c: any = { ...EMPTY_CLIENT, contact: { name: '', email: '', phone: '' } };
    let brandSet = false;
    Object.entries(raw).forEach(([k, v]) => {
      const field = HEADER_MAP[normalizeHeader(k)];
      if (!field || v === null || v === undefined || v === '') return;
      const sv = v.toString().trim();
      switch (field) {
        case 'contact_name': c.contact.name = sv; break;
        case 'contact_email': c.contact.email = sv; break;
        case 'contact_phone': c.contact.phone = sv; break;
        case 'mrr': c.mrr = parseNumber(v); break;
        case 'fee': c.fee = parseNumber(v); break;
        case 'nps': c.nps = parseNumber(v); break;
        case 'lt': c.lt = parseNumber(v); break;
        case 'brand': c.brands = parseBrands(sv); brandSet = true; break;
        case 'data_entrada': case 'data_onboarding': case 'assinatura_date':
          c[field] = parseDateBR(sv); break;
        case 'status': {
          const s = sv.toLowerCase();
          c.status = s.includes('churn') ? 'churned' : s.includes('inativ') ? 'inactive' : 'active';
          break;
        }
        case 'health_status': {
          const s = sv.toLowerCase();
          c.health_status = s.includes('safe') ? 'safe' : s.includes('danger') ? 'danger' : s.includes('churn') ? 'churn' : s.includes('impl') ? 'implementacao' : 'care';
          break;
        }
        default: c[field] = sv;
      }
    });
    // valida
    let err: string | undefined;
    if (!c.company_name) err = 'Nome da empresa obrigatório';
    else if (!brandSet) err = 'Marca não detectada (coluna "marca": phant/leadbox/vivemus)';
    return { ...c, __error: err };
  };

  // Aplica detecção de duplicatas contra o banco e entre as próprias linhas
  const markDuplicates = (rows: ImportRow[]): ImportRow[] => {
    const seenName = new Map<string, number>();
    const seenCnpj = new Map<string, number>();
    return rows.map((r, i) => {
      if (r.__error) return r;
      // contra o banco
      const existing = findDuplicate(r.company_name, r.cnpj);
      if (existing) return { ...r, __duplicate: `já cadastrado: ${existing.company_name}` };
      // entre linhas da planilha
      const nk = normName(r.company_name);
      const ck = normCnpj(r.cnpj);
      if (nk && seenName.has(nk)) return { ...r, __duplicate: `duplicata da linha ${seenName.get(nk)! + 1}` };
      if (ck && ck.length >= 8 && seenCnpj.has(ck)) return { ...r, __duplicate: `CNPJ duplicado da linha ${seenCnpj.get(ck)! + 1}` };
      if (nk) seenName.set(nk, i);
      if (ck && ck.length >= 8) seenCnpj.set(ck, i);
      return r;
    });
  };

  const onFilePicked = async (file: File) => {
    setImportProgress(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      if (json.length === 0) { alert('Planilha vazia'); return; }
      const headers = Object.keys(json[0]);
      const rows = markDuplicates(json.map(rowToClient));
      setImportHeaders(headers);
      setImportRows(rows);
    } catch (err: any) {
      alert('Erro ao ler arquivo: ' + err.message);
    }
  };

  const runImport = async () => {
    const valid = importRows.filter(r => !r.__error && !r.__duplicate);
    setImportProgress({ done: 0, total: valid.length, errors: [] });
    const errors: string[] = [];
    for (let i = 0; i < valid.length; i++) {
      const { __error, __duplicate, ...payload } = valid[i];
      const r = await SupabaseService.saveClient(payload as any);
      if (!r.success) errors.push(`${payload.company_name}: ${r.message || 'erro'}`);
      setImportProgress({ done: i + 1, total: valid.length, errors });
    }
    await loadData();
  };

  const resetImport = () => {
    setImportRows([]); setImportHeaders([]); setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ====== LOADING ======
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-40 space-y-4 animate-pulse">
      <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Carregando...</span>
    </div>
  );

  // ================================================================
  // CLIENT FORM MODAL
  // ================================================================
  const renderForm = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-[32px] p-8 md:p-12 shadow-2xl relative my-6 animate-in zoom-in-95 duration-300">
        <button onClick={() => { setShowNewForm(false); setIsEditing(false); }}
          className="absolute top-6 right-6 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <h2 className="text-2xl font-black tracking-tighter text-gray-900 mb-8">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>

        {formDuplicate && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <div className="flex-1">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">Possível duplicidade</span>
              <span className="text-[12px] font-bold text-amber-900 block">Já existe: <b>{formDuplicate.company_name}</b>{formDuplicate.cnpj ? ` · CNPJ ${formDuplicate.cnpj}` : ''}</span>
              <button onClick={() => { setShowNewForm(false); setIsEditing(false); openDetail(formDuplicate); }}
                className="mt-2 text-[10px] font-black text-amber-700 uppercase tracking-widest hover:text-amber-900 underline">
                Abrir cliente existente &rarr;
              </button>
            </div>
          </div>
        )}

        <div className="space-y-7">
          {/* DADOS EMPRESA */}
          <div className="space-y-3">
            <SectionTitle>Dados da Empresa</SectionTitle>
            {/* LOGO DA EMPRESA */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {editForm.company_logo ? (
                  <img src={editForm.company_logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                )}
              </div>
              <InputField value={editForm.company_logo || ''} onChange={v => setEditForm({ ...editForm, company_logo: v })} placeholder="URL do Logo da Empresa" className="flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <InputField value={editForm.company_name} onChange={v => setEditForm({ ...editForm, company_name: v })} placeholder="Nome da Empresa *" />
              <SelectField value={editForm.industry} onChange={v => setEditForm({ ...editForm, industry: v })} options={INDUSTRIES.map(i => ({ value: i, label: i }))} placeholder="Indústria / Setor" />
              <InputField value={editForm.location || ''} onChange={v => setEditForm({ ...editForm, location: v })} placeholder="Localização" />
              <InputField value={editForm.website || ''} onChange={v => setEditForm({ ...editForm, website: v })} placeholder="Website" />
              <InputField value={editForm.ano_fundacao || ''} onChange={v => setEditForm({ ...editForm, ano_fundacao: v })} placeholder="Ano de Fundação" />
              <SelectField value={editForm.num_funcionarios || ''} onChange={v => setEditForm({ ...editForm, num_funcionarios: v })} options={NUM_FUNC_OPTIONS.map(n => ({ value: n, label: n }))} placeholder="Nº Funcionários" />
            </div>
          </div>

          {/* DADOS INTERNOS */}
          <div className="space-y-3">
            <SectionTitle>Dados Internos</SectionTitle>
            {/* MARCAS — obrigatório selecionar ao menos uma */}
            {(() => {
              const noBrand = !editForm.brands?.phant?.active && !editForm.brands?.leadbox?.active && !editForm.brands?.vivemus?.active;
              return (
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${noBrand ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                    {noBrand ? 'Selecione a empresa do contrato *' : 'Empresa do Contrato'}
                  </label>
                  <div className={`flex flex-wrap gap-3 p-3 rounded-2xl transition-all ${noBrand ? 'bg-red-50/50 border-2 border-dashed border-red-200' : 'bg-transparent'}`}>
                    {[
                      { key: 'phant' as const, label: 'Phant', bg: 'bg-purple-50', border: 'border-purple-200', activeBg: 'bg-purple-600', letter: 'P' },
                      { key: 'leadbox' as const, label: 'Leadbox', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-600', letter: 'L' },
                      { key: 'vivemus' as const, label: 'Vivemus', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-600', letter: 'V' },
                    ].map(b => {
                      const isActive = editForm.brands?.[b.key]?.active;
                      const logo = brandLogos[b.key];
                      return (
                        <button key={b.key} type="button"
                          onClick={() => {
                            const currentBrands = editForm.brands || {};
                            const currentBrand = currentBrands[b.key] || {};
                            setEditForm({ ...editForm, brands: { ...currentBrands, [b.key]: { ...currentBrand, active: !currentBrand.active } } });
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                            isActive ? `${b.activeBg} text-white border-transparent shadow-lg` : `${b.bg} ${b.border} text-gray-500`
                          }`}>
                          {logo ? (
                            <img src={logo} alt={b.label} className={`w-5 h-5 object-contain rounded-full ${isActive ? 'brightness-0 invert' : ''}`} />
                          ) : (
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${isActive ? 'bg-white/20 text-white' : `${b.activeBg} text-white`}`}>{b.letter}</span>
                          )}
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <InputField type="number" value={editForm.fee || 0} onChange={v => setEditForm({ ...editForm, fee: Number(v) })} placeholder="Fee" />
              <SelectField value={editForm.contract_model || 'Growth'} onChange={v => setEditForm({ ...editForm, contract_model: v })} options={CONTRACT_MODELS.map(m => ({ value: m, label: m }))} />
              <SelectField value={editForm.squad_name || ''} onChange={v => setEditForm({ ...editForm, squad_name: v })} options={dynamicSquadOptions.map(s => ({ value: s, label: s }))} placeholder="Squad" />
              <SelectField value={editForm.health_status || 'care'} onChange={v => {
                const healthMap: Record<string, ClientHealthBadge> = { safe: 'safe', care: 'care', danger: 'danger', churn: 'danger', implementacao: 'care' };
                // Sincroniza status do contrato com health_status de churn
                const nextStatus = v === 'churn' ? 'churned' : (editForm.status === 'churned' ? 'active' : editForm.status || 'active');
                setEditForm({ ...editForm, health_status: v, health: healthMap[v] || 'care', status: nextStatus });
              }} options={[
                { value: 'safe', label: 'Safe' }, { value: 'care', label: 'Care' }, { value: 'danger', label: 'Danger' },
                { value: 'churn', label: 'Churn' }, { value: 'implementacao', label: 'Implementação' }
              ]} />
            </div>
          </div>

          {/* CONTRATO */}
          <div className="space-y-3">
            <SectionTitle>Contato & Contrato</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <InputField value={editForm.contact?.name || ''} onChange={v => setEditForm({ ...editForm, contact: { ...editForm.contact, name: v } })} placeholder="Ponto de Contato" />
              <InputField value={editForm.contact?.email || ''} onChange={v => setEditForm({ ...editForm, contact: { ...editForm.contact, email: v } })} placeholder="E-mail" />
              <InputField value={editForm.contact?.phone || ''} onChange={v => setEditForm({ ...editForm, contact: { ...editForm.contact, phone: v } })} placeholder="Telefone" />
              <InputField value={editForm.cnpj || ''} onChange={v => setEditForm({ ...editForm, cnpj: v })} placeholder="CNPJ" label="CNPJ" />
              <InputField type="date" value={editForm.data_entrada || ''} onChange={v => setEditForm({ ...editForm, data_entrada: v })} label="Data de Entrada" />
              <InputField type="date" value={editForm.data_onboarding || ''} onChange={v => setEditForm({ ...editForm, data_onboarding: v })} label="Início Onboarding" />
              <InputField type="date" value={editForm.assinatura_date || ''} onChange={v => setEditForm({ ...editForm, assinatura_date: v })} label="Assinatura" />
              <InputField value={editForm.forma_pagamento || ''} onChange={v => setEditForm({ ...editForm, forma_pagamento: v })} placeholder="Ex: Boleto, Pix, Cartão..." label="Forma de Pagamento" />
            </div>
            <InputField value={editForm.assinatura_descricao || ''} onChange={v => setEditForm({ ...editForm, assinatura_descricao: v })} placeholder="Ex: 1 WhatsApp, 1 Instagram, 3 Usuários" label="Descrição da Assinatura" />
          </div>

          {/* FINANCEIRO & RISCO */}
          <div className="space-y-3">
            <SectionTitle>Financeiro & Risco</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InputField type="number" value={editForm.mrr || 0} onChange={v => setEditForm({ ...editForm, mrr: Number(v) })} placeholder="MRR" />
              <InputField type="number" value={editForm.lt || ''} onChange={v => setEditForm({ ...editForm, lt: v ? Number(v) : undefined })} placeholder="LT" />
              <InputField type="number" value={editForm.nps || ''} onChange={v => setEditForm({ ...editForm, nps: v ? Number(v) : undefined })} placeholder="NPS" />
              <SelectField value={editForm.consciousness_level} onChange={v => setEditForm({ ...editForm, consciousness_level: v })} options={Object.entries(CONSCIOUSNESS_SHORT).map(([k, v]) => ({ value: k, label: v }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SelectField value={editForm.risk_resultado || ''} onChange={v => setEditForm({ ...editForm, risk_resultado: v })} options={RISK_OPTIONS.map(r => ({ value: r, label: r }))} placeholder="Resultado" label="Risco Resultado" />
              <SelectField value={editForm.risk_entregas || ''} onChange={v => setEditForm({ ...editForm, risk_entregas: v })} options={RISK_OPTIONS.map(r => ({ value: r, label: r }))} placeholder="Entregas" label="Risco Entregas" />
              <SelectField value={editForm.risk_relacionamento || ''} onChange={v => setEditForm({ ...editForm, risk_relacionamento: v })} options={RISK_OPTIONS.map(r => ({ value: r, label: r }))} placeholder="Relacionamento" label="Risco Relacionamento" />
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="space-y-3">
            <SectionTitle>Observações</SectionTitle>
            <textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Anotações gerais..." rows={2}
              className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black resize-none transition-colors" />
            <textarea value={editForm.intervention_plan || ''} onChange={e => setEditForm({ ...editForm, intervention_plan: e.target.value })} placeholder="Plano de Intervenção..." rows={2}
              className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black resize-none transition-colors" />
          </div>

          {(() => {
            const noBrand = !editForm.brands?.phant?.active && !editForm.brands?.leadbox?.active && !editForm.brands?.vivemus?.active;
            const hasName = !!(editForm.company_name && editForm.company_name.trim());
            const blockedByDup = !isEditing && !!formDuplicate;
            const canSave = hasName && !noBrand && !blockedByDup && savingState !== 'saving';
            return (
              <button onClick={save} disabled={!canSave}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all ${
                  savingState === 'saved' ? 'bg-emerald-500 text-white' : savingState === 'saving' ? 'bg-gray-200 text-gray-400' : !canSave ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-brand'
                }`}>
                {savingState === 'saved' ? 'Salvo!' : savingState === 'saving' ? 'Salvando...' : !hasName ? 'Informe o nome da empresa' : noBrand ? 'Selecione a empresa do contrato' : blockedByDup ? 'Cliente já cadastrado' : isEditing ? 'Atualizar' : 'Cadastrar'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );

  // ================================================================
  // PLANNING FORM MODAL
  // ================================================================
  const renderPlanForm = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-[32px] p-8 md:p-12 shadow-2xl relative my-6 animate-in zoom-in-95 duration-300">
        <button onClick={() => { setShowPlanningForm(false); setEditingPlanning(null); setPlanningForm(EMPTY_PLANNING); }}
          className="absolute top-6 right-6 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <h2 className="text-2xl font-black tracking-tighter text-gray-900 mb-8">{editingPlanning ? 'Editar Item' : 'Novo Pipeline'}</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InputField value={planningForm.client_name} onChange={v => setPlanningForm({ ...planningForm, client_name: v })} placeholder="Cliente *" />
            <SelectField value={planningForm.account} onChange={v => setPlanningForm({ ...planningForm, account: v })} options={dynamicSquadOptions.map(s => ({ value: s, label: s }))} placeholder="Account" />
            <InputField value={planningForm.produto} onChange={v => setPlanningForm({ ...planningForm, produto: v })} placeholder="Produto" />
            <SelectField value={planningForm.farmer} onChange={v => setPlanningForm({ ...planningForm, farmer: v })} options={dynamicSquadOptions.map(s => ({ value: s, label: s }))} placeholder="Farmer" />
          </div>
          <textarea value={planningForm.milestones_triggers} onChange={e => setPlanningForm({ ...planningForm, milestones_triggers: e.target.value })} placeholder="Milestones / Triggers" rows={2}
            className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-black resize-none" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectField value={planningForm.consciousness_level} onChange={v => setPlanningForm({ ...planningForm, consciousness_level: v })} options={Object.entries(CONSCIOUSNESS_SHORT).map(([k, v]) => ({ value: k, label: v }))} />
            <InputField value={planningForm.previsao_entrada} onChange={v => setPlanningForm({ ...planningForm, previsao_entrada: v })} placeholder="Previsão (ex: Janeiro)" />
            <SelectField value={planningForm.status} onChange={v => setPlanningForm({ ...planningForm, status: v })} options={Object.entries(PLANNING_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InputField type="number" value={planningForm.mrr_value || 0} onChange={v => setPlanningForm({ ...planningForm, mrr_value: Number(v) })} placeholder="MRR" />
            <InputField type="number" value={planningForm.one_time_value || 0} onChange={v => setPlanningForm({ ...planningForm, one_time_value: Number(v) })} placeholder="One Time" />
            <InputField type="number" value={planningForm.variavel_value || 0} onChange={v => setPlanningForm({ ...planningForm, variavel_value: Number(v) })} placeholder="Variável" />
          </div>
          <button onClick={savePlan} disabled={!planningForm.client_name}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl bg-black text-white hover:bg-brand transition-all disabled:opacity-40">
            {editingPlanning ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );

  // ================================================================
  // RECONCILE MODAL
  // ================================================================
  const renderReconcileModal = () => {
    const totalToUpdate = allGroups.reduce((s, g) => {
      const c = reconcileChoices[g.key];
      return s + (c && g.clients.length > 1 ? 1 : 0);
    }, 0);
    const isRunning = reconcileProgress !== null && reconcileProgress.done < reconcileProgress.total;
    const isDone = reconcileProgress !== null && reconcileProgress.done === reconcileProgress.total && reconcileProgress.total > 0;
    // IDs já em algum grupo (para não aparecerem no picker)
    const usedIds = new Set<string>();
    allGroups.forEach(g => g.clients.forEach(c => usedIds.add(c.id)));
    const pickerList = clients
      .filter(c => !usedIds.has(c.id))
      .filter(c => {
        const t = pickerSearch.trim().toLowerCase();
        if (!t) return true;
        return [c.company_name, c.cnpj, c.contact?.email, c.industry].filter(Boolean).join(' ').toLowerCase().includes(t);
      })
      .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-5xl rounded-[32px] p-8 md:p-10 shadow-2xl relative my-6">
          <button onClick={() => { setShowReconcileModal(false); setReconcileProgress(null); }} disabled={isRunning}
            className="absolute top-6 right-6 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-gray-900">Reconciliar Duplicatas</h2>
              <p className="text-gray-400 text-sm font-medium mt-1">
                {duplicateGroups.length} grupo(s) detectado(s){manualGroups.length > 0 ? ` + ${manualGroups.length} manual(is)` : ''}. Escolha o cadastro <b>principal</b> em cada grupo — os campos vazios serão <b>preenchidos automaticamente</b> com dados dos outros. Nenhum cadastro é excluído.
              </p>
            </div>
            <button onClick={() => { setPickerSelected(new Set()); setPickerSearch(''); setShowPicker(true); }}
              disabled={isRunning}
              className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-40 whitespace-nowrap">
              + Marcar Grupo Manualmente
            </button>
          </div>

          {showPicker && (
            <div className="mb-6 p-5 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Selecione 2 ou mais cadastros para marcar como duplicados</span>
                <button onClick={() => setShowPicker(false)} className="text-[10px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-widest">Fechar</button>
              </div>
              <input type="text" placeholder="Buscar por nome, CNPJ, e-mail..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                className="w-full px-4 py-2.5 bg-white rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-black" />
              <div className="max-h-[240px] overflow-y-auto bg-white rounded-xl border border-gray-100">
                {pickerList.length === 0 && (
                  <div className="py-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum cliente disponível</div>
                )}
                {pickerList.map(c => {
                  const isSel = pickerSelected.has(c.id);
                  return (
                    <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 cursor-pointer transition-colors ${isSel ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={isSel}
                        onChange={() => setPickerSelected(prev => {
                          const n = new Set(prev);
                          if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
                          return n;
                        })}
                        className="w-4 h-4 accent-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-[12px] text-gray-900 truncate">{c.company_name}</div>
                        <div className="text-[10px] font-bold text-gray-400">
                          {c.cnpj && <span className="font-mono mr-2">{c.cnpj}</span>}
                          {c.contact?.email && <span className="mr-2">{c.contact.email}</span>}
                          <span>{c.industry || '-'}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{pickerSelected.size} selecionado(s)</span>
                <button onClick={addManualGroup} disabled={pickerSelected.size < 2}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-40">
                  Adicionar grupo
                </button>
              </div>
            </div>
          )}

          {allGroups.length === 0 ? (
            <div className="p-10 text-center">
              <svg className="w-12 h-12 mx-auto text-emerald-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span className="text-sm font-black text-gray-700 block">Sem duplicatas</span>
              <span className="text-[10px] font-bold text-gray-400 block mt-1">Sua base está limpa. Use <b>Marcar Grupo Manualmente</b> se quiser mesclar cadastros manualmente.</span>
            </div>
          ) : (
            <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2">
              {allGroups.map(g => {
                const choice = reconcileChoices[g.key] || { keepId: g.clients[0].id, mergeFields: true };
                return (
                  <div key={g.key} className={`p-5 rounded-2xl border-2 ${g.manual ? 'bg-blue-50/40 border-blue-200' : 'bg-amber-50/40 border-amber-200'}`}>
                    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${g.manual ? 'bg-blue-200 text-blue-800' : 'bg-amber-200 text-amber-800'}`}>{g.reason}</span>
                        <span className="text-[11px] font-bold text-gray-500">{g.clients.length} cadastros</span>
                        {g.manual && (
                          <button onClick={() => removeManualGroup(g.key)} disabled={isRunning}
                            className="ml-2 text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Remover grupo</button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {g.clients.map(c => {
                        const isPrimary = choice.keepId === c.id;
                        const filledScore = [c.cnpj, c.mrr, c.fee, c.contact?.email, c.contact?.phone, c.squad_name, c.industry, c.data_entrada, c.company_logo].filter(Boolean).length;
                        return (
                          <label key={c.id} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isPrimary ? 'bg-white border-emerald-400 shadow-md' : 'bg-white/60 border-gray-200 hover:border-gray-400'}`}>
                            <div className="flex items-start gap-3">
                              <input type="radio" name={`keep-${g.key}`} checked={isPrimary}
                                onChange={() => setReconcileChoices(prev => ({ ...prev, [g.key]: { ...choice, keepId: c.id } }))}
                                className="mt-1 w-4 h-4 accent-emerald-500" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-black text-sm text-gray-900 truncate">{c.company_name}</span>
                                  {isPrimary && <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500 text-white">Principal</span>}
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 space-y-0.5">
                                  {c.cnpj && <div>CNPJ: <span className="font-mono text-gray-600">{c.cnpj}</span></div>}
                                  {c.contact?.email && <div>{c.contact.email}</div>}
                                  {c.contact?.phone && <div>{c.contact.phone}</div>}
                                  <div>{c.industry || '-'} · {c.squad_name || 'sem squad'}</div>
                                  <div>MRR {fmt(c.mrr || 0)} · Fee {fmt(c.fee || 0)}</div>
                                  <div className="text-gray-300">{c.id.substring(0, 8)} · {filledScore} campos preenchidos · atualizado {fmtDate(c.updated_at)}</div>
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {reconcileProgress && (
            <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{isDone ? 'Concluído' : 'Complementando cadastros...'}</span>
                <span className="text-[11px] font-black text-blue-900">{reconcileProgress.done} / {reconcileProgress.total}</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${(reconcileProgress.done / Math.max(reconcileProgress.total, 1)) * 100}%` }} />
              </div>
              {reconcileProgress.errors.length > 0 && (
                <div className="mt-2 text-[10px] font-bold text-red-600 max-h-[80px] overflow-y-auto">
                  {reconcileProgress.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}

          {allGroups.length > 0 && (
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowReconcileModal(false)} disabled={isRunning}
                className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all disabled:opacity-40">
                Cancelar
              </button>
              {isDone ? (
                <button onClick={() => { setShowReconcileModal(false); setReconcileProgress(null); }}
                  className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                  Fechar
                </button>
              ) : (
                <button onClick={runReconcile}
                  disabled={totalToUpdate === 0 || isRunning}
                  className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-40">
                  {isRunning ? 'Processando...' : `Complementar ${totalToUpdate} cadastro(s)`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ================================================================
  // IMPORT MODAL
  // ================================================================
  const renderImportModal = () => {
    const invalid = importRows.filter(r => r.__error);
    const duplicates = importRows.filter(r => !r.__error && r.__duplicate);
    const valid = importRows.filter(r => !r.__error && !r.__duplicate);
    const isImporting = importProgress !== null && importProgress.done < importProgress.total;
    const isDone = importProgress !== null && importProgress.done === importProgress.total;
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-4xl rounded-[32px] p-8 md:p-10 shadow-2xl relative my-6">
          <button onClick={() => { setShowImportModal(false); resetImport(); }}
            className="absolute top-6 right-6 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <h2 className="text-2xl font-black tracking-tighter text-gray-900 mb-2">Importar Clientes</h2>
          <p className="text-gray-400 text-sm font-medium mb-6">Suporta <b>CSV</b>, <b>XLSX</b> e <b>XLS</b>. A primeira linha deve conter os cabeçalhos.</p>

          {importRows.length === 0 && (
            <>
              <label htmlFor="import-file-input" className="block p-10 border-2 border-dashed border-gray-200 rounded-2xl text-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <span className="text-sm font-black text-gray-700 block">Clique para selecionar um arquivo</span>
                <span className="text-[10px] font-bold text-gray-400 block mt-1">ou arraste aqui</span>
              </label>
              <input id="import-file-input" ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFilePicked(f); }}
                className="hidden" />

              <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-[11px] font-medium text-gray-600 space-y-2">
                <div className="font-black text-gray-700 text-[10px] uppercase tracking-widest mb-1">Colunas aceitas (qualquer ordem)</div>
                <div><b>Obrigatórias:</b> <code>empresa</code>, <code>marca</code> (phant, leadbox ou vivemus)</div>
                <div><b>Opcionais:</b> <code>industria</code>, <code>localizacao</code>, <code>cnpj</code>, <code>contato</code>, <code>email</code>, <code>telefone</code>, <code>mrr</code>, <code>fee</code>, <code>squad</code>, <code>modelo</code>, <code>data_entrada</code>, <code>onboarding</code>, <code>assinatura</code>, <code>forma_pagamento</code>, <code>website</code>, <code>status</code>, <code>observacoes</code></div>
                <div className="text-gray-400">Datas aceitas: <code>dd/mm/yyyy</code> ou <code>yyyy-mm-dd</code>. Valores em R$ aceitos com pontos/vírgulas.</div>
              </div>
            </>
          )}

          {importRows.length > 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 bg-gray-50 rounded-2xl text-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total</span>
                  <span className="text-2xl font-black text-gray-900">{importRows.length}</span>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl text-center">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Novas</span>
                  <span className="text-2xl font-black text-emerald-700">{valid.length}</span>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl text-center">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">Duplicadas</span>
                  <span className="text-2xl font-black text-amber-700">{duplicates.length}</span>
                </div>
                <div className="p-4 bg-red-50 rounded-2xl text-center">
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block">Com erro</span>
                  <span className="text-2xl font-black text-red-700">{invalid.length}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-500">
                <b>Colunas detectadas:</b> {importHeaders.join(', ')}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className={th}>#</th>
                      <th className={th}>Empresa</th>
                      <th className={th}>Marca</th>
                      <th className={th}>Contato</th>
                      <th className={th}>E-mail</th>
                      <th className={`${th} text-right`}>MRR</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 100).map((r, i) => {
                      const brands = [r.brands?.phant?.active && 'Phant', r.brands?.leadbox?.active && 'Leadbox', r.brands?.vivemus?.active && 'Vivemus'].filter(Boolean).join(', ');
                      const rowBg = r.__error ? 'bg-red-50/40' : r.__duplicate ? 'bg-amber-50/40' : '';
                      return (
                        <tr key={i} className={`border-b border-gray-50 ${rowBg}`}>
                          <td className={`${td} text-gray-400`}>{i + 1}</td>
                          <td className={tdBold}>{r.company_name || '-'}</td>
                          <td className={td}>{brands || '-'}</td>
                          <td className={td}>{r.contact?.name || '-'}</td>
                          <td className={td}>{r.contact?.email || '-'}</td>
                          <td className={`${tdBold} text-right`}>{r.mrr ? fmt(r.mrr) : '-'}</td>
                          <td className={td}>
                            {r.__error ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black bg-red-100 text-red-700" title={r.__error}>Erro</span>
                            ) : r.__duplicate ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black bg-amber-100 text-amber-700" title={r.__duplicate}>Duplicada</span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-700">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {importRows.length > 100 && <div className="py-2 text-center text-[10px] font-bold text-gray-400">... e mais {importRows.length - 100} linha(s)</div>}
              </div>

              {invalid.length > 0 && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-[11px] space-y-1 max-h-[120px] overflow-y-auto">
                  <span className="font-black text-red-700 text-[10px] uppercase tracking-widest block mb-1">Linhas inválidas serão ignoradas</span>
                  {invalid.slice(0, 10).map((r, i) => (
                    <div key={i} className="text-red-600"><b>{r.company_name || `linha ${importRows.indexOf(r) + 1}`}:</b> {r.__error}</div>
                  ))}
                </div>
              )}

              {duplicates.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] space-y-1 max-h-[120px] overflow-y-auto">
                  <span className="font-black text-amber-700 text-[10px] uppercase tracking-widest block mb-1">Duplicatas detectadas — serão ignoradas</span>
                  {duplicates.slice(0, 10).map((r, i) => (
                    <div key={i} className="text-amber-700"><b>{r.company_name}:</b> {r.__duplicate}</div>
                  ))}
                  {duplicates.length > 10 && <div className="text-amber-600 italic">... e mais {duplicates.length - 10}</div>}
                </div>
              )}

              {importProgress && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{isDone ? 'Concluído' : 'Importando...'}</span>
                    <span className="text-[11px] font-black text-blue-900">{importProgress.done} / {importProgress.total}</span>
                  </div>
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${(importProgress.done / Math.max(importProgress.total, 1)) * 100}%` }} />
                  </div>
                  {importProgress.errors.length > 0 && (
                    <div className="mt-2 text-[10px] font-bold text-red-600 max-h-[80px] overflow-y-auto">
                      {importProgress.errors.map((e, i) => <div key={i}>• {e}</div>)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={resetImport} disabled={isImporting}
                  className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all disabled:opacity-40">
                  Trocar arquivo
                </button>
                {isDone ? (
                  <button onClick={() => { setShowImportModal(false); resetImport(); }}
                    className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                    Fechar
                  </button>
                ) : (
                  <button onClick={runImport} disabled={valid.length === 0 || isImporting}
                    className="flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-black text-white hover:bg-brand transition-all disabled:opacity-40">
                    {isImporting ? 'Importando...' : `Importar ${valid.length} cliente(s)`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ================================================================
  // PAGE: DASHBOARD
  // ================================================================
  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Dashboard" subtitle="Visão geral da carteira de clientes">
        <BtnPrimary onClick={newClient}>+ Novo Cliente</BtnPrimary>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="MRR Total Ativo" value={fmt(metrics.totalMRR)} />
        <KpiCard label="Clientes Ativos" value={metrics.active.length} />
        <KpiCard label="LT Médio" value={metrics.avgLT.toFixed(1)} />
      </div>

      {/* MRR por Squad — todos */}
      {Object.keys(metrics.mrrBySquad).length > 0 && (
        <div className="space-y-3">
          <SectionTitle>MRR por Squad</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Object.entries(metrics.mrrBySquad)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([sq, mrr]) => (
                <KpiCard key={sq} label={sq} value={fmt(mrr as number)} />
              ))}
          </div>
        </div>
      )}

      {/* BRAND CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Phant', total: metrics.brandPhant.length, active: metrics.brandPhantActive.length, mrr: metrics.mrrPhant, color: 'bg-purple-50 border-purple-100', dot: 'bg-purple-600', text: 'text-purple-900', logo: brandLogos.phant },
          { label: 'Leadbox', total: metrics.brandLeadbox.length, active: metrics.brandLeadboxActive.length, mrr: metrics.mrrLeadbox, color: 'bg-blue-50 border-blue-100', dot: 'bg-blue-600', text: 'text-blue-900', logo: brandLogos.leadbox },
          { label: 'Vivemus', total: metrics.brandVivemus.length, active: metrics.brandVivemusActive.length, mrr: metrics.mrrVivemus, color: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-600', text: 'text-emerald-900', logo: brandLogos.vivemus },
          { label: 'Total Geral', total: clients.length, active: metrics.active.length, mrr: metrics.totalMRR, color: 'bg-gray-50 border-gray-200', dot: 'bg-gray-700', text: 'text-gray-900', logo: '' },
        ].map(b => (
          <div key={b.label} className={`p-5 rounded-[20px] border ${b.color}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {b.logo ? <img src={b.logo} alt={b.label} className="w-5 h-5 rounded-full object-cover" /> : null}
                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{b.label}</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${b.dot}`} />
            </div>
            <span className={`text-3xl font-black ${b.text}`}>{b.active}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-bold text-gray-400">{b.total} total · {b.total - b.active} inativos</span>
              <span className="text-[9px] font-black text-gray-500">{fmt(b.mrr)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* HEALTH CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Safe', count: metrics.safe.length, color: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-900' },
          { label: 'Care', count: metrics.care.length, color: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500', text: 'text-amber-900' },
          { label: 'Danger', count: metrics.danger.length, color: 'bg-red-50 border-red-100', dot: 'bg-red-500', text: 'text-red-900' },
          { label: 'Churn', count: metrics.churn.length, color: 'bg-red-100 border-red-200', dot: 'bg-red-700', text: 'text-red-900' },
          { label: 'Impl.', count: metrics.impl.length, color: 'bg-amber-50 border-amber-100', dot: 'bg-amber-400', text: 'text-amber-800' },
        ].map(h => (
          <div key={h.label} className={`p-5 rounded-[20px] border ${h.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{h.label}</span>
              <span className={`w-2 h-2 rounded-full ${h.dot}`} />
            </div>
            <span className={`text-3xl font-black ${h.text}`}>{h.count}</span>
          </div>
        ))}
      </div>

      {/* SILENCE ALERT */}
      {metrics.silent.length > 0 && (
        <div className="p-5 bg-orange-50 rounded-[20px] border border-orange-200 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[9px] font-black text-orange-700 uppercase tracking-widest">
              Alerta de Silêncio — {metrics.silent.length} cliente(s) sem report 30+ dias
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {metrics.silent.slice(0, 12).map(c => (
              <button key={c.id} onClick={() => openDetail(c)}
                className="px-3 py-1.5 bg-white rounded-lg text-[10px] font-black text-orange-700 border border-orange-200 hover:bg-orange-100 transition-all inline-flex items-center gap-1">
                {c.company_name}              </button>
            ))}
          </div>
        </div>
      )}

      {/* DANGER QUICK ACTIONS */}
      {metrics.danger.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Intervenção Imediata</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metrics.danger.map(c => (
              <div key={c.id} onClick={() => openDetail(c)}
                className="p-4 bg-white rounded-[20px] border border-red-100 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                    <span className="text-red-600 font-black text-sm">{c.company_name.charAt(0)}</span>
                  </div>
                  <div>
                    <span className="font-black text-sm text-gray-900 group-hover:text-brand transition-colors">{c.company_name}</span>
                    <span className="text-[9px] font-bold text-gray-400 block">{c.industry} · {fmt(c.mrr)}</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">Agir</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ================================================================
  // PAGE: CADASTRO GERAL
  // ================================================================
  const renderCadastro = () => {
    const brandCounts = {
      phant: clients.filter(c => c.brands?.phant?.active).length,
      leadbox: clients.filter(c => c.brands?.leadbox?.active).length,
      vivemus: clients.filter(c => c.brands?.vivemus?.active).length,
      none: clients.filter(c => !c.brands?.phant?.active && !c.brands?.leadbox?.active && !c.brands?.vivemus?.active).length,
    };
    const statusCounts = {
      active: clients.filter(c => (c.status || 'active') === 'active').length,
      churned: clients.filter(c => c.status === 'churned').length,
      inactive: clients.filter(c => c.status === 'inactive').length,
    };
    const brandChips: { key: BrandKey | 'none'; label: string; count: number; active: string; inactive: string }[] = [
      { key: 'phant', label: 'Phant', count: brandCounts.phant, active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
      { key: 'leadbox', label: 'Leadbox', count: brandCounts.leadbox, active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
      { key: 'vivemus', label: 'Vivemus', count: brandCounts.vivemus, active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
      { key: 'none', label: 'Sem marca', count: brandCounts.none, active: 'bg-gray-700 text-white border-gray-700', inactive: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100' },
    ];
    const hasFilters = brandFilter.size > 0 || statusFilter !== 'all' || searchTerm.trim().length > 0;
    return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Cadastro Geral" subtitle={`${filtered.length} de ${clients.length} clientes`}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        <button onClick={() => { setReconcileProgress(null); setShowReconcileModal(true); }}
          className={`relative px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
            duplicateGroups.length > 0
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-black hover:text-white hover:border-black'
          }`}>
          Reconciliar Duplicatas
          {duplicateGroups.length > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
              {duplicateGroups.length}
            </span>
          )}
        </button>
        <BtnSecondary onClick={() => { resetImport(); setShowImportModal(true); }}>Importar CSV/XLSX</BtnSecondary>
        <BtnPrimary onClick={newClient}>+ Novo</BtnPrimary>
      </PageHeader>

      {/* FILTROS */}
      <div className="p-4 bg-white rounded-[20px] border border-gray-100 space-y-4">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="space-y-2">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Filtrar por Empresa</span>
            <div className="flex flex-wrap gap-2">
              {brandChips.map(b => {
                const isOn = brandFilter.has(b.key);
                const logo = b.key !== 'none' ? brandLogos[b.key] : undefined;
                return (
                  <button key={b.key} onClick={() => toggleBrandFilter(b.key)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isOn ? b.active : b.inactive}`}>
                    {logo && <img src={logo} alt={b.label} className={`w-4 h-4 object-contain rounded-full ${isOn ? 'brightness-0 invert' : ''}`} />}
                    {b.label}
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] ${isOn ? 'bg-white/20' : 'bg-white/80'}`}>{b.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Status</span>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all' as const, label: 'Todos', count: clients.length },
                { key: 'active' as const, label: 'Ativos', count: statusCounts.active },
                { key: 'churned' as const, label: 'Churned', count: statusCounts.churned },
                { key: 'inactive' as const, label: 'Inativos', count: statusCounts.inactive },
              ]).map(s => {
                const isOn = statusFilter === s.key;
                return (
                  <button key={s.key} onClick={() => setStatusFilter(s.key)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isOn ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                    {s.label}
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] ${isOn ? 'bg-white/20' : 'bg-gray-100'}`}>{s.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {hasFilters && (
            <button onClick={() => { setBrandFilter(new Set()); setStatusFilter('all'); setSearchTerm(''); }}
              className="ml-auto self-end px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left min-w-[1400px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th colSpan={8} className="px-4 py-2 text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/60 rounded-tl-[20px]">Dados Empresa</th>
              <th colSpan={4} className="px-4 py-2 text-[8px] font-black text-violet-600 uppercase tracking-widest bg-violet-50/60">Dados Internos</th>
              <th colSpan={5} className="px-4 py-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/60 rounded-tr-[20px]">Dados Contrato</th>
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className={th}>#</th>
              <th className={th}>Marca</th>
              <th className={`${th} min-w-[180px]`}>Nome</th>
              <th className={th}>CNPJ</th>
              <th className={th}>Status</th>
              <th className={th}>Localização</th>
              <th className={th}>Indústria</th>
              <th className={th}>Func.</th>
              <th className={`${th} text-center`}>Fee</th>
              <th className={th}>Modelo</th>
              <th className={th}>Squad</th>
              <th className={th}>Saúde</th>
              <th className={th}>Contato</th>
              <th className={th}>E-mail</th>
              <th className={th}>Telefone</th>
              <th className={th}>Entrada</th>
              <th className={th}>Onboarding</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} className={trHover} onClick={() => openDetail(c)}>
                <td className={`${td} text-gray-400 font-bold`}>{i + 1}</td>
                <td className="px-4 py-3.5"><BrandDots brands={c.brands} companyLogo={c.company_logo} companyName={c.company_name} logos={brandLogos} /></td>
                <td className={tdBold}>{c.company_name}</td>
                <td className={`${td} text-[10px] font-mono text-gray-400`}>{c.cnpj || '-'}</td>
                <td className={td}>
                  <span className={`text-[10px] font-black ${c.status === 'active' ? 'text-emerald-600' : c.status === 'churned' ? 'text-red-500' : 'text-gray-400'}`}>
                    {c.status === 'active' ? 'Ativo' : c.status === 'churned' ? 'Churned' : 'Inativo'}
                  </span>
                </td>
                <td className={td}>{c.location || '-'}</td>
                <td className={td}>{c.industry || '-'}</td>
                <td className={`${td} text-center`}>{c.num_funcionarios || '-'}</td>
                <td className={`${tdBold} text-center`}>{c.fee ? fmt(c.fee) : '-'}</td>
                <td className={td}>{c.contract_model || '-'}</td>
                <td className={`${td} font-bold text-blue-600`}>{c.squad_name || '-'}</td>
                <td className="px-4 py-3.5"><StatusBadge status={c.health_status || c.health} /></td>
                <td className={`${td} font-bold text-gray-700`}>{c.contact?.name || '-'}</td>
                <td className={td}>{c.contact?.email || '-'}</td>
                <td className={td}>{c.contact?.phone || '-'}</td>
                <td className={td}>{fmtDate(c.data_entrada)}</td>
                <td className={td}>{fmtDate(c.data_onboarding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-20 text-center"><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum cliente encontrado</span></div>}
      </div>
    </div>
    );
  };

  // ================================================================
  // PAGE: GER. RISCO
  // ================================================================
  const renderRisco = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Gerenciamento de Risco" subtitle="Monitoramento de saúde e pilares de risco">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Última Atualização" value={new Date().toLocaleDateString('pt-BR')} />
        <KpiCard label="LT Médio" value={metrics.avgLT.toFixed(1)} />
        <KpiCard label="Clientes Ativos" value={metrics.active.length} />
        <KpiCard label="Em Risco" value={metrics.danger.length + metrics.churn.length} accent="text-red-500" />
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left min-w-[1100px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th colSpan={8} className="px-4 py-2 text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/60 rounded-tl-[20px]">Dados Empresas</th>
              <th colSpan={3} className="px-4 py-2 text-[8px] font-black text-amber-600 uppercase tracking-widest bg-amber-50/60">CSAT / NPS / MHS</th>
              <th colSpan={3} className="px-4 py-2 text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50/60 rounded-tr-[20px]">Gerenciamento de Risco</th>
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className={th}>Marca</th>
              <th className={`${th} min-w-[180px]`}>Cliente</th>
              <th className={th}>Status</th>
              <th className={th}>Squad</th>
              <th className={th}>Contato Tri.</th>
              <th className={th}>Assinatura</th>
              <th className={th}>Churn</th>
              <th className={th}>LT</th>
              <th className={th}>NPS</th>
              <th className={th}>Recomendação</th>
              <th className={th}>Status Atual</th>
              <th className={th}>Resultado</th>
              <th className={th}>Entregas</th>
              <th className={th}>Relacionam.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className={trHover} onClick={() => openDetail(c)}>
                <td className="px-4 py-3.5"><BrandDots brands={c.brands} companyLogo={c.company_logo} companyName={c.company_name} logos={brandLogos} /></td>
                <td className={tdBold}>{c.company_name}</td>
                <td className={td}><span className={`font-bold ${c.status === 'active' ? 'text-emerald-600' : c.status === 'churned' ? 'text-red-500' : 'text-gray-400'}`}>{c.status === 'active' ? 'Ativo' : c.status === 'churned' ? 'Churned' : 'Inativo'}</span></td>
                <td className={`${td} font-bold text-blue-600`}>{c.squad_name || '-'}</td>
                <td className={td}>{fmtDate(c.contato_trimestre)}</td>
                <td className={td}>{fmtDate(c.assinatura_date)}</td>
                <td className={td}>{fmtDate(c.churn_date)}</td>
                <td className={tdBold}>{c.lt?.toFixed(1) || '-'}</td>
                <td className={tdBold}>{c.nps ?? '-'}</td>
                <td className={td}>{c.recomendacao || <span className="text-gray-300 italic">Aguardando...</span>}</td>
                <td className="px-4 py-3.5"><StatusBadge status={c.health_status || c.health} /></td>
                <td className="px-4 py-3.5"><RiskBadge rating={c.risk_resultado} /></td>
                <td className="px-4 py-3.5"><RiskBadge rating={c.risk_entregas} /></td>
                <td className="px-4 py-3.5"><RiskBadge rating={c.risk_relacionamento} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-20 text-center"><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum cliente encontrado</span></div>}
      </div>

      {/* LEGENDA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-[20px] border border-gray-100 space-y-4">
          <SectionTitle>Classificação das Flags</SectionTitle>
          <div className="space-y-2">
            {([
              { st: 'danger' as ClientHealthStatus, r: 'Ruim' as RiskRating, e: 'Ruim' as RiskRating, rl: 'Ruim' as RiskRating },
              { st: 'care' as ClientHealthStatus, r: 'Normal' as RiskRating, e: 'Normal' as RiskRating, rl: 'Normal' as RiskRating },
              { st: 'safe' as ClientHealthStatus, r: 'Bom' as RiskRating, e: 'Bom' as RiskRating, rl: 'Normal' as RiskRating },
              { st: 'safe' as ClientHealthStatus, r: 'Bom' as RiskRating, e: 'Bom' as RiskRating, rl: 'Bom' as RiskRating },
            ]).map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <StatusBadge status={row.st} />
                <RiskBadge rating={row.r} /><RiskBadge rating={row.e} /><RiskBadge rating={row.rl} />
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 bg-white rounded-[20px] border border-gray-100 space-y-4">
          <SectionTitle>Critérios de Risco</SectionTitle>
          <div className="space-y-3 text-[11px]">
            <div><span className="font-black text-gray-700">Resultado:</span> <span className="text-gray-500">Performance a longo prazo, metas batidas, mensuração</span></div>
            <div><span className="font-black text-gray-700">Entregas:</span> <span className="text-gray-500">Refações, erros, organização interna, volume de demandas</span></div>
            <div><span className="font-black text-gray-700">Relacionamento:</span> <span className="text-gray-500">Gestão de projeto, comunicação, rapport, operacional</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  // ================================================================
  // PAGE: PLANNING
  // ================================================================
  const renderPlanning = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Planning" subtitle={`${planning.length} oportunidades no pipeline`}>
        <BtnPrimary onClick={() => { setPlanningForm(EMPTY_PLANNING); setEditingPlanning(null); setShowPlanningForm(true); }}>+ Novo Pipeline</BtnPrimary>
      </PageHeader>

      {/* MINI KPIS — exclui recusados dos totais projetados */}
      {(() => {
        const ativos = planning.filter(p => p.status !== 'recusado');
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total MRR Pipeline" value={fmt(ativos.reduce((s, p) => s + (p.mrr_value || 0), 0))} sub={`${ativos.length} ativos`} />
            <KpiCard label="Total One Time" value={fmt(ativos.reduce((s, p) => s + (p.one_time_value || 0), 0))} />
            <KpiCard label="Fechados" value={planning.filter(p => p.status === 'fechado').length} accent="text-emerald-600" />
            <KpiCard label="Aguardando" value={planning.filter(p => p.status === 'aguardando').length} />
          </div>
        );
      })()}

      <div className="overflow-x-auto rounded-[20px] border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left min-w-[1200px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className={`${th} min-w-[140px]`}>Cliente</th>
              <th className={th}>Account</th>
              <th className={`${th} min-w-[200px]`}>Produto</th>
              <th className={th}>Farmer</th>
              <th className={`${th} min-w-[220px]`}>Milestones / Triggers</th>
              <th className={th}>Consciência</th>
              <th className={th}>Previsão</th>
              <th className={`${th} text-right`}>MRR</th>
              <th className={`${th} text-right`}>One Time</th>
              <th className={`${th} text-right`}>Variável</th>
              <th className={th}>Status</th>
              <th className={`${th} w-20`}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {planning.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <td className={tdBold}>{p.client_name}</td>
                <td className={`${td} font-bold`}>{p.account || '-'}</td>
                <td className={td}>{p.produto || '-'}</td>
                <td className={`${td} font-bold`}>{p.farmer || '-'}</td>
                <td className="px-4 py-3 text-[10px] font-medium text-gray-500 leading-relaxed">{p.milestones_triggers || '-'}</td>
                <td className={`${td} text-[10px] font-bold`}>{CONSCIOUSNESS_SHORT[p.consciousness_level] || '-'}</td>
                <td className={`${td} font-bold`}>{p.previsao_entrada || '-'}</td>
                <td className={`${tdBold} text-right`}>{p.mrr_value ? fmt(p.mrr_value) : '-'}</td>
                <td className={`${tdBold} text-right`}>{p.one_time_value ? fmt(p.one_time_value) : '-'}</td>
                <td className={`${tdBold} text-right`}>{p.variavel_value ? fmt(p.variavel_value) : '-'}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${PLANNING_STATUS_COLORS[p.status] || ''}`}>
                    {PLANNING_STATUS_LABELS[p.status] || p.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1">
                    <button onClick={() => { setPlanningForm({ ...p }); setEditingPlanning(p); setShowPlanningForm(true); }}
                      className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-black hover:text-white transition-all border border-gray-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onClick={() => delPlan(p.id)}
                      className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-red-400 border border-red-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {planning.length === 0 && <div className="py-20 text-center"><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Pipeline vazio — adicione o primeiro item</span></div>}
      </div>
    </div>
  );

  // ================================================================
  // PAGE: BACKLOG RECEITA
  // ================================================================
  const renderBacklog = () => {
    const totals = backlogData.reduce((a, [, v]) => ({ mrr: a.mrr + v.mrr, ot: a.ot + v.ot, v: a.v + v.v }), { mrr: 0, ot: 0, v: 0 });
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader title="Backlog de Receita" subtitle="Previsão de faturamento por período" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="SUM de MRR" value={fmt(totals.mrr)} />
          <KpiCard label="SUM de One Time" value={fmt(totals.ot)} />
          <KpiCard label="SUM de Variável" value={fmt(totals.v)} />
          <KpiCard label="Total Pipeline" value={fmt(totals.mrr + totals.ot + totals.v)} accent="text-brand" />
        </div>

        <div className="overflow-x-auto rounded-[20px] border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                <th className={`${th} min-w-[200px]`}>Previsão de Entrada</th>
                <th className={`${th} text-right`}>SUM de MRR</th>
                <th className={`${th} text-right`}>SUM de One Time</th>
                <th className={`${th} text-right`}>SUM de Variável</th>
              </tr>
            </thead>
            <tbody>
              {backlogData.map(([month, v]) => (
                <tr key={month} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className={`${td} font-bold text-gray-700`}>{month}</td>
                  <td className={`${tdBold} text-right`}>{fmt(v.mrr)}</td>
                  <td className={`${tdBold} text-right`}>{fmt(v.ot)}</td>
                  <td className={`${tdBold} text-right`}>{fmt(v.v)}</td>
                </tr>
              ))}
            </tbody>
            {backlogData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-900 text-white rounded-b-[20px]">
                  <td className="px-4 py-4 text-[10px] font-black uppercase tracking-wider">Total Geral</td>
                  <td className="px-4 py-4 text-[12px] font-black text-right">{fmt(totals.mrr)}</td>
                  <td className="px-4 py-4 text-[12px] font-black text-right">{fmt(totals.ot)}</td>
                  <td className="px-4 py-4 text-[12px] font-black text-right">{fmt(totals.v)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {backlogData.length === 0 && <div className="py-20 text-center"><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sem dados — adicione itens no Planning</span></div>}
        </div>

        {/* BREAKDOWN BY STATUS */}
        {planning.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.entries(PLANNING_STATUS_LABELS) as [PlanningStatus, string][]).map(([key, label]) => {
              const items = planning.filter(p => p.status === key);
              const total = items.reduce((s, p) => s + (p.mrr_value || 0) + (p.one_time_value || 0) + (p.variavel_value || 0), 0);
              return (
                <div key={key} className="p-5 bg-white rounded-[20px] border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[7px] font-black uppercase border ${PLANNING_STATUS_COLORS[key]}`}>{label}</span>
                  </div>
                  <span className="text-xl font-black text-gray-900 block">{fmt(total)}</span>
                  <span className="text-[9px] font-bold text-gray-400">{items.length} item(ns)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ================================================================
  // CLIENT DETAIL
  // ================================================================
  const renderDetail = () => {
    if (!selectedClient) return null;
    const c = selectedClient;
    const rd = daysBetween(c.churn_status?.renewal_date);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="space-y-4">
          <button onClick={() => setView('cadastro')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-brand transition-colors">&larr; Voltar</button>
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              {c.company_logo ? (
                <img src={c.company_logo} alt={c.company_name} className="w-16 h-16 object-contain rounded-2xl border border-gray-100" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-100">
                  <span className="text-xl font-black text-gray-400">{c.company_name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter leading-none inline-flex items-center">{c.company_name}</h1>
                <BrandDots brands={c.brands} companyLogo={c.company_logo} companyName={c.company_name} logos={brandLogos} />
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <StatusBadge status={c.health_status || c.health} size="md" />
                <span className="text-[10px] font-bold text-gray-400">{c.industry} · {c.location || '-'} · Squad: {c.squad_name || '-'} · {c.contract_model || '-'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <BtnSecondary onClick={startEdit}>Editar</BtnSecondary>
              {currentRole === 'MASTER' && (
                <button onClick={() => del(c.id)} className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all">Remover</button>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* A: IDENTIDADE & CONTATO */}
          <div className="p-6 bg-white rounded-[20px] border border-gray-100 space-y-5">
            <SectionTitle>Identidade & Contato</SectionTitle>
            {/* MARCAS ATIVAS */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'phant' as const, label: 'Phant', letter: 'P', colorBg: 'bg-purple-600', bg: 'bg-purple-50 border-purple-200 text-purple-700', activeBg: 'bg-purple-600 text-white border-purple-600' },
                { key: 'leadbox' as const, label: 'Leadbox', letter: 'L', colorBg: 'bg-blue-600', bg: 'bg-blue-50 border-blue-200 text-blue-700', activeBg: 'bg-blue-600 text-white border-blue-600' },
                { key: 'vivemus' as const, label: 'Vivemus', letter: 'V', colorBg: 'bg-emerald-600', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', activeBg: 'bg-emerald-600 text-white border-emerald-600' },
              ].map(b => {
                const isActive = c.brands?.[b.key]?.active;
                const logo = brandLogos[b.key];
                return (
                  <span key={b.key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${isActive ? b.activeBg : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                    {logo ? (
                      <img src={logo} alt={b.label} className={`w-4 h-4 object-contain rounded-full ${isActive ? 'brightness-0 invert' : 'opacity-40'}`} />
                    ) : (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black ${isActive ? 'bg-white/20 text-white' : `${b.colorBg} text-white opacity-40`}`}>{b.letter}</span>
                    )}
                    {b.label}
                  </span>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-[12px]">
              <span className="font-bold text-gray-400">Indústria</span><span className="font-black text-gray-900">{c.industry || '-'}</span>
              <span className="font-bold text-gray-400">Localização</span><span className="font-black text-gray-900">{c.location || '-'}</span>
              <span className="font-bold text-gray-400">Funcionários</span><span className="font-black text-gray-900">{c.num_funcionarios || '-'}</span>
              <span className="font-bold text-gray-400">CNPJ</span><span className="font-black text-gray-900">{c.cnpj || '-'}</span>
              <span className="font-bold text-gray-400">Website</span>
              <span>{c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">{c.website}</a> : <span className="text-gray-300">-</span>}</span>
            </div>
            {c.assinatura_descricao && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mb-1">Assinatura</span>
                <p className="text-[11px] font-bold text-blue-900/70 leading-relaxed">{c.assinatura_descricao}</p>
                {c.forma_pagamento && <span className="text-[9px] font-bold text-blue-400 mt-1 block">Pagamento: {c.forma_pagamento}</span>}
              </div>
            )}
            <div className="pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-gray-900 block">{c.contact?.name || '-'}</span>
                  <span className="text-xs font-medium text-gray-400">{c.contact?.email}</span>
                </div>
                {c.contact?.phone && (
                  <a href={`https://wa.me/${c.contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">WhatsApp</a>
                )}
              </div>
            </div>
          </div>

          {/* B: SAÚDE & RISCO */}
          <div className="p-6 bg-white rounded-[20px] border border-gray-100 space-y-5">
            <SectionTitle>Saúde & Risco</SectionTitle>
            <div className="flex items-center gap-4">
              <StatusBadge status={c.health_status || c.health} size="md" />
              <div className="flex-1 text-right">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest block">LT</span>
                <span className="text-2xl font-black text-gray-900">{c.lt?.toFixed(1) || '-'}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Resultado', value: c.risk_resultado },
                { label: 'Entregas', value: c.risk_entregas },
                { label: 'Relacionamento', value: c.risk_relacionamento },
              ].map(r => (
                <div key={r.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-[8px] font-black text-gray-400 block mb-1">{r.label}</span>
                  <RiskBadge rating={r.value} />
                </div>
              ))}
            </div>
            {c.churn_status?.renewal_date && (
              <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                <div><span className="text-[8px] font-black text-gray-300 uppercase block">Renovação</span><span className="text-sm font-black">{fmtDate(c.churn_status.renewal_date)}</span></div>
                <div className={`px-3 py-1.5 rounded-xl text-center ${rd <= 7 ? 'bg-red-100' : rd <= 30 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <span className={`text-xl font-black ${rd <= 7 ? 'text-red-600' : rd <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{rd}</span>
                  <span className="text-[7px] font-black text-gray-400 uppercase block">dias</span>
                </div>
              </div>
            )}
            {c.intervention_plan && c.health === 'danger' && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[8px] font-black text-red-600 uppercase tracking-widest block mb-1">Plano de Intervenção</span>
                <p className="text-xs font-bold text-red-800/70 leading-relaxed">{c.intervention_plan}</p>
              </div>
            )}
          </div>

          {/* C: FINANCEIRO */}
          <div className="p-6 bg-white rounded-[20px] border border-gray-100 space-y-5">
            <SectionTitle>Financeiro</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <div><span className="text-[8px] font-black text-gray-300 uppercase block mb-1">MRR</span><span className="text-xl font-black">{fmt(c.mrr)}</span></div>
              <div><span className="text-[8px] font-black text-gray-300 uppercase block mb-1">Fee</span><span className="text-xl font-black">{fmt(c.fee || 0)}</span></div>
              <div><span className="text-[8px] font-black text-gray-300 uppercase block mb-1">NPS</span><span className="text-xl font-black">{c.nps ?? '-'}</span></div>
            </div>
            <div><SectionTitle>Tendência</SectionTitle><TrendChart data={c.financial_history || []} /></div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50 text-[11px]">
              <div><span className="font-bold text-gray-400 block">Entrada</span><span className="font-black">{fmtDate(c.data_entrada)}</span></div>
              <div><span className="font-bold text-gray-400 block">Assinatura</span><span className="font-black">{fmtDate(c.assinatura_date)}</span></div>
              <div><span className="font-bold text-gray-400 block">Modelo</span><span className="font-black">{c.contract_model || '-'}</span></div>
            </div>
          </div>

          {/* D: EXPANSÃO */}
          <div className="p-6 bg-white rounded-[20px] border border-gray-100 space-y-5">
            <SectionTitle>Expansão & Consciência</SectionTitle>
            <div className="space-y-2">
              <div className="flex gap-1">
                {Object.keys(CONSCIOUSNESS_LABELS).map((k, i) => (
                  <div key={k} className={`flex-1 h-2 rounded-full ${k === c.consciousness_level ? 'bg-brand' : i <= Object.keys(CONSCIOUSNESS_LABELS).indexOf(c.consciousness_level) ? 'bg-blue-200' : 'bg-gray-100'}`} />
                ))}
              </div>
              <span className="text-xs font-black text-brand">{CONSCIOUSNESS_LABELS[c.consciousness_level]}</span>
            </div>
            {(c.upsell_pipeline || []).length > 0 && (
              <div className="space-y-2">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Pipeline Upsell</span>
                {c.upsell_pipeline.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">{item.product}</span>
                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${item.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : item.status === 'negotiating' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.status === 'identified' ? 'Identificado' : item.status === 'proposed' ? 'Proposto' : item.status === 'negotiating' ? 'Negociando' : 'Fechado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(c.milestones || []).length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-50">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Milestones</span>
                {c.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black ${m.completed ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {m.completed ? '\u2713' : i + 1}
                    </span>
                    <span className={`text-[11px] font-bold flex-1 ${m.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{m.title}</span>
                    <span className="text-[9px] font-bold text-gray-400">{fmtDate(m.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {c.notes && (
          <div className="p-6 bg-white rounded-[20px] border border-gray-100">
            <SectionTitle>Observações</SectionTitle>
            <p className="text-sm font-medium text-gray-600 leading-relaxed mt-2">{c.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="max-w-[1800px] mx-auto pb-24 px-2">
      {view === 'dashboard' && renderDashboard()}
      {view === 'cadastro' && renderCadastro()}
      {view === 'risco' && renderRisco()}
      {view === 'planning' && renderPlanning()}
      {view === 'backlog' && renderBacklog()}
      {view === 'detail' && renderDetail()}
      {(showNewForm || isEditing) && renderForm()}
      {showPlanningForm && renderPlanForm()}
      {showImportModal && renderImportModal()}
      {showReconcileModal && renderReconcileModal()}
    </div>
  );
};

export default ClientManagement;
