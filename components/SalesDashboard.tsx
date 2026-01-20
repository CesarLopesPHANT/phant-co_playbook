
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { SALES_PERFORMANCE } from '../constants';
import { SupabaseService, GoogleApiService } from '../services/api';
import { SolutionItem, ProposalRecord } from '../types';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface ProductRank {
  name: string;
  count: number;
}

const RITUALS_BY_DAY: Record<number, string[]> = {
  0: [ // Domingo
    'Planejar agenda da semana',
    'Revisar leituras pendentes',
    'Organizar ambiente de trabalho',
    'Mentalização de metas semanais'
  ],
  1: [ // Segunda - Prospecção e Abertura
    'Validar 5 Leads nos critérios de "Alto Potencial"',
    'Executar 10 Follow-ups de abertura',
    'Revisar e limpar CRM (Leads frios)',
    'Postar conteúdo de autoridade no LinkedIn'
  ],
  2: [ // Terça - Qualificação
    'Realizar 3 reuniões de Diagnóstico',
    'Estudar Diferenciais de uma Solução "Advanced"',
    'Confirmar agendas de Quarta e Quinta',
    'Refinar scripts de quebra de objeção'
  ],
  3: [ // Quarta - Proposta e Negociação
    'Gerar 3 Simulações de Proposta no Sistema',
    'Apresentar propostas para decisores',
    'Enviar materiais de apoio (Fichário) para leads mornos',
    'Analisar funil de vendas'
  ],
  4: [ // Quinta - Follow-up Intensivo
    'Executar 10 Follow-ups ativos (Resgate)',
    'Pedir indicações para clientes atuais',
    'Verificar pagamentos pendentes',
    'Alinhar entregas com time técnico'
  ],
  5: [ // Sexta - Fechamento e Review
    'Garantir assinaturas de contratos pendentes',
    'Atualizar forecast do mês',
    'Review semanal de performance',
    'Zerar caixa de entrada de e-mails'
  ],
  6: [ // Sábado
    'Descanso estratégico',
    'Estudo livre de mercado',
    'Networking informal',
    'Review pessoal'
  ]
};

