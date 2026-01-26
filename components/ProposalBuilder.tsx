
import React, { useState, useEffect, useRef } from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, SolutionItem, ProposalRecord, AppCustomization, ProposalSections } from '../types';
import { generateStrategicMapping, improveObservationText } from '../services/gemini';
import { SupabaseService } from '../services/api';

interface ProposalBuilderProps {
  appConfig: AppCustomization;
}

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ appConfig }) => {
  // --- STATE MANAGEMENT ---
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [strategicMap, setStrategicMap] = useState<StrategicMapItem[]>([]);
  const [catalog, setCatalog] = useState<SolutionItem[]>([]);
  const [proposalHistory, setProposalHistory] = useState<ProposalRecord[]>([]);
  
  // Controle de Seções Ativas
  const [selectedSections, setSelectedSections] = useState<ProposalSections>({
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
    discountValue: 0,
    discountType: 'fixed'
  });
  
  // UI States
  const [activeTab, setActiveTab] = useState<'info' | 'solutions' | 'mapping' | 'history'>('info');
  const [zoom, setZoom] = useState(0.5);
  
  // Async Process States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isImprovingText, setIsImprovingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Data Loading
    const saved = localStorage.getItem('phant_current_proposal');
    if (saved) {
      try {
        setProposalItems(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar proposta local", e);
      }
    }
    SupabaseService.fetchSolutions().then(data => setCatalog(data || []));
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await SupabaseService.fetchProposalsHistory();
    setProposalHistory(history || []);
  };

  // --- CALCULATIONS ---
  const subtotal = proposalItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  
  const discountAmount = (() => {
    if (!metadata.discountValue || metadata.discountValue <= 0) return 0;
    if (metadata.discountType === 'percentage') {
        return subtotal * (metadata.discountValue / 100);
    }
    return metadata.discountValue;
  })();

  const finalTotal = Math.max(subtotal - discountAmount, 0);

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsImprovingText(false);
    }
  };

  const removeSolution = (id: string) => {
    const updatedItems = proposalItems.filter(p => p.instanceId !== id);
    setProposalItems(updatedItems);
    localStorage.setItem('phant_current_proposal', JSON.stringify(updatedItems));
  };

  const showError = (msg: string) => {
    setValidationError(msg);
    setTimeout(() => setValidationError(null), 3000);
  };

  // --- PERSISTENCE LAYER ---
  const saveToCloud = async () => {
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
      alert("Proposta salva no histórico com sucesso!");
      return true;
    } catch (err: any) {
      console.error("Erro na exportação:", err);
      showError("Erro ao salvar no banco de dados.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // --- OPEN NEW TAB LOGIC (PDF) ---
  const handleOpenProposal = () => {
    const sourceElement = document.getElementById('proposal-pages-container');
    if (!sourceElement) return;

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
            <style>
                body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 40px; display: flex; justify-content: center; }
                #proposal-root { display: flex; flex-direction: column; gap: 40px; }
                .printable-page { width: 210mm; height: 297mm; background: white; box-shadow: 0 0 50px rgba(0,0,0,0.1); }
                @media print { body { background: none; padding: 0; } .printable-page { box-shadow: none; page-break-after: always; } }
            </style>
        </head>
        <body><div id="proposal-root">${sourceElement.innerHTML}</div></body>
        </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  const handleOpenPresentation = () => {
    // Presentation mode logic
    showError("O modo apresentação é acessado via prévia interativa.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Gerador de Propostas</h1>
          <p className="text-gray-400 text-lg font-medium mt-2">Transforme simulações em narrativas executivas.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={saveToCloud} disabled={isSaving} className="flex-1 md:flex-none px-6 py-3 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm">
            {isSaving ? 'Salvando...' : 'Salvar Nuvem'}
          </button>
          <button onClick={handleOpenProposal} className="flex-1 md:flex-none px-6 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
            Visualizar PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
              <div className="flex bg-gray-50 p-1 rounded-2xl overflow-x-auto">
                 {(['info', 'solutions', 'mapping', 'history'] as const).map(t => (
                   <button 
                     key={t}
                     onClick={() => setActiveTab(t)}
                     className={`flex-1 min-w-[80px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                   >
                     {t === 'info' ? 'Dados' : t === 'solutions' ? 'Escopo' : t === 'mapping' ? 'IA Mapa' : 'Recentes'}
                   </button>
                 ))}
              </div>

              {activeTab === 'info' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome do Cliente</label>
                     <input value={metadata.clientName} onChange={e => setMetadata({...metadata, clientName: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black/5" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Headline Proposta</label>
                     <input value={metadata.headline} onChange={e => setMetadata({...metadata, headline: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black/5" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Anotações / Condições</label>
                     <textarea value={metadata.observations} onChange={e => setMetadata({...metadata, observations: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]" />
                     <button onClick={handleImproveText} disabled={isImprovingText} className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">
                        {isImprovingText ? 'Processando...' : '✨ Refinar com IA'}
                     </button>
                   </div>
                </div>
              )}

              {activeTab === 'mapping' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                   <button onClick={handleGenerateAI} disabled={isGeneratingAI} className="w-full py-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                     {isGeneratingAI ? 'IA Analisando...' : '✨ Gerar Mapeamento Estratégico'}
                   </button>
                   <div className="space-y-2">
                     {strategicMap.map((map, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-2xl text-[11px] font-bold">
                           <p className="text-red-500 uppercase mb-1">Cenário: {map.current}</p>
                           <p className="text-green-600 uppercase">Desejado: {map.desired}</p>
                        </div>
                     ))}
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
           <div className="flex justify-between items-center px-4">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Prévia da Proposta</span>
              <div className="flex items-center gap-4">
                 <input type="range" min="0.3" max="1" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-24 accent-black" />
              </div>
           </div>
           
           <div className="bg-gray-200 rounded-[40px] p-10 overflow-auto h-[800px] border border-gray-100 flex justify-center custom-scrollbar">
              <div id="proposal-pages-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="transition-transform duration-300">
                {/* Visual rendering of pages (Simplified for preview) */}
                <div className="printable-page mb-10 bg-black text-white p-20 flex flex-col justify-between">
                   <img src={appConfig.proposalLogoUrl} className="h-12 w-auto" alt="Logo" />
                   <h1 className="text-6xl font-black tracking-tighter uppercase italic">{metadata.headline || 'PROPOSTA'}</h1>
                   <div className="space-y-2">
                     <p className="text-xl font-bold text-white/40 italic">Preparado para: {metadata.clientName || '---'}</p>
                     <p className="text-sm font-black uppercase tracking-widest text-white/20">{metadata.consultant}</p>
                   </div>
                </div>
                
                <div className="printable-page bg-white text-black p-20 flex flex-col">
                   <h2 className="text-3xl font-black italic uppercase mb-10">Investimento</h2>
                   <div className="flex-1 space-y-4">
                      {proposalItems.map((item, i) => (
                        <div key={i} className="flex justify-between py-4 border-b">
                           <span className="font-bold text-sm">{item.name}</span>
                           <span className="font-mono text-sm">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                   </div>
                   <div className="pt-10 space-y-2">
                      <div className="flex justify-between items-center text-4xl font-black italic">
                         <span>TOTAL</span>
                         <span>{formatCurrency(finalTotal)}</span>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
      
      {validationError && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl">
          {validationError}
        </div>
      )}
    </div>
  );
};

export default ProposalBuilder;
