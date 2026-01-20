
import React, { useState, useEffect, useRef } from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, SolutionItem, ProposalRecord, AppCustomization } from '../types';
import { generateStrategicMapping, improveObservationText } from '../services/gemini';
import { SupabaseService } from '../services/api';
import ProposalPresentation from './ProposalPresentation';

interface ProposalBuilderProps {
  appConfig: AppCustomization;
}

const PhantPattern = () => (
  <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none opacity-[0.03]">
    <pattern id="phant-text" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
      <text x="10" y="60" fontFamily="Inter" fontWeight="900" fontSize="40" fill="currentColor">PHANT</text>
    </pattern>
    <rect width="100%" height="100%" fill="url(#phant-text)" />
  </svg>
);

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer hover:border-gray-400 transition-colors" onClick={() => onChange(!checked)}>
    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest cursor-pointer select-none">{label}</label>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#6113cc]' : 'bg-gray-300'}`}>
        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ appConfig }) => {
  // --- STATE MANAGEMENT ---
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [strategicMap, setStrategicMap] = useState<StrategicMapItem[]>([]);
  const [catalog, setCatalog] = useState<SolutionItem[]>([]);
  const [proposalHistory, setProposalHistory] = useState<ProposalRecord[]>([]);
  
  const [metadata, setMetadata] = useState<ProposalMetadata>({
    clientName: '',
    industry: '',
    website: '',
    instagram: '',
    meetingNotesPains: '',
    meetingNotesDesires: '',
    observations: '',
    date: new Date().toLocaleDateString('pt-BR'),
    consultant: 'Estrategista PhantLab',
    headline: 'PROPOSTA DE MOVIMENTO ESTRATÉGICO',
    discountType: 'percent',
    discountValue: 0
  });
  
  // UI States
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'solutions' | 'mapping' | 'history'>('info');
  const [zoom, setZoom] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  
  // PAGE VISIBILITY TOGGLES
  const [showCover, setShowCover] = useState(true);
  const [showAIAnalysis, setShowAIAnalysis] = useState(true);
  const [showScope, setShowScope] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showClosing, setShowClosing] = useState(true);
  
  // Async Process States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isImprovingText, setIsImprovingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewContentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Data Loading
    const saved = localStorage.getItem('phant_current_proposal');
    if (saved) setProposalItems(JSON.parse(saved));
    SupabaseService.fetchSolutions().then(data => setCatalog(data || []));
    loadHistory();

    // 2. Load User Profile
    const token = localStorage.getItem('sb-wdatcopytwgykhpqshxa-auth-token');
    if (token) {
        try {
            const user = JSON.parse(token).user;
            if (user && !metadata.consultant) {
                setMetadata(prev => ({ ...prev, consultant: user.user_metadata?.full_name || 'Consultor Phant' }));
            }
        } catch (e) { /* ignore */ }
    }

    // 3. LAZY RENDERING TRIGGER
    const timer = setTimeout(() => {
      setIsPreviewReady(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const loadHistory = async () => {
    const hist = await SupabaseService.fetchProposalsHistory();
    setProposalHistory(hist);
  };

  // FIT TO SCREEN LOGIC
  const fitToScreen = () => {
    if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.clientWidth;
        const availableWidth = containerWidth - 80; 
        const a4WidthPx = 794; 
        const newZoom = Math.min(Math.max(availableWidth / a4WidthPx, 0.3), 1.5);
        setZoom(newZoom);
    }
  };

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, []);

  // --- ACTIONS ---

  const handleGenerateMap = async () => {
    if (!metadata.meetingNotesPains && !metadata.meetingNotesDesires) {
      alert("Preencha as dores ou desejos nas anotações primeiro.");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const map = await generateStrategicMapping(metadata);
      setStrategicMap(map);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar mapa. Verifique sua conexão.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImproveObs = async () => {
    if (!metadata.observations) return;
    setIsImprovingText(true);
    try {
      const improved = await improveObservationText(metadata.observations);
      setMetadata(prev => ({ ...prev, observations: improved }));
    } finally {
      setIsImprovingText(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = proposalItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
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

  const handleSaveToHistory = async () => {
    if (!metadata.clientName) {
      setValidationError("Nome do cliente é obrigatório");
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    
    const { finalPrice } = calculateTotals();

    const result = await SupabaseService.saveProposal(
      metadata.clientName,
      metadata.industry, // Salvando a indústria
      finalPrice,
      metadata.consultant,
      proposalItems,
      metadata
    );

    if (result.success) {
      loadHistory();
      alert("Proposta salva no histórico!");
      setActiveTab('history');
    } else {
      alert("Erro ao salvar: " + result.message);
    }
    setIsSaving(false);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    const element = document.getElementById('printable-area');
    if (!element) return;
    
    // @ts-ignore
    const opt = {
      margin: 0,
      filename: `Proposta_${metadata.clientName.replace(/\s+/g, '_')}_Phant.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- RENDERERS ---

  if (showPresentation) {
    return (
      <ProposalPresentation 
        metadata={metadata} 
        items={proposalItems} 
        strategicMap={strategicMap} 
        appConfig={appConfig}
        onClose={() => setShowPresentation(false)} 
      />
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row h-[calc(100vh-80px)] bg-[#f8f9fa] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100] h-screen bg-gray-100' : ''}`}>
      
      {/* SIDEBAR DE CONFIGURAÇÃO (ESQUERDA) */}
      {!isFullscreen && (
        <aside className="w-full lg:w-[450px] bg-white border-r border-gray-200 flex flex-col h-full shrink-0 z-20 shadow-xl lg:shadow-none">
          {/* Header Sidebar */}
          <div className="p-6 border-b border-gray-100 bg-white">
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Configuração</h2>
            <div className="flex gap-2 mt-4 bg-gray-50 p-1.5 rounded-xl">
              {[
                { id: 'info', label: 'Dados' },
                { id: 'solutions', label: 'Escopo' },
                { id: 'mapping', label: 'Mapa' },
                { id: 'history', label: 'Histórico' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Sidebar */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-white">
            
            {/* TAB: INFO */}
            {activeTab === 'info' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Informações do Cliente</label>
                  <input 
                    placeholder="Nome do Cliente / Empresa" 
                    value={metadata.clientName}
                    onChange={e => setMetadata({...metadata, clientName: e.target.value})}
                    className={`w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border-2 ${validationError ? 'border-red-300' : 'border-transparent'} focus:border-brand`}
                  />
                  {validationError && <p className="text-[9px] font-bold text-red-500 uppercase">{validationError}</p>}
                  
                  {/* CAMPO INDÚSTRIA ADICIONADO AQUI */}
                  <input 
                    placeholder="Indústria / Nicho (Ex: Varejo, SaaS)" 
                    value={metadata.industry}
                    onChange={e => setMetadata({...metadata, industry: e.target.value})}
                    className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-brand"
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                     <input 
                        placeholder="Website" 
                        value={metadata.website}
                        onChange={e => setMetadata({...metadata, website: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-medium text-xs outline-none focus:border-brand border-2 border-transparent"
                     />
                     <input 
                        placeholder="@Instagram" 
                        value={metadata.instagram}
                        onChange={e => setMetadata({...metadata, instagram: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-xl font-medium text-xs outline-none focus:border-brand border-2 border-transparent"
                     />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                   <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Anotações da Reunião (Contexto IA)</label>
                   <textarea 
                     placeholder="Dores e problemas identificados..." 
                     value={metadata.meetingNotesPains}
                     onChange={e => setMetadata({...metadata, meetingNotesPains: e.target.value})}
                     className="w-full bg-red-50 p-4 rounded-xl font-medium text-xs min-h-[80px] outline-none focus:ring-2 focus:ring-red-100"
                   />
                   <textarea 
                     placeholder="Desejos e sonhos mencionados..." 
                     value={metadata.meetingNotesDesires}
                     onChange={e => setMetadata({...metadata, meetingNotesDesires: e.target.value})}
                     className="w-full bg-green-50 p-4 rounded-xl font-medium text-xs min-h-[80px] outline-none focus:ring-2 focus:ring-green-100"
                   />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Observações Finais & Ajustes</label>
                       <button onClick={handleImproveObs} disabled={isImprovingText || !metadata.observations} className="text-[9px] font-black text-brand hover:underline disabled:opacity-50">
                          {isImprovingText ? 'Melhorando...' : '✨ Melhorar com IA'}
                       </button>
                    </div>
                    <textarea 
                      placeholder="Obs. finais, condições de pgto, prazos..." 
                      value={metadata.observations}
                      onChange={e => setMetadata({...metadata, observations: e.target.value})}
                      className="w-full bg-amber-50 p-4 rounded-xl font-medium text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-amber-100"
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                   <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Headline da Capa</label>
                   <input 
                      value={metadata.headline}
                      onChange={e => setMetadata({...metadata, headline: e.target.value})}
                      className="w-full bg-gray-50 p-4 rounded-xl font-black text-sm uppercase tracking-tight outline-none focus:border-brand border-2 border-transparent"
                   />
                </div>
              </div>
            )}

            {/* TAB: SCOPE (SOLUTIONS) */}
            {activeTab === 'solutions' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                       Os itens abaixo vêm do simulador. Você pode adicionar mais itens do catálogo ou remover.
                    </p>
                 </div>

                 {proposalItems.map((item, idx) => (
                    <div key={item.instanceId} className="bg-white border border-gray-200 p-4 rounded-2xl relative group hover:border-brand transition-colors">
                       <button 
                         onClick={() => setProposalItems(prev => prev.filter((_, i) => i !== idx))}
                         className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                       >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                       </button>
                       <h4 className="font-black text-sm text-gray-900 pr-6">{item.name}</h4>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase">{item.duration}</span>
                          <span className="text-[10px] font-bold text-brand">{formatCurrency(item.totalPrice)}</span>
                       </div>
                    </div>
                 ))}

                 {/* Add More Logic */}
                 <div className="pt-4 border-t border-gray-50">
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 block">Adicionar do Catálogo</label>
                    <select 
                       className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
                       onChange={(e) => {
                          const sol = catalog.find(s => String(s.id) === e.target.value);
                          if (sol) {
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
                                resultado_esperado: sol.resultado_esperado,
                                diferenciais: sol.diferenciais
                             };
                             setProposalItems([...proposalItems, newItem]);
                          }
                          e.target.value = "";
                       }}
                    >
                       <option value="">Selecione para adicionar...</option>
                       {catalog.map(c => (
                          <option key={c.id} value={c.id}>{c.solucao}</option>
                       ))}
                    </select>
                 </div>
              </div>
            )}

            {/* TAB: MAPPING (IA) */}
            {activeTab === 'mapping' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                     <p className="text-[10px] font-bold text-purple-800 leading-relaxed mb-3">
                        A IA irá comparar as dores e desejos do cliente para criar um quadro de "De/Para" estratégico.
                     </p>
                     <button 
                        onClick={handleGenerateMap}
                        disabled={isGeneratingAI}
                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all disabled:opacity-50"
                     >
                        {isGeneratingAI ? 'Gerando Análise...' : 'Gerar Mapa Estratégico'}
                     </button>
                  </div>

                  <div className="space-y-3">
                     {strategicMap.map((m, i) => (
                        <div key={i} className="flex gap-2 text-[10px]">
                           <div className="flex-1 bg-red-50 p-3 rounded-xl border border-red-100">
                              <span className="block font-black text-red-400 mb-1">DE (DOR)</span>
                              {m.current}
                           </div>
                           <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100">
                              <span className="block font-black text-green-500 mb-1">PARA (SOLUÇÃO)</span>
                              {m.desired}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'history' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Últimas Propostas</h3>
                     <button onClick={loadHistory} className="text-[10px] text-brand font-bold hover:underline">Atualizar</button>
                  </div>
                  
                  {proposalHistory.length === 0 ? (
                     <div className="text-center py-10 text-gray-400 text-xs">Nenhuma proposta salva.</div>
                  ) : (
                     <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-gray-50">
                              <tr>
                                 <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                 <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                 <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                                 <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {proposalHistory.map((rec) => (
                                 <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="p-3">
                                       <div className="font-bold text-xs text-gray-900">{rec.client_name}</div>
                                       <div className="text-[9px] text-gray-400">{rec.industry || 'Sem nicho'}</div>
                                    </td>
                                    <td className="p-3 text-[10px] text-gray-500 font-medium">
                                       {new Date(rec.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-3 text-[10px] font-bold text-gray-900 text-right font-mono">
                                       {formatCurrency(rec.total_value)}
                                    </td>
                                    <td className="p-3 text-center">
                                       <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                                          rec.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                          rec.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                          'bg-yellow-100 text-yellow-600'
                                       }`}>
                                          {rec.status === 'APPROVED' ? 'APROV' : rec.status === 'REJECTED' ? 'REJEIT' : 'PEND'}
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>
            )}

            {/* PAGE TOGGLES */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
               <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Páginas Visíveis</label>
               <div className="space-y-2">
                  <ToggleSwitch label="Capa" checked={showCover} onChange={setShowCover} />
                  <ToggleSwitch label="Análise IA" checked={showAIAnalysis} onChange={setShowAIAnalysis} />
                  <ToggleSwitch label="Escopo Técnico" checked={showScope} onChange={setShowScope} />
                  <ToggleSwitch label="Investimento" checked={showClosing} onChange={setShowClosing} />
               </div>
            </div>

            {/* DISCOUNT SECTION */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
               <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Desconto</label>
               <div className="flex gap-2">
                  <select 
                    value={metadata.discountType}
                    onChange={e => setMetadata({...metadata, discountType: e.target.value as any})}
                    className="bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
                  >
                     <option value="percent">%</option>
                     <option value="fixed">R$</option>
                  </select>
                  <input 
                    type="number"
                    value={metadata.discountValue}
                    onChange={e => setMetadata({...metadata, discountValue: parseFloat(e.target.value) || 0})}
                    className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold outline-none"
                    placeholder="0"
                  />
               </div>
            </div>
          </div>

          {/* Action Footer Sidebar */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
             <button 
               onClick={handleSaveToHistory}
               disabled={isSaving}
               className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
             >
               {isSaving ? <span className="animate-spin">⏳</span> : '💾'} Salvar no Histórico
             </button>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowPresentation(true)}
                  className="py-3 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-purple-500/20 shadow-lg"
                >
                  Modo Apres.
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  {isDownloading ? 'Gerando...' : 'Baixar PDF'}
                </button>
             </div>
          </div>
        </aside>
      )}

      {/* ÁREA DE PREVIEW (DIREITA) */}
      <main className="flex-1 relative flex flex-col h-full bg-gray-100 overflow-hidden">
        
        {/* Toolbar Superior */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                 {isFullscreen ? '🗗 Restaurar' : '🗖 Tela Cheia'}
              </button>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-2">
                 <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg font-bold hover:bg-gray-200">-</button>
                 <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                 <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg font-bold hover:bg-gray-200">+</button>
                 <button onClick={fitToScreen} className="ml-2 text-[10px] font-bold uppercase text-gray-400 hover:text-black">Ajustar</button>
              </div>
           </div>
           <div>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">A4 Preview</span>
           </div>
        </div>

        {/* Scroll Area Central */}
        <div ref={previewContainerRef} className="flex-1 overflow-auto p-10 flex justify-center bg-gray-200/50 relative custom-scrollbar">
           
           {/* DOCUMENTO A4 */}
           <div 
             id="printable-area"
             className="proposal-preview-area origin-top transition-transform duration-300 ease-out bg-white shadow-2xl"
             style={{ 
                transform: `scale(${zoom})`,
                width: '210mm',
                minHeight: '297mm' // Altura mínima de uma A4
             }}
           >
              {/* === PÁGINA 1: CAPA === */}
              {showCover && (
                <section className="printable-page relative flex flex-col justify-between overflow-hidden bg-black text-white">
                   <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                   
                   <div className="relative z-10 pt-10 px-10">
                      <div className="flex justify-between items-start">
                         <img src={appConfig.proposalLogoUrl || appConfig.systemLogoUrl} alt="Logo" className="h-12 object-contain" />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Confidencial</span>
                      </div>
                   </div>

                   <div className="relative z-10 px-10 space-y-8">
                      <div className="inline-block px-4 py-1.5 border border-white/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
                         Proposta de Movimento Estratégico
                      </div>
                      <h1 className="text-7xl font-black tracking-tighter leading-[0.85] uppercase italic mix-blend-screen">
                         {metadata.headline || 'Impacto & Crescimento'}
                      </h1>
                      <div className="w-20 h-1.5 bg-purple-600"></div>
                   </div>

                   <div className="relative z-10 p-10 bg-white/5 backdrop-blur-sm border-t border-white/10 flex justify-between items-end">
                      <div>
                         <span className="block text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Preparado Exclusivamente Para</span>
                         <h2 className="text-3xl font-black tracking-tight">{metadata.clientName || 'Nome do Cliente'}</h2>
                         <p className="text-sm font-medium opacity-60 mt-1">{metadata.date} • {metadata.consultant}</p>
                      </div>
                      <div className="text-right opacity-40">
                         <p className="text-[9px] font-black uppercase tracking-widest">{appConfig.companyName}</p>
                         <p className="text-[9px] font-bold">Strategic Sales Team</p>
                      </div>
                   </div>
                </section>
              )}

              {/* === PÁGINA 2: DIAGNÓSTICO (Opcional) === */}
              {showAIAnalysis && (
                <section className="printable-page relative flex flex-col bg-white text-gray-900">
                   <PhantPattern />
                   <div className="relative z-10 p-12 h-full flex flex-col">
                      <header className="mb-16">
                         <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Fase 01 • Diagnóstico</span>
                         <h2 className="text-5xl font-black text-gray-900 tracking-tighter mt-2">Cenário Atual <span className="text-purple-600">&</span> Futuro.</h2>
                         <p className="text-gray-400 font-medium mt-4 max-w-lg">
                            Baseado em nossa reunião, identificamos os gargalos que impedem seu crescimento e traçamos o caminho para a solução.
                         </p>
                      </header>

                      {strategicMap.length === 0 ? (
                         <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-[30px] bg-gray-50">
                            <p className="text-gray-300 font-bold uppercase text-xs tracking-widest">Mapa Estratégico não gerado</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 gap-6">
                            {strategicMap.map((item, i) => (
                               <div key={i} className="flex items-stretch border border-gray-100 rounded-[20px] overflow-hidden shadow-sm">
                                  <div className="w-1/2 bg-red-50 p-8 border-r border-red-100 flex flex-col justify-center">
                                     <span className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Estado Atual (Dor)</span>
                                     <p className="text-lg font-bold text-gray-800 leading-tight">"{item.current}"</p>
                                  </div>
                                  <div className="w-12 bg-white flex items-center justify-center relative z-10 -ml-6 -mr-6 rounded-full border border-gray-100 shadow-lg">
                                     <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                  </div>
                                  <div className="w-1/2 bg-green-50 p-8 border-l border-green-100 flex flex-col justify-center pl-10">
                                     <span className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2">Estado Desejado (Solução)</span>
                                     <p className="text-lg font-black text-gray-900 leading-tight uppercase">{item.desired}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}

                      <div className="mt-auto pt-10 border-t border-gray-100 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black">!</div>
                         <p className="text-xs font-bold text-gray-500 italic max-w-lg">
                            "A distância entre o estado atual e o desejado é preenchida por método, não por sorte."
                         </p>
                      </div>
                   </div>
                </section>
              )}

              {/* === PÁGINA 3: ESCOPO TÉCNICO === */}
              {showScope && (
                 <section className="printable-page relative flex flex-col bg-gray-50">
                    <div className="p-12 h-full flex flex-col">
                       <header className="mb-12">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fase 02 • Escopo Tático</span>
                          <h2 className="text-5xl font-black text-gray-900 tracking-tighter mt-2">Plano de Ação.</h2>
                       </header>

                       <div className="flex-1 space-y-6">
                          {proposalItems.map((item, i) => (
                             <div key={i} className="bg-white p-8 rounded-[24px] shadow-sm border border-gray-100 flex gap-8">
                                <div className="w-1/3 border-r border-gray-50 pr-6 space-y-4">
                                   <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-[9px] font-black uppercase">{item.duration}</span>
                                   <h3 className="text-2xl font-black text-gray-900 uppercase leading-none">{item.name}</h3>
                                   {item.promessa && <p className="text-xs text-gray-500 italic font-medium">"{item.promessa}"</p>}
                                </div>
                                <div className="w-2/3 space-y-4">
                                   <div className="space-y-2">
                                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Entregáveis</span>
                                      <ul className="grid grid-cols-2 gap-2">
                                         {(item.deliverables || ['Setup Completo', 'Estratégia']).map((d, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-[11px] font-bold text-gray-700">
                                               <span className="w-1 h-1 bg-purple-600 rounded-full mt-1.5 shrink-0"></span> {d}
                                            </li>
                                         ))}
                                      </ul>
                                   </div>
                                   {item.description && (
                                      <div className="pt-4 border-t border-gray-50">
                                         <p className="text-[11px] text-gray-400 leading-relaxed">{item.description}</p>
                                      </div>
                                   )}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </section>
              )}

              {/* === PÁGINA 4: INVESTIMENTO & FECHAMENTO === */}
              {showClosing && (
                 <section className="printable-page relative flex flex-col bg-black text-white overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-purple-900/40 to-transparent"></div>
                    
                    <div className="relative z-10 p-12 h-full flex flex-col justify-between">
                       <header>
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Fase 03 • Proposta Comercial</span>
                          <h2 className="text-5xl font-black text-white tracking-tighter mt-2">Investimento.</h2>
                       </header>

                       <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
                          <div className="space-y-4">
                             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Valor Total do Projeto</span>
                             <div className="flex flex-col items-center">
                                {calculateTotals().discountAmount > 0 && (
                                   <span className="text-2xl font-bold text-white/30 line-through decoration-red-500/50 mb-2">
                                      {formatCurrency(calculateTotals().subtotal)}
                                   </span>
                                )}
                                <span className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                                   {formatCurrency(calculateTotals().finalPrice)}
                                </span>
                             </div>
                          </div>

                          {metadata.observations && (
                             <div className="max-w-xl p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                                <span className="block text-[9px] font-black uppercase tracking-widest text-purple-400 mb-2">Condições & Observações</span>
                                <p className="text-sm font-medium text-white/80 leading-relaxed whitespace-pre-wrap">
                                   {metadata.observations}
                                </p>
                             </div>
                          )}
                       </div>

                       <div className="grid grid-cols-2 gap-12 pt-12 border-t border-white/10">
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">De acordo,</p>
                             <div className="h-12 border-b-2 border-white/20 mb-2"></div>
                             <p className="text-xs font-bold">{metadata.clientName}</p>
                             <p className="text-[10px] opacity-50">Contratante</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">PhantLab Representative</p>
                             <div className="h-12 border-b-2 border-white/20 mb-2 relative">
                                <img src="https://phant.com.br/uploads/assinatura_digital.png" className="absolute bottom-0 left-0 h-16 opacity-50 grayscale invert" alt="Assinatura" onError={(e) => e.currentTarget.style.display = 'none'} />
                             </div>
                             <p className="text-xs font-bold">{appConfig.companyName}</p>
                             <p className="text-[10px] opacity-50">Contratada</p>
                          </div>
                       </div>
                    </div>
                 </section>
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default ProposalBuilder;
