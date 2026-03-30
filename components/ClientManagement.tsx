
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ClientRecord, ClientHealthBadge, ClientHealthStatus, ConsciousnessLevel, UserRole, PlanningItem, PlanningStatus, RiskRating, AppCustomization } from '../types';
import { SupabaseService } from '../services/api';

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
  brands: { phant: { active: true, mrr: 0, is_planning: false }, leadbox: { active: false, has_propagation: false }, vivemus: { active: false, has_consulting: false } },
  health: 'care', health_status: 'care',
  risk_pillars: [{ name: 'Resultado', score: 5 }, { name: 'Entregas', score: 5 }, { name: 'Relacionamento', score: 5 }],
  risk_resultado: '', risk_entregas: '', risk_relacionamento: '',
  delivery_score: 5, churn_status: { renewal_date: '', contract_months: 12 },
  mrr: 0, fee: 0, contract_model: 'Growth', squad_name: '',
  ano_fundacao: '', receita_anual: '', num_funcionarios: '', data_entrada: '', data_onboarding: '',
  contato_trimestre: '', assinatura_date: '', churn_date: '',
  lt: undefined, nps: undefined, ultima_nota: undefined, recomendacao: '',
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
const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const fmtDate = (d?: string) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; } };
const daysBetween = (d: string) => { if (!d) return 0; return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); };

// ====== MICRO COMPONENTS ======
// ====== BRAND LOGO URLs ======
const PHANT_LOGO = 'https://phant.com.br/uploads/simbolo_roxo.png';
const LEADBOX_LOGO = 'https://phant.com.br/uploads/192x192_20260210_054010_7be369d9.png';
const VIVEMUS_LOGO = 'https://phant.com.br/uploads/foto_perfil_20260228_231237_ee6c4fb3.png';

// ====== BRAND INLINE BADGES (ao lado do nome no dashboard) ======
const PhantTag: React.FC<{ brands?: ClientRecord['brands'] }> = ({ brands }) => {
  const items = [
    { active: brands?.phant?.active, logo: PHANT_LOGO, title: 'Phant' },
    { active: brands?.leadbox?.active, logo: LEADBOX_LOGO, title: 'Leadbox' },
    { active: brands?.vivemus?.active, logo: VIVEMUS_LOGO, title: 'Vivemus' },
  ];
  const activeItems = items.filter(d => d.active);
  if (activeItems.length === 0) return null;
  return (
    <>
      {activeItems.map(d => (
        <img key={d.title} src={d.logo} alt={d.title} title={d.title} className="inline-block w-[18px] h-[18px] object-contain shrink-0 align-middle ml-1.5 rounded-full" />
      ))}
    </>
  );
};

