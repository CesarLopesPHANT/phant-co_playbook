
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
      
      // Ensure pages inside clone have correct break properties
      const pages = clone.querySelectorAll('.printable-page');
      pages.forEach((page: any) => {
        page.style.marginBottom = '0'; // Remove UI spacing
        page.style.boxShadow = 'none'; // Remove UI shadows
        page.style.pageBreakAfter = 'always';
      });

      container.appendChild(clone);
      document.body.appendChild(container);

      // 5. Configure html2pdf
      const opt = {
        margin: 0,
        filename: `${metadata.clientName || 'Proposta'}_PhantLab.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, // High resolution
          useCORS: true, 
          scrollY: 0,
          windowWidth: 794, // Approx 210mm in pixels at 96dpi
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
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
                    {discountAmount > 0 && <span className="text-xs line-through text-white/40 block">{formatCurrency(subtotal)}</span>}
                    <span className="text-3xl font-black tracking-tighter">{formatCurrency(finalPrice)}</span>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => saveToCloud(false)} 
                  disabled={isSaving}
                  className="w-full py-4 bg-white/10 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'SALVANDO...' : 'SALVAR'}
                </button>
                <button 
                  onClick={generatePDF} 
                  disabled={isDownloading}
                  className="w-full py-4 bg-emerald-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDownloading ? <span className="animate-spin">🌀</span> : 'BAIXAR PDF'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setShowPresentation(true)}
                  className="w-full py-4 bg-[#6113cc] text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  🖥️ GERAR APRESENTAÇÃO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RIGHT PANEL: PREVIEW --- */}
      <div 
        ref={previewRef}
        className={`flex-1 relative flex flex-col items-center bg-[#151515] rounded-[60px] overflow-y-auto custom-scrollbar proposal-preview-area ${isFullscreen ? 'h-full w-full rounded-none' : 'p-12 max-h-[850px]'}`}
      >
        <div className="sticky top-4 z-[50] no-print bg-white/10 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-2 mb-8 shadow-2xl">
          <button onClick={() => adjustZoom(-0.05)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth="3" strokeLinecap="round"/></svg>
          </button>
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => adjustZoom(0.05)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round"/></svg>
          </button>
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          <button onClick={generatePDF} disabled={isDownloading} className="px-6 py-2.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             {isDownloading ? 'GERANDO...' : 'BAIXAR PDF'}
          </button>
          <button onClick={toggleFullscreen} className={`h-10 px-4 flex items-center justify-center text-white ${isFullscreen ? 'bg-red-500 hover:bg-red-600 rounded-full font-black text-[10px] uppercase tracking-widest' : 'hover:bg-white/10 rounded-full'}`}>
             {isFullscreen ? (
                'Fechar'
             ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 3h6m0 0v6m0-6L14 10M9 3H3m0 0v6m0-6l7 7M15 21h6m0 0v-6m0 6l7-7M9 21H3m0 0v-6m0 6l7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
             )}
          </button>
        </div>

        {/* --- DOCUMENT RENDERER (LAZY LOADED TO PREVENT WIDTH ERROR) --- */}
        {isPreviewReady ? (
            <div 
              id="proposal-pages-container"
              className="transition-transform duration-300 flex flex-col items-center origin-top print:transform-none proposal-container"
              // Force dimensions to avoid "width(-1)" console error on measuring tools
              style={{ transform: `scale(${zoom})`, minWidth: '210mm', minHeight: '297mm' }}
            >
              {/* PÁGINA 1: CAPA */}
              <section className="printable-page w-[210mm] min-h-[297mm] bg-black text-white p-24 flex flex-col justify-between relative shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none animate-in zoom-in-95 duration-500 print-break-after">
                <PhantPattern />
                <div className="relative z-10 flex justify-between items-start">
                  <div className="w-48 h-auto overflow-hidden flex items-center justify-start text-black font-black">
                     <img 
                       src={appConfig.proposalLogoUrl || "http://phant.com.br/uploads/logo_light.png"} 
                       alt="Logo" 
                       className="w-full h-auto object-contain" 
                     />
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Estrategista Comercial</p>
                      <p className="font-bold text-sm mt-1">{metadata.consultant}</p>
                  </div>
                </div>

                <div className="relative z-10 space-y-12">
                  <h1 className="text-8xl font-black tracking-tighter leading-[0.85] uppercase">
                      {metadata.headline?.split(' ').map((word, i) => (
                        <span key={i} className="block">{word}</span>
                      ))}
                  </h1>
                  <div className="w-32 h-2 bg-brand"></div>
                </div>

                <div className="relative z-10 flex justify-between items-end border-t border-white/20 pt-12">
                  <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40">Exclusivo para</p>
                      <p className="text-5xl font-black tracking-tighter">{metadata.clientName || 'CLIENTE'}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Emissão</p>
                      <p className="font-bold text-lg">{metadata.date}</p>
                  </div>
                </div>
              </section>

              {/* PÁGINA 2: MAPA ESTRATÉGICO */}
              {showAIAnalysis && (
                <section className="printable-page w-[210mm] min-h-[297mm] bg-[#F9F9F9] text-black p-24 flex flex-col justify-between shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                  <div className="flex justify-between items-center border-b-4 border-black pb-10">
                      <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mapa de<br/>Movimento.</h2>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-4 py-1">PHANT AI INSIGHT</span>
                  </div>

                  <div className="flex-1 py-16 flex flex-col justify-center space-y-1">
                      <div className="grid grid-cols-2 gap-px bg-black/10 border border-black/10">
                        <div className="bg-black text-white/40 p-6 text-[10px] font-black uppercase tracking-widest text-center">Estado Atual (Dissonância)</div>
                        <div className="bg-brand text-white p-6 text-[10px] font-black uppercase tracking-widest text-center">Estado Desejado (Clareza {appConfig.companyName})</div>
                      </div>

                      {strategicMap.length > 0 ? strategicMap.map((map, i) => (
                        <div key={i} className="grid grid-cols-2 gap-px bg-black/5">
                          <div className="bg-white p-12 border-r border-black/5 flex flex-col justify-center min-h-[160px]">
                              <span className="text-red-500 font-black text-[30px] mb-4 opacity-20">0{i+1}</span>
                              <p className="text-sm font-medium text-black/50 leading-relaxed italic">"{map.current}"</p>
                          </div>
                          <div className="bg-white p-12 flex flex-col justify-center relative">
                              <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-brand rotate-45 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="4"/></svg>
                              </div>
                              <p className="text-base font-black text-black leading-tight tracking-tight">{map.desired}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="py-40 text-center opacity-10 font-black uppercase tracking-[0.3em]">Gerando Contexto Estratégico...</div>
                      )}
                  </div>

                  <div className="p-12 bg-black text-white flex justify-between items-center rounded-2xl">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Análise proprietária baseada em IA</p>
                        <div className="flex gap-4">
                            <span className="text-[9px] font-bold uppercase text-brand">Website • Instagram • Ads</span>
                        </div>
                      </div>
                      <div className="w-32 h-auto overflow-hidden flex items-center justify-center">
                        <img 
                          src={appConfig.proposalLogoUrl || "http://phant.com.br/uploads/logo_light.png"} 
                          alt="Logo" 
                          className="w-full h-auto object-contain" 
                        />
                      </div>
                  </div>
                </section>
              )}

              {/* PÁGINA 3: ESCOPO TÁTICO */}
              <section className="printable-page w-[210mm] min-h-[297mm] bg-white text-black p-24 flex flex-col shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                <div className="flex justify-between items-start mb-16">
                    <div className="space-y-4">
                      <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">Escopo<br/>Tático.</h2>
                      <div className="w-20 h-3 bg-black"></div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Investimento Total</p>
                      {discountAmount > 0 ? (
                        <div>
                          <p className="text-xl font-bold tracking-tighter text-gray-400 line-through">{formatCurrency(subtotal)}</p>
                          <p className="text-5xl font-black tracking-tighter text-brand">{formatCurrency(finalPrice)}</p>
                        </div>
                      ) : (
                          <p className="text-4xl font-black tracking-tighter text-brand">{formatCurrency(finalPrice)}</p>
                      )}
                    </div>
                </div>

                <div className="flex-1 space-y-12">
                    {proposalItems.map((item, i) => (
                      <div key={i} className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg">0{i+1}</div>
                            <div className="flex-1 border-b-2 border-black pb-2 flex justify-between items-end">
                              <h3 className="text-2xl font-black tracking-tight uppercase">{item.name}</h3>
                              <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md">{item.duration}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-12 pl-16">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-brand">Direcionamento</h4>
                              <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                  {item.description || "Implementação estratégica visando a previsibilidade de escala e monetização agressiva."}
                              </p>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-300">Entregáveis</h4>
                              <ul className="space-y-2">
                                  {(item.deliverables || ['Implementação Técnica', 'Relatório de Performance']).map((d, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-xs font-bold">
                                      <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
                                      {d}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                        </div>
                      </div>
                    ))}

                    {metadata.observations && (
                      <div className="pl-16 pt-8 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20">Termos e Acordos</h4>
                        <p className="text-sm font-bold text-gray-900 leading-relaxed border-l-4 border-brand pl-6 italic bg-gray-50 p-6 rounded-r-2xl">
                          {metadata.observations}
                        </p>
                      </div>
                    )}
                </div>

                <footer className="pt-10 border-t border-black/5 text-[10px] font-black text-black/20 uppercase tracking-widest flex justify-between items-center">
                    <span>© {appConfig.companyName} Strategic Engine</span>
                    <div className="flex items-center gap-4">
                      <span className="opacity-40">{metadata.clientName} Exclusive Access</span>
                      {appConfig.proposalLogoUrl && (
                        <img src={appConfig.proposalLogoUrl} alt="Logo" className="h-4 w-auto grayscale opacity-30" />
                      )}
                    </div>
                </footer>
              </section>

              {/* PÁGINA 4: SELOS E CONTATO (NOVA) */}
              <section className="printable-page w-[210mm] min-h-[297mm] bg-[#111] text-white p-24 flex flex-col justify-center items-center text-center shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                <PhantPattern />
                
                <div className="relative z-10 space-y-16">
                   <div className="w-64 mx-auto">
                      <img 
                        src="http://phant.com.br/uploads/logo_light.png" 
                        alt="PhantLab" 
                        className="w-full h-auto object-contain" 
                      />
                   </div>
                   
                   <div className="space-y-4">
                      <p className="text-xl font-medium text-white/50 tracking-wide">Crescimento é Movimento Estratégico.</p>
                   </div>

                   <div className="w-32 h-1 bg-white/20 mx-auto"></div>

                   <div className="flex justify-center items-center gap-8 py-8">
                       <div className="bg-white text-black p-4 rounded-xl font-black text-xs uppercase w-32 h-16 flex items-center justify-center">
                          Google Partner
                       </div>
                       <div className="bg-white text-black p-4 rounded-xl font-black text-xs uppercase w-32 h-16 flex items-center justify-center">
                          Meta Business
                       </div>
                   </div>

                   <div className="space-y-4 pt-10">
                      <a href="https://www.phant.com.br" className="block text-2xl font-black tracking-widest hover:text-brand transition-colors">WWW.PHANT.COM.BR</a>
                      <p className="text-sm font-bold text-white/40 uppercase tracking-[0.2em]">@phant.br</p>
                   </div>
                </div>
              </section>
            </div>
        ) : (
            <div className="flex items-center justify-center h-full flex-col gap-4 animate-in fade-in duration-1000">
               <div className="w-12 h-12 border-4 border-white/20 border-t-brand rounded-full animate-spin"></div>
               <span className="text-white/30 text-xs font-black uppercase tracking-widest">Preparando Visualização...</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProposalBuilder;
