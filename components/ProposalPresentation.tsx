
import React from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, AppCustomization } from '../types';

interface ProposalPresentationProps {
  metadata: ProposalMetadata;
  items: ProposalItem[];
  strategicMap: StrategicMapItem[];
  appConfig: AppCustomization;
  onClose: () => void;
  proposalId?: string | null;
}

const PHANT_PURPLE = "#6113cc";
// Padrão de Pontos SVG Leve
const DOT_PATTERN = `data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236113cc' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E`;

const ProposalPresentation: React.FC<ProposalPresentationProps> = ({ metadata, items, strategicMap, appConfig, onClose, proposalId }) => {
  const sections = metadata.sections || { cover: true, strategicMap: true, scope: true, closing: true };

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
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleShare = async () => {
    if (!proposalId) {
        alert("Salve a proposta no histórico antes de compartilhar.");
        return;
    }

    const shareUrl = `${window.location.origin}/?presentation=${proposalId}`;
    
    const shareData = {
      title: `Proposta ${metadata.clientName} - PhantLab`,
      text: `Confira a proposta estratégica preparada para ${metadata.clientName}.`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link da apresentação copiado para a área de transferência!');
      }
    } catch (err) {
      console.log('Error sharing', err);
    }
  };

  const logoUrl = appConfig.proposalLogoUrl || appConfig.systemLogoUrl;

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] text-white overflow-y-auto selection:bg-[#6113cc] selection:text-white font-sans scroll-smooth">
      <style>{`
        .presentation-bg {
          background-color: #050505;
          background-image: url("${DOT_PATTERN}");
          background-attachment: fixed;
        }
        section {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 5vw;
          scroll-snap-align: start;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {/* FIXED HEADER */}
      <nav className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-[210] pointer-events-none gap-4 mix-blend-difference">
        <div className="pointer-events-auto">
            <button 
                onClick={onClose}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-black"
            >
                ← Voltar
            </button>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={handleShare}
            className="px-6 py-3 bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition-all text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 backdrop-blur-md"
          >
            <span>🔗</span> {proposalId ? 'Compartilhar' : 'Salvar p/ Compartilhar'}
          </button>
        </div>
      </nav>

      <div className="presentation-bg">
        {/* SLIDE 1: CAPA (Igual PDF) */}
        {sections.cover && (
            <section id="cover" className="relative">
                <div className="w-full max-w-7xl mx-auto flex flex-col justify-between min-h-[80vh]">
                    {/* Header */}
                    <div className="flex justify-between items-start animate-in fade-in slide-in-from-top-4 duration-1000">
                        {logoUrl ? 
                            <img src={logoUrl} alt="Logo" className="h-12 object-contain invert brightness-200" onError={(e) => e.currentTarget.style.display = 'none'} /> : 
                            <h2 className="text-3xl font-black tracking-tighter text-white">{appConfig.companyName}</h2>
                        }
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{metadata.date}</p>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-10 max-w-5xl animate-in zoom-in-50 duration-1000 my-auto">
                        <div className="w-24 h-1.5 bg-[#6113cc]"></div>
                        <span className="block text-xs font-black uppercase tracking-[0.4em] text-[#6113cc]">Confidencial</span>
                        <h1 className="text-7xl md:text-[8rem] font-black leading-[0.9] tracking-tighter uppercase text-white">
                            {metadata.headline || 'Plano de Aceleração'}
                        </h1>
                        <p className="text-3xl font-medium text-gray-500 max-w-3xl">
                            Estratégia exclusiva desenvolvida para <span className="text-white border-b-2 border-[#6113cc]">{metadata.clientName}</span>.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/10 pt-8 flex justify-between items-end animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                        <div>
                            <p className="text-[10px] font-bold text-[#6113cc] uppercase tracking-widest mb-2">Consultor Responsável</p>
                            <p className="text-xl font-bold text-white">{metadata.consultant}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">PhantLab Methodology</p>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {/* SLIDE 2: ANÁLISE DE CENÁRIO (Igual PDF) */}
        {sections.strategicMap && (
            <section id="diagnosis" className="relative">
                <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
                    <header className="mb-20 border-b border-white/10 pb-10 animate-in slide-in-from-left-10 duration-700">
                        <div className="flex justify-between items-center">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white">Análise de Cenário</h2>
                            <span className="text-xs font-black bg-white/10 px-5 py-2 rounded-full text-white/50 uppercase">01 / Diagnóstico</span>
                        </div>
                    </header>

                    <div className="flex-1 grid gap-8">
                        {strategicMap.map((item, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors duration-500 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 150}ms` }}>
                                <div className="flex-1 p-12 border-r border-white/10">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-6 block">Estado Atual (Dor)</span>
                                    <p className="text-3xl font-bold text-gray-500 line-through decoration-red-500/50 decoration-2">{item.current}</p>
                                </div>
                                <div className="flex-1 p-12 bg-[#6113cc]/5 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-[#6113cc]/20 to-transparent pointer-events-none"></div>
                                    <span className="text-[10px] font-black text-[#6113cc] uppercase tracking-widest mb-6 block">Estado Desejado (Solução)</span>
                                    <p className="text-4xl font-black text-white">{item.desired}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}

        {/* SLIDE 3: ESCOPO & ITENS (Igual PDF) */}
        {sections.scope && (
            <section id="scope" className="relative">
                <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
                    <header className="mb-16 border-b border-white/10 pb-10 animate-in slide-in-from-left-10 duration-700">
                        <div className="flex justify-between items-center">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white">Escopo & Itens</h2>
                            <span className="text-xs font-black bg-white/10 px-5 py-2 rounded-full text-white/50 uppercase">02 / Execução</span>
                        </div>
                    </header>

                    <div className="flex-1 space-y-6">
                        {items.map((item, i) => (
                            <div key={i} className="flex flex-col md:flex-row justify-between items-center border border-white/10 p-10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors duration-500 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-5">
                                        <span className="text-[10px] font-black text-[#6113cc] uppercase tracking-widest bg-white/5 px-3 py-1 rounded">{item.duration}</span>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tight">{item.name}</h3>
                                    </div>
                                    <p className="text-base text-gray-500 font-medium max-w-3xl leading-relaxed">{item.description}</p>
                                </div>
                                <div className="text-right mt-6 md:mt-0 pl-10 border-l border-white/5">
                                    <p className="text-3xl font-bold text-white">{formatCurrency(item.totalPrice)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}

        {/* SLIDE 4: FECHAMENTO (Igual PDF) */}
        {sections.closing && (
            <section id="closing" className="relative">
                <div className="w-full max-w-7xl mx-auto flex flex-col justify-center h-full">
                    <div className="p-24 bg-white/[0.03] border border-white/10 text-center space-y-16 animate-in zoom-in-95 duration-700 backdrop-blur-sm rounded-[40px]">
                        <div className="space-y-8">
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-[#6113cc]">Investimento Total</span>
                            {discountAmount > 0 && <span className="block text-3xl font-bold text-gray-600 line-through decoration-gray-500">{formatCurrency(subtotal)}</span>}
                            <h2 className="text-[7rem] md:text-[10rem] font-black tracking-tighter text-white leading-none">{formatCurrency(finalPrice)}</h2>
                        </div>
                        
                        {metadata.observations && (
                            <div className="max-w-2xl mx-auto border-t border-white/10 pt-10">
                                <p className="text-lg text-gray-400 font-medium italic">"{metadata.observations}"</p>
                            </div>
                        )}

                        <div className="pt-16">
                            <div className="w-80 h-px bg-white/20 mx-auto mb-6"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Assinatura do Responsável</p>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-10 left-0 right-0 text-center">
                         <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">Documento Válido por 7 dias</p>
                    </div>
                </div>
            </section>
        )}
      </div>
    </div>
  );
};

export default ProposalPresentation;
