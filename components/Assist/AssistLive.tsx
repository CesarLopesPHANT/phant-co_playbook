
import React, { useEffect, useState, useRef } from 'react';
import { CopilotService } from '../../services/copilot';
import { ScriptDefinition } from '../../types';
import { SPIN_SCRIPT_V1 } from '../../constants';
import { TranscriptChunk, SuggestionEvent } from '../../modules/assist/contracts/events';

interface AssistLiveProps {
  clientName: string;
  scriptDefinition?: ScriptDefinition | null;
  onEnd: () => void;
  onMountService: (s: CopilotService) => void;
}

const AssistLive: React.FC<AssistLiveProps> = ({ clientName, scriptDefinition, onEnd, onMountService }) => {
  // State Typed with Contracts
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<SuggestionEvent[]>([]);
  const [isReady, setIsReady] = useState(false);
  
  const serviceRef = useRef<CopilotService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use provided script or fallback
  const activeScript = scriptDefinition || SPIN_SCRIPT_V1;

  useEffect(() => {
    // Init Service with Contract Callbacks
    const svc = new CopilotService({
      onTranscript: (t) => {
        setTranscript(t);
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      },
      onState: (event) => {
        setPhaseIndex(event.phaseIndex);
        setChecklist(event.checklist);
      },
      onSuggestion: (event) => {
        setSuggestions(prev => [event, ...prev].slice(0, 3));
      }
    });

    serviceRef.current = svc;
    onMountService(svc);
    
    // Set Script before starting
    svc.setScript(activeScript);

    svc.startSession(clientName).then(() => setIsReady(true));

    return () => {
      svc.stopSession();
    };
  }, [clientName, onMountService, activeScript]);

  const currentPhase = activeScript.phases[phaseIndex];

  if (!currentPhase) return <div>Carregando fases...</div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6 p-4">
       {/* HEADER */}
       <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm shrink-0">
          <div>
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <h2 className="text-xl font-black tracking-tight">{clientName}</h2>
             </div>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1 ml-6">Gravando • {isReady ? 'Conectado' : 'Iniciando...'}</p>
          </div>
          <button onClick={onEnd} className="px-8 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
             Encerrar Sessão
          </button>
       </header>

       <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          
          {/* ESQUERDA: CHECKLIST E FASE */}
          <div className="col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
             <div className="bg-black text-white p-8 rounded-[32px] shadow-2xl space-y-6">
                <div>
                   <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Script: {activeScript.name}</span>
                   <h3 className="text-2xl font-black uppercase italic leading-none mt-2">{currentPhase.name}</h3>
                </div>
                <div className="space-y-3">
                   {currentPhase.checklist.map((item, i) => {
                      const key = `${currentPhase.id}_${i}`;
                      const isDone = checklist[key];
                      return (
                        <div 
                          key={i} 
                          onClick={() => serviceRef.current?.checkItem(String(i))}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${isDone ? 'bg-green-500/20 border-green-500' : 'bg-white/10 border-white/5 hover:bg-white/20'}`}
                        >
                           <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${isDone ? 'border-green-500 bg-green-500' : 'border-white/30'}`}>
                             {isDone && <span className="text-[8px]">✓</span>}
                           </div>
                           <p className={`text-[11px] font-bold leading-tight ${isDone ? 'text-green-300 line-through' : 'text-white'}`}>{item}</p>
                        </div>
                      );
                   })}
                </div>
                <div className="flex justify-between pt-4">
                   <button onClick={() => serviceRef.current?.prevPhase()} className="text-[10px] font-black uppercase text-white/30 hover:text-white">← Voltar</button>
                   <button onClick={() => serviceRef.current?.nextPhase()} className="text-[10px] font-black uppercase text-white hover:text-green-400">Próxima →</button>
                </div>
             </div>

             <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 block">Objetivos</span>
                <ul className="space-y-2">
                   {currentPhase.objectives.map((obj, i) => (
                      <li key={i} className="text-[11px] font-bold text-blue-900">• {obj}</li>
                   ))}
                </ul>
             </div>
          </div>

          {/* CENTRO: TRANSCRIÇÃO */}
          <div className="col-span-6 bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
             <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar" ref={scrollRef}>
                {transcript.length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full opacity-30">
                      <span className="text-4xl animate-pulse">🎙️</span>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-4">Aguardando fala...</p>
                   </div>
                )}
                {transcript.map((seg) => (
                   <div key={seg.id} className="animate-in slide-in-from-bottom-2 fade-in">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${seg.isFinal ? 'text-gray-300' : 'text-blue-400'}`}>
                         {seg.isFinal ? 'Detectado' : 'Ouvindo...'}
                      </p>
                      <p className="text-lg font-medium text-gray-800 leading-relaxed">{seg.text}</p>
                   </div>
                ))}
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
          </div>

          {/* DIREITA: SUGESTÕES E GATILHOS */}
          <div className="col-span-3 flex flex-col gap-6">
             <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4 block">Sugestões Rápidas</span>
                <div className="space-y-3">
                   {currentPhase.suggestion_templates.map((sug, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-amber-100/50 shadow-sm">
                         <p className="text-[11px] font-bold text-amber-900 italic">"{sug}"</p>
                      </div>
                   ))}
                </div>
             </div>

             {suggestions.length > 0 && (
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-lg animate-in slide-in-from-right-4">
                   <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <span className="animate-pulse">✨</span> IA Insight
                   </span>
                   <div className="space-y-3">
                      {suggestions.map((s) => (
                         <div key={s.id} className="p-3 bg-purple-50 rounded-xl text-[11px] font-bold text-purple-900 leading-snug">
                            {s.text}
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </div>

       </div>
    </div>
  );
};

export default AssistLive;
