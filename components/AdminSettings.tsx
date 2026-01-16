
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService, SupabaseService, getAppOrigin, AuthService } from '../services/api';
import { SolutionItem, SolutionCategory, SolutionSubCategory, SolutionDuration, SolutionMaturity, AIConfig, AppCustomization } from '../types';
import { suggestSolutionDetails, parseBulkSolutions } from '../services/gemini';
import mammoth from 'mammoth';

type AdminTab = 'solutions' | 'essencia' | 'intelligence' | 'customization';

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('solutions');
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [isMagicFilling, setIsMagicFilling] = useState<string | number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    systemInstruction: "",
    temperature: 0.8,
    maxOutputTokens: 6000,
    thinkingBudget: 4000
  });

  const [appConfig, setAppConfig] = useState<AppCustomization>({
    companyName: "PhantLab",
    logoUrl: "",
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

      if (sols) setSolutions(sols);
      if (ai) setAiConfig(ai);
      if (ess) setEssencia(ess);
      if (branding) setAppConfig(branding);
    } catch (err) {
      console.error("Erro no carregamento administrativo:", err);
      showToast("Alguns dados não puderam ser sincronizados", "error");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast("O logo deve ter no máximo 1MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAppConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
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
          {(['solutions', 'essencia', 'intelligence', 'customization'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              {tab === 'solutions' ? 'Catálogo' : tab === 'essencia' ? 'Essência' : tab === 'intelligence' ? 'Inteligência' : 'Personalização'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'solutions' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex gap-4">
              <button onClick={addSolution} className="px-8 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">+ Nova Solução</button>
              <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-8 py-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2">
                {isImporting ? 'Importando...' : 'Importar DOCX'}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportDocx} accept=".docx" className="hidden" />
            </div>
            <button onClick={handleSyncSolutions} disabled={isSyncing} className={`px-10 py-4 ${isSyncing ? 'bg-gray-400' : 'bg-brand'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all`}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar com Nuvem'}
            </button>
          </div>

          <div className="space-y-6">
            {solutions.map((item) => (
              <div key={item.id} className="app-card p-10 bg-white border border-gray-100 space-y-8 group transition-all hover:border-brand">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Nome da Solução</label>
                    <input 
                      value={item.solucao} 
                      onChange={(e) => updateSolution(item.id, 'solucao', e.target.value)}
                      className="w-full bg-gray-50 p-4 rounded-xl font-bold text-lg focus:bg-white outline-none border border-transparent focus:border-brand"
                    />
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
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Dica de Venda</label>
                        <textarea value={item.dica_venda} onChange={(e) => updateSolution(item.id, 'dica_venda', e.target.value)} className="w-full bg-amber-50/30 p-4 rounded-xl font-medium italic text-sm border border-amber-100/50 min-h-[100px]" />
                      </div>
                   </div>
                </div>
              </div>
            ))}
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
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Anexar Logo</label>
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-brand transition-all overflow-hidden"
                    >
                      {appConfig.logoUrl ? (
                        <img src={appConfig.logoUrl} alt="Preview" className="w-full h-full object-contain p-4" />
                      ) : (
                        <div className="text-center space-y-2">
                          <span className="text-3xl">🖼️</span>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clique para enviar</p>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">Tamanho recomendado: Máx 1MB (PNG/SVG)</p>
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
