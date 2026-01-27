
import React, { useState, useMemo, useEffect } from 'react';
import { AppCustomization } from '../types';

interface CarouselGeneratorProps {
  appConfig: AppCustomization;
}

interface Slide {
  id: number;
  type: 'COVER' | 'CONTENT' | 'TIP' | 'CTA' | 'IMAGE';
  title: string;
  content: string;
  highlightedText?: string;
}

// -----------------------------------------------------------------------------
// LAYOUT PROTECTION RULES: FIXED STRUCTURE FOR PRINT/PDF INTEGRITY
// -----------------------------------------------------------------------------
const STRUCTURAL_RULES = {
  ASPECT_RATIO: 'aspect-[4/5]', // Common Instagram Portrait (1080x1350)
  SAFE_AREA_PADDING: 'p-12 md:p-16',
  BASE_DIMENSIONS: 'w-[432px] h-[540px]', // Scaled down but proportional for preview
  PRINT_DIMENSIONS: 'w-[1080px] h-[1350px]', // Internal logic dimensions
  TYPOGRAPHY_SCALE: {
    COVER_TITLE: 'text-6xl md:text-7xl',
    SECTION_TITLE: 'text-3xl md:text-4xl',
    BODY: 'text-lg md:text-xl',
  }
};

const CarouselGenerator: React.FC<CarouselGeneratorProps> = ({ appConfig }) => {
  const [inputText, setInputText] = useState<string>(`Slide 1: *COMO VENDER* ALTO TICKET COM IA
Slide 2: O problema das vendas tradicionais é a falta de escala.
Slide 3: Dica: Use o PhantLab para automatizar seu diagnóstico.
Slide 4: Faça o movimento agora. Clique no link da bio.`);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'CARD' | 'GRID'>('CARD');

  // Dynamic Parsing Logic
  const parsedSlides = useMemo(() => {
    const slideMarkers = inputText.split(/Slide\s*\d+:?/gi).filter(Boolean);
    return slideMarkers.map((raw, index): Slide => {
      const text = raw.trim();
      const isTip = text.toLowerCase().includes('dica:') || text.toLowerCase().includes('tip:');
      const isFirst = index === 0;
      const isLast = index === slideMarkers.length - 1;

      // Type detection
      let type: Slide['type'] = 'CONTENT';
      if (isFirst) type = 'COVER';
      else if (isLast) type = 'CTA';
      else if (isTip) type = 'TIP';

      // Title/Content Extraction
      const lines = text.split('\n');
      const title = lines[0];
      const content = lines.slice(1).join('\n');

      return {
        id: index + 1,
        type,
        title,
        content
      };
    });
  }, [inputText]);

  // Handle slide highlights (text between asterisks)
  const renderFormattedText = (text: string, baseClass: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={i} className="text-blue-500 font-black italic">{part.slice(1, -1)}</span>;
      }
      return part;
    });
  };

  const SlidePreview = ({ slide }: { slide: Slide }) => {
    const isDark = slide.type === 'COVER' || slide.type === 'CTA';
    
    return (
      <div 
        className={`relative ${STRUCTURAL_RULES.BASE_DIMENSIONS} ${STRUCTURAL_RULES.ASPECT_RATIO} ${isDark ? 'bg-black text-white' : 'bg-white text-gray-900'} rounded-[40px] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 border border-gray-100`}
      >
        {/* STRUCTURAL_INTEGRITY_GUARD: Ensures safe zones and alignment */}
        <div className={`flex-1 flex flex-col ${STRUCTURAL_RULES.SAFE_AREA_PADDING} relative z-10`}>
          
          {/* Slide Progress / Number */}
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-[10px] font-black text-white">
                 {slide.id}
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Slide {slide.id} / {parsedSlides.length}</span>
            </div>
            <img src={appConfig.systemLogoUrl} className="h-4 opacity-30 grayscale" alt="Phant" />
          </div>

          {/* Content Logic based on Slide Type */}
          <div className="flex-1 flex flex-col justify-center">
            {slide.type === 'COVER' && (
              <div className="space-y-6">
                <span className="text-blue-500 font-black text-[12px] uppercase tracking-[0.4em] mb-4 block">Manifesto PhantLab</span>
                <h2 className={`${STRUCTURAL_RULES.TYPOGRAPHY_SCALE.COVER_TITLE} font-black tracking-tighter leading-[0.9] uppercase`}>
                  {renderFormattedText(slide.title, '')}
                </h2>
                <div className="w-20 h-2 bg-blue-500 mt-10"></div>
              </div>
            )}

            {slide.type === 'CONTENT' && (
              <div className="space-y-6">
                <h3 className={`${STRUCTURAL_RULES.TYPOGRAPHY_SCALE.SECTION_TITLE} font-black tracking-tighter leading-tight`}>
                  {slide.title}
                </h3>
                <p className={`${STRUCTURAL_RULES.TYPOGRAPHY_SCALE.BODY} text-gray-500 font-medium leading-relaxed`}>
                  {slide.content}
                </p>
              </div>
            )}

            {slide.type === 'TIP' && (
              <div className="space-y-8 bg-blue-50 -mx-16 p-16 border-y border-blue-100">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">💡</span>
                  <h3 className="text-2xl font-black text-blue-900 tracking-tight italic">Insight do Estrategista</h3>
                </div>
                <p className="text-xl font-bold text-blue-800/70 leading-relaxed italic">
                  {slide.title.replace(/dica:|tip:/gi, '').trim()}
                </p>
              </div>
            )}

            {slide.type === 'CTA' && (
              <div className="text-center space-y-12">
                <h2 className="text-5xl font-black tracking-tighter leading-none italic uppercase">
                  {slide.title}
                </h2>
                <p className="text-xl text-white/40 font-medium">{slide.content}</p>
                <div className="pt-10">
                   <div className="inline-block px-10 py-5 bg-blue-600 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30">
                     Ação Estratégica
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Branding */}
          <div className="mt-10 flex justify-between items-center border-t border-gray-100/10 pt-8 opacity-40">
             <span className="text-[10px] font-black uppercase tracking-widest italic">{appConfig.companyName} Strategic Hub</span>
             <span className="text-[10px] font-black">@phantlab</span>
          </div>
        </div>

        {/* Structural Background Accents */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Gerador de Carrossel.</h1>
          <p className="text-gray-400 font-medium text-lg">Diagramação automática com hierarquia visual PhantLab.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm gap-1">
           <button 
             onClick={() => setViewMode('CARD')}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'CARD' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}
           >
             Preview
           </button>
           <button 
             onClick={() => setViewMode('GRID')}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'GRID' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}
           >
             Grid
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Editor Area */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
           <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-xl flex-1 flex flex-col space-y-6">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Editor de Roteiro</label>
                 <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-md italic">
                   {parsedSlides.length} Slides Detectados
                 </span>
              </div>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 w-full bg-gray-50 p-8 rounded-[30px] font-mono text-sm leading-relaxed border-none focus:ring-4 focus:ring-blue-500/5 outline-none resize-none custom-scrollbar"
                placeholder="Cole seu roteiro aqui... Ex: Slide 1: Título..."
              />
              <div className="p-6 bg-blue-50 rounded-[30px] space-y-2 border border-blue-100/50">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Guia de Formatação</p>
                 <ul className="text-[11px] font-medium text-blue-900/60 space-y-1">
                    <li>• Use <span className="font-black">Slide X:</span> para criar novos cards.</li>
                    <li>• Use <span className="font-black italic">*palavras*</span> para destacar textos em azul.</li>
                    <li>• O primeiro slide é sempre a <span className="font-black">Capa</span>.</li>
                    <li>• O último slide é sempre o <span className="font-black">CTA</span>.</li>
                 </ul>
              </div>
           </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
           {viewMode === 'CARD' ? (
             <div className="flex flex-col items-center space-y-10 w-full animate-in zoom-in-95 duration-500">
                <div className="relative group">
                   <SlidePreview slide={parsedSlides[currentSlideIndex]} />
                   
                   {/* Navigation Buttons */}
                   <button 
                     disabled={currentSlideIndex === 0}
                     onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                     className="absolute left-[-40px] top-1/2 -translate-y-1/2 w-16 h-16 bg-white border border-gray-100 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all disabled:opacity-0 disabled:pointer-events-none group-hover:left-[-60px]"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                   </button>
                   <button 
                     disabled={currentSlideIndex === parsedSlides.length - 1}
                     onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                     className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-16 h-16 bg-white border border-gray-100 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all disabled:opacity-0 disabled:pointer-events-none group-hover:right-[-60px]"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                   </button>
                </div>

                <div className="flex gap-2">
                   {parsedSlides.map((_, i) => (
                     <button 
                       key={i}
                       onClick={() => setCurrentSlideIndex(i)}
                       className={`h-2 rounded-full transition-all duration-500 ${currentSlideIndex === i ? 'w-10 bg-blue-600' : 'w-2 bg-gray-200 hover:bg-gray-300'}`}
                     />
                   ))}
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-8 w-full animate-in fade-in duration-500 overflow-y-auto max-h-[800px] p-6 custom-scrollbar pb-20">
                {parsedSlides.map((slide) => (
                  <div key={slide.id} className="scale-75 origin-top cursor-pointer hover:scale-[0.77] transition-transform" onClick={() => { setCurrentSlideIndex(slide.id - 1); setViewMode('CARD'); }}>
                    <SlidePreview slide={slide} />
                  </div>
                ))}
             </div>
           )}

           {/* Export Action (Simulated) */}
           <div className="fixed bottom-10 right-32 z-50 no-print">
              <button className="px-10 py-5 bg-black text-white rounded-[30px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3"/></svg>
                Exportar Projeção
              </button>
           </div>
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          LAYOUT PROTECTION SECTION (INVISIBLE)
          This section contains CSS and logic that prevents future changes from 
          altering the structural integrity of the PDF/Print layout.
      ----------------------------------------------------------------------- */}
      <div id="STRUCTURAL_INTEGRITY_GUARD" className="hidden">
         <style>{`
           @media print {
             .proposal-container {
               width: 1080px !important;
               height: 1350px !important;
               transform: none !important;
               margin: 0 !important;
               overflow: visible !important;
             }
             .printable-slide {
               page-break-after: always;
               width: 1080px !important;
               height: 1350px !important;
               box-shadow: none !important;
               border-radius: 0 !important;
             }
           }
         `}</style>
      </div>
    </div>
  );
};

export default CarouselGenerator;
