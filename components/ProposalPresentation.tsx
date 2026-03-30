
import React, { useMemo } from 'react';
import { ProposalItem, StrategicMapItem, ProposalMetadata, AppCustomization, ProposalSections } from '../types';

interface ProposalPresentationProps {
  metadata: ProposalMetadata;
  items: ProposalItem[];
  strategicMap: StrategicMapItem[];
  appConfig: AppCustomization;
  selectedSections?: ProposalSections;
}

const PHANT_PURPLE = "#6113cc";
const PHANT_LOGO_URL = "http://phant.com.br/uploads/logo_light.png";

const ProposalPresentation: React.FC<ProposalPresentationProps> = ({ metadata, items, strategicMap, appConfig, selectedSections }) => {
  const subTotal = items.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const discountAmount = useMemo(() => {
    if (!metadata.discountValue || metadata.discountValue <= 0) return 0;
    if (metadata.discountType === 'percentage') {
      return subTotal * (metadata.discountValue / 100);
    }
    return metadata.discountValue;
  }, [subTotal, metadata.discountValue, metadata.discountType]);

  const finalTotal = Math.max(0, subTotal - discountAmount);
  const installmentValue = finalTotal / (metadata.installments || 1);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const sections = selectedSections || { cover: true, strategicMap: true, tacticalScope: true, finalInvestment: true, backCover: true };

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
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      <div className="presentation-bg">
        {/* SLIDE 1: CAPA */}
        {sections.cover && (
          <section id="cover" className="relative text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600 rounded-full blur-[160px] animate-pulse"></div>
            </div>
            <div className="relative z-10 max-w-6xl mx-auto space-y-12">
              <div className="mb-12 flex justify-center items-center gap-8">
                <img src={PHANT_LOGO_URL} alt="Phant" className="h-24 md:h-32 w-auto animate-in zoom-in-50 duration-1000" />
                {metadata.clientLogo && (
                  <>
                    <span className="text-white/20 text-4xl font-thin">&times;</span>
                    <img src={metadata.clientLogo} alt={metadata.clientName} className="h-20 md:h-28 w-auto animate-in zoom-in-50 duration-1000 object-contain" />
                  </>
                )}
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

        {/* SLIDES DE FICHA TÉCNICA (UM POR ITEM) */}
        {sections.tacticalScope && items.map((item, i) => (
          <section key={item.instanceId} className="bg-[#0a0a0a] overflow-hidden">
            <div className="max-w-7xl mx-auto w-full space-y-16">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                {/* Coluna Esquerda: Hook & Promessa */}
                <div className="lg:col-span-5 space-y-10">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="px-4 py-1 bg-purple-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{item.category || 'Solução'}</span>
                      <span className="px-4 py-1 bg-white/10 text-white/60 text-[10px] font-black rounded-full uppercase tracking-widest">{item.subCategory || 'Estratégia'}</span>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{item.duration}</span>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] italic">
                      {item.name}
                    </h2>
                  </div>

                  <div className="p-10 bg-white/5 border-l-4 border-purple-600 rounded-r-[40px] relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 text-8xl opacity-5 group-hover:scale-110 transition-transform">✨</div>
                    <p className="text-2xl md:text-3xl font-black text-purple-400 leading-tight italic tracking-tight">
                      "{item.promessa || "Uma nova fronteira de resultados para sua operação."}"
                    </p>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black uppercase text-white/30 block mb-1">Fee Base</span>
                        <p className="text-xl font-black text-white">{formatCurrency(item.basePrice)}</p>
                      </div>
                      <div className="p-4 bg-purple-600/10 rounded-2xl border border-purple-500/20">
                        <span className="text-[9px] font-black uppercase text-purple-400 block mb-1">Maturidade</span>
                        <p className="text-xl font-black text-white uppercase">{item.maturity || 'Base'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Detalhamento Técnico & Opcionais */}
                <div className="lg:col-span-7 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30">Fases do Cronograma</h4>
                      <div className="space-y-3">
                          {(item.deliverables && item.deliverables.length > 0 ? item.deliverables : ['Setup de Inteligência', 'Análise de Ativos', 'Implementação']).map((phase, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-4 group">
                              <div className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {pIdx + 1}
                              </div>
                              <p className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{phase}</p>
                            </div>
                          ))}
                      </div>
                    </div>

                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30">Opcionais Selecionados</h4>
                        <div className="space-y-3">
                          {item.selectedOptions.map((opt, oIdx) => (
                            <div key={oIdx} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
                              <span className="text-[11px] font-bold text-white/60">{opt.label}</span>
                              <span className="text-[11px] font-black text-purple-400">+{formatCurrency(opt.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-8 border-t border-white/10">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30">Visão Geral da Operação</h4>
                    <p className="text-lg font-medium text-white/60 leading-relaxed italic">
                      {item.description || "Implementação tática focada em remover fricções comerciais e escalar a autoridade da marca no ambiente digital."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* SLIDE: INVESTIMENTO & FECHAMENTO */}
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
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">
                        {metadata.installments && metadata.installments > 1 ? `${metadata.installments}x de` : 'Investimento Estratégico Total'}
                      </span>
                      <div className="flex flex-col items-center">
                          {discountAmount > 0 && (
                            <span className="text-xl font-bold text-red-400 line-through decoration-red-400/50 mb-2 opacity-60">
                                {formatCurrency(subTotal)}
                            </span>
                          )}
                          <div className="text-7xl md:text-[7rem] font-black tracking-tighter italic">
                            {formatCurrency(metadata.installments && metadata.installments > 1 ? installmentValue : finalTotal)}
                          </div>
                          {metadata.installments && metadata.installments > 1 && (
                            <span className="text-sm font-black text-white/30 uppercase tracking-[0.3em] mt-4">Total: {formatCurrency(finalTotal)}</span>
                          )}
                      </div>
                      
                      {metadata.observations && <p className="text-white/40 font-medium italic mt-6 max-w-xl mx-auto text-sm leading-relaxed">{metadata.observations}</p>}
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 justify-center">
                      <button 
                        onClick={() => window.print()}
                        className="btn-presentation px-16 py-8 rounded-[30px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl"
                      >
                        ACEITAR PROPOSTA
                      </button>
                  </div>
                </div>

                <footer className="pt-20 space-y-8">
                  <img src={PHANT_LOGO_URL} alt="Phant" className="h-12 mx-auto drop-shadow-lg" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">© 2025 PHANTLAB STRATEGIC PLATFORM • EXCLUSIVE ACCESS</p>
                </footer>
            </div>
          </section>
        )}

        {/* SLIDE FINAL: CONTRA-CAPA (BACK COVER) */}
        {sections.backCover && (
          <section id="back-cover" className="relative flex flex-col justify-between">
            <div className="absolute inset-0 bg-black z-0">
               <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none opacity-[0.05]">
                <pattern id="phant-text-pres" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
                  <text x="10" y="60" fontFamily="Inter" fontWeight="900" fontSize="40" fill="white">PHANT</text>
                </pattern>
                <rect width="100%" height="100%" fill="url(#phant-text-pres)" />
              </svg>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto w-full h-full flex flex-col justify-between py-12">
               <div>
                  <img src={PHANT_LOGO_URL} alt="Phant" className="h-16 opacity-80" />
               </div>

               <div className="space-y-8">
                  <p className="text-xs font-black uppercase tracking-[0.5em] text-white/40">Manifesto</p>
                  <h2 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.9]">
                    Crescimento<br/>é Movimento<br/><span className="text-purple-600">Estratégico.</span>
                  </h2>
                  <p className="text-xl md:text-2xl text-white/60 font-medium max-w-2xl leading-relaxed italic border-l-4 border-purple-600 pl-8">
                     "Não somos agência. Somos uma plataforma estruturada por método, produtos e inteligência aplicada para diagnosticar estagnação e provocar movimento."
                  </p>
               </div>

               <div className="flex flex-col md:flex-row justify-between items-end border-t border-white/10 pt-12">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Fale Conosco</p>
                      <div>
                         <p className="text-4xl font-black tracking-tighter">66 9 9900 0523</p>
                         <p className="text-2xl font-medium text-white/60">www.phant.com.br</p>
                      </div>
                   </div>
                   <div className="text-right opacity-30 mt-8 md:mt-0">
                      <p className="text-[10px] font-black uppercase tracking-widest">{appConfig.companyName} HQ</p>
                      <p className="text-[10px] uppercase">All Rights Reserved © {new Date().getFullYear()}</p>
                   </div>
               </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProposalPresentation;
