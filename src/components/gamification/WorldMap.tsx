import React from 'react';
import { CANONICAL_WORLDS } from '../../data/canonicalGameData';
import { getUserProgressTracks } from '../../lib/gameSession';

interface WorldMapProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({ onNavigate, showToast }) => {
  const tracks = getUserProgressTracks();

  const handleWorldClick = (worldId: number, isUnlocked: boolean) => {
    if (!isUnlocked) {
      const prevWorld = CANONICAL_WORLDS.find((w) => w.id === worldId - 1);
      showToast(
        prevWorld
          ? `Complete o Mundo ${prevWorld.id}: ${prevWorld.title} para desbloquear.`
          : 'Complete os mundos anteriores para avançar.',
        'lock'
      );
      return;
    }
    onNavigate('screen-selecao-nivel');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas font-display text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-36">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 transition-colors">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => onNavigate('screen-game-dashboard')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-300"
            title="Voltar"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Sua Jornada
          </h1>
          <button
            onClick={() => showToast('Complete os mundos para avançar na fé.', 'help')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sacred-brand dark:text-sacred-neon"
            title="Ajuda"
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
        </div>

        {/* 3 trilhas reais */}
        <div className="flex items-center justify-between px-6 pb-3 pt-1">
          <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-white/10 text-xs">
            <span className="material-symbols-outlined text-orange-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{tracks.streakDays}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-white/10 text-xs">
            <span className="material-symbols-outlined text-gold-talent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              stars
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{tracks.masteryStars}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-white/10 text-xs">
            <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{tracks.lifetimeXp} XP</span>
          </div>
        </div>
      </header>

      {/* Main Path Container */}
      <main className="flex-1 relative flex flex-col items-center pt-6 pb-12 px-4 w-full max-w-md mx-auto">
        {/* Central Connecting Vertical Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-800 -translate-x-1/2 z-0" />

        {CANONICAL_WORLDS.map((world, idx) => {
          const isActive = world.isUnlocked && idx === 0; // Mundo 1 é o ativo
          const isCompleted = false; // futuramente: verificar progresso
          const isLocked = !world.isUnlocked;

          if (isLocked) {
            /* ── MUNDO BLOQUEADO ── */
            return (
              <div key={world.id} className="relative w-full z-10 mb-10 opacity-75">
                <div
                  onClick={() => handleWorldClick(world.id, false)}
                  className="relative bg-white/50 dark:bg-surface-dark/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-4">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-md mb-1.5 ring-2 ring-gold-talent/30">
                      <span className="material-symbols-outlined text-gold-talent text-2xl">lock</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-xs bg-white/90 dark:bg-black/70 px-3 py-1 rounded-full shadow-sm">
                      Mundo {world.id} • {world.title}
                    </p>
                  </div>

                  <div className="flex flex-row gap-3.5 items-center filter grayscale opacity-50">
                    <div
                      className="size-16 shrink-0 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${world.themeColor}20` }}
                    >
                      <span
                        className="material-symbols-outlined text-3xl"
                        style={{ color: world.themeColor, fontVariationSettings: "'FILL' 1" }}
                      >
                        {world.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {world.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">{world.title}</h3>
                      <p className="text-slate-500 text-xs">{world.subtitle}</p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2" />
                    </div>
                  </div>
                </div>
                {idx < CANONICAL_WORLDS.length - 1 && (
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 size-3 rounded-full bg-slate-200 dark:bg-slate-800 z-20" />
                )}
              </div>
            );
          }

          /* ── MUNDO ATUAL (desbloqueado) ── */
          return (
            <div key={world.id} className="relative w-full z-10 mb-10">
              <div className="absolute -inset-1 bg-gradient-to-r from-sacred-brand to-sacred-neon rounded-3xl blur opacity-30 animate-pulse" />
              <div className="relative bg-white dark:bg-surface-dark rounded-2xl shadow-xl border-l-4 border-sacred-brand overflow-hidden">
                <div className="h-28 w-full relative flex items-center justify-center" style={{ backgroundColor: `${world.themeColor}20` }}>
                  <span
                    className="material-symbols-outlined text-6xl opacity-40"
                    style={{ color: world.themeColor, fontVariationSettings: "'FILL' 1" }}
                  >
                    {world.icon}
                  </span>
                  <div className="absolute top-2.5 left-2.5 z-20 bg-white/90 dark:bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                    <span className="text-[10px] font-black text-sacred-brand dark:text-sacred-neon uppercase tracking-wider">
                      Mundo Atual
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 z-20 bg-white/90 dark:bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {world.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                        {world.title}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{world.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black text-sacred-brand dark:text-sacred-neon">
                        {tracks.lifetimeXp > 0 ? `${Math.min(Math.round((tracks.lifetimeXp / 500) * 100), 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mb-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sacred-brand to-sacred-neon h-full rounded-full"
                      style={{ width: `${Math.min(Math.round((tracks.lifetimeXp / 500) * 100), 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {world.totalPhases} Fases • {world.achievementBadge}
                    </span>
                    <button
                      onClick={() => handleWorldClick(world.id, true)}
                      className="btn-duo-primary py-2 px-4 text-xs font-bold shadow-duo-primary dark:shadow-[0_4px_0_#0e302c] flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_circle</span>
                      <span>Continuar</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 size-4 rounded-full bg-slate-300 dark:bg-slate-700 border-4 border-bg-canvas dark:border-dark-canvas z-20" />
            </div>
          );
        })}
      </main>

      {/* Floating Ask BiblIA Pill */}
      <button
        onClick={() => onNavigate('screen-ai')}
        className="fixed bottom-24 right-4 z-40 bg-white dark:bg-surface-dark text-slate-800 dark:text-white py-2 px-3.5 rounded-full shadow-xl border border-sacred-brand/30 flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <div className="size-6 rounded-full bg-sacred-brand/10 dark:bg-sacred-neon/15 flex items-center justify-center text-sacred-brand dark:text-sacred-neon">
          <span className="material-symbols-outlined text-[16px]">smart_toy</span>
        </div>
        <span className="text-xs font-bold pr-0.5">Pergunte à IA</span>
      </button>
    </div>
  );
};
