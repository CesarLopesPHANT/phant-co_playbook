
import React from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, AppCustomization, ProposalSections } from '../types';

interface ProposalPresentationProps {
  metadata: ProposalMetadata;
  items: ProposalItem[];
  strategicMap: StrategicMapItem[];
  appConfig: AppCustomization;
  // onClose removido pois abrirá em nova aba
  selectedSections?: ProposalSections;
}

const PHANT_PURPLE = "#6113cc";
const PHANT_LOGO_URL = "http://phant.com.br/uploads/logo_light.png";

const ProposalPresentation: React.FC<ProposalPresentationProps> = ({ metadata, items, strategicMap, appConfig, selectedSections }) => {
  const total = items.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  // Default to all true if not provided (backward compatibility)
  const sections = selectedSections || { cover: true, strategicMap: true, tacticalScope: true, finalInvestment: true };

  return (
    <div className="bg-black text-white selection:bg-purple-500 selection:text-white font-sans scroll-smooth h-screen overflow-y-scroll snap-y snap-mandatory">
      <style>{`
        .presentation-bg {
          background-color: #050505;
          background-image: 
            radial-gradient(circle at 20% 20%, rgba(97, 19, 204, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(97, 19, 204, 0.05) 0%, transparent 50%);
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
          position: relative;
        }
        /* Esconde scrollbar mas permite scroll */
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* FIXED HEADER - Removed Navigation/Close Button for New Tab View */}
      
      <div className="presentation-bg">
        {/* SLIDE 1: CAPA */}
        {sections.cover && (
          <section id="cover" className="relative text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600 rounded-full blur-[160px] animate-pulse"></div>
            </div>
            <div className="relative z-10 max-w-6xl mx-auto space-y-12">
              <div className="mb-12 flex justify-center">
                <img src={PHANT_LOGO_URL} alt="Phant" className="h-24 md:h-32 w-auto animate-in zoom-in-50 duration-1000" />
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
          <section id="diagnosis" className="bg-[#080808]">
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
        {sections.tacticalScope && (
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
        )}

        {/* SLIDE 4: ESCOPO TÁTICO (OFFER) */}
        {sections.tacticalScope && (
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
                      <div className="md:w-1/3 space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1 bg-purple-600 rounded-full">{item.duration}</span>
                          <h3 className="text-3xl font-black italic tracking-tighter uppercase">{item.name}</h3>
                      </div>
                      <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-10 border-l border-white/10 pl-0 md:pl-10">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">A Estratégia</h4>
                            <p className="text-sm text-white/60 font-medium leading-relaxed">{item.description || "Implementação tática para ganho de market share imediato."}</p>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Principais Marcos</h4>
                            <ul className="space-y-2">
                              {(item.deliverables || ['Setup Tecnológico', 'Validado em Campo', 'Relatório de ROAS']).map((d, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-xs font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
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
        {sections.finalInvestment && (
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
                      <div className="text-7xl md:text-[7rem] font-black tracking-tighter italic">{formatCurrency(total)}</div>
                      {metadata.observations && <p className="text-white/40 font-medium italic mt-6 max-w-xl mx-auto text-sm leading-relaxed">{metadata.observations}</p>}
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 justify-center">
                      <button 
                        onClick={() => window.print()}
                        className="btn-presentation px-16 py-8 rounded-[30px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl"
                      >
                        ACEITAR PROPOSTA
                      </button>
                      {/* BOTAO REVISAR DADOS REMOVIDO */}
                  </div>
                </div>

                <footer className="pt-20 space-y-8">
                  <img src={PHANT_LOGO_URL} alt="Phant" className="h-12 mx-auto drop-shadow-lg" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">© 2025 PHANTLAB STRATEGIC PLATFORM • EXCLUSIVE ACCESS</p>
                </footer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProposalPresentation;
