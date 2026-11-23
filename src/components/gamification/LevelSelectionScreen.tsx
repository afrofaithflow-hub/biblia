import React, { useState } from 'react';
import { PhasePreviewModal } from './PhasePreviewModal';
import { CANONICAL_WORLDS } from '../../data/canonicalGameData';
import { requestGameMode, getUserProgressTracks } from '../../lib/gameSession';
import { getJourneyPhases } from '../../lib/gameJourney';
import type { CanonicalPhase } from '../../types/gameContracts';

interface LevelSelectionScreenProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

const NODE_ICONS: Record<string, string> = {
  lesson: 'menu_book',
  memory: 'psychology',
  guided_reading: 'auto_stories',
  blessing_chest: 'featured_seasonal_and_gifts',
  world_review: 'military_tech',
  checkpoint: 'flag',
};

/** Converte CanonicalPhase para o formato que PhasePreviewModal espera */
function phaseToModalData(phase: CanonicalPhase, phases: CanonicalPhase[]) {
  return {
    title: phase.title,
    testament: 'Antigo Testamento',
    level: phase.phaseNumber,
    xpReward: phase.estimatedMinutes * 10,
    difficulty: phase.phaseNumber <= 3 ? 'Fácil' : phase.phaseNumber <= 7 ? 'Média' : 'Avançada',
    duration: `${phase.estimatedMinutes} min`,
    heartsRequired: 1,
    summary: phase.description,
    tags: phase.topics,
    nextPhase:
      phases[phase.phaseNumber]
        ? `Fase ${phase.phaseNumber + 1}: ${phases[phase.phaseNumber].title}`
        : 'Próximo Mundo',
  };
}

