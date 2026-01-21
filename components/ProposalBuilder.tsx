
import React, { useState, useEffect, useMemo } from 'react';
import { AppCustomization, ProposalItem, ProposalMetadata, ProposalRecord, StrategicMapItem, SolutionItem } from '../types';
import { SupabaseService } from '../services/api';
import ProposalPresentation from './ProposalPresentation';
import { generateStrategicMapping } from '../services/gemini';

// Padrão de Pontos (Leve para impressão, visual Tech)
const DOT_PATTERN = `data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23333333' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E`;

interface ProposalBuilderProps {
  appConfig: AppCustomization;
}

type ViewMode = 'EDITOR' | 'PREVIEW';

export default function ProposalBuilder({ appConfig }: ProposalBuilderProps) {
  const [mode, setMode] = useState<ViewMode>('EDITOR');
  const [showPresentation, setShowPresentation] = useState(false);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [allSolutions, setAllSolutions] = useState<SolutionItem[]>([]);
  const [history, setHistory] = useState<ProposalRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);
  
  // Track Current Proposal ID for Sharing
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
  
  // Metadados da Proposta
  const [metadata, setMetadata] = useState<ProposalMetadata>({
    clientName: '',
    industry: '',
    website: '',
    instagram: '',
    headline: 'Plano de Aceleração',
    consultant: '',
    date: new Date().toLocaleDateString('pt-BR'),
    discountType: 'percent',
    discountValue: 0,
    observations: '',
    // Campos para IA
    meetingNotesPains: '',
    meetingNotesDesires: '',
    // Visibilidade Padrão
    sections: {
      cover: true,
      strategicMap: true,
      scope: true,
      closing: true
    }
  });

  // Mapeamento Estratégico (Cenário De/Para)
  const [comparisons, setComparisons] = useState<StrategicMapItem[]>([
      { current: 'Dependência de Indicação', desired: 'Máquina de Vendas Previsível' },
      { current: 'Baixa Conversão', desired: 'Processo Comercial Validado' }
  ]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
        // 1. Carregar Itens do LocalStorage
        const savedItems = localStorage.getItem('phant_current_proposal');
        if (savedItems) setItems(JSON.parse(savedItems));

        // 2. Carregar Soluções para o Seletor
        const solutions = await SupabaseService.fetchSolutions();
        setAllSolutions(solutions);

        // 3. Carregar Usuário Logado
        try {
             const { data: { user } } = await import('../services/api').then(m => m.supabase.auth.getUser());
             if (user?.user_metadata?.full_name) {
                 setMetadata(prev => ({ ...prev, consultant: user.user_metadata.full_name }));
             }
        } catch {}

        // 4. Carregar Histórico
        fetchHistory();
    };
    loadInitialData();
  }, []);

  const fetchHistory = async () => {
      const recs = await SupabaseService.fetchProposalsHistory();
      setHistory(recs);
  };

  const calculateTotals = () => {
      const subtotal = items.reduce((acc, curr) => acc + curr.totalPrice, 0);
      let finalPrice = subtotal;
      let discountAmount = 0;

      if (metadata.discountValue && metadata.discountValue > 0) {
          if (metadata.discountType === 'percent') {
              discountAmount = subtotal * (metadata.discountValue / 100);
          } else {
              discountAmount = metadata.discountValue;
          }
          finalPrice = Math.max(0, subtotal - discountAmount);
      }

      return { subtotal, discountAmount, finalPrice };
  };

  const { subtotal, discountAmount, finalPrice } = calculateTotals();

  const toggleSection = (key: keyof typeof metadata.sections) => {
      setMetadata(prev => ({
          ...prev,
          sections: {
              ...(prev.sections || { cover: true, strategicMap: true, scope: true, closing: true }),
              [key]: !prev.sections?.[key]
          }
      }));
  };

  // --- ACTIONS ---

  const handleSaveProposal = async () => {
      if (!metadata.clientName) {
          alert("Por favor, preencha o nome do cliente.");
          return;
      }
      setIsSaving(true);
      
      const metadataToSave = {
        ...metadata,
        strategicMap: comparisons
      };

      const res = await SupabaseService.saveProposal(
          metadata.clientName, 
          metadata.industry, 
          finalPrice, 
          metadata.consultant, 
          items, 
          metadataToSave
      );

      if (res.success) {
          alert("Proposta salva no histórico!");
          if (res.id) setCurrentProposalId(res.id); 
          fetchHistory();
      } else {
          alert("Erro ao salvar: " + res.message);
      }
      setIsSaving(false);
  };

  const handleLoadHistory = (record: ProposalRecord) => {
      const shouldLoad = items.length === 0 || confirm(`Deseja carregar a proposta de ${record.client_name}?`);
      
      if (shouldLoad) {
          const defaultSections = { cover: true, strategicMap: true, scope: true, closing: true };
          const loadedMeta = {
              ...metadata, 
              ...record.metadata, 
              sections: record.metadata.sections || defaultSections 
          };
          
          setMetadata(loadedMeta);
          setItems(record.items || []);
          setCurrentProposalId(record.id);
          
          if ((record.metadata as any).strategicMap) {
              setComparisons((record.metadata as any).strategicMap);
          }
          
          localStorage.setItem('phant_current_proposal', JSON.stringify(record.items || []));
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleDeleteHistory = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir esta proposta permanentemente?")) {
          const res = await SupabaseService.deleteProposal(id);
          if (res.success) {
              if (currentProposalId === id) setCurrentProposalId(null);
              fetchHistory();
          } else {
              alert("Erro ao excluir: " + res.message);
          }
      }
  };

  const handleAnalyzeContext = async () => {
      if (!metadata.clientName) {
          alert("Preencha o nome do cliente antes de analisar.");
          return;
      }
      setIsAnalyzing(true);
      try {
          const result = await generateStrategicMapping(metadata);
          if (result && result.length > 0) {
              setComparisons(result);
          } else {
              alert("A IA não conseguiu gerar o mapa. Verifique dados de URL/Notas.");
          }
      } catch (e) {
          alert("Erro na análise IA.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const removeItem = (instanceId: string) => {
      const newItems = items.filter(i => i.instanceId !== instanceId);
      setItems(newItems);
      localStorage.setItem('phant_current_proposal', JSON.stringify(newItems));
  };

  const addItem = (sol: SolutionItem) => {
      const newItem: ProposalItem = {
          instanceId: `${sol.id}-${Date.now()}`,
          solutionId: sol.id,
          name: sol.solucao,
          basePrice: sol.valor_base_num || 0,
          selectedOptions: [],
          totalPrice: sol.valor_base_num || 0,
          duration: sol.duracao,
          description: sol.descricao,
          deliverables: sol.entregaveis,
          promessa: sol.promessa,
          publico_alvo: sol.publico_alvo,
          resultado_esperado: sol.resultado_esperado,
          diferenciais: sol.diferenciais
      };
      const nextItems = [...items, newItem];
      setItems(nextItems);
      localStorage.setItem('phant_current_proposal', JSON.stringify(nextItems));
      setShowItemSelector(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- RENDER: APRESENTAÇÃO (SLIDES) ---
  if (showPresentation) {
      return (
          <ProposalPresentation 
             proposalId={currentProposalId}
             metadata={metadata}
             items={items}
             strategicMap={comparisons}
             appConfig={appConfig}
             onClose={() => setShowPresentation(false)}
          />
      );
  }

  // --- RENDER: LAYOUT DE IMPRESSÃO (PREVIEW - PDF) ---
  if (mode === 'PREVIEW') {
    const logoUrl = appConfig.proposalLogoUrl || appConfig.systemLogoUrl || "";
    const sections = metadata.sections || { cover: true, strategicMap: true, scope: true, closing: true };
    
    return (
      <div className="bg-[#111] min-h-screen flex justify-center py-10 proposal-preview-wrapper">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
            .font-inter { font-family: 'Inter', sans-serif; }
            p, h1, h2, h3, h4, h5, h6 { text-wrap: balance; }

            .proposal-container {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                padding-bottom: 80px;
            }

            .proposal-page {
                width: 210mm;
                height: 297mm;
                background-color: #050505; /* PRETO ABSOLUTO PHANT */
                color: white;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                flex-shrink: 0;
            }
          `}
        </style>

        <div className="fixed top-6 right-6 z-50 flex gap-3 no-print">
           <button onClick={() => setMode('EDITOR')} className="px-6 py-3 bg-white text-gray-900 font-bold text-xs uppercase tracking-widest rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 transition-all">
              ← Voltar
           </button>
           <button onClick={() => window.print()} className="px-8 py-3 bg-[#6113cc] text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2">
              <span>🖨️</span> Salvar PDF
           </button>
        </div>

        <div className="proposal-container font-inter">
          
          {/* PAGE 1: CAPA PHANT */}
          {sections.cover && (
            <section className="proposal-page p-[15mm] flex flex-col justify-between relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: `url("${DOT_PATTERN}")`, backgroundSize: '15px' }}></div>
                
                {/* Header */}
                <div className="relative z-10 flex justify-between items-start">
                    {logoUrl ? 
                        <img src={logoUrl} alt="Logo" className="h-10 object-contain invert grayscale brightness-200" /> : 
                        <h2 className="text-2xl font-black tracking-tighter text-white">{appConfig.companyName}</h2>
                    }
                    <div className="text-right">
                         <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">{metadata.date}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 space-y-8">
                    <div className="w-20 h-1 bg-[#6113cc]"></div>
                    <h1 className="text-[5rem] font-black leading-[0.85] tracking-tighter uppercase text-white">
                        {metadata.headline}
                    </h1>
                    <p className="text-2xl font-medium text-gray-500 max-w-lg">
                        Plano estratégico de aceleração para <span className="text-white">{metadata.clientName}</span>.
                    </p>
                </div>

                {/* Footer */}
                <div className="relative z-10 border-t border-white/10 pt-8 flex justify-between items-end">
                    <div>
                        <p className="text-[8px] font-bold text-[#6113cc] uppercase tracking-widest mb-2">Prepared By</p>
                        <p className="text-sm font-bold text-white">{metadata.consultant}</p>
                    </div>
                    <div className="text-right">
                         <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Confidential Document</p>
                    </div>
                </div>
            </section>
          )}

          {/* PAGE 2: DIAGNÓSTICO */}
          {sections.strategicMap && (
            <section className="proposal-page p-[15mm] flex flex-col relative">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("${DOT_PATTERN}")`, backgroundSize: '15px' }}></div>
                
                <header className="relative z-10 mb-16 border-b border-white/10 pb-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-4xl font-black tracking-tighter uppercase text-white">Diagnóstico</h2>
                        <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full text-white/50 uppercase">01 / Analysis</span>
                    </div>
                </header>

                <div className="flex-1 relative z-10 flex flex-col justify-center gap-6">
                    {comparisons.map((item, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row border border-white/10 bg-white/[0.02]">
                            <div className="flex-1 p-10 border-r border-white/10">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-4 block">Cenário Atual</span>
                                <p className="text-2xl font-bold text-gray-500 line-through decoration-red-500/50 decoration-2">{item.current}</p>
                            </div>
                            <div className="flex-1 p-10 bg-[#6113cc]/5 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-[#6113cc]/20 to-transparent"></div>
                                <span className="text-[9px] font-black text-[#6113cc] uppercase tracking-widest mb-4 block">Cenário Desejado</span>
                                <p className="text-3xl font-black text-white">{item.desired}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
          )}

          {/* PAGE 3: ESCOPO E INVESTIMENTO */}
          <section className="proposal-page p-[15mm] flex flex-col relative">
             <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("${DOT_PATTERN}")`, backgroundSize: '15px' }}></div>

             <div className="h-full flex flex-col justify-between relative z-10">
                <div className="space-y-10">
                    {sections.scope && (
                        <>
                            <header className="border-b border-white/10 pb-8 flex justify-between items-end">
                                <h2 className="text-4xl font-black tracking-tighter uppercase text-white">Escopo Tático</h2>
                                <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full text-white/50 uppercase">02 / Execution</span>
                            </header>

                            <div className="space-y-4">
                                {items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center border border-white/10 p-6 bg-white/[0.02]">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] font-black text-[#6113cc] uppercase tracking-widest">{item.duration}</span>
                                                <h3 className="text-xl font-bold text-white uppercase">{item.name}</h3>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-medium max-w-md">{item.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-white">{formatCurrency(item.totalPrice)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {sections.closing && (
                    <div className="mt-auto">
                        <div className="border-t border-white/10 pt-10">
                            <div className="flex justify-between items-end mb-8">
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Investimento Total</span>
                                <div className="text-right">
                                    {discountAmount > 0 && <span className="block text-sm font-bold text-gray-600 line-through mb-1">{formatCurrency(subtotal)}</span>}
                                    <span className="text-6xl font-black tracking-tighter text-white">{formatCurrency(finalPrice)}</span>
                                </div>
                            </div>
                            
                            {metadata.observations && (
                                <div className="p-6 bg-white/[0.02] border border-white/5 text-center">
                                    <p className="text-[10px] text-gray-400 font-medium italic">{metadata.observations}</p>
                                </div>
                            )}
                        </div>
                        <div className="text-center mt-8">
                             <p className="text-[8px] font-black text-[#6113cc] uppercase tracking-[0.4em]">PhantLab Methodology • Valid Until {new Date(Date.now() + 7 * 86400000).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
             </div>
          </section>
        </div>
      </div>
    );
  }

  // --- RENDER: EDITOR (PAINEL GERENCIAL) ---
  const sections = metadata.sections || { cover: true, strategicMap: true, scope: true, closing: true };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
       <header className="flex justify-between items-end bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Gerador de Propostas</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Painel de Construção e Emissão</p>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Valor Total</span>
             <span className="text-4xl font-black text-gray-900 tracking-tighter">{formatCurrency(finalPrice)}</span>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUNA ESQUERDA: CONFIGURAÇÃO */}
          <div className="lg:col-span-4 space-y-8">
             <div className="app-card p-8 bg-white border border-gray-100 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black tracking-tight">Dados do Cliente</h3>
                    <button 
                        onClick={handleAnalyzeContext} 
                        disabled={isAnalyzing}
                        title="Usa dados de URL e Notas para gerar estratégia"
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-black uppercase hover:bg-purple-200 transition-all flex items-center gap-1"
                    >
                        {isAnalyzing ? '...' : '✨ Analisar (IA)'}
                    </button>
                </div>
                
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome da Empresa</label>
                      <input 
                        value={metadata.clientName}
                        onChange={e => setMetadata({...metadata, clientName: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Ex: ACME Ltda"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Setor / Nicho</label>
                      <input 
                        value={metadata.industry}
                        onChange={e => setMetadata({...metadata, industry: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Ex: Tecnologia"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Instagram (Opcional)</label>
                        <input 
                            value={metadata.instagram || ''}
                            onChange={e => setMetadata({...metadata, instagram: e.target.value})}
                            className="w-full bg-gray-50 p-3 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="@usuario"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Site (Opcional)</label>
                        <input 
                            value={metadata.website || ''}
                            onChange={e => setMetadata({...metadata, website: e.target.value})}
                            className="w-full bg-gray-50 p-3 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="www.site.com"
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Contexto (Dores/Desejos)</label>
                      <textarea 
                        value={metadata.meetingNotesPains}
                        onChange={e => setMetadata({...metadata, meetingNotesPains: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-medium text-xs min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                        placeholder="O que o cliente precisa resolver? (Usado pela IA)"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Consultor Responsável</label>
                      <input 
                        value={metadata.consultant}
                        onChange={e => setMetadata({...metadata, consultant: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                   </div>
                </div>
             </div>

             {/* BLOCO DE ESTRUTURA (CONFIGURAÇÃO) */}
             <div className="app-card p-8 bg-white border border-gray-100 space-y-6">
                <h3 className="text-lg font-black tracking-tight">Estrutura da Proposta</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-700">Capa do Documento</span>
                        <button onClick={() => toggleSection('cover')} className={`w-10 h-6 rounded-full p-1 transition-colors ${sections.cover ? 'bg-black' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${sections.cover ? 'translate-x-4' : ''}`}></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-700">Análise IA (Mapa)</span>
                        <button onClick={() => toggleSection('strategicMap')} className={`w-10 h-6 rounded-full p-1 transition-colors ${sections.strategicMap ? 'bg-black' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${sections.strategicMap ? 'translate-x-4' : ''}`}></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-700">Escopo & Itens</span>
                        <button onClick={() => toggleSection('scope')} className={`w-10 h-6 rounded-full p-1 transition-colors ${sections.scope ? 'bg-black' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${sections.scope ? 'translate-x-4' : ''}`}></div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-700">Total & Fechamento</span>
                        <button onClick={() => toggleSection('closing')} className={`w-10 h-6 rounded-full p-1 transition-colors ${sections.closing ? 'bg-black' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${sections.closing ? 'translate-x-4' : ''}`}></div>
                        </button>
                    </div>
                </div>
             </div>

             <div className="app-card p-8 bg-white border border-gray-100 space-y-6">
                <h3 className="text-lg font-black tracking-tight">Condições & Obs</h3>
                
                <div className="space-y-4">
                   <div className="p-4 bg-gray-50 rounded-2xl space-y-4">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Aplicar Desconto</label>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => setMetadata({...metadata, discountType: 'percent'})}
                           className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metadata.discountType === 'percent' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}
                         >
                           % Percentual
                         </button>
                         <button 
                           onClick={() => setMetadata({...metadata, discountType: 'fixed'})}
                           className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metadata.discountType === 'fixed' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}
                         >
                           R$ Fixo
                         </button>
                      </div>
                      <input 
                        type="number"
                        value={metadata.discountValue}
                        onChange={e => setMetadata({...metadata, discountValue: parseFloat(e.target.value)})}
                        className="w-full bg-white p-3 rounded-xl font-bold text-center outline-none"
                        placeholder="0"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Observações Internas / Proposta</label>
                      <textarea 
                        value={metadata.observations}
                        onChange={e => setMetadata({...metadata, observations: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-medium text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Condições de pagamento, prazos especiais..."
                      />
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => setMode('PREVIEW')}
                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
                 >
                    <span>📄</span> PDF
                 </button>
                 <button 
                    onClick={() => setShowPresentation(true)}
                    className="w-full py-5 bg-purple-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-purple-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
                 >
                    <span>📺</span> Slides
                 </button>
             </div>
             
             <button 
                onClick={handleSaveProposal}
                disabled={isSaving}
                className="w-full py-4 bg-white border border-gray-200 text-gray-900 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all disabled:opacity-50"
             >
                {isSaving ? 'Salvando...' : 'Salvar no Histórico'}
             </button>
          </div>

          {/* COLUNA DIREITA: ESCOPO E ITENS */}
          <div className="lg:col-span-8 space-y-8">
             <div className="app-card p-10 bg-white border border-gray-100 min-h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black tracking-tight">Escopo do Projeto</h3>
                   <button 
                     onClick={() => setShowItemSelector(true)}
                     className="px-6 py-3 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                   >
                     + Adicionar Item
                   </button>
                </div>

                <div className="flex-1 space-y-4">
                   {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[32px] p-10">
                         <span className="text-4xl mb-4">🛒</span>
                         <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item adicionado</p>
                         <p className="text-xs font-medium mt-2">Adicione itens do catálogo para compor a proposta.</p>
                      </div>
                   ) : (
                      items.map((item, i) => (
                         <div key={item.instanceId} className="group p-6 rounded-[24px] border border-gray-100 hover:border-black/10 hover:shadow-lg transition-all flex justify-between items-center bg-gray-50/50">
                            <div className="space-y-1">
                               <div className="flex items-center gap-3">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black rounded uppercase">{item.duration}</span>
                                  <h4 className="font-black text-lg text-gray-900">{item.name}</h4>
                               </div>
                               <p className="text-xs text-gray-500 font-medium max-w-md truncate">{item.promessa || item.description}</p>
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="text-right">
                                  <span className="text-lg font-black text-gray-900">{formatCurrency(item.totalPrice)}</span>
                               </div>
                               <button 
                                 onClick={() => removeItem(item.instanceId)}
                                 className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                 title="Remover Item"
                               >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                               </button>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>

             {/* HISTÓRICO */}
             <div className="app-card p-8 bg-white border border-gray-100 space-y-6">
                <h3 className="text-lg font-black tracking-tight">Histórico Recente</h3>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="text-[10px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50">
                            <th className="pb-4 pl-4">Cliente</th>
                            <th className="pb-4">Data</th>
                            <th className="pb-4">Valor</th>
                            <th className="pb-4 text-center">Ações</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {history.slice(0, 5).map(h => (
                            <tr key={h.id} className="group hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleLoadHistory(h)} title="Clique para editar">
                               <td className="py-4 pl-4 font-bold text-xs text-gray-900">{h.client_name}</td>
                               <td className="py-4 text-xs text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td>
                               <td className="py-4 font-mono text-xs font-bold text-gray-700">{formatCurrency(h.total_value)}</td>
                               <td className="py-4 text-center flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => handleLoadHistory(h)} className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase rounded hover:bg-gray-800 transition-all">
                                    Editar
                                  </button>
                                  <button onClick={() => handleDeleteHistory(h.id)} className="p-1.5 text-red-300 hover:text-red-500 transition-all" title="Excluir">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  </button>
                               </td>
                            </tr>
                         ))}
                         {history.length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-[10px] font-black uppercase text-gray-300">Nenhum histórico encontrado</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
       </div>

       {/* MODAL SELETOR DE ITENS */}
       {showItemSelector && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl space-y-6 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center shrink-0">
                   <h3 className="text-2xl font-black tracking-tight">Adicionar ao Escopo</h3>
                   <button onClick={() => setShowItemSelector(false)} className="p-3 bg-gray-100 rounded-full hover:bg-black hover:text-white transition-all">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                   {allSolutions.map(sol => (
                      <button 
                        key={sol.id} 
                        onClick={() => addItem(sol)}
                        className="w-full p-4 rounded-2xl border border-gray-100 hover:border-black hover:shadow-lg transition-all flex justify-between items-center group text-left"
                      >
                         <div>
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-blue-500">{sol.categoria}</span>
                            <h4 className="font-bold text-gray-900">{sol.solucao}</h4>
                         </div>
                         <div className="text-right">
                            <span className="block text-sm font-black text-gray-900">{formatCurrency(sol.valor_base_num)}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{sol.duracao}</span>
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          </div>
       )}
    </div>
  );
}