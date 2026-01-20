
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService, SupabaseService, getAppOrigin, AuthService } from '../services/api';
import { SolutionItem, SolutionCategory, SolutionSubCategory, SolutionDuration, SolutionMaturity, AIConfig, AppCustomization, MonthlyGoal } from '../types';
import { suggestSolutionDetails, parseBulkSolutions } from '../services/gemini';
import mammoth from 'mammoth';

type AdminTab = 'solutions' | 'essencia' | 'intelligence' | 'customization' | 'metas';

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('solutions');
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [isMagicFilling, setIsMagicFilling] = useState<string | number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para Inputs temporários de variáveis (Upsell/Cross-sell)
  const [variableInputs, setVariableInputs] = useState<Record<string, { label: string, valor: string }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const systemLogoInputRef = useRef<HTMLInputElement>(null);
  const proposalLogoInputRef = useRef<HTMLInputElement>(null);

  // Metas
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [historyRealized, setHistoryRealized] = useState<Record<string, number>>({});

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    apiKey: "",
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
      // Usamos chamadas individuais em vez de Promise.all para não travar tudo se uma tabela falhar
      const sols = await SupabaseService.fetchSolutions().catch(() => []);
      const ai = await SupabaseService.fetchAIConfig().catch(() => null);
      const ess = await SupabaseService.fetchEssencia().catch(() => null);
      const branding = await SupabaseService.fetchAppConfig().catch(() => null);
      const loadedGoals = await SupabaseService.fetchGoals().catch(() => []);
      const history = await SupabaseService.fetchProposalsHistory().catch(() => []);

      // Calculate realized per month
      const realizedMap: Record<string, number> = {};
      history?.forEach(p => {
        if (p.created_at) {
          const monthKey = new Date(p.created_at).toISOString().slice(0, 7); // YYYY-MM
          realizedMap[monthKey] = (realizedMap[monthKey] || 0) + (p.total_value || 0);
        }
      });

      if (sols) setSolutions(sols);
      if (ai) setAiConfig(prev => ({ ...prev, ...ai })); // Merge para manter defaults se necessário
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
    // Gera 12 meses (6 para trás, 6 para frente) se não existirem
    for (let i = -6; i <= 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const key = d.toISOString().slice(0, 7);
        if (!list.find(g => g.month === key)) {
            list.push({ month: key, target: 0 });
        }
    }
    return list.sort((a, b) => b.month.localeCompare(a.month)); // Decrescente
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
      showToast("IA gerou os detalhes da oferta!");
    } catch (err) {
      showToast("Erro na IA", "error");
    } finally {
      setIsMagicFilling(null);
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
      dica_venda: ""
    };
    setSolutions([newItem, ...solutions]);
  };

  const updateSolution = (id: string | number, field: keyof SolutionItem, value: any) => {
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSolution = (id: string | number) => {
    setSolutions(prev => prev.filter(s => s.id !== id));
  };
  
  const toggleFavorite = (id: string | number) => {
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s));
  };

  // --- GERENCIAMENTO DE VARIÁVEIS OPCIONAIS ---
  
  const handleAddVariable = (solutionId: string | number) => {
    const input = variableInputs[String(solutionId)] || { label: '', valor: '' };
    if (!input.label.trim()) return;
    
    const valorNum = parseFloat(input.valor) || 0;
    
    setSolutions(prev => prev.map(s => {
       if (s.id === solutionId) {
          const currentVars = s.variaveis_opcionais || [];
          return { 
             ...s, 
             variaveis_opcionais: [...currentVars, { label: input.label, valor: valorNum }] 
          };
       }
       return s;
    }));

    // Reset input
    setVariableInputs(prev => ({
       ...prev,
       [String(solutionId)]: { label: '', valor: '' }
    }));
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

  const updateVariableInput = (solutionId: string | number, field: 'label' | 'valor', value: string) => {
     setVariableInputs(prev => ({
        ...prev,
        [String(solutionId)]: {
           ...(prev[String(solutionId)] || { label: '', valor: '' }),
           [field]: value
        }
     }));
  };

  // --- PERSISTÊNCIA AUXILIAR ---

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

  // LOGICA DE FILTRO E ORDENAÇÃO
  const filteredSolutions = solutions
    .filter(s => s.solucao.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
       // Favoritos primeiro
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
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4 tracking-tighter">Administração</h1>
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

          <div className="space-y-6">
            {filteredSolutions.map((item) => (
              <div key={item.id} className={`app-card p-10 bg-white border border-gray-100 space-y-8 group transition-all hover:border-brand ${item.is_favorite ? 'ring-2 ring-amber-400/20' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                  <div className="md:col-span-2 space-y-2 relative">
                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                       Nome da Solução
                       {item.is_favorite && <span className="text-amber-500">★ Destaque</span>}
                    </label>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => toggleFavorite(item.id)}
                         className={`p-4 rounded-xl transition-all ${item.is_favorite ? 'bg-amber-100 text-amber-500' : 'bg-gray-50 text-gray-300 hover:bg-amber-50 hover:text-amber-400'}`}
                         title="Favoritar / Destacar no Topo"
                       >
                          <svg className="w-5 h-5" fill={item.is_favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                       </button>
                       <input 
                         value={item.solucao} 
                         onChange={(e) => updateSolution(item.id, 'solucao', e.target.value)}
                         className="flex-1 bg-gray-50 p-4 rounded-xl font-bold text-lg focus:bg-white outline-none border border-transparent focus:border-brand"
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Categoria</label>
                    <select 
                      value={item.categoria} 
                      onChange={(e) => updateSolution(item.id, 'categoria', e.target.value)}
                      className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-brand"
                    >
                      <option>Direção</option><option>Propagação</option><option>Aceleração</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button 
                      onClick={() => handleMagicFill(item.id)}
                      disabled={isMagicFilling === item.id}
                      className="flex-1 bg-amber-50 text-amber-600 border border-amber-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                    >
                      {isMagicFilling === item.id ? 'Gerando...' : '✨ Magic Fill'}
                    </button>
                    <button onClick={() => removeSolution(item.id)} className="p-4 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50">
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Promessa Principal</label>
                        <textarea value={item.promessa} onChange={(e) => updateSolution(item.id, 'promessa', e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl font-medium text-sm focus:bg-white outline-none min-h-[80px]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Descrição Técnica</label>
                        <textarea value={item.descricao} onChange={(e) => updateSolution(item.id, 'descricao', e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl font-medium text-sm focus:bg-white outline-none min-h-[120px]" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Preço Base (Num)</label>
                          <input type="number" value={item.valor_base_num} onChange={(e) => updateSolution(item.id, 'valor_base_num', parseFloat(e.target.value))} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Duração</label>
                          <select value={item.duracao} onChange={(e) => updateSolution(item.id, 'duracao', e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm">
                            <option>30 dias</option><option>90 dias</option><option>6 meses</option><option>12 meses</option><option>Recorrente</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* VARIAVEIS OPCIONAIS (UPSELL) */}
                      <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Variáveis / Adicionais (Upsell)</label>
                         
                         {item.variaveis_opcionais && item.variaveis_opcionais.length > 0 && (
                            <div className="space-y-2 mb-3">
                               {item.variaveis_opcionais.map((v, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs">
                                     <span className="font-bold text-gray-600">{v.label}</span>
                                     <div className="flex items-center gap-2">
                                        <span className="font-mono text-gray-400">{formatCurrency(v.valor)}</span>
                                        <button onClick={() => handleRemoveVariable(item.id, idx)} className="text-red-400 hover:text-red-600 font-bold px-1">×</button>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         )}

                         <div className="flex gap-2">
                            <input 
                              placeholder="Ex: Taxa de Setup" 
                              value={variableInputs[String(item.id)]?.label || ''}
                              onChange={(e) => updateVariableInput(item.id, 'label', e.target.value)}
                              className="flex-[2] bg-white border border-gray-200 p-2 rounded-lg text-xs font-bold outline-none focus:border-black"
                            />
                            <input 
                              type="number" 
                              placeholder="R$ 0" 
                              value={variableInputs[String(item.id)]?.valor || ''}
                              onChange={(e) => updateVariableInput(item.id, 'valor', e.target.value)}
                              className="flex-1 bg-white border border-gray-200 p-2 rounded-lg text-xs font-bold outline-none focus:border-black"
                            />
                            <button 
                              onClick={() => handleAddVariable(item.id)}
                              className="bg-black text-white px-3 rounded-lg font-black text-xs hover:bg-gray-800"
                            >
                              +
                            </button>
                         </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Dica de Venda</label>
                        <textarea value={item.dica_venda} onChange={(e) => updateSolution(item.id, 'dica_venda', e.target.value)} className="w-full bg-amber-50/30 p-4 rounded-xl font-medium italic text-sm border border-amber-100/50 min-h-[80px]" />
                      </div>
                   </div>
                </div>
              </div>
            ))}
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
                      
                      {/* URL INPUT FOR SYSTEM LOGO */}
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

                      {/* URL INPUT FOR PROPOSAL LOGO */}
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
                
                {/* NEW API KEY INPUT */}
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                          Google Gemini API Key
                          <span className="text-xs">🔑</span>
                       </label>
                       <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-400 hover:text-blue-600 uppercase tracking-widest underline">
                          Obter Chave no AI Studio
                       </a>
                    </div>
                    <input 
                      type="password" 
                      value={aiConfig.apiKey || ''} 
                      onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})}
                      className="w-full bg-white p-4 rounded-xl font-mono text-sm border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="AIzaSy..."
                    />
                    <p className="text-[9px] text-blue-400 font-medium leading-relaxed">
                       Esta chave será usada para todas as funcionalidades de IA (Mentor, Melhoria de Texto, Copiloto). 
                       Se deixada em branco, o sistema tentará usar a chave de ambiente do servidor (se configurada).
                    </p>
                </div>

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