import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserRole } from '../types';
import { SupabaseService } from '../services/api';
import MarketingScienceTrack from './tracks/MarketingScienceTrack';

type Area = 'onboarding' | 'growth' | 'lives' | 'branding' | 'marketing';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  description: string;
  youtubeId: string;
  playlistId?: string;
}

interface Track {
  id: string;
  area: Area;
  title: string;
  subtitle: string;
  cover: string;
  coverImage?: string;
  roles: UserRole[];
  areasAllowed: Area[];
  lessons: Lesson[];
}

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const lessonThumb = (l: Lesson): string | null => {
  if (l.youtubeId) return ytThumb(l.youtubeId);
  return null;
};

const trackThumb = (t: Track): string | null => {
  if (t.coverImage) return t.coverImage;
  const firstWithId = t.lessons.find(l => l.youtubeId);
  return firstWithId ? ytThumb(firstWithId.youtubeId) : null;
};

const AREAS: { id: Area; label: string; icon: string; color: string }[] = [
  { id: 'onboarding', label: 'Onboarding', icon: '🚀', color: 'bg-black' },
  { id: 'growth',     label: 'Growth',     icon: '📈', color: 'bg-emerald-600' },
  { id: 'lives',      label: 'Lives',      icon: '🎥', color: 'bg-rose-600' },
  { id: 'branding',   label: 'Branding',   icon: '🎨', color: 'bg-indigo-600' },
  { id: 'marketing',  label: 'Marketing',  icon: '🧪', color: 'bg-purple-700' },
];

const TRACKS: Track[] = [
  {
    id: 'onboarding-phant',
    area: 'onboarding',
    title: 'Onboarding Phant',
    subtitle: 'Primeiros passos: Growth, Lives e Branding na prática.',
    cover: '🚀',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    roles: ['MASTER', 'USER'],
    areasAllowed: ['onboarding', 'growth', 'lives', 'branding'],
    lessons: [
      { id: 'on-1', title: 'Boas-vindas à Phant',                    duration: '8 min',  description: 'Nossa essência, missão e o jeito Phant de encantar clientes.',        youtubeId: '' },
      { id: 'on-2', title: 'Cultura & Rituais',                      duration: '12 min', description: 'Como organizamos nossa semana: dailies, reviews e retros.',         youtubeId: '' },
      { id: 'on-3', title: 'Growth: fundamentos do funil',           duration: '18 min', description: 'Do topo ao fundo: aquisição, ativação, retenção e receita.',       youtubeId: '' },
      { id: 'on-4', title: 'Growth: experimentação e métricas',      duration: '15 min', description: 'Como rodar experimentos ICE/PIE e o que medir de verdade.',        youtubeId: '' },
      { id: 'on-5', title: 'Lives: anatomia de uma live que vende',  duration: '22 min', description: 'Roteiro, gatilhos, chamadas e follow-up pós-live.',                youtubeId: '' },
      { id: 'on-6', title: 'Lives: produção e operação',             duration: '14 min', description: 'Setup técnico, plataformas e checklist de transmissão.',          youtubeId: '' },
      { id: 'on-7', title: 'Branding: identidade e posicionamento',  duration: '16 min', description: 'Arquétipo, tom de voz e pilares visuais da marca Phant.',         youtubeId: '' },
      { id: 'on-8', title: 'Branding: guidelines na prática',        duration: '10 min', description: 'Como aplicar a marca em decks, redes e materiais de venda.',      youtubeId: '' },
      { id: 'on-9', title: 'Primeira missão: seu pitch',             duration: '—',      description: 'Monte seu pitch pessoal e compartilhe com o squad.',                youtubeId: '' },
    ],
  },
  {
    id: 'marketing-cientifico',
    area: 'marketing',
    title: 'Marketing Científico',
    subtitle: 'Operação Cientista do Marketing + Processos Internos. Cultura científica, performance e homologação operacional.',
    cover: '🧪',
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1600&q=80',
    roles: ['MASTER', 'USER'],
    areasAllowed: ['marketing', 'onboarding', 'growth'],
    lessons: [
      // ===== MISSÃO 01: CIENTISTA DO MARKETING =====
      {
        id: 'mc-f1',
        title: 'Fase 1 — Reprogramando o Sistema',
        duration: 'Playlist',
        description: 'O Mindset e o Método. Playlist completa de imersão na cultura científica de marketing.',
        youtubeId: '',
        playlistId: 'PL8kAZHXN1qcLxyMNCpmLYxvSxtVFPX3nw',
      },
      {
        id: 'mc-f2a',
        title: 'Fase 2 — Estratégia Aplicada (Parte 1)',
        duration: '—',
        description: 'Fundamentos de estratégia aplicada ao marketing de performance.',
        youtubeId: 'rqbwrtLt66U',
      },
      {
        id: 'mc-f2b',
        title: 'Fase 2 — Estratégia Aplicada (Parte 2)',
        duration: '—',
        description: 'Continuação dos fundamentos e aplicação prática da estratégia.',
        youtubeId: 'DGsvXcykxcE',
      },
      {
        id: 'mc-f3a',
        title: 'Fase 3 — Táticas de Combate (Parte 1)',
        duration: '—',
        description: 'Execução: as táticas que transformam estratégia em resultado.',
        youtubeId: 'N-Qk9BUbGrg',
      },
      {
        id: 'mc-f3b',
        title: 'Fase 3 — Táticas de Combate (Parte 2)',
        duration: '—',
        description: 'Aprofundamento das táticas de execução e fechamento da Missão 01.',
        youtubeId: 'Gf5fdazhaRs',
      },
      // ===== MISSÃO 02: PROCESSOS INTERNOS =====
      {
        id: 'mc-f4a',
        title: 'Fase 4 — Protocolos de Elite (Parte 1)',
        duration: '—',
        description: 'Alinhamento Estrutural. A forma como operamos internamente define a escala que alcançamos fora.',
        youtubeId: 'twrqGjGeZek',
      },
      {
        id: 'mc-f4b',
        title: 'Fase 4 — Protocolos de Elite (Parte 2)',
        duration: '—',
        description: 'Continuação dos protocolos de alinhamento estrutural da operação.',
        youtubeId: 'IbJg6yV0Y4U',
      },
      {
        id: 'mc-f5a',
        title: 'Fase 5 — Sistematização Avançada (Parte 1)',
        duration: '—',
        description: 'Operação e Escala. Não dependemos de esforço braçal, dependemos de sistemas lógicos.',
        youtubeId: 'GsXzNG6d3F4',
      },
      {
        id: 'mc-f5b',
        title: 'Fase 5 — Sistematização Avançada (Parte 2)',
        duration: '—',
        description: 'Matrizes de escala e sistematização avançada da operação.',
        youtubeId: 'AXV1kChxLxc',
      },
      {
        id: 'mc-f6',
        title: 'Fase 6 — A Auditoria Final',
        duration: '—',
        description: 'Otimização Contínua. Como garantir a qualidade inegociável da operação. Conclusão do Treinamento de Elite.',
        youtubeId: 'NGDDbxJjK90',
      },
    ],
  },
];