const SalesDashboard: React.FC = () => {
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [history, setHistory] = useState<ProposalRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [currentMonthTarget, setCurrentMonthTarget] = useState(0);
  
  // Estado para Ritos Dinâmicos
  const [checkpoints, setCheckpoints] = useState<{id: number, text: string, done: boolean}[]>([]);

  useEffect(() => {
    const load = async () => {
      // Carregar Soluções
      const data = await SupabaseService.fetchSolutions();
      setSolutions(data || []);
      
      // Carregar Histórico Real
      const hist = await SupabaseService.fetchProposalsHistory();
      setHistory(hist || []);

      // Carregar Metas do Mês
      const goals = await SupabaseService.fetchGoals();
      const currentKey = new Date().toISOString().slice(0, 7);
      const target = goals.find(g => g.month === currentKey)?.target || 0;
      setCurrentMonthTarget(target);

      // Configurar Ritos do Dia
      const today = new Date().getDay();
      const todaysRituals = RITUALS_BY_DAY[today] || RITUALS_BY_DAY[1];
      setCheckpoints(todaysRituals.map((text, idx) => ({ id: idx, text, done: false })));
      
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

  // Cálculos Derivados
  const totalPipelineValue = useMemo(() => {
    return history.reduce((acc, curr) => acc + (curr.total_value || 0), 0);
  }, [history]);

  // Filtra apenas o realizado no mês atual para o gráfico de progresso
  const currentMonthRealized = useMemo(() => {
    const currentKey = new Date().toISOString().slice(0, 7);
    return history
      .filter(p => p.created_at.startsWith(currentKey))
      .reduce((acc, curr) => acc + (curr.total_value || 0), 0);
  }, [history]);

  // Propostas Pendentes ("Na Mesa")
  const pendingProposals = useMemo(() => {
    return history.filter(h => h.status === 'PENDING' || !h.status);
  }, [history]);

  const totalPendingValue = pendingProposals.reduce((acc, curr) => acc + curr.total_value, 0);

  const proposalsCount = history.length;
  
  // Progresso em relação à meta do mês (evita divisão por zero)
  const progressToTarget = currentMonthTarget > 0 
    ? Math.min((currentMonthRealized / currentMonthTarget) * 100, 100) 
    : 0;

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(record => {
      if (record.items && Array.isArray(record.items)) {
        record.items.forEach(item => {
          counts[item.name] = (counts[item.name] || 0) + 1;
        });
      }
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [history]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const formatTime = (event: CalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return '--:--';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getDayName = () => {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString('pt-BR', { month: 'long' });
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Bom dia, <span className="text-blue-600">Vendedor.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
            Status: {progressToTarget >= 100 ? '⚡ Meta Batida' : '🔥 Em Perseguição'}
          </p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-8 py-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Meta {getMonthName()}</span>
              <span className="text-2xl font-black text-gray-900">
                {currentMonthTarget > 0 ? formatCurrency(currentMonthTarget) : "Não definida"}
              </span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA 1: PERFORMANCE E RESUMO */}
        <div className="lg:col-span-4 space-y-8">
          <div className="app-card p-10 bg-white space-y-8 relative overflow-hidden min-h-[500px]">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Performance Mês</h3>
                <span className={`text-[10px] font-black px-2 py-1 rounded-md ${progressToTarget >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                  {Math.round(progressToTarget)}% Concluído
                </span>
             </div>
             
             <div className="relative h-4 bg-gray-50 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" style={{ width: `${progressToTarget}%` }}></div>
                {/* Marcador de 100% se passar da meta */}
                {progressToTarget > 100 && <div className="absolute top-0 right-0 h-full w-1 bg-green-500 z-10"></div>}
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                   <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Realizado (Mês)</span>
                   <span className="text-lg font-black text-gray-900 tracking-tight">{formatCurrency(currentMonthRealized)}</span>
                </div>
                <div className="p-4 bg-gray-900 text-white rounded-2xl">
                   <span className="text-[8px] font-black text-white/40 uppercase block mb-1">Pipeline Total</span>
                   <span className="text-lg font-black text-blue-400">{formatCurrency(totalPipelineValue)}</span>
                </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-gray-50">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Produtos em Alta (Top 3)</span>
                {topProducts.length > 0 ? (
                  topProducts.map((prod, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-300' : 'bg-orange-700'}`}>{i+1}</span>
                         <span className="text-[11px] font-bold text-gray-600 truncate max-w-[150px]">{prod.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-900">{prod.count}x</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] italic text-gray-400">Nenhuma proposta gerada ainda.</p>
                )}
             </div>

             {/* CHART FIX: Explicit height container to prevent Recharts width(0) loop */}
             <div className="mt-4 w-full opacity-50 relative overflow-hidden" style={{ height: '6rem' }}>
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={SALES_PERFORMANCE}>
                    <Area type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={3} fill="#2563eb" fillOpacity={0.05} />
                    <Tooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} cursor={false} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="app-card p-8 bg-black text-white relative group cursor-pointer overflow-hidden transition-all hover:scale-[1.02]">
             <div className="absolute -right-6 -bottom-6 text-8xl opacity-10 group-hover:opacity-20 transition-opacity duration-700">💰</div>
             <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] block mb-4">Oportunidade na Mesa</span>
             <p className="text-3xl font-black leading-none text-white tracking-tighter mb-2">
                {formatCurrency(totalPendingValue)}
             </p>
             <p className="text-xs font-medium text-gray-400 leading-relaxed mb-4">
                Existem <b>{pendingProposals.length} propostas</b> abertas aguardando sua ação. Vai deixar esfriar?
             </p>
             {pendingProposals.length > 0 && (
                <div className="flex -space-x-2 overflow-hidden py-1">
                   {pendingProposals.slice(0, 5).map((p, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-black flex items-center justify-center text-[8px] font-bold text-white" title={p.client_name}>
                         {p.client_name.charAt(0)}
                      </div>
                   ))}
                   {pendingProposals.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-black flex items-center justify-center text-[8px] font-bold text-white">
                         +{pendingProposals.length - 5}
                      </div>
                   )}
                </div>
             )}
          </div>
        </div>

        {/* COLUNA 2: AGENDA E RITOS */}
        <div className="lg:col-span-4 space-y-8">
          <div className="app-card p-10 bg-white space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Agenda Hoje</h3>
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
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-black tracking-tight italic">Ritos de {getDayName()}</h3>
                <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded text-white/60 uppercase">{checkpoints.filter(c => c.done).length}/{checkpoints.length}</span>
             </div>
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

        {/* COLUNA 3: CULTURA */}
        <div className="lg:col-span-4 space-y-8">
          <div className="app-card p-10 bg-white border-l-4 border-amber-400 space-y-6">
             <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.3em]">Fundamento do SLA</span>
             <h4 className="text-xl font-black text-gray-900 tracking-tighter leading-tight">Perfil de Cliente Ideal (ICP)</h4>
             <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                Empresas com faturamento acima de **R$ 100k/mês**. Se o decisor (dono) não estiver na call, sua taxa de conversão cai em 70%.
             </p>
          </div>

          <div className="app-card p-10 bg-gray-50 border border-gray-100 text-center space-y-6 flex flex-col justify-center h-full max-h-[300px]">
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
