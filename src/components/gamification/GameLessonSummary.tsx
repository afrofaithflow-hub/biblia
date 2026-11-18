import React, { useEffect, useMemo } from 'react';
import { getLatestGameResult, getReviewQueue, getUserProgressTracks } from '../../lib/gameSession';
import { Confetti } from '../shared/Confetti';
import { gameSfx } from '../../lib/gameSoundEffects';

interface GameLessonSummaryProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

const STAR_COLORS = ['text-slate-300', 'text-amber-400', 'text-amber-400'];

export const GameLessonSummary: React.FC<GameLessonSummaryProps> = ({ onNavigate }) => {
  const result = getLatestGameResult();
  const tracks = getUserProgressTracks();
  const reviewQueue = getReviewQueue();
  const reviewDueCount = useMemo(() => {
    const now = new Date();
    return reviewQueue.filter((item) => new Date(item.nextReviewDate) <= now).length;
  }, [reviewQueue]);

  const accuracy = result ? Math.round((result.correct / result.total) * 100) : 0;
  const stars = result?.starsEarned ?? 0;
  const isCompleted = result?.completed ?? false;

  useEffect(() => {
    if (stars > 0) {
      const timer = setTimeout(() => {
        gameSfx.play('star');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [stars]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas text-slate-800 dark:text-slate-100 font-display transition-colors duration-200 relative">
      {isCompleted && <Confetti active={true} count={40} />}
      {/* ── Header ── */}
      <header className="flex items-center justify-between p-5 pb-2 shrink-0">
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="size-9 rounded-full bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Fechar"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-black">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_fire_department
          </span>
          <span>{tracks.streakDays} Dias</span>
        </div>
      </header>

      {/* ── Celebration Hero ── */}
      <div className="flex flex-col items-center pt-4 pb-6 px-5">
        {isCompleted ? (
          <div className="size-20 rounded-full bg-sacred-brand/10 border-4 border-sacred-brand flex items-center justify-center shadow-glow-teal mb-3">
            <span className="material-symbols-outlined text-4xl text-sacred-brand font-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
        ) : (
          <div className="size-20 rounded-full bg-rose-500/10 border-4 border-rose-500 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-4xl text-rose-500 font-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite_border
            </span>
          </div>
        )}

        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">
          {isCompleted ? 'Glória a Deus!' : 'Boa tentativa!'}
        </h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5 text-center">
          {isCompleted ? result?.modeLabel + ' — Concluído' : 'As vidas se esgotaram — Tente novamente'}
        </p>

        {/* ── Estrelas de Domínio (Trilha 2) ── */}
        <div className="flex gap-2 mt-4" aria-label={`${stars} de 3 estrelas de domínio`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`material-symbols-outlined text-4xl transition-all duration-300 ${i < stars ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200 dark:text-slate-700'}`}
              style={{ fontVariationSettings: i < stars ? "'FILL' 1" : "'FILL' 0" }}
            >
              star
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {stars === 3 ? '3ª estrela desbloqueada em revisão após 3 dias!' : stars === 2 ? 'Precisão ≥ 80% — 2 estrelas!' : stars === 1 ? '1ª estrela — Concluído!' : 'Continue para ganhar estrelas de domínio.'}
        </p>
      </div>

      {/* ── As 3 Trilhas de Recompensa (G0) ── */}
      <div className="px-5 pb-4 max-w-sm mx-auto w-full space-y-3">
        {/* Trilha 1: XP de Caminhada */}
        <div className="p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-xl flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-sacred-brand/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-sacred-brand" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">XP de Caminhada (Permanente)</p>
            <p className="text-2xl font-black text-sacred-brand leading-tight">+{result?.xpEarned ?? 0} XP</p>
            <p className="text-xs text-slate-400 mt-0.5">Total acumulado: <span className="font-bold text-slate-600 dark:text-slate-300">{tracks.lifetimeXp.toLocaleString('pt')} XP</span></p>
          </div>
        </div>

        {/* Trilha 3: Talentos da Semana */}
        {(result?.talentsEarned ?? 0) > 0 && (
          <div className="p-3.5 rounded-2xl bg-gold-radiant/10 border border-gold-radiant/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-gold-radiant shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
              monetization_on
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Talentos da Semana (Liga)</p>
              <p className="text-lg font-black text-gold-radiant">+{result?.talentsEarned} Talentos</p>
            </div>
          </div>
        )}

        {/* Precisão */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-200">Precisão da sessão</span>
            <span className="text-sacred-brand font-black">{accuracy}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-sacred-brand h-full rounded-full transition-all duration-700"
              style={{ width: `${accuracy}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {result?.correct ?? 0}/{result?.total ?? 0} respostas certas · {result?.livesRemaining ?? 0} vidas restantes
          </p>
        </div>

        {/* Revisão Espaçada (se houver erros) */}
        {(result?.reviewItemsAddedCount ?? 0) > 0 && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-indigo-500 shrink-0 mt-0.5">history_edu</span>
            <div>
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {result?.reviewItemsAddedCount} passagem{(result?.reviewItemsAddedCount ?? 0) > 1 ? 'ns' : ''} adicionada{(result?.reviewItemsAddedCount ?? 0) > 1 ? 's' : ''} à fila de revisão
              </p>
              <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                Revise em 1 dia para avançar no domínio do tema. {reviewDueCount > 0 ? `(${reviewDueCount} revisões pendentes agora)` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Ações ── */}
      <div className="px-5 pb-10 max-w-sm mx-auto w-full space-y-2.5 shrink-0">
        {/* Continuar Jornada */}
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="btn-duo-primary w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2"
        >
          <span>Continuar Jornada</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {/* Revisar Passagens */}
          {reviewDueCount > 0 && (
            <button
              onClick={() => onNavigate('screen-estatisticas')}
              className="py-3 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[15px]">history_edu</span>
              <span>Revisar Agora</span>
            </button>
          )}
          {/* Ver Ranking */}
          <button
            onClick={() => onNavigate('screen-ranking')}
            className="py-3 px-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-sacred-brand transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">leaderboard</span>
            <span>Ver Ranking</span>
          </button>
        </div>
      </div>
    </div>
  );
};
