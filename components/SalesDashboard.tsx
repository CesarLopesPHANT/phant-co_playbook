
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SALES_PERFORMANCE } from '../constants';
import { SupabaseService, GoogleApiService } from '../services/api';
import { SolutionItem } from '../types';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const SalesDashboard: React.FC = () => {
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [proposalsCount, setProposalsCount] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [checkpoints, setCheckpoints] = useState([
    { id: 1, text: 'Validar 5 Leads nos critérios de "Alto Potencial"', done: false },
    { id: 2, text: 'Estudar Diferenciais de uma Solução "Advanced"', done: false },
    { id: 3, text: 'Gerar 3 Simulações de Proposta no Sistema', done: false },
    { id: 4, text: 'Executar 10 Follow-ups ativos', done: false },
  ]);

  const slaMeta = { base: 5, super: 10 };

  useEffect(() => {
    const load = async () => {
      const data = await SupabaseService.fetchSolutions();
      setSolutions(data || []);
      const savedProposals = JSON.parse(localStorage.getItem('phant_current_proposal') || '[]');
      setProposalsCount(savedProposals.length);
      
      // Busca agenda real do Google
      setIsLoadingEvents(true);
      const events = await GoogleApiService.fetchCalendarEvents();
      setCalendarEvents(events);
      setIsLoadingEvents(false);
    };
    load();
  }, []);

  const toggleCheckpoint = (id: number) => {
    setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  const progressToSuper = Math.min((proposalsCount / slaMeta.super) * 100, 100);

  const formatTime = (event: CalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return '--:--';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Bom dia, <span className="text-blue-600">Vendedor.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
            Status: {proposalsCount >= slaMeta.base ? '⚡ Alta Performance' : '🔥 Aquecendo Motores'}
          </p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-8 py-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Gap Super Meta</span>
              <span className="text-2xl font-black text-gray-900">{slaMeta.super - proposalsCount} <span className="text-xs text-gray-400">deals</span></span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-8">
          <div className="app-card p-10 bg-white space-y-8 relative overflow-hidden min-h-[500px]">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Radar de Superação</h3>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{Math.round(progressToSuper)}%</span>
             </div>
             
             <div className="relative h-4 bg-gray-50 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" style={{ width: `${progressToSuper}%` }}></div>
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30 z-10" title="Meta Base"></div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                   <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Propostas Hoje</span>
                   <span className="text-xl font-black text-gray-900">{proposalsCount}</span>
                </div>
                <div className="p-4 bg-gray-900 text-white rounded-2xl">
                   <span className="text-[8px] font-black text-white/40 uppercase block mb-1">SLA Atendido</span>
                   <span className="text-xl font-black text-blue-400">{proposalsCount >= slaMeta.base ? 'SIM' : 'NÃO'}</span>
                </div>
             </div>

             <div className="h-48 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                  <AreaChart data={SALES_PERFORMANCE}>
                    <Area type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={3} fill="#2563eb" fillOpacity={0.05} />
                    <Tooltip hide />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="app-card p-8 bg-blue-600 text-white relative group cursor-pointer overflow-hidden">
             <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 group-hover:scale-125 transition-transform duration-700">🏆</div>
             <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] block mb-4">Recomendação Tática</span>
             <p className="text-lg font-black leading-tight tracking-tight">
                {proposalsCount < 3 
                  ? "Seu volume de propostas está baixo. Foque na prospecção ativa de leads de alto ticket nas próximas 2 horas." 
                  : "Excelente ritmo! Aproveite o momentum para aplicar a técnica de ancoragem em propostas paradas."}
             </p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="app-card p-10 bg-white space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Google Agenda</h3>
                <span className={`w-2 h-2 rounded-full bg-green-500 ${isLoadingEvents ? 'animate-ping' : 'animate-pulse'}`}></span>
             </div>
             
             <div className="space-y-4">
                {isLoadingEvents ? (
                   <p className="text-[10px] font-black text-gray-300 uppercase text-center py-4">Sincronizando compromissos...</p>
                ) : calendarEvents.length > 0 ? (
                  calendarEvents.map(event => (
                    <div key={event.id} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                       <div className="text-center min-w-[50px]">
                          <span className="block text-[10px] font-black text-blue-600">{formatTime(event)}</span>
                          <span className="block text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Início</span>
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-[11px] font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{event.summary}</h4>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-400 rounded uppercase">Google Meet / Local</span>
                       </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] font-black text-gray-300 uppercase text-center py-4">Sem reuniões para hoje.</p>
                )}
             </div>
          </div>

          <div className="app-card p-10 bg-black text-white space-y-6 shadow-2xl shadow-black/20">
             <h3 className="text-lg font-black tracking-tight italic">Protocolo de Ritos</h3>
             <div className="space-y-3">
                {checkpoints.map(cp => (
                  <button 
                    key={cp.id}
                    onClick={() => toggleCheckpoint(cp.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${cp.done ? 'bg-white/10 border-white/5 opacity-40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 ${cp.done ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                       {cp.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className={`text-[10px] font-bold text-left leading-tight ${cp.done ? 'line-through' : ''}`}>{cp.text}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="app-card p-10 bg-white border-l-4 border-amber-400 space-y-6">
             <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.3em]">Fundamento do SLA</span>
             <h4 className="text-xl font-black text-gray-900 tracking-tighter leading-tight">Perfil de Cliente Ideal (ICP)</h4>
             <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                Empresas com faturamento acima de **R$ 100k/mês**. Se o decisor (dono) não estiver na call, sua taxa de conversão cai em 70%.
             </p>
          </div>

          <div className="app-card p-10 bg-gray-50 border border-gray-100 text-center space-y-6">
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block">A Nossa Essência</span>
             <p className="text-2xl font-black text-gray-900 tracking-tighter italic leading-none">
                "Crescimento é <br/> Movimento <br/> Estratégico."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
