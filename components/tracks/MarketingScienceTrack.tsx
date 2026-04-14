import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SupabaseService } from '../../services/api';

interface Phase {
  id: string;
  num: number;
  mission: 1 | 2;
  tag: string;
  title: string;
  description?: string;
  xp: number;
  videos?: string[];
  playlistId?: string;
  ctaLabel: string;
}

const PHASES: Phase[] = [
  {
    id: 'mc-f1',
    num: 1, mission: 1,
    tag: 'Fase 1: O Mindset e o Método',
    title: 'Reprogramando o Sistema',
    description: 'Imersão na cultura científica. Instale o mindset antes de qualquer tática.',
    xp: 500,
    playlistId: 'PL8kAZHXN1qcLxyMNCpmLYxvSxtVFPX3nw',
    ctaLabel: '✓ Concluir Missão (+500 XP)',
  },
  {
    id: 'mc-f2',
    num: 2, mission: 1,
    tag: 'Fase 2: Fundamentos',
    title: 'Estratégia Aplicada',
    description: 'Os pilares estratégicos que sustentam toda operação de performance.',
    xp: 500,
    videos: ['rqbwrtLt66U', 'DGsvXcykxcE'],
    ctaLabel: '✓ Concluir Missão (+500 XP)',
  },
  {
    id: 'mc-f3',
    num: 3, mission: 1,
    tag: 'Fase 3: Execução',
    title: 'Táticas de Combate',
    description: 'O que separa quem planeja de quem entrega: execução com método.',
    xp: 500,
    videos: ['N-Qk9BUbGrg', 'Gf5fdazhaRs'],
    ctaLabel: '✓ Finalizar Missão 01 (+500 XP)',
  },
  {
    id: 'mc-f4',
    num: 4, mission: 2,
    tag: 'Fase 4: Alinhamento Estrutural',
    title: 'Protocolos de Elite',
    description: 'Atenção aos detalhes. A forma como operamos internamente define a escala que podemos alcançar fora.',
    xp: 600,
    videos: ['twrqGjGeZek', 'IbJg6yV0Y4U'],
    ctaLabel: '✓ Homologar Fase 4 (+600 XP)',
  },
  {
    id: 'mc-f5',
    num: 5, mission: 2,
    tag: 'Fase 5: Operação e Escala',
    title: 'Sistematização Avançada',
    description: 'Não dependemos de esforço braçal, dependemos de sistemas lógicos. Absorva as matrizes de escala.',
    xp: 600,
    videos: ['GsXzNG6d3F4', 'AXV1kChxLxc'],
    ctaLabel: '✓ Homologar Fase 5 (+600 XP)',
  },
  {
    id: 'mc-f6',
    num: 6, mission: 2,
    tag: 'Fase 6: Otimização Contínua',
    title: 'A Auditoria Final',
    description: 'O último passo do nosso modelo operacional. Como garantir a qualidade inegociável da operação.',
    xp: 1000,
    videos: ['NGDDbxJjK90'],
    ctaLabel: '✓ Concluir Treinamento de Elite (+1000 XP)',
  },
];

const TOTAL_XP = PHASES.reduce((s, p) => s + p.xp, 0);
const TRACK_ID = 'marketing-cientifico';

interface Props {
  userId: string;
  userName: string;
  onBack: () => void;
}

const ytSrc = (id: string, playlist?: string) => {
  const params = 'rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&controls=1&fs=1';
  return playlist
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlist}&${params}`
    : `https://www.youtube-nocookie.com/embed/${id}?${params}`;
};

