
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
        }
        .text-gradient {
          background: linear-gradient(135deg, #fff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .btn-presentation {
          background: ${PHANT_PURPLE};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-presentation:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(97, 19, 204, 0.4);
        }
        section {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 5rem 2rem;
          scroll-snap-align: start;
        }
      `}</style>

      {/* FIXED HEADER */}
      <nav className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-[210] pointer-events-none gap-4">
        <div className="pointer-events-auto">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-auto invert brightness-200" onError={(e) => e.currentTarget.style.display = 'none'} />}
        </div>
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={handleShare}
            className="px-6 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <span>🔗</span> {proposalId ? 'Compartilhar' : 'Salvar p/ Compartilhar'}
          </button>
          <button 
            onClick={onClose}
            className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="presentation-bg">
        {/* SLIDE 1: CAPA */}
        {sections.cover && (
            <section id="cover" className="relative text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600 rounded-full blur-[160px] animate-pulse"></div>
            </div>
            <div className="relative z-10 max-w-6xl mx-auto space-y-12">
                <div className="mb-12 flex justify-center">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="h-24 md:h-32 w-auto animate-in zoom-in-50 duration-1000 invert brightness-200" onError={(e) => e.currentTarget.style.display = 'none'} />}
                </div>
                <span className="inline-block px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-[0.4em] text-white/40">
                Proposta de Movimento Estratégico
                </span>
                <h1 className="text-7xl md:text-[9rem] font-black tracking-tighter leading-[0.8] uppercase italic">
                {metadata.headline || 'Impacto & Crescimento'}
                </h1>
                <div className="flex flex-col items-center gap-6">
                <div className="h-1 w-40 bg-purple-600"></div>
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-white/60">
                    Preparado exclusivamente para <span className="text-white italic">{metadata.clientName}</span>
                </p>
                </div>
            </div>
            </section>
        )}

        {/* SLIDE 2: O CENÁRIO (MAPA) */}
        {sections.strategicMap && (
            <section id="diagnosis" className="bg-[#080808]/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto w-full space-y-20">
                <div className="space-y-6">
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-none">
                    O Diagnóstico <br/> <span className="text-purple-600">Estratégico.</span>
                </h2>
                <p className="text-xl text-white/40 max-w-2xl font-medium">A clareza sobre onde você está é o primeiro passo para o domínio do mercado.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
                {strategicMap.length > 0 ? strategicMap.map((map, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 group">
                        <div className="p-12 md:p-16 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/[0.02] transition-all">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-red-500 mb-6">Estado Atual (Gargalo)</span>
                        <p className="text-lg font-medium text-white/40 italic leading-relaxed">"{map.current}"</p>
                        </div>
                        <div className="p-12 md:p-16 bg-purple-600/5 group-hover:bg-purple-600/10 transition-all relative">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-purple-600 rotate-45 hidden md:block"></div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6">Estado Desejado (Movimento)</span>
                        <p className="text-xl font-black text-white leading-tight uppercase">{map.desired}</p>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-2 py-40 text-center text-white/20 font-black uppercase tracking-[0.5em]">Gerando análise profunda...</div>
                )}
                </div>
            </div>
            </section>
        )}

        {/* SLIDE 3: O MÉTODO (3 MOVIMENTOS) */}
        <section id="method" className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto w-full space-y-24">
            <div className="text-center space-y-6">
               <h2 className="text-6xl md:text-[7rem] font-black tracking-tighter uppercase italic leading-none">
                 Os 3 Movimentos <br/> <span className="text-purple-600">da Phant.</span>
               </h2>
               <p className="text-xl text-white/40 max-w-2xl mx-auto font-medium">Aceleramos empresas através de um ecossistema de inteligência.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
               {[
                 { t: 'DIREÇÃO', s: 'A Tese', c: '#00B884', d: 'Alinhamento intelectual e clareza de rumo para o decisor.' },
                 { t: 'PROPAGAÇÃO', s: 'O Ativo', c: '#0095FF', d: 'Materialização da tese em canais e infraestrutura digital.' },
                 { t: 'ACELERAÇÃO', s: 'A Escala', c: '#7C3AED', d: 'Execução agressiva e monetização através de tecnologia e IA.' }
               ].map((m, i) => (
                 <div key={i} className="p-12 bg-white/5 border border-white/10 rounded-[50px] space-y-8 group hover:border-purple-500/50 transition-all">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-2xl group-hover:scale-110 transition-transform" style={{ backgroundColor: m.c }}>
                      0{i+1}
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-3xl font-black italic tracking-tighter" style={{ color: m.c }}>{m.t}</h3>
                       <p className="text-white/80 font-bold uppercase text-xs tracking-widest">{m.s}</p>
                       <p className="text-white/40 leading-relaxed font-medium">{m.d}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* SLIDE 4: ESCOPO TÁTICO */}
        {sections.scope && (
            <section id="scope" className="bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto w-full space-y-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="space-y-6">
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-none text-gradient">
                        Nossa <br/> <span className="text-white">Entrega.</span>
                    </h2>
                    <p className="text-xl text-white/40 max-w-xl font-medium">Ações concretas para tirar a sua empresa da inércia.</p>
                    </div>
                    <div className="text-right pb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Projeto de Impacto</p>
                    <p className="text-4xl font-black text-white">{items.length} Soluções Integradas</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {items.map((item, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-10 p-10 bg-white/[0.03] border border-white/5 rounded-[40px] hover:bg-white/[0.05] transition-all">
                        <div className="md:w-1/3 space-y-6">
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1 bg-purple-600 rounded-full">{item.duration}</span>
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">{item.name}</h3>
                            </div>
                            {(item.promessa) && (
                            <p className="text-sm text-purple-200/80 italic border-l-2 border-purple-500 pl-4 font-medium">
                                "{item.promessa}"
                            </p>
                            )}
                        </div>

                        <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-10 border-l border-white/10 pl-0 md:pl-10">
                            <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Descrição Técnica</h4>
                            <p className="text-sm text-white/60 font-medium leading-relaxed whitespace-pre-wrap">{item.description || "Implementação tática para ganho de market share imediato."}</p>
                            
                            {item.resultado_esperado && (
                                <div className="pt-4 mt-4 border-t border-white/5">
                                    <span className="text-[9px] font-black text-green-400 uppercase tracking-widest block mb-1">Resultado Esperado</span>
                                    <p className="text-xs text-white/80">{item.resultado_esperado}</p>
                                </div>
                            )}
                            </div>
                            <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Entregáveis & Escopo</h4>
                            <ul className="space-y-2">
                                {(item.deliverables || ['Setup Tecnológico', 'Validado em Campo', 'Relatório de ROAS']).map((d, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-xs font-bold text-white/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                                    {d}
                                </li>
                                ))}
                            </ul>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            </section>
        )}

        {/* SLIDE 5: INVESTIMENTO & FECHAMENTO */}
        {sections.closing && (
            <section id="closing" className="relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[180px] opacity-20"></div>
            </div>
            
            <div className="max-w-4xl mx-auto w-full text-center space-y-20 relative z-10">
                <div className="space-y-12">
                    <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-none">
                        O Próximo <br/> <span className="text-purple-600">Movimento.</span>
                    </h2>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto font-medium">O custo da inércia é infinitamente superior ao investimento em clareza.</p>
                </div>

                <div className="p-16 bg-white/[0.03] border-2 border-purple-600/30 rounded-[60px] space-y-12 backdrop-blur-xl">
                    <div className="space-y-4">
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Investimento Estratégico Total</span>
                        {discountAmount > 0 && <div className="text-2xl font-bold tracking-tighter italic line-through text-white/30">{formatCurrency(subtotal)}</div>}
                        <div className="text-7xl md:text-[7rem] font-black tracking-tighter italic">{formatCurrency(finalPrice)}</div>
                        {metadata.observations && <p className="text-white/40 font-medium italic mt-6 max-w-xl mx-auto text-sm leading-relaxed">{metadata.observations}</p>}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 justify-center">
                        <button 
                        onClick={() => window.print()}
                        className="btn-presentation px-16 py-8 rounded-[30px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl"
                        >
                        ACEITAR PROPOSTA
                        </button>
                        <button 
                        onClick={onClose}
                        className="px-16 py-8 bg-white/5 border border-white/10 rounded-[30px] font-black text-sm uppercase tracking-[0.3em] hover:bg-white/10 transition-all"
                        >
                        {proposalId ? 'FECHAR' : 'VOLTAR'}
                        </button>
                    </div>
                </div>

                <footer className="pt-20 space-y-8">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 mx-auto drop-shadow-lg invert brightness-200" onError={(e) => e.currentTarget.style.display = 'none'} />}
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">© {new Date().getFullYear()} {appConfig.companyName} • EXCLUSIVE ACCESS</p>
                </footer>
            </div>
            </section>
        )}
      </div>
    </div>
  );
};

export default ProposalPresentation;