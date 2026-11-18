import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { getUserProgressTracks, getReviewQueue } from '../../lib/gameSession';
import { CANONICAL_WORLDS, WORLD_1_PHASES } from '../../data/canonicalGameData';

interface GameDashboardProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({ onNavigate, showToast }) => {
  const { profile } = useSubscription();
  const tracks = getUserProgressTracks();
  const reviewQueue = getReviewQueue();

  // Mundo e fase actuais
  const currentWorld = CANONICAL_WORLDS[0]; // futuramente: derivar do progresso
  const currentPhase = WORLD_1_PHASES.find((p) => p.isUnlocked && !p.isCompleted) ?? WORLD_1_PHASES[0];
  const completedCount = WORLD_1_PHASES.filter((p) => p.isCompleted).length;
  const progressPct = Math.round((completedCount / currentWorld.totalPhases) * 100);

  // Revisões pendentes
  const pendingReviews = reviewQueue.filter((r) => r.nextReviewDate <= new Date().toISOString()).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas font-display text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-28">
      {/* Top App Bar */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('screen-perfil')}
            className="relative group cursor-pointer"
            title="Meu Perfil"
          >
            <div
              className="size-10 rounded-full bg-cover bg-center border-2 border-sacred-brand dark:border-sacred-neon"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAr--EFhANXtDV9oTFLCtoed6XR_AcJmqa9e-X2W3EQt8KJrF2-_rc0fkT_gEhZod62O86r9kzVtVhKLX1LnUq6qkXxqjQgxnLQLMF64SO2VIMCNsjtGkVipBEoyPDa0PQpQoW1YMXhxjm4COMk1EN_P0hX0EmhbHrgAbvaAfpq8DUInOiHK6ao8ltQ3McXv18Hzfp-H4Mw1g0zOUusgwpBmhDXRInwJX9xvldUO_uKc2aJFhFhdIH5nCRU3JVaQX-b80PpqSQO1rs')`,
              }}
            />
            <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-bg-canvas dark:border-dark-canvas rounded-full" />
          </button>

          {/* Nível de caminhada + XP */}
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-black text-sacred-brand dark:text-sacred-neon">
              Nível {tracks.walkLevel}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {tracks.lifetimeXp} XP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('screen-ranking')}
            className="flex items-center gap-1 bg-white dark:bg-surface-dark rounded-full px-2.5 py-1 text-xs font-bold border border-slate-200 dark:border-white/10 shadow-sm text-gold-talent hover:border-gold-talent transition-all"
            title="Leaderboard / Classificação"
          >
            <span className="material-symbols-outlined text-[16px]">leaderboard</span>
            <span>Ranking</span>
          </button>

          <button
            onClick={() => onNavigate('screen-estatisticas')}
            className="flex items-center gap-1 bg-white dark:bg-surface-dark rounded-full px-2.5 py-1 text-xs font-bold border border-slate-200 dark:border-white/10 shadow-sm text-sacred-brand dark:text-sacred-neon hover:border-sacred-brand transition-all"
            title="Estatísticas do Jogador"
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            <span>Stats</span>
          </button>

          {/* Talentos Semanais (real) */}
          <div className="flex items-center bg-white dark:bg-surface-dark rounded-full px-3 py-1 shadow-sm border border-slate-200 dark:border-white/10">
            <span
              className="material-symbols-outlined text-gold-radiant mr-1 text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              diamond
            </span>
            <span className="text-gold-radiant font-black text-xs tracking-wide">{tracks.weeklyTalents}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area — hierarquia §4.1 */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-5 pt-2 pb-8 space-y-5 max-w-md mx-auto w-full">

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
            Jogo BiblIA
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
            Conhecer a Palavra nunca foi assim.
          </p>
        </div>

        {/* §4.1 — 1. CTA "Continuar Jornada" */}
        <div>
          <button
            onClick={() => onNavigate('screen-mapa-mundos')}
            className="w-full btn-duo-primary py-4 text-base font-bold shadow-duo-primary dark:shadow-[0_4px_0_#0e302c] flex items-center justify-center gap-2 group"
          >
            <span
              className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
            <span>CONTINUAR JORNADA</span>
          </button>
        </div>

        {/* §4.1 — 2. Próximo pequeno passo */}
        {pendingReviews > 0 ? (
          <div
            onClick={() => onNavigate('screen-estatisticas')}
            className="flex items-center gap-3.5 bg-white dark:bg-surface-dark p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm relative overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
            <div className="bg-indigo-500/10 rounded-full p-2.5 shrink-0 text-indigo-600 dark:text-indigo-400">
              <span className="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Revisar {pendingReviews} {pendingReviews === 1 ? 'erro' : 'erros'} pendentes
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revisão espaçada activa — reforce o que aprendeu.
              </p>
            </div>
            <span className="material-symbols-outlined text-indigo-500 text-lg">arrow_forward</span>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('screen-desafio-diario')}
            className="flex items-center gap-3.5 bg-white dark:bg-surface-dark p-4 rounded-xl border border-orange-200 dark:border-orange-800/50 shadow-sm relative overflow-hidden cursor-pointer hover:border-orange-400 transition-colors"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
            <div className="bg-orange-500/10 rounded-full p-2.5 shrink-0 text-orange-600 dark:text-orange-400">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Desafio Diário</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mantenha a chama acesa — {tracks.streakDays} {tracks.streakDays === 1 ? 'dia' : 'dias'} consecutivos.
              </p>
            </div>
            <span className="material-symbols-outlined text-orange-500 text-lg">arrow_forward</span>
          </div>
        )}

        {/* §4.1 — 3. Progresso com significado */}
        <div>
          <div
            onClick={() => onNavigate('screen-mapa-mundos')}
            className="relative w-full aspect-[16/7] rounded-2xl overflow-hidden shadow-lg shadow-sacred-brand/10 group cursor-pointer transition-transform hover:scale-[1.01] duration-300"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCpIGpIH8cE3hncvCzqMEsOSltzFsWmD7IHQaOyhiSyqwLZxQNY-IfkP7fAijVS0CnpLn12fBXrXQVcfCXekN5l9K4Ooap_gwyc6W42PKfikTgz1AeyUdJfCacF815L3ek_SRWLNjsza-B_5tQxJlvgMI0uY_3OxBV4pSOg2b7obq7BsFHLlzFD9LOkcAmjO2oxhTsSUcCjiciMnJ0J0Yy5c7GrnC5kPDs7DzIONwkPXUQrGKGjUKyALTqrbo5OQy4fnrHX7XzQCSg')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sacred-deep/95 via-sacred-deep/40 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-orange-600/90 backdrop-blur-sm px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  Mundo Actual
                </span>
              </div>
              <h2 className="text-lg font-bold leading-tight mb-2">{currentWorld.title}</h2>

              <div className="flex flex-col gap-1 bg-black/25 backdrop-blur-md rounded-xl p-2.5 border border-white/10">
                <div className="flex justify-between items-end text-xs font-medium text-white/90">
                  <span>Fase {currentPhase.phaseNumber}/{currentWorld.totalPhases}</span>
                  <span className="text-gold-radiant font-bold">{tracks.masteryStars} ★ domínio</span>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-radiant rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/70 mt-0.5">
                  Próxima fase: {currentPhase.title} — {currentPhase.scriptureReference}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* §4.1 — 4. Modos Livres */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Modos de Desafio Bíblico
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => onNavigate('screen-jogo-quiz')}
              className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 shadow-sm hover:border-sacred-brand cursor-pointer flex flex-col gap-2 transition-all active:scale-95"
            >
              <div className="size-9 rounded-xl bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">quiz</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Quiz Cronometrado</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">4 alternativas rápidas</p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('screen-jogo-tf')}
              className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 shadow-sm hover:border-sacred-brand cursor-pointer flex flex-col gap-2 transition-all active:scale-95"
            >
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">thumbs_up_down</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Verdadeiro ou Falso</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Discernimento rápido</p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('screen-jogo-fill')}
              className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 shadow-sm hover:border-sacred-brand cursor-pointer flex flex-col gap-2 transition-all active:scale-95"
            >
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">extension</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Completar Versículo</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Memorização bíblica</p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('screen-desafio-diario')}
              className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 shadow-sm hover:border-sacred-brand cursor-pointer flex flex-col gap-2 transition-all active:scale-95"
            >
              <div className="size-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Desafio Diário</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Mantenha a chama acesa</p>
              </div>
            </div>
          </div>
        </div>

        {/* §4.1 — 5. Comunidade (opcional, não forçado) */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Comunidade
          </h3>
          <div className="flex gap-2.5">
            <button
              onClick={() => onNavigate('screen-ranking')}
              className="flex-1 flex items-center gap-2 bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-gold-talent transition-all"
            >
              <span className="material-symbols-outlined text-gold-talent text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                leaderboard
              </span>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Liga Semanal</p>
                <p className="text-[10px] text-slate-400 truncate">{tracks.weeklyTalents} talentos esta semana</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('screen-ranking')}
              className="flex-1 flex items-center gap-2 bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-sacred-brand transition-all"
            >
              <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                group_add
              </span>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Convidar Amigo</p>
                <p className="text-[10px] text-slate-400 truncate">QR, link ou código</p>
              </div>
            </button>
          </div>
        </div>

        {/* Caminho actual */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Seu Caminho
          </h3>
          <div className="relative flex flex-col gap-4 pl-3">
            <div className="absolute left-[23px] top-4 bottom-8 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-700 -z-10" />

            {WORLD_1_PHASES.slice(0, 5).map((phase) => {
              const isActive = phase.isUnlocked && !phase.isCompleted;
              const isDone = phase.isCompleted;
              const isLocked = !phase.isUnlocked;

              return (
                <div
                  key={phase.id}
                  className={`flex items-center gap-3.5 ${isLocked ? 'opacity-40' : ''}`}
                >
                  <div
                    className={`size-6 rounded-full flex items-center justify-center ring-4 z-10 shrink-0 ${
                      isDone
                        ? 'bg-sacred-brand text-white ring-bg-canvas dark:ring-dark-canvas'
                        : isActive
                        ? 'bg-sacred-neon text-slate-950 ring-bg-canvas dark:ring-dark-canvas shadow-glow-teal animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 ring-bg-canvas dark:ring-dark-canvas'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">
                      {isDone ? 'check' : isActive ? 'play_arrow' : 'lock'}
                    </span>
                  </div>

                  <div
                    onClick={() => isActive ? onNavigate('screen-selecao-nivel') : undefined}
                    className={`bg-white dark:bg-surface-dark rounded-xl p-3 w-full border flex items-center justify-between ${
                      isActive
                        ? 'border-2 border-sacred-brand dark:border-sacred-neon shadow-md cursor-pointer hover:scale-[1.01] transition-all'
                        : isDone
                        ? 'border-slate-200 dark:border-white/10 shadow-sm opacity-75'
                        : 'border-slate-200 dark:border-white/5 bg-white/50 dark:bg-surface-dark/40'
                    }`}
                  >
                    <div>
                      <h4 className={`text-xs font-bold ${isActive ? 'text-sacred-brand dark:text-sacred-neon' : 'text-slate-900 dark:text-white'}`}>
                        Fase {phase.phaseNumber}: {phase.title}
                      </h4>
                      <p className="text-[10px] text-slate-400">{phase.scriptureReference} • {isDone ? '100% Concluído' : isActive ? 'Em andamento' : 'Bloqueado'}</p>
                    </div>
                    {isDone && <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>}
                    {isActive && <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg">arrow_forward</span>}
                    {isLocked && <span className="material-symbols-outlined text-slate-400 text-lg">lock</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