const MarketingScienceTrack: React.FC<Props> = ({ userId, userName, onBack }) => {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showFinal, setShowFinal] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const tag = useMemo(() => 'PHANT-' + (userId.replace(/-/g, '').slice(0, 5).toUpperCase() || '00000'), [userId]);

  const loadProgress = useCallback(async () => {
    const rows: any[] = await SupabaseService.fetchTrainingProgress(userId);
    const done = new Set<string>(
      rows.filter(r => r.track_id === TRACK_ID && r.completed).map(r => r.lesson_id)
    );
    setCompleted(done);
  }, [userId]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const xp = useMemo(
    () => PHASES.filter(p => completed.has(p.id)).reduce((s, p) => s + p.xp, 0),
    [completed]
  );

  const isUnlocked = (p: Phase) => {
    if (p.num === 1) return true;
    const prev = PHASES[p.num - 2];
    return completed.has(prev.id);
  };

  const completePhase = async (p: Phase) => {
    if (pending || completed.has(p.id)) return;
    setPending(p.id);
    const nextSet = new Set(completed); nextSet.add(p.id);
    setCompleted(nextSet);
    await SupabaseService.upsertTrainingProgress({
      user_id: userId,
      user_name: userName,
      track_id: TRACK_ID,
      lesson_id: p.id,
      completed: true,
    });
    setPending(null);

    if (p.num === PHASES.length) {
      setShowFinal(true);
    } else {
      setTimeout(() => {
        document.getElementById(`mc-fase-${p.num + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const mission2Start = PHASES.find(p => p.mission === 2);

  return (
    <div className="-mt-8 -mx-8 md:-mt-16 md:-mx-16 min-h-screen bg-black text-white relative overflow-hidden font-mono">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;700&display=swap');
        .mc-bg { background-color: #000; background-image: linear-gradient(rgba(97,19,204,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(97,19,204,0.12) 1px, transparent 1px); background-size: 50px 50px; }
        .mc-h { font-family: 'Orbitron', sans-serif; }
        .mc-b { font-family: 'Rajdhani', sans-serif; }
        .mc-glow-purple { filter: drop-shadow(0 0 12px #6113cc); }
        .mc-glow-green  { filter: drop-shadow(0 0 12px #00ff88); }
        .mc-glow-red    { filter: drop-shadow(0 0 12px #ff3333); }
        .mc-scroll::-webkit-scrollbar { width: 8px; }
        .mc-scroll::-webkit-scrollbar-thumb { background: #6113cc; border-radius: 4px; }
      `}</style>

      <div className="mc-bg mc-b min-h-screen pb-32">
        {/* HUD */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b-2 border-[#6113cc] shadow-[0_0_30px_rgba(97,19,204,0.5)]">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={onBack}
              className="mc-h text-[10px] tracking-[0.3em] text-white/60 hover:text-white uppercase"
            >
              ← Sair da operação
            </button>
            <div className="flex items-center gap-6 mc-h text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              <div>RECRUTA: <span className="text-white">{userName}</span></div>
              <div>TAG: <span className="text-white">{tag}</span></div>
              <div>XP: <span className="text-white">{xp}</span> / {TOTAL_XP}</div>
            </div>
          </div>
        </div>

        {/* HERO MISSÃO 01 */}
        <section className="pt-24 pb-16 text-center px-6">
          <div className="mc-h text-xs text-[#6113cc] tracking-[0.4em] mb-4">[ MISSÃO 01: ATIVA ]</div>
          <h1 className="mc-h text-5xl md:text-7xl font-extrabold uppercase mc-glow-purple bg-gradient-to-b from-white to-[#6113cc] bg-clip-text text-transparent leading-tight mb-6">
            Operação:<br/>Cientista do Marketing
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Nivele seu conhecimento sobre Cultura Científica e Performance.
          </p>
        </section>

        {/* MAPA 1 — FASES 1 a 3 */}
        <section className="max-w-[1200px] mx-auto px-6 space-y-12">
          {PHASES.filter(p => p.mission === 1).map(p => (
            <PhaseCard
              key={p.id}
              phase={p}
              completed={completed.has(p.id)}
              unlocked={isUnlocked(p)}
              pending={pending === p.id}
              onComplete={() => completePhase(p)}
            />
          ))}
        </section>

        {/* DIVISOR — MISSÃO 02 */}
        <div className="max-w-[1200px] mx-auto px-6 mt-24 mb-16">
          <div className="relative border-y-2 border-dashed border-[#ff3333] py-12 text-center bg-[rgba(255,51,51,0.05)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black px-4 mc-h text-xs tracking-[0.2em] text-[#ff3333]">
              [ SECURITY CLEARANCE: LEVEL 2 ]
            </div>
            <h2 className="mc-h text-4xl uppercase tracking-[0.3em] text-[#ff3333] mb-4">
              Operação: Processos Internos
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              A mentalidade foi instalada. Agora entraremos em uma zona de aprofundamento tático focado nas engrenagens operacionais e homologação de processos da nossa estrutura.
            </p>
          </div>
        </div>

        {/* MAPA 2 — FASES 4 a 6 */}
        <section className="max-w-[1200px] mx-auto px-6 space-y-12">
          {PHASES.filter(p => p.mission === 2).map(p => (
            <PhaseCard
              key={p.id}
              phase={p}
              completed={completed.has(p.id)}
              unlocked={isUnlocked(p)}
              pending={pending === p.id}
              onComplete={() => completePhase(p)}
            />
          ))}
        </section>
      </div>

      {/* MODAL FINAL */}
      {showFinal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0a0a0a] border-2 border-[#00ff88] rounded-lg p-12 text-center shadow-[0_0_60px_rgba(0,255,136,0.5)]">
            <h2 className="mc-h text-2xl uppercase text-[#00ff88] mb-4">Treinamento de Elite Concluído!</h2>
            <p className="text-white/70 mb-8">
              Operação perfeita, <span className="text-white font-bold">{userName}</span>. Você absorveu a Cultura Científica e dominou os Processos Internos da empresa. Acesso corporativo total concedido.
            </p>
            <div className="flex justify-around bg-black border border-cyan-400 rounded-lg p-6 mb-8">
              <div>
                <div className="text-[10px] uppercase text-white/40 mc-h tracking-widest">XP Total</div>
                <div className="mc-h text-3xl text-cyan-300">{xp}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-white/40 mc-h tracking-widest">Rank</div>
                <div className="mc-h text-lg text-[#ff3333]">Executivo Tático</div>
              </div>
            </div>
            <button
              onClick={() => setShowFinal(false)}
              className="mc-h w-full py-4 border-2 border-[#00ff88] text-[#00ff88] uppercase tracking-widest text-sm hover:bg-[#00ff88] hover:text-black transition-all"
            >
              Homologar Resultados
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============== PHASE CARD ==============
const PhaseCard: React.FC<{
  phase: Phase;
  completed: boolean;
  unlocked: boolean;
  pending: boolean;
  onComplete: () => void;
}> = ({ phase, completed, unlocked, pending, onComplete }) => {
  const isM2 = phase.mission === 2;
  const accent = completed ? '#00ff88' : isM2 ? '#ff3333' : '#6113cc';
  const iconShape = isM2 ? 'rounded-lg' : 'rounded-full';

  return (
    <div
      id={`mc-fase-${phase.num}`}
      className={`relative bg-[#0a0a0a] border rounded-xl p-8 grid grid-cols-1 md:grid-cols-[100px_1fr] gap-8 transition-all ${
        unlocked ? '' : 'opacity-30 grayscale pointer-events-none'
      }`}
      style={{
        borderColor: completed ? 'rgba(0,255,136,0.5)' : isM2 ? 'rgba(255,51,51,0.3)' : 'rgba(97,19,204,0.3)',
        boxShadow: completed ? '0 0 30px rgba(0,255,136,0.15)' : 'none',
      }}
    >
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="mc-h text-sm bg-black/80 border border-red-500 px-6 py-4 text-white text-center">
            🔒 Fase Bloqueada<br/>
            <span className="text-[10px] text-white/60">Complete a fase anterior</span>
          </div>
        </div>
      )}

      <div className={`w-20 h-20 ${iconShape} bg-black border-4 flex items-center justify-center mc-h text-2xl shrink-0`}
           style={{ borderColor: accent, color: accent, boxShadow: `0 0 20px ${accent}` }}>
        {isM2 ? `A${phase.num}` : `P${phase.num}`}
      </div>

      <div>
        <span
          className="inline-block mc-h text-[10px] uppercase tracking-widest px-3 py-1 border rounded mb-3"
          style={{ borderColor: accent, color: accent, background: `${accent}15` }}
        >
          {phase.tag}
        </span>
        <h3 className="mc-h text-2xl uppercase mb-3">{phase.title}</h3>
        {phase.description && (
          <p className="text-white/50 text-base mb-6 max-w-2xl">{phase.description}</p>
        )}

        {/* VIDEOS / PLAYLIST */}
        {phase.playlistId ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden border-2 border-[#222] bg-black mb-6">
            <iframe
              src={ytSrc('', phase.playlistId)}
              title={phase.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : phase.videos && phase.videos.length > 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {phase.videos.map(v => (
              <div key={v} className="aspect-video rounded-lg overflow-hidden border-2 border-[#222] bg-black">
                <iframe
                  src={ytSrc(v)}
                  title={v}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ))}
          </div>
        ) : phase.videos && phase.videos[0] ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden border-2 border-[#222] bg-black mb-6">
            <iframe
              src={ytSrc(phase.videos[0])}
              title={phase.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : null}

        <button
          onClick={onComplete}
          disabled={completed || pending}
          className="mc-h px-6 py-4 border-2 uppercase text-sm tracking-widest transition-all"
          style={{
            borderColor: accent,
            color: completed ? '#00ff88' : accent,
            background: completed ? 'rgba(0,255,136,0.1)' : 'rgba(0,0,0,0.5)',
          }}
        >
          {pending ? '[ PROCESSANDO... ]' : completed ? '✓ HOMOLOGADO' : phase.ctaLabel}
        </button>
      </div>
    </div>
  );
};

export default MarketingScienceTrack;
