import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService, SupabaseService, getAppOrigin, AuthService } from '../services/api';
import { SolutionItem, SolutionCategory, SolutionSubCategory, SolutionDuration, SolutionMaturity, AIConfig, AppCustomization, MonthlyGoal } from '../types';
import { suggestSolutionDetails, parseBulkSolutions, generateSolutionDeliverables } from '../services/gemini';
import mammoth from 'mammoth';

type AdminTab = 'solutions' | 'metas' | 'essencia' | 'intelligence' | 'customization';

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
  
  // Estado para Inputs temporários
  const [variableInputs, setVariableInputs] = useState<Record<string, { label: string, valor: string }>>({});
  const [deliverableInputs, setDeliverableInputs] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const systemLogoInputRef = useRef<HTMLInputElement>(null);
  const proposalLogoInputRef = useRef<HTMLInputElement>(null);

  // Metas
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [historyRealized, setHistoryRealized] = useState<Record<string, number>>({});

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    systemInstruction: "",
    temperature: 0.8,
    maxOutputTokens: 6000,
    thinkingBudget: 4000
  });

  const [appConfig, setAppConfig] = useState<AppCustomization>({
    companyName: "PhantLab",
    systemLogoUrl: "http://phant.com.br/uploads/simbolo_roxo.png",
    proposalLogoUrl: "http://phant.com.br/uploads/logo_light.png",
    primaryColor: "#2563eb"
  });

  const [essencia, setEssencia] = useState<any>({
    tese_titulo: "",
    tese_descricao: "",
    lema_titulo: "",
    lema_descricao: "",
    posicionamento_titulo: "",
    posicionamento_frase: ""
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAllData = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const sols = await SupabaseService.fetchSolutions().catch(() => []);
      const ai = await SupabaseService.fetchAIConfig().catch(() => null);
      const ess = await SupabaseService.fetchEssencia().catch(() => null);
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
      if (ai) setAiConfig(ai);
      if (ess) setEssencia(ess);
      if (branding) setAppConfig(branding);
      setGoals(generateGoalList(loadedGoals));
      setHistoryRealized(realizedMap);

    } catch (err) {
      console.error("Erro no carregamento administrativo:", err);
      showToast("Alguns dados não puderam ser sincronizados", "error");
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

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSyncSolutions = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await SupabaseService.syncSolutions(solutions);
      if (result.success) {
        showToast("Catálogo sincronizado com a Nuvem");
      } else {
        showToast("Erro na sincronia: " + result.message, "error");
      }
    } catch (err) {
      showToast("Falha na conexão com o servidor", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'system' | 'proposal') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast("O logo deve ter no máximo 1MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'system') {
        setAppConfig(prev => ({ ...prev, systemLogoUrl: reader.result as string }));
      } else {
        setAppConfig(prev => ({ ...prev, proposalLogoUrl: reader.result as string }));
      }
      showToast("Logo carregado localmente. Clique em Aplicar para salvar.");
    };
    reader.readAsDataURL(file);
  };

  const handleMagicFill = async (id: string | number) => {
    const item = solutions.find(s => s.id === id);
    if (!item || !item.solucao) return;
    setIsMagicFilling(id);
    try {
      const details = await suggestSolutionDetails(item.solucao);
      setSolutions(prev => prev.map(s => s.id === id ? { ...s, ...details } : s));
      showToast("IA gerou os detalhes e o cronograma da oferta!");
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
          categoria: (item.categoria as SolutionCategory) || 'Direção',
          subcategoria: (item.subcategoria as SolutionSubCategory) || 'Marca & Cultura',
          duracao: (item.duracao as SolutionDuration) || '90 dias',
          maturidade: (item.maturidade as SolutionMaturity) || 'Base',
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
      categoria: "Direção",
      subcategoria: "Marca & Cultura",
      duracao: "90 dias",
      maturidade: "Base",
      fee_mensal: "R$ 0",
      valor_base_num: 0,
      variaveis_opcionais: [],
      entregaveis: [],
      dica_venda: ""
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

  const saveAIConfig = async () => {
    try {
      const res = await SupabaseService.syncAIConfig(aiConfig);
      if (res.success) showToast("Configuração de IA salva");
      else showToast("Erro ao salvar IA", "error");
    } catch (err) {
      showToast("Erro de rede ao salvar", "error");
    }
  };

  const saveEssencia = async () => {
    try {
      const res = await SupabaseService.syncEssencia(essencia);
      if (res.success) showToast("Nossa Essência atualizada");
      else showToast("Erro ao salvar essência", "error");
    } catch (err) {
      showToast("Erro de rede ao salvar", "error");
    }
  };

  const saveCustomization = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await SupabaseService.syncAppConfig(appConfig);
      if (res.success) {
        showToast("Configurações salvas! Atualizando interface...");
        setTimeout(() => {
          setIsSyncing(false);
          window.location.href = window.location.origin + window.location.pathname;
        }, 1200);
      } else {
        setIsSyncing(false);
        showToast("Erro ao salvar: " + res.message, "error");
      }
    } catch (err) {
      setIsSyncing(false);
      showToast("Erro inesperado ao salvar", "error");
    }
  };

  const updateGoal = (month: string, val: number) => {
    setGoals(prev => prev.map(g => g.month === month ? { ...g, target: val } : g));
  };

  const saveGoals = async () => {
    setIsSyncing(true);
    try {
      const res = await SupabaseService.syncGoals(goals);
      if (res.success) showToast("Metas atualizadas com sucesso!");
      else showToast("Erro ao salvar metas", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatMonth = (m: string) => {
    const [y, month] = m.split('-');
    const date = new Date(parseInt(y), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredSolutions = solutions
    .filter(s => s.solucao.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
       if (a.is_favorite === b.is_favorite) return 0;
       return a.is_favorite ? -1 : 1;
    });

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando Governança...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-in fade-in duration-700 px-4 relative">
      {toast && (
        <div className={`fixed top-10 right-10 z-[200] px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest animate-in slide-in-from-right-10 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
          {toast.message}
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4">Administração</h1>
          <p className="text-gray-400 text-xl font-medium tracking-tight">Governança de Ativos e Inteligência</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex-wrap gap-1">
          {(['solutions', 'metas', 'essencia', 'intelligence', 'customization'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              {tab === 'solutions' ? 'Catálogo' : tab === 'metas' ? 'Metas & Perf.' : tab === 'essencia' ? 'Essência' : tab === 'intelligence' ? 'Inteligência' : 'Personalização'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'solutions' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex-1 w-full md:w-auto relative">
               <input 
                  type="text" 
                  placeholder="Buscar solução por nome..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold text-sm focus:bg-white border border-transparent focus:border-brand outline-none transition-all"
               />
               <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <button onClick={addSolution} className="px-6 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all whitespace-nowrap">+ Nova Solução</button>
              <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-6 py-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2 whitespace-nowrap">
                {isImporting ? 'Importando...' : 'Importar DOCX'}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportDocx} accept=".docx" className="hidden" />
              <button onClick={handleSyncSolutions} disabled={isSyncing} className={`px-8 py-4 ${isSyncing ? 'bg-gray-400' : 'bg-brand'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all whitespace-nowrap`}>
                {isSyncing ? 'Sincronizando...' : 'Sincronizar com Nuvem'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredSolutions.map((item) => (
                <div key={item.id} className="transition-all">
                  {/* LIST ROW */}
                  <div 
                    className={`flex items-center justify-between p-6 hover:bg-gray-50 cursor-pointer transition-colors ${expandedId === item.id ? 'bg-gray-50' : ''}`}
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        className={`transition-all ${item.is_favorite ? 'text-amber-500 scale-125' : 'text-gray-200 hover:text-amber-300'}`}
                      >
                        ★
                      </button>
                      <div className="min-w-0">
                        <p className="font-black text-lg text-gray-900 truncate tracking-tight">{item.solucao}</p>
                        <div className="flex gap-2 mt-1">
                           <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase tracking-widest text-gray-500 rounded">{item.categoria}</span>
                           <span className="px-2 py-0.5 bg-blue-50 text-[8px] font-black uppercase tracking-widest text-blue-500 rounded">{item.maturidade}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="hidden md:block text-right">
                         <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Fee Base</p>
                         <p className="text-sm font-bold text-gray-900">{formatCurrency(item.valor_base_num)}</p>
                      </div>
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                        <svg className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {expandedId === item.id && (
                    <div className="p-10 bg-white border-t border-gray-100 animate-in slide-in-from-top-4 duration-300 space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="md:col-span-2 space-y-4">
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Nome da Solução</label>
                             <input 
                               value={item.solucao} 
                               onChange={(e) => updateSolution(item.id, 'solucao', e.target.value)}
                               className="w-full bg-gray-50 p-4 rounded-xl font-bold text-lg focus:bg-white outline-none border border-transparent focus:border-brand"
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Promessa Principal</label>
                             <textarea value={item.promessa} onChange={(e) => updateSolution(item.id, 'promessa', e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl font-medium text-sm focus:bg-white outline-none min-h-[80px]" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Descrição Técnica</label>
                             <textarea value={item.descricao} onChange={(e) => updateSolution(item.id, 'descricao', e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl font-medium text-sm focus:bg-white outline-none min-h-[120px]" />
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-2">
                             <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Categoria & Maturidade</label>
                             <div className="grid grid-cols-2 gap-2">
                                <select value={item.categoria} onChange={(e) => updateSolution(item.id, 'categoria', e.target.value)} className="bg-gray-50 p-3 rounded-xl font-bold text-xs outline-none">
                                  <option>Direção</option><option>Propagação</option><option>Aceleração</option>
                                </select>
                                <select value={item.maturidade} onChange={(e) => updateSolution(item.id, 'maturidade', e.target.value)} className="bg-gray-50 p-3 rounded-xl font-bold text-xs outline-none">
                                  <option>Base</option><option>Pro</option><option>Advanced</option>
                                </select>
                             </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Preço Base (R$)</label>
                                <input type="number" value={item.valor_base_num} onChange={(e) => updateSolution(item.id, 'valor_base_num', parseFloat(e.target.value))} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-2">Duração</label>
                                <select value={item.duracao} onChange={(e) => updateSolution(item.id, 'duracao', e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm">
                                  <option>30 dias</option><option>90 dias</option><option>6 meses</option><option>12 meses</option><option>Recorrente</option>
                                </select>
                              </div>
                           </div>
                           
                           <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Variáveis / Adicionais (Upsell)</label>
                             {item.variaveis_opcionais && item.variaveis_opcionais.length > 0 && (
                                <div className="space-y-1 mb-3">
                                   {item.variaveis_opcionais.map((v, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-[11px]">
                                         <span className="font-bold text-gray-600 truncate mr-2">{v.label}</span>
                                         <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono text-gray-400">{formatCurrency(v.valor)}</span>
                                            <button onClick={() => handleRemoveVariable(item.id, idx)} className="text-red-400 hover:text-red-600 font-bold px-1">×</button>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             )}
                             <div className="flex gap-2">
                                <input placeholder="Nome" value={variableInputs[String(item.id)]?.label || ''} onChange={(e) => setVariableInputs({...variableInputs, [String(item.id)]: {...(variableInputs[String(item.id)]||{label:'',valor:''}), label: e.target.value}})} className="flex-[2] bg-white border border-gray-200 p-2 rounded-lg text-[10px] font-bold outline-none" />
                                <input type="number" placeholder="Valor" value={variableInputs[String(item.id)]?.valor || ''} onChange={(e) => setVariableInputs({...variableInputs, [String(item.id)]: {...(variableInputs[String(item.id)]||{label:'',valor:''}), valor: e.target.value}})} className="flex-1 bg-white border border-gray-200 p-2 rounded-lg text-[10px] font-bold outline-none" />
                                <button onClick={() => handleAddVariable(item.id)} className="bg-black text-white px-3 rounded-lg font-black text-xs">+</button>
                             </div>
                           </div>
                        </div>

                        {/* FASES DE ENTREGA (PROJECT PHASES) SECTION */}
                        <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Fases de Entrega / Cronograma</label>
                              <button 
                                onClick={() => handleGenerateDeliverables(item.id)}
                                disabled={isGeneratingDeliverables === item.id}
                                className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-all disabled:opacity-50"
                              >
                                {isGeneratingDeliverables === item.id ? 'Gerando...' : '✨ Gerar via IA'}
                              </button>
                           </div>
                           
                           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 min-h-[150px] space-y-3 relative">
                              <div className="absolute left-7 top-6 bottom-16 w-0.5 bg-gray-200 pointer-events-none"></div>
                              {item.entregaveis && item.entregaveis.length > 0 ? (
                                <div className="space-y-3 relative z-10">
                                   {item.entregaveis.map((task, idx) => (
                                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 group/task shadow-sm">
                                         <p className="text-[11px] font-bold text-gray-700 leading-tight flex items-center gap-3">
                                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[8px] flex items-center justify-center font-black shrink-0">{idx + 1}</span>
                                            {task}
                                         </p>
                                         <button onClick={() => handleRemoveDeliverable(item.id, idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                         </button>
                                      </div>
                                   ))}
                                </div>
                              ) : (
                                <p className="text-[10px] italic text-gray-400 text-center py-6">Nenhuma fase definida para este projeto.</p>
                              )}
                              
                              <div className="relative pt-2">
                                 <input 
                                   placeholder="Nova fase..." 
                                   value={deliverableInputs[String(item.id)] || ''}
                                   onChange={(e) => setDeliverableInputs({...deliverableInputs, [String(item.id)]: e.target.value})}
                                   onKeyDown={(e) => e.key === 'Enter' && handleAddDeliverable(item.id)}
                                   className="w-full bg-white border border-gray-200 p-3 rounded-xl text-[11px] font-medium outline-none pr-10"
                                 />
                                 <button onClick={() => handleAddDeliverable(item.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                                 </button>
                              </div>
                           </div>

                           <div className="pt-4 space-y-4">
                              <button 
                                onClick={() => handleMagicFill(item.id)}
                                disabled={isMagicFilling === item.id}
                                className="w-full bg-amber-50 text-amber-600 border border-amber-100 p-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                              >
                                {isMagicFilling === item.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin"></span>
                                    REFINANDO TUDO...
                                  </>
                                ) : '✨ Magic Fill (Promessa, Desc e Fases)'}
                              </button>
                              <button onClick={() => removeSolution(item.id)} className="w-full p-4 bg-red-50 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                                Remover Solução
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metas' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="app-card p-12 bg-white space-y-10">
              <div className="border-l-4 border-black pl-8 mb-10 flex justify-between items-end">
                 <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Metas & Histórico</h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Definição de objetivos comerciais</p>
                 </div>
                 <button onClick={saveGoals} disabled={isSyncing} className="px-8 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                   {isSyncing ? 'Salvando...' : 'Salvar Alterações'}
                 </button>
              </div>

              <div className="overflow-hidden rounded-3xl border border-gray-100">
                <table className="w-full">
                   <thead>
                      <tr className="bg-gray-50 text-left">
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Mês de Referência</th>
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Meta Definida (R$)</th>
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Realizado (R$)</th>
                         <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Performance</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {goals.map((g) => {
                         const realized = historyRealized[g.month] || 0;
                         const percent = g.target > 0 ? (realized / g.target) * 100 : 0;
                         const isCurrent = g.month === new Date().toISOString().slice(0, 7);
                         
                         return (
                           <tr key={g.month} className={`group hover:bg-gray-50 transition-colors ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                              <td className="p-6 font-bold text-gray-900 capitalize flex items-center gap-2">
                                 {formatMonth(g.month)}
                                 {isCurrent && <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] rounded uppercase font-black">Atual</span>}
                              </td>
                              <td className="p-6">
                                 <input 
                                   type="number" 
                                   value={g.target} 
                                   onChange={e => updateGoal(g.month, parseFloat(e.target.value))}
                                   className="bg-gray-100 p-3 rounded-xl font-mono text-sm font-bold w-40 text-right focus:bg-white focus:ring-2 ring-black outline-none transition-all"
                                 />
                              </td>
                              <td className="p-6 font-mono text-sm font-bold text-gray-600">
                                 {formatCurrency(realized)}
                              </td>
                              <td className="p-6 text-right">
                                 <div className="flex items-center justify-end gap-3">
                                    <span className={`text-[10px] font-black ${percent >= 100 ? 'text-green-600' : 'text-gray-400'}`}>{percent.toFixed(0)}%</span>
                                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                       <div className={`h-full ${percent >= 100 ? 'bg-green-500' : 'bg-black'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                    </div>
                                 </div>
                              </td>
                           </tr>
                         );
                      })}
                   </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'customization' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="app-card p-12 bg-white space-y-10">
              <div className="border-l-4 border-black pl-8 mb-10">
                 <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Personalização da Marca</h2>
                 <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Logo, Cores e Identidade do App</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome da Empresa</label>
                  <input 
                    value={appConfig.companyName} 
                    onChange={e => setAppConfig({...appConfig, companyName: e.target.value})} 
                    className="w-full bg-gray-50 p-5 rounded-2xl font-bold text-lg focus:ring-2 focus:ring-brand outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Logo do Sistema (Interface)</label>
                      <div 
                        onClick={() => systemLogoInputRef.current?.click()}
                        className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-brand transition-all overflow-hidden"
                      >
                        {appConfig.systemLogoUrl ? (
                          <img src={appConfig.systemLogoUrl} alt="Preview Sistema" className="w-full h-full object-contain p-4" />
                        ) : (
                          <div className="text-center space-y-2">
                            <span className="text-3xl">🖼️</span>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo Sistema</p>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={systemLogoInputRef} onChange={e => handleLogoUpload(e, 'system')} accept="image/*" className="hidden" />
                      <div className="mt-4 flex items-center gap-3">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest shrink-0">OU URL:</span>
                          <input
                            type="text"
                            value={appConfig.systemLogoUrl}
                            onChange={(e) => setAppConfig({...appConfig, systemLogoUrl: e.target.value})}
                            placeholder="https://exemplo.com/logo.png"
                            className="w-full bg-gray-50 p-3 rounded-xl font-medium text-xs border border-transparent focus:bg-white focus:border-brand outline-none transition-all"
                          />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Logo da Proposta (PDF)</label>
                      <div 
                        onClick={() => proposalLogoInputRef.current?.click()}
                        className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-brand transition-all overflow-hidden"
                      >
                        {appConfig.proposalLogoUrl ? (
                          <img src={appConfig.proposalLogoUrl} alt="Preview Proposta" className="w-full h-full object-contain p-4" />
                        ) : (
                          <div className="text-center space-y-2">
                            <span className="text-3xl">📄</span>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo Proposta</p>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={proposalLogoInputRef} onChange={e => handleLogoUpload(e, 'proposal')} accept="image/*" className="hidden" />
                      <div className="mt-4 flex items-center gap-3">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest shrink-0">OU URL:</span>
                          <input
                            type="text"
                            value={appConfig.proposalLogoUrl}
                            onChange={(e) => setAppConfig({...appConfig, proposalLogoUrl: e.target.value})}
                            placeholder="https://exemplo.com/logo_dark.png"
                            className="w-full bg-gray-50 p-3 rounded-xl font-medium text-xs border border-transparent focus:bg-white focus:border-brand outline-none transition-all"
                          />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cor dos Detalhes (Primária)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={appConfig.primaryColor} 
                          onChange={e => setAppConfig({...appConfig, primaryColor: e.target.value})} 
                          className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0 overflow-hidden shadow-lg" 
                        />
                        <input 
                          type="text" 
                          value={appConfig.primaryColor} 
                          onChange={e => setAppConfig({...appConfig, primaryColor: e.target.value})} 
                          className="flex-1 bg-gray-50 p-5 rounded-2xl font-mono text-sm uppercase font-bold focus:ring-2 focus:ring-brand outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Preview do Botão</label>
                      <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-center h-[72px]">
                         <button style={{ backgroundColor: appConfig.primaryColor }} className="px-8 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">
                            BOTÃO DE EXEMPLO
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-gray-100 flex justify-end">
                   <button 
                    onClick={saveCustomization} 
                    disabled={isSyncing}
                    className={`px-12 py-5 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-3`}
                  >
                    {isSyncing && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                    {isSyncing ? 'SALVANDO...' : 'Aplicar Personalização'}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'essencia' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="app-card p-12 bg-white space-y-10">
              <div className="border-l-4 border-black pl-8 mb-10">
                 <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Nossa Essência</h2>
                 <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Fundamentos da Marca</p>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título da Tese</label>
                    <input value={essencia.tese_titulo} onChange={e => setEssencia({...essencia, tese_titulo: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Título do Lema</label>
                    <input value={essencia.lema_titulo} onChange={e => setEssencia({...essencia, lema_titulo: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição da Tese</label>
                  <textarea value={essencia.tese_descricao} onChange={e => setEssencia({...essencia, tese_descricao: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-medium min-h-[100px] focus:ring-2 focus:ring-brand outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Lema</label>
                  <textarea value={essencia.lema_descricao} onChange={e => setEssencia({...essencia, lema_descricao: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-medium min-h-[100px] focus:ring-2 focus:ring-brand outline-none" />
                </div>
                <div className="pt-10 border-t border-gray-100 flex justify-end">
                   <button onClick={saveEssencia} className="px-12 py-5 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">Salvar Essência</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'intelligence' && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="app-card p-12 bg-white space-y-8">
              <div className="border-l-4 border-black pl-8 mb-10">
                 <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Mentor AI Settings</h2>
                 <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Prompt do Sistema e Parâmetros</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Instruction (O Cérebro do Mentor)</label>
                  <textarea 
                    value={aiConfig.systemInstruction} 
                    onChange={e => setAiConfig({...aiConfig, systemInstruction: e.target.value})}
                    className="w-full bg-gray-50 p-6 rounded-2xl font-medium text-sm min-h-[250px] focus:bg-white outline-none border border-transparent focus:border-brand"
                    placeholder="Defina aqui como a IA deve se comportar..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temperatura ({aiConfig.temperature})</label>
                      <input type="range" min="0" max="1" step="0.1" value={aiConfig.temperature} onChange={e => setAiConfig({...aiConfig, temperature: parseFloat(e.target.value)})} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thinking Budget</label>
                      <input type="number" value={aiConfig.thinkingBudget} onChange={e => setAiConfig({...aiConfig, thinkingBudget: parseInt(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Tokens</label>
                      <input type="number" value={aiConfig.maxOutputTokens} onChange={e => setAiConfig({...aiConfig, maxOutputTokens: parseInt(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" />
                   </div>
                </div>
                <div className="pt-8 flex justify-end">
                   <button onClick={saveAIConfig} className="px-12 py-5 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">Atualizar Mentor IA</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;