
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, SolutionItem, ProposalRecord, AppCustomization, ProposalSections } from '../types';
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

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ appConfig }) => {
  // --- STATE MANAGEMENT ---
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [strategicMap, setStrategicMap] = useState<StrategicMapItem[]>([]);
  const [catalog, setCatalog] = useState<SolutionItem[]>([]);
  const [proposalHistory, setProposalHistory] = useState<ProposalRecord[]>([]);
  
  const [selectedSections, setSelectedSections] = useState<ProposalSections>(appConfig.config?.defaultProposalSections || {
    cover: true,
    strategicMap: true,
    tacticalScope: true,
    finalInvestment: true,
    backCover: true
  });
  
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
    discountType: 'fixed',
    discountValue: 0,
    installments: 1
  });
  
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'solutions' | 'mapping' | 'history'>('info');
  const [zoom, setZoom] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isImprovingText, setIsImprovingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('phant_current_proposal');
    if (saved) setProposalItems(JSON.parse(saved));
    SupabaseService.fetchSolutions().then(data => setCatalog(data || []));
    loadHistory();

    const timer = setTimeout(() => {
      setIsPreviewReady(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const loadHistory = async () => {
    const history = await SupabaseService.fetchProposalsHistory();
    setProposalHistory(history || []);
  };

  const subTotal = useMemo(() => proposalItems.reduce((acc, curr) => acc + curr.totalPrice, 0), [proposalItems]);
  
  const discountAmount = useMemo(() => {
    if (!metadata.discountValue || metadata.discountValue <= 0) return 0;
    if (metadata.discountType === 'percentage') {
      return subTotal * (metadata.discountValue / 100);
    }
    return metadata.discountValue;
  }, [subTotal, metadata.discountValue, metadata.discountType]);

  const finalTotal = Math.max(0, subTotal - discountAmount);
  const installmentValue = useMemo(() => finalTotal / (metadata.installments || 1), [finalTotal, metadata.installments]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
      setSelectedSections(prev => ({...prev, strategicMap: true}));
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
      deliverables: sol.entregaveis || [],
      promessa: sol.promessa,
      category: sol.categoria,
      subCategory: sol.subcategoria,
      maturity: sol.maturidade,
      targetAudience: sol.publico_alvo,
      expectedResult: sol.resultado_esperado
    };
    setProposalItems(prev => [...prev, newItem]);
    setSelectedSections(prev => ({...prev, tacticalScope: true}));
  };

  const removeSolution = (id: string) => {
    setProposalItems(prev => prev.filter(p => p.instanceId !== id));
  };

  const showError = (msg: string) => {
    setValidationError(msg);
    setTimeout(() => setValidationError(null), 3000);
  };

  const exportTasksToExcel = (record: ProposalRecord) => {
    try {
      let csv = 'Item de Solução;Fase/Tarefa do Projeto;Duração;Valor do Item\n';
      
      record.items.forEach(item => {
        const tasks = item.deliverables || [];
        if (tasks.length > 0) {
          tasks.forEach(task => {
            csv += `"${item.name}";"${task}";"${item.duration}";"${formatCurrency(item.totalPrice)}"\n`;
          });
        } else {
          csv += `"${item.name}";"Implementação Estratégica";"${item.duration}";"${formatCurrency(item.totalPrice)}"\n`;
        }
      });

      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Cronograma_${record.client_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao exportar cronograma:", err);
    }
  };

  const updateStatus = async (record: ProposalRecord, newStatus: 'APPROVED' | 'REJECTED') => {
    const res = await SupabaseService.updateProposalStatus(record.id, newStatus);
    if (res.success) {
        setProposalHistory(prev => prev.map(p => p.id === record.id ? { ...p, status: newStatus } : p));
        if (newStatus === 'APPROVED') {
          exportTasksToExcel(record);
        }
    } else {
        showError("Erro ao atualizar status");
    }
  };

  const handleDeleteProposal = async (id: string, clientName: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a proposta para "${clientName}"?`)) return;
    const res = await SupabaseService.deleteProposal(id);
    if (res.success) {
      setProposalHistory(prev => prev.filter(p => p.id !== id));
    } else {
      showError("Erro ao deletar do banco.");
    }
  };

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
        finalTotal,
        metadata.consultant,
        proposalItems,
        metadata
      );
      
      if (!res.success) throw new Error(res.message);

      await loadHistory();
      if (!silent) alert("Proposta salva no histórico com sucesso!");
      return true;
    } catch (err: any) {
      showError("Erro ao salvar no banco de dados.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProposal = () => {
    const sourceElement = document.getElementById('proposal-pages-container');
    if (!sourceElement) return;

    // Clone the element to manipulate it without affecting the UI
    const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
    clonedElement.style.transform = 'none';
    clonedElement.style.width = '100%';
    clonedElement.style.minWidth = 'auto';
    clonedElement.style.minHeight = 'auto';

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
        alert("Pop-up bloqueado. Permita pop-ups para visualizar a proposta.");
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Proposta - ${metadata.clientName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            <script>
                tailwind.config = {
                    important: true,
                    theme: {
                        extend: {
                            colors: {
                                brand: '${appConfig.primaryColor}',
                            }
                        }
                    }
                }
            </script>
            <style>
                :root { --brand-primary: ${appConfig.primaryColor}; }
                .text-brand { color: var(--brand-primary) !important; }
                .bg-brand { background-color: var(--brand-primary) !important; }
                .border-brand { border-color: var(--brand-primary) !important; }

                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #1a1a1a;
                    margin: 0;
                    padding: 40px;
                    display: flex;
                    justify-content: center;
                    min-height: 100vh;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .proposal-integrity-container {
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                    width: 210mm;
                }
                #proposal-pages-container {
                    transform: none !important;
                    width: 100% !important;
                    min-width: auto !important;
                    min-height: auto !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 40px !important;
                }
                .printable-page {
                    width: 210mm !important;
                    height: 297mm !important;
                    min-height: 297mm !important;
                    max-height: 297mm !important;
                    background: white !important;
                    position: relative !important;
                    overflow: hidden !important;
                    box-shadow: 0 0 50px rgba(0,0,0,0.5) !important;
                    flex-shrink: 0 !important;
                    box-sizing: border-box !important;
                    margin: 0 auto !important;
                }
                @media print {
                    @page { 
                        size: A4; 
                        margin: 0 !important; 
                    }
                    body { 
                        background: white !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                    }
                    .proposal-integrity-container { 
                        gap: 0 !important; 
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #proposal-pages-container {
                        gap: 0 !important;
                    }
                    .printable-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        page-break-after: always !important;
                        page-break-inside: avoid !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                    }
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                }
            </style>
        </head>
        <body>
            <div class="proposal-integrity-container">
                ${clonedElement.outerHTML}
            </div>
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        // Opcional: window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  const handleOpenPresentation = () => {
    const sourceElement = document.getElementById('presentation-hidden-source');
    if (!sourceElement) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
        alert("Pop-up bloqueado.");
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Apresentação - ${metadata.clientName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
              body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: black; color: white; }
              * { box-sizing: border-box; }
              ::-webkit-scrollbar { width: 0px; }
              .snap-container { scroll-snap-type: y mandatory; height: 100vh; overflow-y: scroll; }
              .snap-slide { scroll-snap-align: start; min-height: 100vh; }
            </style>
        </head>
        <body>
            <div id="presentation-root" class="snap-container">
                ${sourceElement.innerHTML}
            </div>
        </body>
        </html>
    `;
    
    newWindow.document.write(htmlContent);
    newWindow.document.close();
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
      discountType: record.metadata?.discountType || 'fixed',
      discountValue: record.metadata?.discountValue || 0,
      installments: record.metadata?.installments || 1
    });
    setActiveTab('solutions');
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

  const SectionToggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (val: boolean) => void }) => (
    <button 
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checked ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <div className={`w-3 h-3 rounded-full ${checked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
    </button>
  );

  // Helper para agrupar itens em páginas
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const strategicMapChunks = useMemo(() => chunkArray(strategicMap, 4), [strategicMap]);
  const proposalItemChunks = useMemo(() => chunkArray(proposalItems, 2), [proposalItems]);

  return (
    <div className={`flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700 ${isFullscreen ? 'fixed inset-0 z-[100] bg-[#1a1a1a] p-0 overflow-hidden' : ''}`}>
      
      <div id="presentation-hidden-source" className="hidden">
        <ProposalPresentation 
          metadata={metadata} 
          items={proposalItems} 
          strategicMap={strategicMap} 
          appConfig={appConfig}
          selectedSections={selectedSections}
        />
      </div>

      {/* --- LEFT PANEL: CONTROLS --- */}
      {!isFullscreen && (
        <div className="w-full lg:w-[450px] space-y-8 no-print shrink-0">
          <header className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Gerar Propostas.</h2>
            <p className="text-gray-400 text-sm font-medium">Configure os dados e seções do documento.</p>
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
                  <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Seções do Documento</p>
                     <div className="grid grid-cols-2 gap-2">
                        <SectionToggle label="1. Capa" checked={selectedSections.cover} onChange={v => setSelectedSections(p => ({...p, cover: v}))} />
                        <SectionToggle label="2. Mapa" checked={selectedSections.strategicMap} onChange={v => setSelectedSections(p => ({...p, strategicMap: v}))} />
                        <SectionToggle label="3. Escopo" checked={selectedSections.tacticalScope} onChange={v => setSelectedSections(p => ({...p, tacticalScope: v}))} />
                        <SectionToggle label="4. Resumo" checked={selectedSections.finalInvestment} onChange={v => setSelectedSections(p => ({...p, finalInvestment: v}))} />
                        <SectionToggle label="5. Contra-Capa" checked={selectedSections.backCover} onChange={v => setSelectedSections(p => ({...p, backCover: v}))} />
                     </div>
                  </div>

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
                    {isGeneratingAI ? 'ANALISANDO...' : '✨ Analisar com IA'}
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
                      <p className="text-center py-10 text-[10px] font-black text-gray-300 uppercase">Selecione itens do catálogo.</p>
                    )}
                    
                    <div className="pt-6 border-t border-gray-100 space-y-4">
                      <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Adicionar do Catálogo</h4>
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
                   <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Mapa de Movimento</h4>
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
                    <div key={record.id} className="p-5 bg-gray-50 rounded-[24px] border border-gray-100 group hover:border-brand transition-all cursor-pointer relative" onClick={() => loadFromHistory(record)}>
                       <div className="flex justify-between items-start mb-2 pr-8">
                         <p className="font-black text-[12px] text-gray-900 leading-none">{record.client_name}</p>
                         {getStatusBadge(record.status)}
                       </div>
                       
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDeleteProposal(record.id, record.client_name); }}
                         className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                       </button>

                       <div className="flex justify-between items-center mt-3">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{new Date(record.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="text-[10px] font-black text-brand">{formatCurrency(record.total_value)}</span>
                       </div>
                       
                       <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                          {record.status !== 'APPROVED' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateStatus(record, 'APPROVED'); }}
                              className="flex-1 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase hover:bg-green-500 hover:text-white transition-all"
                            >
                              ✓ Aprovar
                            </button>
                          )}
                          {record.status !== 'REJECTED' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateStatus(record, 'REJECTED'); }}
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
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Observações</label>
                    <button onClick={handleImproveText} className="text-[8px] font-black text-brand uppercase tracking-widest">✨ Refinar</button>
                 </div>
                 <textarea 
                  value={metadata.observations}
                  onChange={e => setMetadata({...metadata, observations: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-[10px] font-medium text-white/80 min-h-[60px] outline-none"
                  placeholder="Condições especiais..."
                 />
              </div>

              {/* CAMPO DE DESCONTO E PARCELAS */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Tipo</label>
                  <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden p-0.5">
                    <button 
                      onClick={() => setMetadata({...metadata, discountType: 'percentage'})}
                      className={`flex-1 py-1.5 text-[8px] font-black transition-all rounded-lg ${metadata.discountType === 'percentage' ? 'bg-brand text-white' : 'text-white/40 hover:bg-white/5'}`}
                    >
                      %
                    </button>
                    <button 
                      onClick={() => setMetadata({...metadata, discountType: 'fixed'})}
                      className={`flex-1 py-1.5 text-[8px] font-black transition-all rounded-lg ${metadata.discountType === 'fixed' ? 'bg-brand text-white' : 'text-white/40 hover:bg-white/5'}`}
                    >
                      R$
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Valor</label>
                  <input 
                    type="number"
                    value={metadata.discountValue || ''}
                    onChange={e => setMetadata({...metadata, discountValue: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 p-2 rounded-xl text-[10px] font-black text-white outline-none focus:border-brand h-[34px]"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Parcelas</label>
                  <input 
                    type="number"
                    min="1"
                    value={metadata.installments || 1}
                    onChange={e => setMetadata({...metadata, installments: parseInt(e.target.value) || 1})}
                    className="w-full bg-white/5 border border-white/10 p-2 rounded-xl text-[10px] font-black text-white outline-none focus:border-brand h-[34px]"
                    placeholder="1"
                  />
                </div>
              </div>

                <div className="flex justify-between items-end pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                          {metadata.installments && metadata.installments > 1 ? `${metadata.installments}x de` : 'Valor Final'}
                        </span>
                        {discountAmount > 0 && <span className="text-[9px] font-bold text-red-400 line-through">{formatCurrency(subTotal)}</span>}
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-white">
                      {formatCurrency(metadata.installments && metadata.installments > 1 ? installmentValue : finalTotal)}
                    </span>
                </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => saveToCloud(false)} disabled={isSaving} className="w-full py-4 bg-white/10 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/20 transition-all">
                  SALVAR
                </button>
                <button onClick={handleOpenProposal} className="w-full py-4 bg-emerald-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-500 transition-all">
                  ABRIR PDF
                </button>
              </div>
              <button onClick={handleOpenPresentation} className="w-full py-4 bg-brand text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
                🖥️ APRESENTAÇÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RIGHT PANEL: PREVIEW --- */}
      <div 
        ref={previewRef}
        className={`flex-1 relative flex flex-col items-center bg-[#151515] rounded-[60px] overflow-y-auto custom-scrollbar proposal-preview-area ${isFullscreen ? 'h-full w-full rounded-none' : 'p-4 md:p-12 max-h-[850px]'}`}
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
          <button onClick={toggleFullscreen} className="h-10 px-4 flex items-center justify-center text-white hover:bg-white/10 rounded-full">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 3h6m0 0v6m0-6L14 10M9 3H3m0 0v6m0-6l7 7M15 21h6m0 0v-6m0 6l7-7M9 21H3m0 0v-6m0 6l7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {isPreviewReady ? (
            <div 
              id="proposal-pages-container"
              className="transition-transform duration-300 flex flex-col items-center origin-top print:transform-none proposal-integrity-container"
              style={{ transform: `scale(${zoom})`, minWidth: '210mm', minHeight: '297mm' }}
            >
              {/* PÁGINA 1: CAPA */}
              {selectedSections.cover && (
                <section className="printable-page w-[210mm] min-h-[297mm] bg-black text-white p-24 flex flex-col justify-between relative shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                  <PhantPattern />
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="w-48 h-auto overflow-hidden flex items-center justify-start text-black font-black">
                      {appConfig.proposalLogoUrl ? (
                        <img src={appConfig.proposalLogoUrl} alt="Logo" className="w-full h-auto object-contain" />
                      ) : (
                        <span className="text-white text-4xl">{appConfig.companyName.charAt(0) || 'P'}</span>
                      )}
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Consultoria</p>
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
              )}

              {/* PÁGINAS DE MAPA ESTRATÉGICO */}
              {selectedSections.strategicMap && (strategicMapChunks.length > 0 ? strategicMapChunks : [[]]).map((chunk, chunkIdx) => (
                <section key={`map-page-${chunkIdx}`} className="printable-page w-[210mm] min-h-[297mm] bg-[#F9F9F9] text-black p-24 flex flex-col justify-between shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                  <div className="flex justify-between items-center border-b-4 border-black pb-10">
                      <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Mapa de<br/>Movimento{strategicMapChunks.length > 1 ? ` (${chunkIdx + 1})` : ''}.</h2>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-4 py-1">PHANT AI INSIGHT</span>
                  </div>

                  <div className="flex-1 py-16 flex flex-col justify-center space-y-1">
                      <div className="grid grid-cols-2 gap-px bg-black/10 border border-black/10">
                        <div className="bg-black text-white/40 p-6 text-[10px] font-black uppercase tracking-widest text-center">Estado Atual</div>
                        <div className="bg-brand text-white p-6 text-[10px] font-black uppercase tracking-widest text-center">Estado Desejado</div>
                      </div>

                      {chunk.length > 0 ? chunk.map((map, i) => (
                        <div key={i} className="grid grid-cols-2 gap-px bg-black/5">
                          <div className="bg-white p-12 border-r border-black/5 flex flex-col justify-center min-h-[160px]">
                              <p className="text-sm font-medium text-black/50 leading-relaxed italic">"{map.current}"</p>
                          </div>
                          <div className="bg-white p-12 flex flex-col justify-center relative">
                              <p className="text-base font-black text-black leading-tight tracking-tight">{map.desired}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="py-40 text-center opacity-10 font-black uppercase tracking-[0.3em]">Gerando análise profunda...</div>
                      )}
                  </div>

                  <footer className="pt-10 border-t border-black/5 text-[10px] font-black text-black/20 uppercase tracking-widest flex justify-between items-center">
                      <span>© {appConfig.companyName} Strategic Hub</span>
                      {strategicMapChunks.length > 1 && <span>Página {chunkIdx + 1} de {strategicMapChunks.length}</span>}
                  </footer>
                </section>
              ))}

              {/* PÁGINAS DE ESCOPO TÁTICO */}
              {selectedSections.tacticalScope && (proposalItemChunks.length > 0 ? proposalItemChunks : [[]]).map((chunk, chunkIdx) => (
                <section key={`scope-page-${chunkIdx}`} className="printable-page w-[210mm] min-h-[297mm] bg-white text-black p-24 flex flex-col shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                  <div className="flex justify-between items-start mb-12">
                      <div className="space-y-4">
                        <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">Escopo<br/>Tático{proposalItemChunks.length > 1 ? ` (${chunkIdx + 1})` : ''}.</h2>
                        <div className="w-20 h-3 bg-black"></div>
                      </div>
                  </div>

                  <div className="flex-1 space-y-14 overflow-hidden">
                      {chunk.map((item, i) => (
                        <div key={i} className="space-y-6">
                          <div className="flex items-center gap-6">
                              <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-xl">{(chunkIdx * 2) + i + 1}</div>
                              <div className="flex-1 border-b-2 border-black pb-2 flex justify-between items-end">
                                <div className="flex flex-col">
                                  <h3 className="text-3xl font-black tracking-tight uppercase leading-none">{item.name}</h3>
                                  <div className="flex gap-2 mt-2">
                                     <span className="text-[8px] font-black uppercase tracking-widest bg-brand text-white px-2 py-0.5 rounded">{item.maturity || 'Base'}</span>
                                     <span className="text-[8px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{item.subCategory || 'Consultoria'}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-[8px] font-black uppercase text-gray-300 mb-1">Fee do Ativo</p>
                                   <span className="text-xl font-black text-brand tracking-tighter">{formatCurrency(item.totalPrice)}</span>
                                   <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg ml-3">{item.duration}</span>
                                </div>
                              </div>
                          </div>
                          
                          {item.promessa && (
                            <div className="pl-16">
                               <p className="text-lg font-black text-brand italic tracking-tight leading-tight">"{item.promessa}"</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-12 gap-10 pl-16">
                              <div className="col-span-7 space-y-6">
                                <div className="space-y-2">
                                  <h4 className="text-[9px] font-black uppercase tracking-widest text-black/30">Direcionamento Técnico</h4>
                                  <p className="text-[11px] font-medium text-gray-600 leading-relaxed">{item.description}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                   {item.targetAudience && (
                                     <div className="space-y-2">
                                       <h4 className="text-[9px] font-black uppercase tracking-widest text-black/30">Público-Alvo</h4>
                                       <p className="text-[10px] font-bold text-gray-800 leading-tight">{item.targetAudience}</p>
                                     </div>
                                   )}
                                   {item.expectedResult && (
                                     <div className="space-y-2">
                                       <h4 className="text-[9px] font-black uppercase tracking-widest text-black/30">Resultado Esperado</h4>
                                       <p className="text-[10px] font-bold text-gray-800 leading-tight">{item.expectedResult}</p>
                                     </div>
                                   )}
                                </div>
                              </div>
                              
                              <div className="col-span-5 space-y-4">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-black/30">Cronograma / Fases</h4>
                                <ul className="space-y-2">
                                    {(item.deliverables || []).slice(0, 6).map((d, idx) => (
                                      <li key={idx} className="flex items-center gap-3 text-[10px] font-bold text-gray-900 border-l-2 border-brand pl-3 py-0.5">
                                        {d}
                                      </li>
                                    ))}
                                </ul>
                              </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Se for a última página de itens, mostra o resumo do investimento se ativado */}
                  {chunkIdx === proposalItemChunks.length - 1 && selectedSections.finalInvestment && (
                    <div className="pl-16 pt-8 space-y-6 border-t border-gray-100 mt-auto">
                        <div className="flex justify-between items-end bg-gray-50 p-6 rounded-[24px]">
                            <div className="flex flex-col">
                               <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                 {metadata.installments && metadata.installments > 1 ? `${metadata.installments}x de` : 'Investimento Consolidado'}
                               </span>
                               <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-bold text-gray-300 uppercase">Proposta Válida por 7 dias</span>
                                 {metadata.installments && metadata.installments > 1 && (
                                   <span className="text-[8px] font-black text-gray-400 uppercase">Total: {formatCurrency(finalTotal)}</span>
                                 )}
                               </div>
                            </div>
                            <span className="text-5xl font-black text-gray-900 tracking-tighter">
                              {formatCurrency(metadata.installments && metadata.installments > 1 ? installmentValue : finalTotal)}
                            </span>
                        </div>

                        {metadata.observations && (
                            <div className="space-y-2 pt-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20">Cláusulas e Observações</h4>
                            <p className="text-[13px] font-bold text-gray-900 leading-relaxed border-l-4 border-brand pl-6 italic bg-gray-50/50 py-4 rounded-r-xl">
                                {metadata.observations}
                            </p>
                            </div>
                        )}
                    </div>
                  )}

                  <footer className="pt-10 text-[10px] font-black text-black/20 uppercase tracking-widest flex justify-between items-center">
                      <span>Página {chunkIdx + 1} de {proposalItemChunks.length}</span>
                  </footer>
                </section>
              ))}

              {/* PÁGINA FINAL: CONTRA-CAPA */}
              {selectedSections.backCover && (
                <section className="printable-page w-[210mm] min-h-[297mm] bg-black text-white p-24 flex flex-col justify-between relative shadow-2xl shrink-0 mb-12 print:mb-0 print:shadow-none print-break-after">
                  <PhantPattern />
                  <div className="relative z-10 w-full h-full flex flex-col justify-between">
                     <div className="w-48 h-auto overflow-hidden">
                        {appConfig.proposalLogoUrl ? (
                          <img src={appConfig.proposalLogoUrl} alt="Logo" className="w-full h-auto object-contain" />
                        ) : (
                          <span className="text-white text-4xl">{appConfig.companyName}</span>
                        )}
                     </div>

                     <div className="space-y-8">
                        <h2 className="text-7xl font-black tracking-tighter leading-[0.9] uppercase">
                          Crescimento<br/>é Movimento<br/><span className="text-brand">Estratégico.</span>
                        </h2>
                     </div>

                     <div className="border-t border-white/20 pt-12 flex justify-between items-end">
                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Contato</p>
                           <p className="text-2xl font-black tracking-tighter">www.phant.com.br</p>
                        </div>
                     </div>
                  </div>
                </section>
              )}
            </div>
        ) : (
            <div className="flex items-center justify-center h-full">
               <span className="text-white/30 text-xs font-black uppercase tracking-widest">Renderizando...</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProposalBuilder;