export const LevelSelectionScreen: React.FC<LevelSelectionScreenProps> = ({
  onNavigate,
  showToast,
}) => {
  const [selectedPhase, setSelectedPhase] = useState<CanonicalPhase | null>(null);

  const world = CANONICAL_WORLDS[0]; // Mundo 1 — Criação e Éden
  const journeyPhases = getJourneyPhases(world.id);
  const tracks = getUserProgressTracks();

  // Contagem de estrelas conquistadas no Mundo 1
  const earnedStars = journeyPhases.reduce((acc, p) => acc + (p.stars ?? 0), 0);
  const totalStars = world.totalPhases * 3;

  // Progresso percentual: fases concluídas / total
  const completedCount = journeyPhases.filter((p) => p.isCompleted).length;
  const progressPct = Math.round((completedCount / world.totalPhases) * 100);

  const handleLevelClick = (phase: CanonicalPhase) => {
    if (!phase.isUnlocked) {
      showToast('Conclua os desafios anteriores para desbloquear.', 'lock');
      return;
    }
    setSelectedPhase(phase);
  };

  const handleStart = () => {
    if (!selectedPhase) return;
    requestGameMode(selectedPhase.mode, selectedPhase.id);
    onNavigate('screen-jogo-licao');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas font-display text-slate-900 dark:text-white transition-colors duration-300 pb-36">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 w-full px-4 py-3">
        <div className="max-w-md md:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('screen-mapa-mundos')}
            className="flex items-center justify-center size-9 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-300"
            title="Voltar ao Mapa"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 shadow-sm text-xs">
            <span className="material-symbols-outlined text-orange-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{tracks.streakDays} {tracks.streakDays === 1 ? 'Dia' : 'Dias'}</span>
          </div>

          <button
            onClick={() => onNavigate('screen-ranking')}
            className="flex items-center justify-center size-9 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-secondary"
            title="Ver Ranking"
          >
            <span className="material-symbols-outlined text-xl">leaderboard</span>
          </button>
        </div>
      </header>

      {/* World Hero Section */}
      <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto sm:px-4 sm:pt-4">
        <div className="relative w-full h-[220px] sm:h-[240px] bg-gradient-to-br from-sacred-deep via-teal-900 to-amber-900/70 overflow-hidden flex flex-col justify-end p-5 sm:rounded-3xl shadow-md">
          <div className="absolute right-6 top-6 opacity-15 pointer-events-none">
            <span className="material-symbols-outlined text-[120px] text-amber-200" style={{ fontVariationSettings: "'FILL' 1" }}>
              {world.icon}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-bg-canvas dark:from-dark-canvas via-bg-canvas/50 dark:via-dark-canvas/50 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-end justify-between mb-1.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sacred-brand dark:text-sacred-neon bg-sacred-brand/10 dark:bg-sacred-neon/15 px-2 py-0.5 rounded-full">
                  Mundo {world.id}
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1">
                  {world.title}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{world.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 text-gold-talent font-bold text-sm bg-gold-light/40 dark:bg-gold-talent/10 px-2.5 py-1 rounded-full border border-gold-talent/30">
                <span>{earnedStars}/{totalStars}</span>
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-sacred-brand to-sacred-neon h-full rounded-full transition-all duration-500 shadow-glow-teal"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {completedCount} de {world.totalPhases} fases concluídas • {progressPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Path List */}
      <div className="relative px-4 py-6 flex flex-col items-center gap-6 max-w-md mx-auto w-full">
        {/* Vertical dashed connecting line */}
        <div className="absolute left-1/2 top-4 bottom-12 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-white/15 -translate-x-1/2 pointer-events-none" />

        {journeyPhases.map((phase, index) => {
          const isLeft = index % 2 === 0;
          const isCurrent = phase.isUnlocked && !phase.isCompleted;
          const isFirst = journeyPhases.findIndex((p) => p.isUnlocked && !p.isCompleted) === index;
          const nodeIcon = NODE_ICONS[phase.nodeType] ?? 'help';

          if (phase.isUnlocked && !phase.isCompleted && isFirst) {
            /* ── DESAFIO ATUAL ── */
            return (
              <div key={phase.id} className="relative w-full flex justify-center z-10">
                <div className="relative w-[95%] bg-white dark:bg-surface-dark border-2 border-sacred-brand dark:border-sacred-neon p-4 rounded-2xl shadow-xl flex flex-col gap-3">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                    Desafio Atual
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-sacred-deep flex items-center justify-center border border-sacred-brand/40">
                      <span className="material-symbols-outlined text-white z-10 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {nodeIcon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-sacred-brand dark:text-sacred-neon uppercase tracking-wider">
                        Fase {phase.phaseNumber.toString().padStart(2, '0')}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                        {phase.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {phase.scriptureReference}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLevelClick(phase)}
                    className="w-full btn-duo-primary py-3 text-sm flex items-center justify-center gap-2 shadow-duo-primary dark:shadow-[0_4px_0_#0e302c]"
                  >
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      play_arrow
                    </span>
                    <span>INICIAR FASE</span>
                  </button>
                </div>
              </div>
            );
          }

          if (phase.isCompleted) {
            /* ── CONCLUÍDA ── */
            return (
              <div
                key={phase.id}
                className={`relative w-full flex ${isLeft ? 'justify-start pl-2' : 'justify-end pr-2'} z-10`}
              >
                <div
                  onClick={() => handleLevelClick(phase)}
                  className="relative w-[85%] bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer hover:border-sacred-brand transition-all active:scale-95"
                >
                  <div className="absolute -top-2.5 right-3 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] font-bold block">check</span>
                  </div>

                  <div className="size-12 shrink-0 rounded-xl bg-sacred-brand/10 dark:bg-sacred-neon/10 flex items-center justify-center border border-sacred-brand/20">
                    <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {nodeIcon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-bold text-gold-talent uppercase">
                        Fase {phase.phaseNumber.toString().padStart(2, '0')}
                      </span>
                      <div className="flex text-gold-radiant">
                        {[1, 2, 3].map((s) => (
                          <span
                            key={s}
                            className={`material-symbols-outlined text-[13px] ${
                              s <= (phase.stars ?? 0) ? 'text-gold-radiant' : 'text-slate-300 dark:text-slate-600'
                            }`}
                            style={{ fontVariationSettings: s <= (phase.stars ?? 0) ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{phase.title}</h3>
                    <p className="text-[11px] text-slate-400 truncate">{phase.scriptureReference}</p>
                  </div>
                </div>
              </div>
            );
          }

          /* ── BLOQUEADA ── */
          return (
            <div
              key={phase.id}
              className={`relative w-full flex ${isLeft ? 'justify-start pl-2' : 'justify-end pr-2'} z-10 opacity-50 grayscale`}
            >
              <div
                onClick={() => handleLevelClick(phase)}
                className="relative w-[85%] bg-white/70 dark:bg-surface-dark/50 border border-slate-200 dark:border-white/5 p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer"
              >
                <div className="size-12 shrink-0 rounded-xl overflow-hidden bg-slate-200 dark:bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400 text-xl">lock</span>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Fase {phase.phaseNumber.toString().padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate">{phase.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{phase.scriptureReference}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase Preview Modal */}
      <PhasePreviewModal
        isOpen={Boolean(selectedPhase)}
        onClose={() => setSelectedPhase(null)}
        onStart={handleStart}
        phaseData={selectedPhase ? phaseToModalData(selectedPhase, journeyPhases) : undefined}
      />
    </div>
  );
};
