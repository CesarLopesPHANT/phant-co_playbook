import React, { useState, useEffect, useRef } from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, SolutionItem, ProposalRecord, AppCustomization } from '../types';
import { generateStrategicMapping, improveObservationText } from '../services/gemini';
import { SupabaseService } from '../services/api';
import ProposalPresentation from './ProposalPresentation';
import html2pdf from 'html2pdf.js';

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
  const [isPreviewReady, setIsPreviewReady] = useState(false); // LAZY RENDERING STATE
  const [activeTab, setActiveTab] = useState<'info' | 'solutions' | 'mapping' | 'history'>('info');
  const [zoom, setZoom] = useState(1.0); // Default A4 100%
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(true); // Toggle para mostrar/ocultar mapa IA
  
  // Async Process States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isImprovingText, setIsImprovingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Data Loading
    const saved = localStorage.getItem('phant_current_proposal');
    if (saved) setProposalItems(JSON.parse(saved));
    SupabaseService.fetchSolutions().then(data => setCatalog(data || []));
    loadHistory();

    // 2. LAZY RENDERING TRIGGER
    // Wait for the parent layout (flexbox) to settle before rendering the heavy PDF DOM
    const timer = setTimeout(() => {
      setIsPreviewReady(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const loadHistory = async () => {
    const history = await SupabaseService.fetchProposalsHistory();
    setProposalHistory(history || []);
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

  const { subtotal, discountAmount, finalPrice } = calculateTotals();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- AI & LOGIC HANDLERS ---
  const handleGenerateAI = async () => {
    if (!metadata.clientName) {
      showError("O nome do cliente é obrigatório para análise.");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const mapping = await generateStrategicMapping(metadata);
      setStrategicMap(mapping || []);
      setActiveTab('mapping');
    } catch (err) {
      console.error(err);
      showError("A pesquisa da IA falhou.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImproveText = async () => {
    if (!metadata.observations?.trim() || isImprovingText) return;
    setIsImprovingText(true);
    try {
      const improved = await improveObservationText(metadata.observations);
      setMetadata(prev => ({ ...prev, observations: improved }));
    } finally {
      setIsImprovingText(false);
    }
  };

  const handleAddSolution = (sol: SolutionItem) => {
    const newItem: ProposalItem = {
      instanceId: `manual-${Date.now()}`,
      solutionId: sol.id,
      name: sol.solucao,
      basePrice: sol.valor_base_num,
      selectedOptions: [],
      totalPrice: sol.valor_base_num,
      duration: sol.duracao,
      description: sol.descricao,
      deliverables: sol.entregaveis || []
    };
    setProposalItems(prev => [...prev, newItem]);
  };

  const removeSolution = (id: string) => {
    setProposalItems(prev => prev.filter(p => p.instanceId !== id));
  };

  const showError = (msg: string) => {
    setValidationError(msg);
    setTimeout(() => setValidationError(null), 3000);
  };

  const updateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const res = await SupabaseService.updateProposalStatus(id, newStatus);
    if (res.success) {
        setProposalHistory(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } else {
        showError("Erro ao atualizar status");
    }
  };

  // --- PERSISTENCE LAYER (SUPABASE) ---
  const saveToCloud = async (silent = false) => {
    if (!metadata.clientName) {
      showError("Defina o nome do cliente antes de salvar.");
      setActiveTab('info');
      return false;
    }

    setIsSaving(true);
    try {
      const res = await SupabaseService.saveProposal(
        metadata.clientName,
        metadata.industry || "N/A",
        finalPrice,
        metadata.consultant,
        proposalItems,
        metadata
      );
      
      if (!res.success) throw new Error(res.message);

      await loadHistory();
      if (!silent) alert("Proposta salva no histórico com sucesso!");
      return true;
    } catch (err: any) {
      console.error("Erro na exportação:", err);
      showError("Erro ao salvar no banco de dados.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // --- GENERATION LAYER (HTML2PDF) ---
  const generatePDF = async () => {
    setIsDownloading(true);
    
    // 1. Identify Source
    const sourceElement = document.getElementById('proposal-pages-container');
    if (!sourceElement) {
      setIsDownloading(false);
      return;
    }

    try {
      // 2. Clone DOM to avoid messing with current view and remove transforms
      const clone = sourceElement.cloneNode(true) as HTMLElement;
      
      // 3. Create Sandbox Container (Fixed A4 dimensions, off-screen)
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '0';
      container.style.width = '210mm'; // Force Exact A4 Width
      container.id = 'pdf-generation-sandbox';
      
      // 4. Reset Clone Styles (Remove Zoom/Transform)
      clone.style.transform = 'scale(1)';
      clone.style.transformOrigin = 'top left';
      clone.style.margin = '0';
      clone.style.width = '100%';
      clone.style.height = 'auto';
      
      // Reset page margins and shadows for the clone
      const pages = clone.querySelectorAll('.printable-page');
      pages.forEach((page: any) => {
        page.style.marginBottom = '0'; // Remove UI spacing
        page.style.boxShadow = 'none'; // Remove UI shadows
        page.style.height = 'auto';    // Allow height to grow
        page.style.minHeight = '297mm'; // Minimum A4
      });

      container.appendChild(clone);
      document.body.appendChild(container);

      // 5. Configure html2pdf with BETTER PAGE BREAK SETTINGS
      const opt = {
        margin: 0,
        filename: `${metadata.clientName || 'Proposta'}_PhantLab.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          scrollY: 0,
          windowWidth: 794, 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // IMPORTANT: Use 'css' mode to respect break-inside: avoid
        pagebreak: { mode: ['css', 'legacy'] }
      };

      // 6. Safe Execution
      // @ts-ignore
      const pdfLib = html2pdf.default || html2pdf || (window as any).html2pdf;
      
      if (typeof pdfLib === 'function') {
         await pdfLib().set(opt).from(clone).save();
      } else {
         console.error("HTML2PDF library not loaded correctly", pdfLib);
         alert("Erro interno na biblioteca de PDF.");
      }

      // 7. Cleanup
      document.body.removeChild(container);

    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  const loadFromHistory = (record: ProposalRecord) => {
    if (!record) return;
    setProposalItems(Array.isArray(record.items) ? record.items : []);
    setMetadata({
      clientName: record.client_name || '',
      industry: record.industry || '',
      website: record.metadata?.website || '',
      instagram: record.metadata?.instagram || '',
      meetingNotesPains: record.metadata?.meetingNotesPains || '',
      meetingNotesDesires: record.metadata?.meetingNotesDesires || '',
      observations: record.metadata?.observations || '',
      date: record.metadata?.date || new Date(record.created_at).toLocaleDateString('pt-BR'),
      consultant: record.consultant || 'Estrategista PhantLab',
      headline: record.metadata?.headline || 'PROPOSTA DE MOVIMENTO ESTRATÉGICO',
      discountType: record.metadata?.discountType || 'percent',
      discountValue: record.metadata?.discountValue || 0
    });
    setActiveTab('solutions');
    const scrollArea = document.querySelector('.proposal-preview-area');
    if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const adjustZoom = (delta: number) => setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 1.5));
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      previewRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'APPROVED') return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black uppercase rounded">Aprovada</span>;
    if (status === 'REJECTED') return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded">Reprovada</span>;
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-black uppercase rounded">Pendente</span>;
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700 ${isFullscreen ? 'fixed inset-0 z-[100] bg-[#1a1a1a] p-0 overflow-hidden' : ''}`}>
      <style>{`
        /* FORÇA QUEBRA DE PÁGINA CORRETA NO PDF */
        .pdf-item {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .print-break-after {
          page-break-after: always;
        }
      `}</style>

      {showPresentation && (
        <ProposalPresentation 
          metadata={metadata} 
          items={proposalItems} 
          strategicMap={strategicMap} 
          appConfig={appConfig}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* --- LEFT PANEL: CONTROLS --- */}
      {!isFullscreen && (
        <div className="w-full lg:w-[450px] space-y-8 no-print shrink-0">
          <header className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Gerador Proposta.</h2>
            <p className="text-gray-400 text-sm font-medium">Configure os dados antes de exportar o PDF.</p>
          </header>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[750px] relative">
            {validationError && (
              <div className="absolute top-16 left-0 right-0 z-50 px-8 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-full duration-300">
                {validationError}
              </div>
            )}
            
            <nav className="flex p-4 gap-2 bg-gray-50 border-b border-gray-100 no-print">
              {(['info', 'solutions', 'mapping', 'history'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
                >
                  {t === 'info' ? 'Dados' : t === 'solutions' ? 'Itens' : t === 'mapping' ? 'Estratégia' : 'Salvas'}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar no-print">
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-2 transition-colors ${validationError ? 'text-red-500' : 'text-gray-300'}`}>Nome do Cliente</label>
                    <input 
                      value={metadata.clientName}
                      onChange={e => {
                        setMetadata({...metadata, clientName: e.target.value.toUpperCase()});
                        if (validationError) setValidationError(null);
                      }}
                      className="w-full bg-gray-50 border-transparent border focus:border-brand p-4 rounded-2xl font-black text-sm outline-none transition-all"
                      placeholder="CLIENTE EXEMPLO"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-2">Website</label>
                      <input 
                        value={metadata.website}
                        onChange={e => setMetadata({...metadata, website: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-xs outline-none"
                        placeholder="site.com.br"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-2">Instagram</label>
                      <input 
                        value={metadata.instagram}
                        onChange={e => setMetadata({...metadata, instagram: e.target.value})}
                        className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-xs outline-none"
                        placeholder="@perfil"
                      />
                    </div>
                  </div>

                   {/* DISCOUNT SELECTOR */}
                   <div className="p-4 bg-gray-50 rounded-2xl space-y-4 border border-gray-100">
                      <label className="text-[10px] font-black text-brand uppercase tracking-widest">Aplicar Desconto</label>
                      <div className="flex gap-2">
                        <select 
                          value={metadata.discountType}
                          onChange={e => setMetadata({...metadata, discountType: e.target.value as 'percent' | 'fixed'})}
                          className="bg-white p-3 rounded-xl font-bold text-xs border border-gray-200 outline-none"
                        >
                          <option value="percent">% OFF</option>
                          <option value="fixed">R$ OFF</option>
                        </select>
                        <input 
                          type="number"
                          value={metadata.discountValue || ''}
                          onChange={e => setMetadata({...metadata, discountValue: parseFloat(e.target.value)})}
                          placeholder={metadata.discountType === 'percent' ? 'Ex: 10' : 'Ex: 500'}
                          className="flex-1 bg-white p-3 rounded-xl font-bold text-xs border border-gray-200 outline-none"
                        />
                      </div>
                      {discountAmount > 0 && (
                        <div className="text-right text-[10px] font-bold text-gray-400">
                           Desconto aplicado: -{formatCurrency(discountAmount)}
                        </div>
                      )}
                   </div>

                   {/* SHOW/HIDE AI MAP TOGGLE - HIGH CONTRAST */}
                   <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer hover:border-gray-400 transition-colors" onClick={() => setShowAIAnalysis(!showAIAnalysis)}>
                        <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest cursor-pointer">Incluir Mapa Estratégico (IA)</label>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${showAIAnalysis ? 'bg-[#6113cc]' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showAIAnalysis ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                   </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-2">Dores do Cliente</label>
                    <textarea 
                      value={metadata.meetingNotesPains}
                      onChange={e => setMetadata({...metadata, meetingNotesPains: e.target.value})}
                      className="w-full bg-gray-50 p-4 rounded-2xl font-medium text-xs min-h-[80px] outline-none"
                      placeholder="Quais problemas ele tem hoje?"
                    />
                  </div>

                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI}
                    className="w-full py-5 bg-black text-white rounded-[30px] font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl disabled:opacity-50"
                  >
                    {isGeneratingAI ? 'ANALISANDO WEB...' : '✨ Analisar Empresa com IA'}
                  </button>
                </div>
              )}

              {activeTab === 'solutions' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                   <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Itens na Proposta</h4>
                   {proposalItems.length > 0 ? proposalItems.map(item => (
                      <div key={item.instanceId} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group">
                        <div className="overflow-hidden">
                          <p className="font-black text-[11px] truncate">{item.name}</p>
                          <p className="text-[9px] text-brand font-bold uppercase">{formatCurrency(item.totalPrice)}</p>
                        </div>
                        <button onClick={() => removeSolution(item.instanceId)} className="text-gray-300 hover:text-red-500 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    )) : (
                      <p className="text-center py-10 text-[10px] font-black text-gray-300 uppercase">Nenhum item selecionado.</p>
                    )}
                    
                    <div className="pt-6 border-t border-gray-100 space-y-4">
                      <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Catálogo</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {catalog.map(sol => (
                          <button 
                            key={sol.id}
                            onClick={() => handleAddSolution(sol)}
                            className="w-full text-left p-4 bg-white border border-gray-100 rounded-2xl hover:border-brand transition-all flex justify-between items-center group"
                          >
                            <span className="font-bold text-[11px] text-gray-600 group-hover:text-black">{sol.solucao}</span>
                            <span className="text-[8px] font-black text-brand tracking-widest">+ ADD</span>
                          </button>
                        ))}
                      </div>
                    </div>
                </div>
              )}

              {activeTab === 'mapping' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                   <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Mapa IA de Movimento</h4>
                   {strategicMap.map((m, i) => (
                    <div key={i} className="p-6 bg-gray-50 rounded-[24px] border border-gray-100 space-y-4">
                        <textarea 
                          value={m.current}
                          onChange={e => {
                            const next = [...strategicMap];
                            next[i].current = e.target.value;
                            setStrategicMap(next);
                          }}
                          className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-gray-400 resize-none focus:ring-0"
                          placeholder="Estado Atual"
                        />
                        <div className="h-px bg-gray-200 w-full"></div>
                        <textarea 
                          value={m.desired}
                          onChange={e => {
                            const next = [...strategicMap];
                            next[i].desired = e.target.value;
                            setStrategicMap(next);
                          }}
                          className="w-full bg-transparent border-none p-0 text-xs font-black text-gray-900 resize-none focus:ring-0"
                          placeholder="Estado Desejado"
                        />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                  {proposalHistory.map(record => (
                    <div key={record.id} className="p-5 bg-gray-50 rounded-[24px] border border-gray-100 group hover:border-brand transition-all cursor-pointer" onClick={() => loadFromHistory(record)}>
                       <div className="flex justify-between items-start mb-2">
                         <p className="font-black text-[12px] text-gray-900 leading-none">{record.client_name}</p>
                         {getStatusBadge(record.status)}
                       </div>
                       <div className="flex justify-between items-center mt-3">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{new Date(record.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="text-[10px] font-black text-brand">{formatCurrency(record.total_value)}</span>
                       </div>
                       
                       {/* APROVACAO / REPROVACAO */}
                       <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                          {record.status !== 'APPROVED' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateStatus(record.id, 'APPROVED'); }}
                              className="flex-1 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase hover:bg-green-500 hover:text-white transition-all"
                            >
                              ✓ Aprovar
                            </button>
                          )}
                          {record.status !== 'REJECTED' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateStatus(record.id, 'REJECTED'); }}
                              className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                            >
                              × Reprovar
                            </button>
                          )}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 bg-black text-white space-y-4 no-print">
              <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Observações extras</label>
                    <button onClick={handleImproveText} className="text-[8px] font-black text-brand uppercase tracking-widest">✨ Refinar Texto</button>
                 </div>
                 <textarea 
                  value={metadata.observations}
                  onChange={e => setMetadata({...metadata, observations: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-[10px] font-medium text-white/80 min-h-[60px] outline-none focus:bg-white/10"
                  placeholder="Acordos de pagamento..."
                 />
              </div>

              <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Valor Final</span>
                  <div className="text-right">
                    {discountAmount > 0 && (
                      <span className="block text-[10px] font-bold text-white/40 line-through mb-1">{formatCurrency(subtotal)}</span>
                    )}
                    <span className="text-4xl font-black text-white tracking-tighter leading-none">{formatCurrency(finalPrice)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => saveToCloud()}
                  disabled={isSaving}
                  className="py-4 bg-white/10 border border-white/10 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-50"
                 >
                   {isSaving ? 'Salvando...' : 'Salvar no Histórico'}
                 </button>
                 <button 
                  onClick={generatePDF}
                  disabled={isDownloading}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                 >
                   {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
                 </button>
              </div>

              <div className="pt-8 border-t border-white/10 text-center space-y-4">
                 <button 
                  onClick={() => setShowPresentation(true)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                 >
                   ▶ Modo Apresentação
                 </button>
                 <button onClick={toggleFullscreen} className="text-[8px] font-black text-white/20 uppercase tracking-widest hover:text-white transition-colors">
                   {isFullscreen ? 'Sair da Tela Cheia' : 'Expandir Editor'}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RIGHT PANEL: PDF PREVIEW --- */}
      <div className={`flex-1 bg-gray-200 overflow-y-auto custom-scrollbar relative flex justify-center p-8 transition-all ${isFullscreen ? 'bg-[#1a1a1a]' : ''}`}>
        
        {/* TOOLBAR ZOOM */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 hover:scale-105 transition-transform no-print">
            <button onClick={() => adjustZoom(-0.1)} className="text-lg font-bold hover:text-gray-300">-</button>
            <span className="text-[10px] font-black min-w-[30px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => adjustZoom(0.1)} className="text-lg font-bold hover:text-gray-300">+</button>
        </div>

        {isPreviewReady ? (
          <div 
             id="proposal-pages-container"
             ref={previewRef}
             className="origin-top transition-transform duration-200 ease-out"
             style={{ transform: `scale(${zoom})` }}
          >
             {/* PAGE 1: CAPA */}
             <div className="printable-page w-[210mm] min-h-[297mm] bg-white shadow-2xl relative flex flex-col justify-between overflow-hidden mb-8 pdf-item">
                <PhantPattern />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] -mr-20 -mt-20"></div>
                
                <div className="p-16 relative z-10">
                   {appConfig.proposalLogoUrl ? (
                     <img src={appConfig.proposalLogoUrl} alt="Logo" className="h-12 w-auto mb-12 object-contain" />
                   ) : (
                     <div className="h-12 mb-12 flex items-center text-4xl font-black">{appConfig.companyName}</div>
                   )}
                   <span className="px-4 py-1.5 border border-black rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Proposta Comercial</span>
                </div>

                <div className="px-16 space-y-6 relative z-10 mb-auto">
                   <h1 className="text-7xl font-black tracking-tighter leading-[0.85] text-gray-900 uppercase">
                      {metadata.headline || 'Impacto & Crescimento'}
                   </h1>
                   <div className="w-20 h-2 bg-black"></div>
                   <p className="text-2xl font-bold text-gray-400">Preparado para <span className="text-gray-900 underline decoration-4 decoration-blue-200">{metadata.clientName}</span></p>
                </div>

                <div className="p-16 bg-black text-white relative z-10 mt-20 print-break-after">
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                         <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Data</span>
                         <span className="text-sm font-bold">{metadata.date}</span>
                      </div>
                      <div>
                         <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Consultor</span>
                         <span className="text-sm font-bold">{metadata.consultant}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* PAGE 2: DIAGNOSTICO E MAPA */}
             {showAIAnalysis && strategicMap.length > 0 && (
               <div className="printable-page w-[210mm] min-h-[297mm] bg-white shadow-2xl relative p-16 flex flex-col mb-8 pdf-item">
                  <div className="space-y-4 mb-16 border-l-4 border-blue-600 pl-6">
                     <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Diagnóstico <br/> Estratégico</h2>
                     <p className="text-sm font-medium text-gray-500 max-w-sm">Mapeamento de gargalos e oportunidades de crescimento.</p>
                  </div>

                  <div className="flex-1 space-y-2">
                     {strategicMap.map((map, i) => (
                        <div key={i} className="grid grid-cols-2 border border-gray-100 rounded-2xl overflow-hidden mb-4 break-inside-avoid">
                           <div className="p-8 bg-red-50/50 border-r border-gray-100">
                              <span className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-3 block">Estado Atual</span>
                              <p className="text-sm font-medium text-gray-600 leading-relaxed italic">"{map.current}"</p>
                           </div>
                           <div className="p-8 bg-blue-50/50">
                              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-3 block">Estado Desejado</span>
                              <p className="text-base font-black text-gray-900 leading-tight uppercase">{map.desired}</p>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="mt-auto pt-10 border-t border-gray-100">
                     <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">Análise gerada por Inteligência {appConfig.companyName}</p>
                  </div>
               </div>
             )}

             {/* PAGE 3: ESCOPO E INVESTIMENTO */}
             <div className="printable-page w-[210mm] min-h-[297mm] bg-white shadow-2xl relative flex flex-col mb-8 pdf-item">
                <div className="p-16 flex-1 space-y-10">
                   <div className="space-y-4 border-l-4 border-black pl-6">
                      <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Plano de <br/> Ação</h2>
                   </div>

                   <div className="space-y-6">
                      {proposalItems.map((item, i) => (
                         <div key={i} className="flex justify-between items-start pb-6 border-b border-gray-100 break-inside-avoid">
                            <div className="space-y-2 max-w-[70%]">
                               <div className="flex items-center gap-3">
                                  <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase rounded">{item.duration}</span>
                                  <h3 className="text-lg font-black uppercase tracking-tight">{item.name}</h3>
                               </div>
                               <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                               {item.deliverables && item.deliverables.length > 0 && (
                                 <ul className="pl-4 pt-1 space-y-1">
                                   {item.deliverables.slice(0, 3).map((d, idx) => (
                                     <li key={idx} className="text-[9px] font-bold text-gray-400 list-disc">{d}</li>
                                   ))}
                                 </ul>
                               )}
                            </div>
                            <div className="text-right">
                               <span className="text-sm font-black text-gray-900">{formatCurrency(item.totalPrice)}</span>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="bg-gray-50 p-16 border-t border-gray-100 break-inside-avoid">
                   <div className="flex justify-between items-end mb-8">
                      <div>
                         <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Investimento Total</h3>
                         {metadata.discountValue && metadata.discountValue > 0 && (
                            <p className="text-xs font-bold text-green-600">Desconto aplicado de {metadata.discountType === 'percent' ? `${metadata.discountValue}%` : formatCurrency(metadata.discountValue)}</p>
                         )}
                      </div>
                      <div className="text-right">
                         {discountAmount > 0 && <span className="block text-sm font-bold text-gray-400 line-through mb-1">{formatCurrency(subtotal)}</span>}
                         <span className="text-5xl font-black text-blue-600 tracking-tighter">{formatCurrency(finalPrice)}</span>
                      </div>
                   </div>

                   {metadata.observations && (
                      <div className="p-6 bg-white rounded-2xl border border-gray-200">
                         <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2">Observações</span>
                         <p className="text-xs font-medium text-gray-600 leading-relaxed">{metadata.observations}</p>
                      </div>
                   )}
                </div>
             </div>

          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalBuilder;