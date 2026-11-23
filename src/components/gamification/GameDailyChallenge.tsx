import React, { useMemo, useState } from 'react';
import {
  getDailyProgress,
  getDailyQuestionsForDate,
  getMaputoDateKey,
  requestGameMode,
} from '../../lib/gameSession';

interface GameDailyChallengeProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const GameDailyChallenge: React.FC<GameDailyChallengeProps> = ({ onNavigate, showToast }) => {
  const [progress] = useState(getDailyProgress);
  const today = getMaputoDateKey();
  const dailyQuestions = useMemo(() => getDailyQuestionsForDate(today), [today]);

  const todayReferences = useMemo(
    () => Array.from(new Set(dailyQuestions.map((q) => q.reference).filter(Boolean))),
    [dailyQuestions]
  );
  const todayTopics = useMemo(
    () => Array.from(new Set(dailyQuestions.map((q) => q.topic).filter(Boolean))),
    [dailyQuestions]
  );
  const maxDailyXp = dailyQuestions.length * 10 + 15;
  const featuredQuestion = dailyQuestions[0];

  const todayDate = new Date(`${today}T12:00:00Z`);
  const daysOfWeek = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayDate);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    return {
      label: new Intl.DateTimeFormat('pt', { timeZone: 'Africa/Maputo', weekday: 'short' })
        .format(date)
        .replace('.', '')
        .toUpperCase(),
      active: progress.completedDates.has(dateKey),
      today: dateKey === today,
    };
  });

  const startChallenge = () => {
    if (progress.completedToday) {
      showToast('O desafio de hoje já está concluído. Pode repetir para praticar.', 'check_circle');
    }
    requestGameMode('daily');
    onNavigate('screen-jogo-licao');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display transition-colors duration-200 p-5 pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3">
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="size-9 rounded-full bg-white dark:bg-surface-dark shadow-soft flex items-center justify-center text-slate-600 dark:text-slate-300"
          title="Voltar"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>

        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Desafio Diário
        </h2>

        <div className="size-9" />
      </header>

      {/* Main Content */}
      <div className="space-y-5 max-w-sm mx-auto w-full">
        {/* Streak Flame Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-xl text-center space-y-3">
          <div className="size-16 mx-auto rounded-full bg-orange-500/15 dark:bg-orange-500/25 flex items-center justify-center text-orange-500 animate-flame-pulse shadow-[0_0_20px_rgba(249,115,22,0.35)]">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
          </div>

          <div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white">
              {progress.currentStreak} {progress.currentStreak === 1 ? 'Dia' : 'Dias'}
            </h3>
            <p className="text-[11px] font-black uppercase tracking-wider text-orange-500 mt-0.5">
              {progress.currentStreak > 0 ? 'Sequência Ativa' : 'Comece Hoje'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {progress.completedToday
                ? 'Desafio de hoje concluído. A chama continua acesa!'
                : 'Complete o desafio de hoje para manter ou iniciar a sua sequência.'}
            </p>
          </div>

          {/* Days bubbles */}
          <div className="flex justify-between items-center pt-2 px-1">
            {daysOfWeek.map((d, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    d.active
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-800 text-slate-400'
                  } ${d.today ? 'ring-2 ring-orange-500/40 ring-offset-2 dark:ring-offset-surface-dark' : ''}`}
                >
                  {d.active ? (
                    <span className="material-symbols-outlined text-base">check</span>
                  ) : (
                    d.label[0]
                  )}
                </div>
                <span
                  className={`text-[9px] font-extrabold ${
                    d.today ? 'text-orange-500 font-black' : 'text-slate-400'
                  }`}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mission Card */}
        <div>
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 dark:text-slate-500 block mb-2 px-1">
            Sua Missão de Hoje ({today})
          </span>

          <div className="rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
            {/* Sacred Local Gradient Header */}
            <div className="h-32 relative p-4 flex flex-col justify-between bg-gradient-to-br from-sacred-deep via-sacred-brand to-amber-700 overflow-hidden">
              <div className="absolute right-3 bottom-1 opacity-15 pointer-events-none">
                <span className="material-symbols-outlined text-[92px] text-amber-200" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_stories
                </span>
              </div>
              <div className="relative flex justify-end">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/45 text-white backdrop-blur flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">quiz</span>
                  <span>{dailyQuestions.length} questões</span>
                </span>
              </div>
              <div className="relative">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide bg-orange-500 text-white">
                  Seleção Diária
                </span>
                <h4 className="text-base font-black text-white mt-1 truncate">
                  {todayTopics.slice(0, 2).join(' · ') || 'Palavra em Prática'}
                </h4>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-orange-500 text-[18px] shrink-0 mt-0.5">
                  auto_awesome
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Passagens em foco hoje:{' '}
                  <strong>{todayReferences.join(', ')}</strong>.
                </p>
              </div>

              <button
                onClick={startChallenge}
                className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>{progress.completedToday ? 'Repetir Desafio' : 'Começar Agora'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Rewards Badges */}
        <div>
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 dark:text-slate-500">
              Recompensas de Hoje
            </span>
            <span className="text-[11px] text-primary font-bold">
              {progress.completedToday ? 'Concluído' : 'Disponível'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  stars
                </span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">Até +{maxDailyXp} XP</p>
                <p className="text-[10px] text-slate-400">Com 100% de acerto</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">military_tech</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {progress.currentStreak} {progress.currentStreak === 1 ? 'dia' : 'dias'}
                </p>
                <p className="text-[10px] text-slate-400">Sequência atual</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Scripture Insight */}
        {featuredQuestion && (
          <div className="pt-2 text-center">
            <p className="text-xs italic text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              "{featuredQuestion.explanation}"
            </p>
            <p className="text-[11px] font-bold text-primary mt-1">— {featuredQuestion.reference}</p>
          </div>
        )}
      </div>
    </div>
  );
};
