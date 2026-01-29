
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService, SupabaseService, getAppOrigin, AuthService } from '../services/api';
import { SolutionItem, SolutionCategory, SolutionSubCategory, SolutionDuration, SolutionMaturity, AIConfig, AppCustomization, MonthlyGoal, SystemConfig } from '../types';
import { suggestSolutionDetails, parseBulkSolutions, generateSolutionDeliverables } from '../services/gemini';
import mammoth from 'mammoth';

type AdminTab = 'solutions' | 'metas' | 'system';

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('solutions');
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [isMagicFilling, setIsMagicFilling] = useState<string | number | null>(null);
  const [isGeneratingDeliverables, setIsGeneratingDeliverables] = useState<string | number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [variableInputs, setVariableInputs] = useState<Record<string, { label: string, valor: string }>>({});
  const [deliverableInputs, setDeliverableInputs] = useState<Record<string, string>>({});
  const [diferencialInputs, setDiferencialInputs] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [historyRealized, setHistoryRealized] = useState<Record<string, number>>({});

  const [appConfig, setAppConfig] = useState<AppCustomization>({
    companyName: "PhantLab",
    systemLogoUrl: "http://phant.com.br/uploads/simbolo_roxo.png",
    proposalLogoUrl: "http://phant.com.br/uploads/logo_light.png",
    primaryColor: "#2563eb",
    config: {
      categories: ["Direção", "Propagação", "Aceleração"],
      subCategories: ["Marca & Cultura", "Crescimento (Growth)", "Tecnologia", "Cursos & Mentorias"],
      durations: ["30 dias", "90 dias", "6 meses", "12 meses", "Recorrente"],
      maturities: ["Base", "Pro", "Advanced"],
      tags: ["High Ticket", "Recorrente", "Setup Requerido", "Escalável"],
      defaultProposalSections: {
        cover: true,
        strategicMap: true,
        tacticalScope: true,
        finalInvestment: true,
        backCover: true
      },
      slaThreshold: 100000,
      aiModelText: 'gemini-3-pro-preview',
      aiModelImage: 'gemini-3-pro-image-preview',
      aiMaxTokens: 8000,
      aiThinkingBudget: 4000,
      driveFolderId: "1-01ahpyVthGXZJNUH5rZCjFKxqCm8sOI",
      syncJobId: "d11a1e38-414b-4c69-bb58-9e655f0e2d29",
      enabledModules: ["dashboard", "copilot", "fichario", "catalogo", "pdf_builder"]
    }
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAllData = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const sols = await SupabaseService.fetchSolutions().catch(() => []);
      const branding = await SupabaseService.fetchAppConfig().catch(() => null);
      const loadedGoals = await SupabaseService.fetchGoals().catch(() => []);
      const history = await SupabaseService.fetchProposalsHistory().catch(() => []);

      const realizedMap: Record<string, number> = {};
      history?.forEach(p => {
        if (p.created_at) {
          const monthKey = new Date(p.created_at).toISOString().slice(0, 7);
          realizedMap[monthKey] = (realizedMap[monthKey] || 0) + (p.total_value || 0);
        }
      });

      if (sols) setSolutions(sols);
      if (branding) setAppConfig(branding);
      setGoals(generateGoalList(loadedGoals));
      setHistoryRealized(realizedMap);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const generateGoalList = (existing: MonthlyGoal[]) => {
    const list = [...existing];
    const today = new Date();
    for (let i = -6; i <= 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const key = d.toISOString().slice(0, 7);
        if (!list.find(g => g.month === key)) {
            list.push({ month: key, target: 0 });
        }
    }
    return list.sort((a, b) => b.month.localeCompare(a.month));
  };

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const handleSyncSolutions = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await SupabaseService.syncSolutions(solutions);
      if (result.success) showToast("Catálogo sincronizado com a Nuvem");
      else showToast("Erro na sincronia: " + result.message, "error");
    } catch (err) {
      showToast("Falha na conexão com o servidor", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMagicFill = async (id: string | number) => {
    const item = solutions.find(s => s.id === id);
    if (!item || !item.solucao) return;
    setIsMagicFilling(id);
    try {
      const details = await suggestSolutionDetails(item.solucao);
      setSolutions(prev => prev.map(s => s.id === id ? { ...s, ...details } : s));
      showToast("IA gerou os detalhes conforme suas instruções!");
    } catch (err) {
      showToast("Erro na IA", "error");
    } finally {
      setIsMagicFilling(null);
    }
  };

  const handleGenerateDeliverables = async (id: string | number) => {
    const item = solutions.find(s => s.id === id);
    if (!item || !item.solucao) return;
    setIsGeneratingDeliverables(id);
    try {
      const tasks = await generateSolutionDeliverables(item.solucao, item.descricao || "");
      if (tasks.length > 0) {
        setSolutions(prev => prev.map(s => s.id === id ? { ...s, entregaveis: tasks } : s));
        showToast("Fases do cronograma geradas pela IA!");
      }
    } catch (err) {
      showToast("Erro ao gerar fases", "error");
    } finally {
      setIsGeneratingDeliverables(null);
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      const newItems = await parseBulkSolutions(text);
      if (newItems && newItems.length > 0) {
        const formatted: SolutionItem[] = newItems.map((item, i) => ({
          ...item,
          id: `imp-${Date.now()}-${i}`,
          categoria: item.categoria || appConfig.config?.categories[0] || 'Direção',
          subcategoria: item.subcategoria || appConfig.config?.subCategories[0] || 'Marca & Cultura',
          duracao: item.duracao || appConfig.config?.durations[0] || '90 dias',
          maturidade: item.maturidade || appConfig.config?.maturities[0] || 'Base',
          valor_base_num: item.valor_base_num || 0,
          variaveis_opcionais: [],
          entregaveis: [],
          fee_mensal: item.fee_mensal || "R$ 0",
          promessa: item.promessa || ""
        } as SolutionItem));
        setSolutions(prev => [...prev, ...formatted]);
        showToast(`${formatted.length} soluções importadas!`);
      }
    } catch (err) {
      showToast("Erro ao processar arquivo", "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addSolution = () => {
    const newItem: SolutionItem = {
      id: `new-${Date.now()}`,
      solucao: "Nova Solução",
      promessa: "Promessa de valor",
      categoria: appConfig.config?.categories[0] || "Direção",
      subcategoria: appConfig.config?.subCategories[0] || "Marca & Cultura",
      duracao: appConfig.config?.durations[0] || "90 dias",
      maturidade: appConfig.config?.maturities[0] || "Base",
      fee_mensal: "R$ 0",
      valor_base_num: 0,
      variaveis_opcionais: [],
      entregaveis: [],
      dica_venda: "",
      diferenciais: [],
      link: ""
    };
    setSolutions([newItem, ...solutions]);
    setExpandedId(newItem.id);
  };

  const updateSolution = (id: string | number, field: keyof SolutionItem, value: any) => {
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSolution = (id: string | number) => {
    if (confirm("Deseja remover esta solução?")) {
      setSolutions(prev => prev.filter(s => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };
  
  const toggleFavorite = (id: string | number) => {
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s));
  };

  const handleAddVariable = (solutionId: string | number) => {
    const input = variableInputs[String(solutionId)] || { label: '', valor: '' };
    if (!input.label.trim()) return;
    const valorNum = parseFloat(input.valor) || 0;
    setSolutions(prev => prev.map(s => {
       if (s.id === solutionId) {
          const currentVars = s.variaveis_opcionais || [];
          return { ...s, variaveis_opcionais: [...currentVars, { label: input.label, valor: valorNum }] };
       }
       return s;
    }));
    setVariableInputs(prev => ({ ...prev, [String(solutionId)]: { label: '', valor: '' } }));
  };

  const handleRemoveVariable = (solutionId: string | number, index: number) => {
     setSolutions(prev => prev.map(s => {
        if (s.id === solutionId) {
           const newVars = [...(s.variaveis_opcionais || [])];
           newVars.splice(index, 1);
           return { ...s, variaveis_opcionais: newVars };
        }
        return s;
     }));
  };

  const handleAddDeliverable = (solutionId: string | number) => {
    const text = deliverableInputs[String(solutionId)] || '';
    if (!text.trim()) return;
    setSolutions(prev => prev.map(s => {
      if (s.id === solutionId) {
        const current = s.entregaveis || [];
        return { ...s, entregaveis: [...current, text.trim()] };
      }
      return s;
    }));
    setDeliverableInputs(prev => ({ ...prev, [String(solutionId)]: '' }));
  };

  const handleRemoveDeliverable = (solutionId: string | number, index: number) => {
    setSolutions(prev => prev.map(s => {
      if (s.id === solutionId) {
        const current = [...(s.entregaveis || [])];
        current.splice(index, 1);
        return { ...s, entregaveis: current };
      }
      return s;
    }));
  };

  const handleAddDiferencial = (solutionId: string | number) => {
    const text = diferencialInputs[String(solutionId)] || '';
    if (!text.trim()) return;
    setSolutions(prev => prev.map(s => {
      if (s.id === solutionId) {
        const current = s.diferenciais || [];
        return { ...s, diferenciais: [...current, text.trim()] };
      }
      return s;
    }));
    setDiferencialInputs(prev => ({ ...prev, [String(solutionId)]: '' }));
  };

  const handleRemoveDiferencial = (solutionId: string | number, index: number) => {
    setSolutions(prev => prev.map(s => {
      if (s.id === solutionId) {
        const current = [...(s.diferenciais || [])];
        current.splice(index, 1);
        return { ...s, diferenciais: current };
      }
      return s;
    }));
  };

  const toggleSolutionTag = (solutionId: string | number, tag: string) => {
    setSolutions(prev => prev.map(s => {
      if (s.id === solutionId) {
        const currentTags = s.tags || [];
        const nextTags = currentTags.includes(tag) 
          ? currentTags.filter(t => t !== tag) 
          : [...currentTags, tag];
        return { ...s, tags: nextTags };
      }
      return s;
    }));
  };

  const saveCustomization = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await SupabaseService.syncAppConfig(appConfig);
      if (res.success) {
        showToast("Governança atualizada!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast("Erro ao salvar", "error");
      }
    } catch {
      showToast("Falha de rede", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTaxonomy = (field: keyof SystemConfig, value: string) => {
    if (!value.trim() || !appConfig.config) return;
    const currentList = (appConfig.config[field] as string[]) || [];
    if (currentList.includes(value)) return;
    setAppConfig({
      ...appConfig,
      config: { ...appConfig.config, [field]: [...currentList, value.trim()] }
    });
  };

  const handleRemoveTaxonomy = (field: keyof SystemConfig, index: number) => {
    if (!appConfig.config) return;
    const currentList = [...((appConfig.config[field] as string[]) || [])];
    currentList.splice(index, 1);
    setAppConfig({
      ...appConfig,
      config: { ...appConfig.config, [field]: currentList }
    });
  };

  const toggleModule = (moduleId: string) => {
    if (!appConfig.config) return;
    const current = appConfig.config.enabledModules || [];
    const next = current.includes(moduleId) 
      ? current.filter(id => id !== moduleId) 
      : [...current, moduleId];
    setAppConfig({
      ...appConfig,
      config: { ...appConfig.config, enabledModules: next }
    });
  };

  const updateGoal = (month: string, val: number) => {
    setGoals(prev => prev.map(g => g.month === month ? { ...g, target: val } : g));
  };

  const saveGoals = async () => {
    setIsSyncing(true);
    try {
      await SupabaseService.syncGoals(goals);
      showToast("Metas salvas!");
    } finally { setIsSyncing(false); }
  };

  const formatMonth = (m: string) => {
    const [y, month] = m.split('-');
    return new Date(parseInt(y), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredSolutions = solutions
    .filter(s => s.solucao.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.is_favorite === b.is_favorite ? 0 : a.is_favorite ? -1 : 1));

  if (isInitialLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-300 uppercase tracking-widest text-[10px]">Carregando Governança...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4">
      {toast && (
        <div className={`fixed top-10 right-10 z-[200] px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest ${toast.type === 'error' ? 'bg-red-600' : 'bg-black'} text-white animate-in slide-in-from-right-10 duration-300`}>
          {toast.message}
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4">Administração</h1>
          <p className="text-gray-400 text-xl font-medium tracking-tight">Painel de Controle do Arquiteto</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex-wrap gap-1">
          {(['solutions', 'metas', 'system'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              {tab === 'solutions' ? 'Catálogo' : tab === 'metas' ? 'Metas' : 'Sistema'}
            </button>
          ))}
        </div>
      </header>

      {/* RENDER SOLUTIONS TAB */}
      {activeTab === 'solutions' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex-1 w-full md:w-auto relative">
               <input 
                  type="text" 
                  placeholder="Buscar solução..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold text-sm focus:bg-white border border-transparent focus:border-brand outline-none transition-all shadow-inner"
               />
               <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={addSolution} className="flex-1 md:flex-none px-8 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap">+ Nova Solução</button>
              <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex-1 md:flex-none px-8 py-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                {isImporting ? '...' : 'Importar DOCX'}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportDocx} accept=".docx" className="hidden" />
              <button onClick={handleSyncSolutions} disabled={isSyncing} className={`flex-1 md:flex-none px-10 py-4 ${isSyncing ? 'bg-gray-400' : 'bg-brand'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap`}>
                {isSyncing ? 'Salvando...' : 'Sincronizar'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredSolutions.map((item) => (
              <div key={item.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                {/* Collapsed Header */}
                <div 
                  className={`flex flex-col md:flex-row items-center justify-between p-6 cursor-pointer transition-colors ${expandedId === item.id ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex items-center gap-6 flex-1 w-full min-w-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                      className={`transition-all text-xl ${item.is_favorite ? 'text-amber-500 scale-110' : 'text-gray-200 hover:text-amber-300'}`}
                    >
                      ★
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-xl text-gray-900 truncate tracking-tight uppercase italic">{item.solucao}</p>
                        <span className={`px-2 py-0.5 ${item.categoria === 'Aceleração' ? 'bg-purple-50 text-purple-600' : item.categoria === 'Propagação' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} text-[8px] font-black uppercase tracking-widest rounded`}>
                          {item.categoria}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-gray-400 truncate mt-1 italic">"{item.promessa}"</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-10 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Investimento Base</p>
                       <p className="text-lg font-black text-gray-900 tracking-tighter">{formatCurrency(item.valor_base_num)}</p>
                    </div>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${expandedId === item.id ? 'bg-black text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Editor Body */}
                {expandedId === item.id && (
                  <div className="p-8 md:p-12 bg-white border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    {/* Top Action Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-gray-50/50 p-6 rounded-[24px] border border-gray-100">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">⚡</div>
                         <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Configuração de Ativo</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Refinamento técnico e comercial da solução</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleMagicFill(item.id)}
                          disabled={isMagicFilling === item.id}
                          className="px-6 py-3 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                          {isMagicFilling === item.id ? 'Sincronizando...' : '✨ Magic Fill (IA)'}
                        </button>
                        <button 
                          onClick={() => handleGenerateDeliverables(item.id)}
                          disabled={isGeneratingDeliverables === item.id}
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                          {isGeneratingDeliverables === item.id ? 'Mapeando...' : '📅 Gerar Cronograma (IA)'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      
                      {/* COLUNA ESQUERDA: IDENTIDADE E ESTRATÉGIA */}
                      <div className="space-y-10">
                        {/* IDENTIDADE */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 space-y-6 shadow-sm">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                             Identidade da Solução
                          </span>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Título Comercial</label>
                              <input 
                                value={item.solucao} 
                                onChange={(e) => updateSolution(item.id, 'solucao', e.target.value)}
                                className="w-full bg-gray-50 border-transparent border focus:border-blue-500 focus:bg-white p-4 rounded-xl font-black text-lg outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Promessa Principal (Headline)</label>
                              <textarea 
                                value={item.promessa} 
                                onChange={(e) => updateSolution(item.id, 'promessa', e.target.value)} 
                                className="w-full bg-gray-50 border-transparent border focus:border-blue-500 focus:bg-white p-4 rounded-xl font-bold text-sm outline-none min-h-[80px] transition-all" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição do Escopo</label>
                              <textarea 
                                value={item.descricao} 
                                onChange={(e) => updateSolution(item.id, 'descricao', e.target.value)} 
                                className="w-full bg-gray-50 border-transparent border focus:border-blue-500 focus:bg-white p-4 rounded-xl font-medium text-xs outline-none min-h-[120px] transition-all" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* ESTRATÉGIA / ROI */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 space-y-6 shadow-sm">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                             Estratégia & ROI
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Público-Alvo</label>
                               <textarea 
                                 value={item.publico_alvo} 
                                 onChange={(e) => updateSolution(item.id, 'publico_alvo', e.target.value)} 
                                 className="w-full bg-gray-50 p-4 rounded-xl font-bold text-[10px] min-h-[100px] outline-none border border-transparent focus:border-emerald-500" 
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Resultado Esperado</label>
                               <textarea 
                                 value={item.resultado_esperado} 
                                 onChange={(e) => updateSolution(item.id, 'resultado_esperado', e.target.value)} 
                                 className="w-full bg-gray-50 p-4 rounded-xl font-bold text-[10px] min-h-[100px] outline-none border border-transparent focus:border-emerald-500" 
                               />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Diferenciais Competitivos</label>
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               {item.diferenciais?.map((d, idx) => (
                                 <span key={idx} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-black uppercase text-gray-600 flex items-center gap-2">
                                   {d}
                                   <button onClick={() => handleRemoveDiferencial(item.id, idx)} className="text-red-400 hover:text-red-600 transition-colors">×</button>
                                 </span>
                               ))}
                               <input 
                                 placeholder="Novo diferencial..." 
                                 value={diferencialInputs[String(item.id)] || ''}
                                 onChange={(e) => setDiferencialInputs({...diferencialInputs, [String(item.id)]: e.target.value})}
                                 onKeyDown={(e) => e.key === 'Enter' && handleAddDiferencial(item.id)}
                                 className="bg-transparent text-[10px] font-bold outline-none flex-1 min-w-[150px]"
                               />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COLUNA DIREITA: COMERCIAL E OPERAÇÕES */}
                      <div className="space-y-10">
                        {/* COMERCIAL / PRECIFICAÇÃO */}
                        <div className="bg-black text-white rounded-[32px] p-8 space-y-6 shadow-2xl">
                          <span className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
                             Precificação & Taxonomia
                          </span>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Investimento Base</label>
                              <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold text-xs">R$</span>
                                 <input 
                                   type="number" 
                                   value={item.valor_base_num} 
                                   onChange={(e) => updateSolution(item.id, 'valor_base_num', parseFloat(e.target.value))} 
                                   className="w-full bg-white/10 border-transparent border focus:border-brand p-4 pl-12 rounded-xl font-black text-xl text-white outline-none" 
                                 />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Duração Padrão</label>
                              <select 
                                value={item.duracao} 
                                onChange={(e) => updateSolution(item.id, 'duracao', e.target.value)} 
                                className="w-full bg-white/10 p-4 rounded-xl font-bold text-xs text-white outline-none cursor-pointer"
                              >
                                {appConfig.config?.durations.map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3">
                             <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Categorização do Ativo</label>
                             <div className="grid grid-cols-3 gap-3">
                                <select value={item.categoria} onChange={(e) => updateSolution(item.id, 'categoria', e.target.value)} className="bg-white/10 p-3 rounded-lg text-[10px] font-black uppercase text-white outline-none">
                                  {appConfig.config?.categories.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                                </select>
                                <select value={item.subcategoria} onChange={(e) => updateSolution(item.id, 'subcategoria', e.target.value)} className="bg-white/10 p-3 rounded-lg text-[10px] font-black uppercase text-white outline-none">
                                  {appConfig.config?.subCategories.map(sc => <option key={sc} value={sc} className="bg-black">{sc}</option>)}
                                </select>
                                <select value={item.maturidade} onChange={(e) => updateSolution(item.id, 'maturidade', e.target.value)} className="bg-white/10 p-3 rounded-lg text-[10px] font-black uppercase text-white outline-none">
                                  {appConfig.config?.maturities.map(m => <option key={m} value={m} className="bg-black">{m}</option>)}
                                </select>
                             </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Opcionais (Upsells)</label>
                            <div className="space-y-2">
                               {item.variaveis_opcionais?.map((v, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                                     <span className="text-[10px] font-bold text-white/60">{v.label}</span>
                                     <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-brand">{formatCurrency(v.valor)}</span>
                                        <button onClick={() => handleRemoveVariable(item.id, idx)} className="text-red-400 hover:text-red-500 font-black">×</button>
                                     </div>
                                  </div>
                               ))}
                               <div className="flex gap-2">
                                  <input 
                                    placeholder="Descrição" 
                                    value={variableInputs[String(item.id)]?.label || ''} 
                                    onChange={(e) => setVariableInputs({...variableInputs, [String(item.id)]: {...(variableInputs[String(item.id)]||{label:'',valor:''}), label: e.target.value}})} 
                                    className="flex-[2] bg-white/10 p-3 rounded-xl text-[10px] font-bold outline-none text-white placeholder:text-white/20" 
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="R$" 
                                    value={variableInputs[String(item.id)]?.valor || ''} 
                                    onChange={(e) => setVariableInputs({...variableInputs, [String(item.id)]: {...(variableInputs[String(item.id)]||{label:'',valor:''}), valor: e.target.value}})} 
                                    className="flex-1 bg-white/10 p-3 rounded-xl text-[10px] font-bold outline-none text-white" 
                                  />
                                  <button onClick={() => handleAddVariable(item.id)} className="bg-brand text-white px-4 rounded-xl font-black text-xs hover:bg-blue-700 transition-colors">+</button>
                               </div>
                            </div>
                          </div>
                        </div>

                        {/* OPERAÇÕES / CRONOGRAMA */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 space-y-6 shadow-sm">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                             Entrega & Dicas de Venda
                          </span>
                          
                          <div className="space-y-3">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Cronograma (Fases)</label>
                             <div className="space-y-2">
                                {item.entregaveis?.map((task, idx) => (
                                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                                      <p className="text-[10px] font-bold text-gray-700 leading-tight flex items-center gap-3">
                                         <span className="w-5 h-5 rounded-full bg-black text-white text-[8px] flex items-center justify-center font-black shrink-0">{idx + 1}</span>
                                         {task}
                                      </p>
                                      <button onClick={() => handleRemoveDeliverable(item.id, idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">×</button>
                                   </div>
                                ))}
                                <div className="relative">
                                   <input 
                                     placeholder="Adicionar nova fase..." 
                                     value={deliverableInputs[String(item.id)] || ''}
                                     onChange={(e) => setDeliverableInputs({...deliverableInputs, [String(item.id)]: e.target.value})}
                                     onKeyDown={(e) => e.key === 'Enter' && handleAddDeliverable(item.id)}
                                     className="w-full bg-gray-50 border-transparent border focus:border-blue-500 p-3 rounded-xl text-[10px] font-medium outline-none pr-10"
                                   />
                                   <button onClick={() => handleAddDeliverable(item.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:scale-110 transition-transform">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v12m6-6H6"/></svg>
                                   </button>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1 italic">Dica de Venda (Pitch)</label>
                            <textarea 
                              value={item.dica_venda} 
                              onChange={(e) => updateSolution(item.id, 'dica_venda', e.target.value)} 
                              className="w-full bg-amber-50/50 border border-amber-100 p-4 rounded-xl font-bold text-[11px] text-amber-900 min-h-[100px] outline-none placeholder:text-amber-200 focus:bg-white transition-all" 
                              placeholder="Foque no ROI imediato de 30 dias..."
                            />
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex gap-4 pt-6">
                           <button 
                             onClick={() => removeSolution(item.id)} 
                             className="flex-1 p-4 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                           >
                             Excluir da Nuvem
                           </button>
                           <button 
                             onClick={() => setExpandedId(null)} 
                             className="flex-1 p-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                           >
                             Fechar Edição
                           </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredSolutions.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                 <p className="font-black text-gray-300 uppercase tracking-widest text-xs">Nenhuma solução encontrada.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* METAS TAB */}
      {activeTab === 'metas' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
           <div className="app-card p-12 bg-white space-y-10 rounded-[40px] shadow-xl border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                 <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Metas de Faturamento</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Planejamento financeiro mensal</p>
                 </div>
                 <button onClick={saveGoals} className="px-10 py-4 bg-black text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Salvar Metas</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(g => (
                  <div key={g.month} className="flex items-center justify-between p-6 bg-gray-50 rounded-[24px] border border-gray-100 hover:border-black/10 transition-all group">
                    <span className="font-bold text-gray-600 uppercase text-[10px] tracking-widest">{formatMonth(g.month)}</span>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[10px]">R$</span>
                       <input 
                         type="number" 
                         value={g.target} 
                         onChange={e => updateGoal(g.month, parseFloat(e.target.value))} 
                         className="bg-white border border-gray-200 p-3 pl-8 rounded-xl font-black text-right w-40 outline-none focus:border-black transition-all" 
                       />
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* SYSTEM TAB */}
      {activeTab === 'system' && (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="app-card p-12 bg-white space-y-16 shadow-2xl rounded-[40px] border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-10 gap-6">
                 <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Configurações Base</h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Personalize a taxonomia e o motor técnico do sistema</p>
                 </div>
                 <button onClick={saveCustomization} disabled={isSyncing} className="px-12 py-5 bg-brand text-white rounded-[30px] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-500/20">
                   {isSyncing ? 'Sincronizando...' : 'Aplicar Alterações'}
                 </button>
              </div>

              {/* 1. Módulos Ativos */}
              <section className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">🧩</div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">1. Gestão de Módulos</h3>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {['dashboard', 'copilot', 'fichario', 'catalogo', 'pdf_builder'].map(m => {
                       const isActive = appConfig.config?.enabledModules.includes(m);
                       return (
                          <button key={m} onClick={() => toggleModule(m)} className={`p-8 rounded-[32px] border flex flex-col items-center gap-4 transition-all ${isActive ? 'bg-black text-white border-black shadow-xl' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}>
                             <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-gray-300'}`}></div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{m.replace('_', ' ')}</span>
                          </button>
                       );
                    })}
                 </div>
              </section>

              {/* 2. Taxonomia de Catálogo */}
              <section className="space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg">📁</div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">2. Taxonomia Dinâmica</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Tags */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-2">Tags Globais (Filtros)</label>
                       <div className="flex flex-wrap gap-2 p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 min-h-[140px]">
                          {appConfig.config?.tags.map((tag, i) => (
                             <span key={i} className="px-4 py-2 bg-white border border-blue-200 rounded-xl text-[10px] font-black text-blue-600 flex items-center gap-3 shadow-sm">
                                #{tag}
                                <button onClick={() => handleRemoveTaxonomy('tags', i)} className="text-blue-200 hover:text-blue-600 transition-colors">×</button>
                             </span>
                          ))}
                          <input placeholder="Add Tag..." className="bg-transparent text-[10px] font-black outline-none w-24 p-2 text-blue-400 placeholder:text-blue-200" onKeyDown={e => { if(e.key === 'Enter') { handleAddTaxonomy('tags', e.currentTarget.value); e.currentTarget.value = ''; } }} />
                       </div>
                    </div>
                    {/* Maturidades */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Níveis de Maturidade</label>
                       <div className="flex flex-wrap gap-2 p-6 bg-gray-50 rounded-[32px] border border-gray-100 min-h-[140px]">
                          {appConfig.config?.maturities.map((m, i) => (
                             <span key={i} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black flex items-center gap-3 shadow-sm">
                                {m}
                                <button onClick={() => handleRemoveTaxonomy('maturities', i)} className="text-red-300 hover:text-red-600 transition-colors">×</button>
                             </span>
                          ))}
                          <input placeholder="Add..." className="bg-transparent text-[10px] font-black outline-none w-24 p-2 text-gray-400 placeholder:text-gray-200" onKeyDown={e => { if(e.key === 'Enter') { handleAddTaxonomy('maturities', e.currentTarget.value); e.currentTarget.value = ''; } }} />
                       </div>
                    </div>
                 </div>
              </section>

              {/* 3. Motor de Inteligência */}
              <section className="space-y-10 pt-10 border-t border-gray-100">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl shadow-lg">🧠</div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">3. Motor de IA (Técnico)</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Modelo de Texto Preferencial</label>
                       <select value={appConfig.config?.aiModelText} onChange={e => setAppConfig({...appConfig, config: { ...appConfig.config!, aiModelText: e.target.value as any }})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-xs outline-none cursor-pointer hover:bg-gray-100 transition-all">
                          <option value="gemini-3-pro-preview">Gemini 3 Pro (Full Reason)</option>
                          <option value="gemini-3-flash-preview">Gemini 3 Flash (High Performance)</option>
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Max Tokens</label>
                           <input type="number" value={appConfig.config?.aiMaxTokens} onChange={e => setAppConfig({...appConfig, config: { ...appConfig.config!, aiMaxTokens: parseInt(e.target.value) }})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-xs outline-none" />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Thinking Budget</label>
                           <input type="number" value={appConfig.config?.aiThinkingBudget} onChange={e => setAppConfig({...appConfig, config: { ...appConfig.config!, aiThinkingBudget: parseInt(e.target.value) }})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-xs outline-none" />
                        </div>
                    </div>
                 </div>
              </section>

              {/* 4. Auditoria de Status */}
              <section className="space-y-8 pt-10 border-t border-gray-100">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-lg">📡</div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">4. Infraestrutura PhantLab</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 bg-gray-50 rounded-[32px] flex flex-col justify-between h-40 border border-gray-100">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IA Engine Status</span>
                       <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                          <span className="text-xl font-black text-gray-900 uppercase italic">ONLINE</span>
                       </div>
                    </div>
                    <div className="p-8 bg-gray-50 rounded-[32px] flex flex-col justify-between h-40 border border-gray-100">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Database Sync</span>
                       <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                          <span className="text-xl font-black text-gray-900 uppercase italic">PROTECTED</span>
                       </div>
                    </div>
                    <div className="p-8 bg-gray-50 rounded-[32px] flex flex-col justify-between h-40 border border-gray-100">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Workspace API</span>
                       <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                          <span className="text-xl font-black text-gray-900 uppercase italic">CONNECTED</span>
                       </div>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