// ====== BRAND BADGES (logos na coluna Marca) ======
const BrandDots: React.FC<{ brands: ClientRecord['brands'] }> = ({ brands }) => {
  const items = [
    { active: brands?.phant?.active, logo: PHANT_LOGO, title: 'Phant' },
    { active: brands?.leadbox?.active, logo: LEADBOX_LOGO, title: 'Leadbox' },
    { active: brands?.vivemus?.active, logo: VIVEMUS_LOGO, title: 'Vivemus' },
  ];
  const activeItems = items.filter(d => d.active);
  if (activeItems.length === 0) return <span className="text-[10px] text-gray-300">-</span>;
  return (
    <div className="flex gap-1.5 items-center">
      {activeItems.map(d => (
        <img key={d.title} src={d.logo} alt={d.title} title={d.title} className="w-6 h-6 object-contain rounded-full" />
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, p] = await Promise.all([SupabaseService.fetchClients(), SupabaseService.fetchPlanning()]);
      setClients(c); setPlanning(p);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (view !== 'detail') setView(initialView); }, [initialView]);

  // ====== METRICS ======
  const metrics = useMemo(() => {
    const active = clients.filter(c => c.status === 'active');
    const totalMRR = active.reduce((s, c) => s + (c.mrr || 0), 0);
    const danger = active.filter(c => c.health === 'danger');
    const care = active.filter(c => c.health === 'care');
    const safe = active.filter(c => c.health === 'safe');
    const churn = clients.filter(c => c.health_status === 'churn' || c.status === 'churned');
    const impl = clients.filter(c => c.health_status === 'implementacao');
    const silent = active.filter(c => { if (!c.last_report_date) return true; return daysBetween(c.last_report_date) < -30; });
    const lts = active.filter(c => c.lt);
    const avgLT = lts.length > 0 ? lts.reduce((s, c) => s + (c.lt || 0), 0) / lts.length : 0;
    const mrrBySquad: Record<string, number> = {};
    active.forEach(c => { const sq = c.squad_name || 'Sem Squad'; mrrBySquad[sq] = (mrrBySquad[sq] || 0) + (c.mrr || 0); });
    return { totalMRR, danger, care, safe, churn, impl, active, silent, avgLT, mrrBySquad };
  }, [clients]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const t = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.company_name.toLowerCase().includes(t) || c.contact?.name?.toLowerCase().includes(t) ||
      c.industry?.toLowerCase().includes(t) || c.squad_name?.toLowerCase().includes(t)
    );
  }, [clients, searchTerm]);

  const backlogData = useMemo(() => {
    const m: Record<string, { mrr: number; ot: number; v: number }> = {};
    planning.forEach(p => {
      const k = p.previsao_entrada || 'Sem data';
      if (!m[k]) m[k] = { mrr: 0, ot: 0, v: 0 };
      m[k].mrr += p.mrr_value || 0; m[k].ot += p.one_time_value || 0; m[k].v += p.variavel_value || 0;
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b));
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

        <div className="space-y-7">
          {/* DADOS EMPRESA */}
          <div className="space-y-3">
            <SectionTitle>Dados da Empresa</SectionTitle>
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
            {/* MARCAS */}
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'phant' as const, label: 'Phant', bg: 'bg-purple-50', border: 'border-purple-200', activeBg: 'bg-purple-600', icon: PHANT_LOGO },
                { key: 'leadbox' as const, label: 'Leadbox', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-600', icon: LEADBOX_LOGO },
                { key: 'vivemus' as const, label: 'Vivemus', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-600', icon: VIVEMUS_LOGO },
              ].map(b => {
                const isActive = editForm.brands?.[b.key]?.active;
                return (
                  <button key={b.key} type="button"
                    onClick={() => setEditForm({ ...editForm, brands: { ...editForm.brands, [b.key]: { ...editForm.brands?.[b.key], active: !isActive } } })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                      isActive ? `${b.activeBg} text-white border-transparent shadow-lg` : `${b.bg} ${b.border} text-gray-500`
                    }`}>
                    <img src={b.icon} alt={b.label} className={`w-4 h-4 object-contain rounded-full ${isActive ? 'brightness-0 invert' : ''}`} />
                    {b.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <InputField type="number" value={editForm.fee || 0} onChange={v => setEditForm({ ...editForm, fee: Number(v) })} placeholder="Fee" />
              <SelectField value={editForm.contract_model || 'Growth'} onChange={v => setEditForm({ ...editForm, contract_model: v })} options={CONTRACT_MODELS.map(m => ({ value: m, label: m }))} />
              <SelectField value={editForm.squad_name || ''} onChange={v => setEditForm({ ...editForm, squad_name: v })} options={dynamicSquadOptions.map(s => ({ value: s, label: s }))} placeholder="Squad" />
              <SelectField value={editForm.health_status || 'care'} onChange={v => {
                const healthMap: Record<string, ClientHealthBadge> = { safe: 'safe', care: 'care', danger: 'danger', churn: 'danger', implementacao: 'care' };
                setEditForm({ ...editForm, health_status: v, health: healthMap[v] || 'care' });
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
              <InputField type="date" value={editForm.data_entrada || ''} onChange={v => setEditForm({ ...editForm, data_entrada: v })} label="Data de Entrada" />
              <InputField type="date" value={editForm.data_onboarding || ''} onChange={v => setEditForm({ ...editForm, data_onboarding: v })} label="Início Onboarding" />
              <InputField type="date" value={editForm.assinatura_date || ''} onChange={v => setEditForm({ ...editForm, assinatura_date: v })} label="Assinatura" />
            </div>
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

          <button onClick={save} disabled={!editForm.company_name || savingState === 'saving'}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all ${
              savingState === 'saved' ? 'bg-emerald-500 text-white' : savingState === 'saving' ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-brand'
            }`}>
            {savingState === 'saved' ? 'Salvo!' : savingState === 'saving' ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
          </button>
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
  // PAGE: DASHBOARD
  // ================================================================
  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Dashboard" subtitle="Visão geral da carteira de clientes">
        <BtnPrimary onClick={newClient}>+ Novo Cliente</BtnPrimary>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="MRR Total Ativo" value={fmt(metrics.totalMRR)} />
        <KpiCard label="Clientes Ativos" value={metrics.active.length} />
        <KpiCard label="LT Médio" value={metrics.avgLT.toFixed(1)} />
        {Object.entries(metrics.mrrBySquad).slice(0, 2).map(([sq, mrr]) => (
          <KpiCard key={sq} label={`MRR ${sq}`} value={fmt(mrr as number)} />
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
                {c.company_name}<PhantTag brands={c.brands} />
              </button>
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
                    <span className="font-black text-sm text-gray-900 group-hover:text-brand transition-colors inline-flex items-center">{c.company_name}<PhantTag brands={c.brands} /></span>
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
  const renderCadastro = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Cadastro Geral" subtitle={`${clients.length} clientes cadastrados`}>
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        <BtnPrimary onClick={newClient}>+ Novo</BtnPrimary>
      </PageHeader>

      <div className="overflow-x-auto rounded-[20px] border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left min-w-[1200px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th colSpan={7} className="px-4 py-2 text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/60 rounded-tl-[20px]">Dados Empresa</th>
              <th colSpan={4} className="px-4 py-2 text-[8px] font-black text-violet-600 uppercase tracking-widest bg-violet-50/60">Dados Internos</th>
              <th colSpan={5} className="px-4 py-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/60 rounded-tr-[20px]">Dados Contrato</th>
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className={th}>#</th>
              <th className={th}>Marca</th>
              <th className={`${th} min-w-[180px]`}>Nome</th>
              <th className={th}>Status</th>
              <th className={th}>Localização</th>
              <th className={th}>Indústria</th>
              <th className={th}>Func.</th>
              <th className={th}>Fee</th>
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
                <td className="px-4 py-3.5"><BrandDots brands={c.brands} /></td>
                <td className={tdBold}><span className="inline-flex items-center">{c.company_name}<PhantTag brands={c.brands} /></span></td>
                <td className={td}>
                  <span className={`text-[10px] font-black ${c.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {c.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className={td}>{c.location || '-'}</td>
                <td className={td}>{c.industry || '-'}</td>
                <td className={`${td} text-center`}>{c.num_funcionarios || '-'}</td>
                <td className={tdBold}>{c.fee ? fmt(c.fee) : '-'}</td>
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
                <td className="px-4 py-3.5"><BrandDots brands={c.brands} /></td>
                <td className={tdBold}><span className="inline-flex items-center">{c.company_name}<PhantTag brands={c.brands} /></span></td>
                <td className={td}><span className={c.status === 'active' ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{c.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
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

      {/* MINI KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total MRR Pipeline" value={fmt(planning.reduce((s, p) => s + (p.mrr_value || 0), 0))} />
        <KpiCard label="Total One Time" value={fmt(planning.reduce((s, p) => s + (p.one_time_value || 0), 0))} />
        <KpiCard label="Fechados" value={planning.filter(p => p.status === 'fechado').length} accent="text-emerald-600" />
        <KpiCard label="Aguardando" value={planning.filter(p => p.status === 'aguardando').length} />
      </div>

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
            <div className="flex gap-2 items-center">
              <BrandDots brands={c.brands} />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter leading-none inline-flex items-center">{c.company_name}<PhantTag brands={c.brands} /></h1>
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
            <div className="grid grid-cols-2 gap-y-3 text-[12px]">
              <span className="font-bold text-gray-400">Indústria</span><span className="font-black text-gray-900">{c.industry || '-'}</span>
              <span className="font-bold text-gray-400">Localização</span><span className="font-black text-gray-900">{c.location || '-'}</span>
              <span className="font-bold text-gray-400">Funcionários</span><span className="font-black text-gray-900">{c.num_funcionarios || '-'}</span>
              <span className="font-bold text-gray-400">Website</span>
              <span>{c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">{c.website}</a> : <span className="text-gray-300">-</span>}</span>
            </div>
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
                <div className={`px-3 py-1.5 rounded-xl text-center ${rd < 0 ? 'bg-red-100' : rd < 30 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <span className={`text-xl font-black ${rd < 0 ? 'text-red-600' : rd < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{rd}</span>
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
    </div>
  );
};

export default ClientManagement;
