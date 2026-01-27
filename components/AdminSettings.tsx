
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService, SupabaseService, getAppOrigin, AuthService } from '../services/api';
import { SolutionItem, SolutionCategory, SolutionSubCategory, SolutionDuration, SolutionMaturity, AIConfig, AppCustomization, MonthlyGoal } from '../types';
import { suggestSolutionDetails, parseBulkSolutions } from '../services/gemini';
import mammoth from 'mammoth';

type AdminTab = 'solutions' | 'essencia' | 'intelligence' | 'customization' | 'metas';

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('solutions');
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [expandedSolutionId, setExpandedSolutionId] = useState<string | number | null>(null);
  const [isMagicFilling, setIsMagicFilling] = useState<string | number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [historyRealized, setHistoryRealized] = useState<Record<string, number>>({});

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    mentorInstruction: "",
    mappingInstruction: "",
    suggesterInstruction: "",
    copilotInstruction: "",
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

      if (sols) setSolutions(sols.map(s => ({ 
        ...s, 
        entregaveis: Array.isArray(s.entregaveis) ? s.entregaveis : [],
        descricao: s.descricao || ""
      })));
      if (ai) setAiConfig(ai);
      if (ess) setEssencia(ess);
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
      if (result.success) showToast("Catálogo sincronizado");
      else showToast("Erro: " + result.message, "error");
    } finally { setIsSyncing(false); }
  };

  const addSolution = () => {
    const newItem: SolutionItem = {
      id: `new-${Date.now()}`,
      solucao: "Nova Solução",
      promessa: "Promessa de valor",
      descricao: "",
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
    setExpandedSolutionId(newItem.id);
  };

  const updateSolution = (id: string | number, field: keyof SolutionItem, value: any) => {
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleMagicFill = async (id: string | number, name: string) => {
    if (!name || name === "Nova Solução") {
      showToast("Dê um nome real à solução primeiro", "error");
      return;
    }
    setIsMagicFilling(id);
    try {
      const suggestion = await suggestSolutionDetails(name);
      if (suggestion.promessa) updateSolution(id, 'promessa', suggestion.promessa);
      if (suggestion.descricao) updateSolution(id, 'descricao', suggestion.descricao);
      if (suggestion.maturidade) updateSolution(id, 'maturidade', suggestion.maturidade as SolutionMaturity);
      if (suggestion.entregaveis && Array.isArray(suggestion.entregaveis)) {
        updateSolution(id, 'entregaveis', suggestion.entregaveis);
      }
      showToast("Campos e Entregas preenchidos pela IA");
    } catch (error) {
      showToast("Falha na IA", "error");
    } finally {
      setIsMagicFilling(null);
    }
  };

  const addDeliverable = (id: string | number) => {
    const task = taskInputs[String(id)];
    if (!task?.trim()) return;
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, entregaveis: [...(s.entregaveis || []), task.trim()] } : s));
    setTaskInputs(prev => ({ ...prev, [String(id)]: '' }));
  };

  const removeDeliverable = (id: string | number, idx: number) => {
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, entregaveis: s.entregaveis.filter((_, i) => i !== idx) } : s));
  };

  const saveAIConfig = async () => {
    const res = await SupabaseService.syncAIConfig(aiConfig);
    if (res.success) showToast("Configuração de IA salva");
  };

  const filteredSolutions = solutions
    .filter(s => s.solucao.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.is_favorite === b.is_favorite ? 0 : a.is_favorite ? -1 : 1));

  const toggleExpand = (id: string | number) => {
    setExpandedSolutionId(expandedSolutionId === id ? null : id);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isInitialLoading) return <div className="p-20 text-center">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-in fade-in duration-700 px-4 relative">
      {toast && (
        <div className={`fixed top-10 right-10 z-[200] px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest bg-black text-white animate-in slide-in-from-right-10`}>
          {toast.message}
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-4">Administração</h1>
          <p className="text-gray-400 text-xl font-medium tracking-tight">Governança de Ativos e Inteligência</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex-wrap gap-1">
          {(['solutions', 'metas', 'essencia', 'intelligence', 'customization'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              {tab === 'solutions' ? 'Catálogo' : tab === 'metas' ? 'Metas' : tab === 'essencia' ? 'Essência' : tab === 'intelligence' ? 'Inteligência' : 'Personalização'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'solutions' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-gray-100">
             <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar solução..." className="bg-gray-50 px-6 py-4 rounded-2xl font-bold text-sm w-96 outline-none" />
             <div className="flex gap-4">
               <button onClick={addSolution} className="px-6 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">+ Novo Item</button>
               <button onClick={handleSyncSolutions} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Sincronizar Nuvem</button>
             </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-10 py-6 border-b border-gray-50 bg-gray-50/50">
              <div className="col-span-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Solução</div>
              <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Categoria</div>
              <div className="col-span-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pr-10">Valor Base</div>
              <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</div>
            </div>

            <div className="divide-y divide-gray-50">
              {filteredSolutions.map((item) => (
                <div key={item.id} className="group transition-all">
                  {/* LINHA RESUMO */}
                  <div 
                    onClick={() => toggleExpand(item.id)}
                    className={`grid grid-cols-12 gap-4 px-10 py-6 items-center cursor-pointer hover:bg-gray-50 transition-colors ${expandedSolutionId === item.id ? 'bg-gray-50' : ''}`}
                  >
                    <div className="col-span-5 flex items-center gap-4">
                       <span className={`text-xl ${item.is_favorite ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                       <span className="font-bold text-gray-900">{item.solucao}</span>
                    </div>
                    <div className="col-span-2 text-center">
                       <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest">
                         {item.categoria}
                       </span>
                    </div>
                    <div className="col-span-3 text-right pr-10">
                       <span className="font-mono font-bold text-gray-600">{formatCurrency(item.valor_base_num)}</span>
                    </div>
                    <div className="col-span-2 flex justify-end items-center gap-3">
                       <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className={`p-2 rounded-lg transition-transform ${expandedSolutionId === item.id ? 'rotate-180 bg-black text-white' : 'text-gray-400 bg-gray-100'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                       </button>
                    </div>
                  </div>

                  {/* ÁREA EXPANDIDA (CONFIGURAÇÃO) */}
                  {expandedSolutionId === item.id && (
                    <div className="bg-gray-50/30 p-10 space-y-8 animate-in slide-in-from-top-4 duration-300">
                       <div className="grid grid-cols-4 gap-6 items-end">
                        <div className="col-span-2 space-y-2">
                          <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Nome da Solução</label>
                          <div className="flex gap-3">
                            <input value={item.solucao} onChange={e => updateSolution(item.id, 'solucao', e.target.value)} className="flex-1 bg-white border border-gray-100 p-4 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-black/5" />
                            <button 
                              onClick={() => handleMagicFill(item.id, item.solucao)}
                              disabled={isMagicFilling === item.id}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isMagicFilling === item.id ? 'bg-amber-100 text-amber-500 animate-pulse' : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100'}`}
                            >
                              {isMagicFilling === item.id ? 'IA...' : '✨ Criar com IA'}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Categoria</label>
                          <select value={item.categoria} onChange={e => updateSolution(item.id, 'categoria', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-xl font-bold text-sm outline-none">
                            <option>Direção</option><option>Propagação</option><option>Aceleração</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-2 justify-end">
                           <button onClick={() => updateSolution(item.id, 'is_favorite', !item.is_favorite)} className={`p-4 rounded-xl transition-all ${item.is_favorite ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-white border border-gray-100 text-gray-300'}`}>★</button>
                           <button onClick={() => setSolutions(prev => prev.filter(s => s.id !== item.id))} className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">🗑</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                        <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Promessa Curta</label>
                              <textarea value={item.promessa} onChange={e => updateSolution(item.id, 'promessa', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-xl text-sm font-bold min-h-[60px] outline-none" placeholder="A frase de impacto da solução..." />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Descrição Detalhada / Escopo Técnico</label>
                              <textarea value={item.descricao} onChange={e => updateSolution(item.id, 'descricao', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-xl text-xs font-medium leading-relaxed min-h-[140px] outline-none" placeholder="Explique o que é entregue tecnicamente..." />
                            </div>
                            
                            <div className="space-y-4 bg-white/50 p-6 rounded-3xl border border-dashed border-gray-200">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Entregas Operacionais (Ekyte Blueprint)</label>
                              <div className="space-y-2">
                                {(item.entregaveis || []).map((task, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                     <span className="text-xs font-bold text-gray-700">{idx + 1}. {task}</span>
                                     <button onClick={() => removeDeliverable(item.id, idx)} className="text-red-400 font-bold hover:text-red-600 px-2">×</button>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  placeholder="Nova tarefa operacional..." 
                                  value={taskInputs[String(item.id)] || ''} 
                                  onChange={e => setTaskInputs({...taskInputs, [String(item.id)]: e.target.value})}
                                  onKeyDown={e => e.key === 'Enter' && addDeliverable(item.id)}
                                  className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-black"
                                />
                                <button onClick={() => addDeliverable(item.id)} className="bg-black text-white px-6 rounded-xl font-black text-[10px] uppercase">+</button>
                              </div>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Preço Base (R$)</label>
                                <input type="number" value={item.valor_base_num} onChange={e => updateSolution(item.id, 'valor_base_num', parseFloat(e.target.value))} className="w-full bg-white border border-gray-100 p-4 rounded-xl font-black text-lg outline-none" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Duração do Movimento</label>
                                <select value={item.duracao} onChange={e => updateSolution(item.id, 'duracao', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-xl font-bold outline-none">
                                  <option>30 dias</option><option>90 dias</option><option>6 meses</option><option>12 meses</option><option>Recorrente</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Subcategoria</label>
                                 <select value={item.subcategoria} onChange={e => updateSolution(item.id, 'subcategoria', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-xl font-bold outline-none">
                                   <option>Marca & Cultura</option><option>Crescimento (Growth)</option><option>Tecnologia</option><option>Cursos & Mentorias</option>
                                 </select>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Maturidade</label>
                                 <select value={item.maturidade} onChange={e => updateSolution(item.id, 'maturidade', e.target.value)} className="w-full bg-white border border-gray-100 p-4 rounded-xl font-bold outline-none">
                                   <option>Base</option><option>Pro</option><option>Advanced</option>
                                 </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Dica de Venda / Quebra de Objeção</label>
                              <textarea value={item.dica_venda} onChange={e => updateSolution(item.id, 'dica_venda', e.target.value)} className="w-full bg-amber-50/20 p-6 rounded-[30px] italic text-sm font-medium border border-amber-100 outline-none" placeholder="Como o vendedor deve falar dessa solução..." />
                            </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredSolutions.length === 0 && (
                <div className="py-20 text-center text-gray-300 font-black text-xs uppercase tracking-widest">
                  Nenhuma solução encontrada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'intelligence' && (
        <div className="max-w-4xl mx-auto space-y-12">
           <div className="app-card p-12 bg-white space-y-12">
              <div className="border-l-4 border-black pl-8 mb-10">
                 <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Inteligência PhantLab</h2>
                 <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Configuração de Prompts e Raciocínio de IA</p>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm">💬</span>
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Mentor Comercial (Chat de Suporte)</label>
                  </div>
                  <textarea 
                    value={aiConfig.mentorInstruction} 
                    onChange={e => setAiConfig({...aiConfig, mentorInstruction: e.target.value})}
                    className="w-full bg-gray-50 p-6 rounded-2xl font-medium text-sm min-h-[150px] outline-none border border-transparent focus:border-brand transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm">🗺️</span>
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Mapeamento Estratégico (Propostas)</label>
                  </div>
                  <textarea 
                    value={aiConfig.mappingInstruction} 
                    onChange={e => setAiConfig({...aiConfig, mappingInstruction: e.target.value})}
                    className="w-full bg-gray-50 p-6 rounded-2xl font-medium text-sm min-h-[150px] outline-none border border-transparent focus:border-brand transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm">📦</span>
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Sugestor de Catálogo (Admin)</label>
                  </div>
                  <textarea 
                    value={aiConfig.suggesterInstruction} 
                    onChange={e => setAiConfig({...aiConfig, suggesterInstruction: e.target.value})}
                    className="w-full bg-gray-50 p-6 rounded-2xl font-medium text-sm min-h-[150px] outline-none border border-transparent focus:border-brand transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center text-sm">🎙️</span>
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Copiloto de Reunião (Live)</label>
                  </div>
                  <textarea 
                    value={aiConfig.copilotInstruction} 
                    onChange={e => setAiConfig({...aiConfig, copilotInstruction: e.target.value})}
                    className="w-full bg-gray-50 p-6 rounded-2xl font-medium text-sm min-h-[150px] outline-none border border-transparent focus:border-brand transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6 pt-10 border-t border-gray-50">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Temperatura ({aiConfig.temperature})</label>
                      <input type="range" min="0" max="1" step="0.1" value={aiConfig.temperature} onChange={e => setAiConfig({...aiConfig, temperature: parseFloat(e.target.value)})} className="w-full h-2 bg-gray-100 rounded-lg accent-black" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Thinking Budget</label>
                      <input type="number" value={aiConfig.thinkingBudget} onChange={e => setAiConfig({...aiConfig, thinkingBudget: parseInt(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Max Tokens</label>
                      <input type="number" value={aiConfig.maxOutputTokens} onChange={e => setAiConfig({...aiConfig, maxOutputTokens: parseInt(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm" />
                   </div>
                </div>

                <div className="pt-10 flex justify-end">
                   <button onClick={saveAIConfig} className="px-12 py-5 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">Salvar Inteligência</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
