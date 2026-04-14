import React, { useEffect, useMemo, useState } from 'react';
import { SupabaseService } from '../services/api';
import { UserRole } from '../types';

interface Props {
  currentRole: UserRole;
  userProfile?: any;
  onNavigate?: (moduleId: string) => void;
}

interface RecentVisit {
  moduleId: string;
  title: string;
  ts: number;
}

const PHANT_REMINDERS = [
  {
    title: 'Marketing é ciência, não achismo.',
    body: 'Toda decisão começa por hipótese, vira experimento e termina em métrica. Se não dá para medir, não dá para escalar.',
  },
  {
    title: 'Sistemas antes de esforço.',
    body: 'Não dependemos de força braçal. Dependemos de processos lógicos, replicáveis e auditáveis.',
  },
  {
    title: 'Encantar é o padrão mínimo.',
    body: 'O cliente Phant não recebe entrega — recebe experiência. Cada toque carrega o nosso jeito de cuidar.',
  },
  {
    title: 'Clareza vence carisma.',
    body: 'Posicionamento direto, promessa nítida, próximo passo óbvio. Quem confunde, perde.',
  },
  {
    title: 'Cultura científica é diária.',
    body: 'Hipótese → teste → leitura → ajuste. Repetir até virar reflexo do squad.',
  },
  {
    title: 'A operação fala antes da venda.',
    body: 'A forma como a gente opera por dentro define o tamanho do que entrega por fora.',
  },
  {
    title: 'Cada lead é um ser humano.',
    body: 'CRM é memória de relacionamento, não planilha de cobrança.',
  },
];

const QUICK_LINKS = [
  { id: 'treinamento',    title: 'Treinamento',       desc: 'Trilhas e cursos por área.',                  icon: '🎓', color: 'bg-purple-700' },
  { id: 'fichario',       title: 'Fichário',          desc: 'Documentos, decks e materiais.',              icon: '📂', color: 'bg-blue-600' },
  { id: 'clientes',       title: 'Gestão de Clientes',desc: 'Saúde, risco e expansão da carteira.',        icon: '👥', color: 'bg-emerald-600' },
  { id: 'cadastro_geral', title: 'Cadastro Geral',    desc: 'CRM e funil de leads.',                       icon: '📇', color: 'bg-rose-600' },
  { id: 'pdf_builder',    title: 'Gerar Propostas',   desc: 'Crie propostas de alto impacto.',             icon: '📄', color: 'bg-amber-600' },
  { id: 'cultura',        title: 'Nossa Essência',    desc: 'Os fundamentos do jeito Phant.',              icon: '🧭', color: 'bg-indigo-600' },
];

const VISITS_KEY = 'phant_recent_visits';

export const recordVisit = (moduleId: string, title: string) => {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    const list: RecentVisit[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(v => v.moduleId !== moduleId);
    filtered.unshift({ moduleId, title, ts: Date.now() });
    localStorage.setItem(VISITS_KEY, JSON.stringify(filtered.slice(0, 8)));
  } catch {}
};

const timeAgo = (ts: number) => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
};

const MyDay: React.FC<Props> = ({ userProfile, onNavigate }) => {
  const userId: string = userProfile?.id || '';
  const userName: string = userProfile?.full_name || 'Phant';
  const firstName = userName.split(' ')[0];

  const [visits, setVisits] = useState<RecentVisit[]>([]);
  const [lastLesson, setLastLesson] = useState<{ track_id: string; lesson_id: string; updated_at?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VISITS_KEY);
      if (raw) setVisits(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!userId) return;
    SupabaseService.fetchTrainingProgress(userId).then((rows: any[]) => {
      if (!rows || rows.length === 0) return;
      const sorted = [...rows].sort((a, b) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      );
      setLastLesson(sorted[0]);
    });
  }, [userId]);

  const reminder = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return PHANT_REMINDERS[day % PHANT_REMINDERS.length];
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* HEADER */}
      <div className="mb-12">
        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Meu dia</div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">
          {greeting}, {firstName}.
        </h1>
        <p className="text-sm font-bold text-gray-500">
          Continue de onde parou e siga construindo o jeito Phant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* POSICIONAMENTO PHANT */}
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-black text-white rounded-[40px] p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-6">
              Posicionamento Phant · Lembrete do dia
            </div>
            <h2 className="text-4xl font-black tracking-tighter leading-tight mb-6 max-w-xl">
              {reminder.title}
            </h2>
            <p className="text-base font-bold text-white/60 leading-relaxed max-w-xl">
              {reminder.body}
            </p>
          </div>
        </div>

        {/* CONTINUE DE ONDE PAROU */}
        <div className="bg-white border border-gray-100 rounded-[40px] p-10">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6">
            Continue de onde parou
          </div>
          {lastLesson ? (
            <button
              onClick={() => onNavigate?.('treinamento')}
              className="text-left w-full group"
            >
              <div className="text-[8px] font-black text-brand uppercase tracking-[0.3em] mb-2">Treinamento</div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                Última aula em andamento
              </h3>
              <p className="text-xs font-bold text-gray-400 leading-relaxed mb-6">
                {lastLesson.track_id} · {lastLesson.lesson_id}
              </p>
              <span className="text-[10px] font-black text-brand uppercase tracking-widest border-b border-brand/30 pb-1 group-hover:border-brand">
                Retomar →
              </span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate?.('treinamento')}
              className="text-left w-full group"
            >
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                Comece sua primeira trilha
              </h3>
              <p className="text-xs font-bold text-gray-400 leading-relaxed mb-6">
                Onboarding Phant te leva por Growth, Lives e Branding.
              </p>
              <span className="text-[10px] font-black text-brand uppercase tracking-widest border-b border-brand/30 pb-1 group-hover:border-brand">
                Iniciar →
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ATIVIDADES RECENTES */}
      {visits.length > 0 && (
        <div className="mb-10">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4">
            Suas últimas atividades
          </div>
          <div className="bg-white border border-gray-100 rounded-[32px] divide-y divide-gray-50">
            {visits.map(v => (
              <button
                key={v.moduleId + v.ts}
                onClick={() => onNavigate?.(v.moduleId)}
                className="w-full text-left px-8 py-5 flex items-center gap-6 hover:bg-gray-50 transition-all first:rounded-t-[32px] last:rounded-b-[32px]"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">
                  ↻
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-gray-900 tracking-tight truncate">{v.title}</h4>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{timeAgo(v.ts)}</div>
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest shrink-0">Abrir →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ATALHOS */}
      <div>
        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4">
          Áreas do sistema
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map(l => (
            <button
              key={l.id}
              onClick={() => onNavigate?.(l.id)}
              className="text-left bg-white border border-gray-100 rounded-[28px] p-7 hover:border-gray-200 hover:shadow-md transition-all group"
            >
              <div className={`w-12 h-12 rounded-[16px] ${l.color} text-white flex items-center justify-center text-xl mb-5`}>
                {l.icon}
              </div>
              <h3 className="text-base font-black text-gray-900 tracking-tight mb-1">{l.title}</h3>
              <p className="text-xs font-bold text-gray-400 leading-relaxed">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyDay;