interface ProgressRow {
  user_id: string;
  user_name: string;
  track_id: string;
  lesson_id: string;
  completed?: boolean;
  liked?: boolean;
}

interface Props {
  currentRole: UserRole;
  userProfile?: any;
}

const YouTubeEmbed: React.FC<{ id: string; title: string; playlistId?: string }> = ({ id, title, playlistId }) => {
  if (!id && !playlistId) {
    return (
      <div className="aspect-video w-full rounded-[28px] bg-gray-100 flex items-center justify-center">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aula em breve</span>
      </div>
    );
  }
  const baseParams = 'rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&controls=1&fs=1&color=white';
  const src = playlistId
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&${baseParams}`
    : `https://www.youtube-nocookie.com/embed/${id}?${baseParams}`;
  return (
    <div className="aspect-video w-full rounded-[28px] overflow-hidden bg-black">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full border-0"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
};

const MembersArea: React.FC<Props> = ({ currentRole, userProfile }) => {
  const userId: string = userProfile?.id || 'anon';
  const userName: string = userProfile?.full_name || 'Usuário';

  const [view, setView] = useState<'tracks' | 'performance'>('tracks');
  const [selectedArea, setSelectedArea] = useState<Area | 'all'>(currentRole === 'MASTER' ? 'all' : 'onboarding');
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [rows, setRows] = useState<ProgressRow[]>([]);

  const loadRows = useCallback(async () => {
    const data = currentRole === 'MASTER'
      ? await SupabaseService.fetchTrainingProgress()
      : await SupabaseService.fetchTrainingProgress(userId);
    setRows(data as ProgressRow[]);
  }, [currentRole, userId]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const myRow = (trackId: string, lessonId: string): ProgressRow | undefined =>
    rows.find(r => r.user_id === userId && r.track_id === trackId && r.lesson_id === lessonId);

  const mutate = async (trackId: string, lessonId: string, patch: { completed?: boolean; liked?: boolean }) => {
    const existing = myRow(trackId, lessonId);
    const next: ProgressRow = {
      user_id: userId,
      user_name: userName,
      track_id: trackId,
      lesson_id: lessonId,
      completed: existing?.completed ?? false,
      liked: existing?.liked ?? false,
      ...patch,
    };
    setRows(prev => {
      const others = prev.filter(r => !(r.user_id === userId && r.track_id === trackId && r.lesson_id === lessonId));
      return [...others, next];
    });
    await SupabaseService.upsertTrainingProgress(next);
  };

  const visibleTracks = useMemo(() => {
    return TRACKS.filter(t => {
      if (!t.roles.includes(currentRole)) return false;
      if (currentRole === 'MASTER') return true;
      if (selectedArea === 'all') return true;
      return t.areasAllowed.includes(selectedArea);
    });
  }, [currentRole, selectedArea]);

  const trackStats = (t: Track) => {
    const myDone = t.lessons.filter(l => myRow(t.id, l.id)?.completed).length;
    return { done: myDone, total: t.lessons.length, pct: Math.round((myDone / t.lessons.length) * 100) };
  };

  const lessonLikes = (trackId: string, lessonId: string) =>
    rows.filter(r => r.track_id === trackId && r.lesson_id === lessonId && r.liked).length;

  // ============ LESSON PLAYER ============
  if (activeTrack && activeLesson) {
    const row = myRow(activeTrack.id, activeLesson.id);
    const likes = lessonLikes(activeTrack.id, activeLesson.id);
    const idx = activeTrack.lessons.findIndex(l => l.id === activeLesson.id);
    const next = activeTrack.lessons[idx + 1];

    return (
      <div className="max-w-[1000px] mx-auto pb-20">
        <button
          onClick={() => setActiveLesson(null)}
          className="mb-8 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-brand"
        >
          ← Voltar para {activeTrack.title}
        </button>

        <YouTubeEmbed id={activeLesson.youtubeId} playlistId={activeLesson.playlistId} title={activeLesson.title} />

        <div className="mt-8">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">
            Aula {idx + 1} de {activeTrack.lessons.length} • {activeLesson.duration}
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">{activeLesson.title}</h1>
          <p className="text-sm font-bold text-gray-500 leading-relaxed mb-8">{activeLesson.description}</p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => mutate(activeTrack.id, activeLesson.id, { completed: !row?.completed })}
              className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${row?.completed ? 'bg-brand text-white' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              {row?.completed ? '✓ Concluída' : 'Marcar como concluída'}
            </button>
            <button
              onClick={() => mutate(activeTrack.id, activeLesson.id, { liked: !row?.liked })}
              className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${row?.liked ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {row?.liked ? '♥' : '♡'} {likes} curtidas
            </button>
            {next && (
              <button
                onClick={() => setActiveLesson(next)}
                className="ml-auto px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
              >
                Próxima aula →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ CUSTOM LAYOUT: MARKETING CIENTÍFICO ============
  if (activeTrack && activeTrack.id === 'marketing-cientifico') {
    return (
      <MarketingScienceTrack
        userId={userId}
        userName={userName}
        onBack={() => { setActiveTrack(null); loadRows(); }}
      />
    );
  }

  // ============ TRACK DETAIL (Netflix-style) ============
  if (activeTrack) {
    const p = trackStats(activeTrack);
    const banner = trackThumb(activeTrack);
    const area = AREAS.find(a => a.id === activeTrack.area);
    const firstUndone = activeTrack.lessons.find(l => !myRow(activeTrack.id, l.id)?.completed) || activeTrack.lessons[0];

    return (
      <div className="-mt-8 -mx-8 md:-mt-16 md:-mx-16 pb-20">
        {/* HERO BANNER */}
        <div className="relative h-[420px] w-full overflow-hidden">
          {banner ? (
            <img src={banner} alt={activeTrack.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className={`absolute inset-0 ${area?.color}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent" />

          <div className="relative h-full max-w-[1400px] mx-auto px-8 md:px-16 flex flex-col justify-end pb-12">
            <button
              onClick={() => setActiveTrack(null)}
              className="self-start mb-6 text-[10px] font-black text-gray-700 uppercase tracking-widest hover:text-brand bg-white/80 backdrop-blur px-4 py-2 rounded-full"
            >
              ← Voltar
            </button>
            <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] mb-3">
              {area?.icon} {area?.label} • {activeTrack.lessons.length} aulas
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4 max-w-3xl leading-[0.95]">
              {activeTrack.title}
            </h1>
            <p className="text-base font-bold text-gray-700 leading-relaxed max-w-2xl mb-6">{activeTrack.subtitle}</p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setActiveLesson(firstUndone)}
                className="px-8 py-4 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 shadow-xl flex items-center gap-3"
              >
                ▶ {p.done > 0 ? 'Continuar' : 'Começar'}
              </button>
              <div className="flex items-center gap-3 max-w-xs">
                <div className="w-32 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all" style={{ width: `${p.pct}%` }} />
                </div>
                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{p.done}/{p.total} • {p.pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* LESSONS */}
        <div className="max-w-[1400px] mx-auto px-8 md:px-16 mt-12">
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-5">Episódios</div>
          <div className="space-y-3">
            {activeTrack.lessons.map((l, i) => {
              const row = myRow(activeTrack.id, l.id);
              const likes = lessonLikes(activeTrack.id, l.id);
              const thumb = lessonThumb(l);
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLesson(l)}
                  className={`w-full text-left bg-white rounded-[24px] border transition-all flex items-center gap-5 p-3 pr-6 group ${row?.completed ? 'border-brand/30' : 'border-gray-100 hover:border-gray-300 hover:shadow-md'}`}
                >
                  <div className="relative w-44 aspect-video rounded-[16px] overflow-hidden bg-gray-100 shrink-0">
                    {thumb ? (
                      <img src={thumb} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full ${area?.color} flex items-center justify-center text-3xl text-white`}>
                        {activeTrack.cover}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-black text-xs ml-0.5">▶</span>
                      </div>
                    </div>
                    {row?.completed && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-black">✓</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Episódio {i + 1} · {l.duration}</div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight mb-1 truncate">{l.title}</h3>
                    <p className="text-xs font-bold text-gray-500 leading-relaxed line-clamp-2">{l.description}</p>
                  </div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0 hidden md:block">
                    {row?.liked ? '♥' : '♡'} {likes}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============ PERFORMANCE (MASTER) ============
  if (view === 'performance' && currentRole === 'MASTER') {
    const totalLessons = TRACKS.reduce((s, t) => s + t.lessons.length, 0);
    const byUser = new Map<string, { name: string; done: number; liked: number }>();
    rows.forEach(r => {
      const cur = byUser.get(r.user_id) || { name: r.user_name, done: 0, liked: 0 };
      if (r.completed) cur.done += 1;
      if (r.liked) cur.liked += 1;
      cur.name = r.user_name || cur.name;
      byUser.set(r.user_id, cur);
    });
    const list = Array.from(byUser.entries()).sort((a, b) => b[1].done - a[1].done);

    return (
      <div className="max-w-[1200px] mx-auto pb-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Treinamento</div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Desempenho</h1>
          </div>
          <button
            onClick={() => setView('tracks')}
            className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
          >
            Ver trilhas
          </button>
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-[32px] p-16 text-center border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum colaborador iniciou trilhas ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(([uid, s]) => {
              const pct = Math.round((s.done / totalLessons) * 100);
              return (
                <div key={uid} className="bg-white rounded-[24px] p-6 border border-gray-100 flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-black shrink-0">
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight truncate">{s.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-sm">
                        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.done}/{totalLessons} aulas • {pct}%</span>
                    </div>
                  </div>
                  <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest shrink-0">♥ {s.liked}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============ TRACKS LIST (Netflix-style) ============
  const featured = visibleTracks
    .map(t => ({ t, p: trackStats(t) }))
    .sort((a, b) => b.p.pct - a.p.pct)[0]?.t || visibleTracks[0];

  const tracksByArea: { area: typeof AREAS[number]; items: Track[] }[] = AREAS
    .map(a => ({ area: a, items: visibleTracks.filter(t => t.area === a.id) }))
    .filter(g => g.items.length > 0);

  const renderCard = (t: Track) => {
    const p = trackStats(t);
    const area = AREAS.find(a => a.id === t.area);
    const thumb = trackThumb(t);
    return (
      <button
        key={t.id}
        onClick={() => setActiveTrack(t)}
        className="group shrink-0 w-72 text-left rounded-[20px] overflow-hidden bg-gray-100 relative transition-all hover:scale-[1.04] hover:z-10 hover:shadow-2xl"
      >
        <div className="relative aspect-video bg-gray-200">
          {thumb ? (
            <img src={thumb} alt={t.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${area?.color} flex items-center justify-center text-5xl text-white`}>
              {t.cover}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-3 left-3 text-[8px] font-black text-white uppercase tracking-[0.3em] bg-black/60 backdrop-blur px-2.5 py-1 rounded-full">
            {area?.icon} {area?.label}
          </div>
          {p.pct === 100 && (
            <div className="absolute top-3 right-3 text-[8px] font-black text-white uppercase tracking-widest bg-brand px-2.5 py-1 rounded-full">✓ Concluído</div>
          )}
          <div className="absolute bottom-0 inset-x-0 p-4">
            <h3 className="text-base font-black text-white tracking-tight leading-tight mb-1 line-clamp-2">{t.title}</h3>
            <div className="text-[9px] font-black text-white/70 uppercase tracking-widest">{t.lessons.length} episódios</div>
          </div>
        </div>
        {p.pct > 0 && (
          <div className="h-1 bg-gray-300">
            <div className="h-full bg-brand transition-all" style={{ width: `${p.pct}%` }} />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="-mt-8 -mx-8 md:-mt-16 md:-mx-16 pb-20">
      {/* HERO FEATURED */}
      {featured && (() => {
        const banner = trackThumb(featured);
        const area = AREAS.find(a => a.id === featured.area);
        const p = trackStats(featured);
        return (
          <div className="relative h-[480px] w-full overflow-hidden">
            {banner ? (
              <img src={banner} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={`absolute inset-0 ${area?.color}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/40 to-transparent" />

            <div className="relative h-full max-w-[1400px] mx-auto px-8 md:px-16 flex flex-col justify-center">
              <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-3">
                Fundamentos · Treinamento · Em destaque
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter mb-4 max-w-3xl leading-[0.92]">
                {featured.title}
              </h1>
              <p className="text-base font-bold text-gray-700 leading-relaxed max-w-xl mb-8">{featured.subtitle}</p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setActiveTrack(featured)}
                  className="px-8 py-4 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 shadow-2xl flex items-center gap-3"
                >
                  ▶ {p.done > 0 ? 'Continuar assistindo' : 'Assistir agora'}
                </button>
                <button
                  onClick={() => setActiveTrack(featured)}
                  className="px-8 py-4 rounded-full bg-white/90 backdrop-blur border border-gray-200 text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-white"
                >
                  Mais informações
                </button>
                {currentRole === 'MASTER' && (
                  <button
                    onClick={() => setView('performance')}
                    className="ml-auto px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/80 backdrop-blur border border-gray-200 text-gray-700 hover:bg-white"
                  >
                    Desempenho do time
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* AREA FILTERS */}
      <div className="max-w-[1400px] mx-auto px-8 md:px-16 mt-12 mb-8">
        <div className="flex flex-wrap gap-2">
          {currentRole === 'MASTER' && (
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedArea === 'all' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Todas
            </button>
          )}
          {AREAS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedArea(a.id)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedArea === a.id ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ROWS BY AREA */}
      {visibleTracks.length === 0 ? (
        <div className="max-w-[1400px] mx-auto px-8 md:px-16">
          <div className="bg-white rounded-[32px] p-16 text-center border border-gray-100">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sem trilhas nesta área ainda.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {tracksByArea.map(g => (
            <div key={g.area.id}>
              <div className="max-w-[1400px] mx-auto px-8 md:px-16 mb-4 flex items-baseline gap-3">
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter">
                  <span className="mr-2">{g.area.icon}</span>{g.area.label}
                </h2>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {g.items.length} {g.items.length === 1 ? 'trilha' : 'trilhas'}
                </span>
              </div>
              <div className="px-8 md:px-16 max-w-[1400px] mx-auto">
                <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 snap-x scroll-smooth"
                     style={{ scrollbarWidth: 'thin' }}>
                  {g.items.map(renderCard)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembersArea;
