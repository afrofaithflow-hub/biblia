import React, { useMemo, useState } from 'react';
import { getDailyProgress, getReviewQueue, getUserProgressTracks, requestGameMode } from '../../lib/gameSession';

interface GameStatsProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

type StatsTab = 'overview' | 'mastery' | 'review' | 'history';

const TAB_CONFIG: { id: StatsTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
  { id: 'mastery', label: 'Domínio', icon: 'stars' },
  { id: 'review', label: 'Revisar', icon: 'history_edu' },
  { id: 'history', label: 'Histórico', icon: 'calendar_month' },
];

const DIVISION_LABELS: Record<string, string> = {
  seed: 'Semente', path: 'Caminho', disciple: 'Discípulo', messenger: 'Mensageiro', celestial: 'Celestial',
};

export const GameStats: React.FC<GameStatsProps> = ({ onNavigate, showToast }) => {
  const [tab, setTab] = useState<StatsTab>('overview');
  const tracks = getUserProgressTracks();
  const dailyProgress = getDailyProgress();
  const reviewQueue = getReviewQueue();

  const dueReviews = useMemo(() => {
    const now = new Date();
    return reviewQueue.filter((item) => new Date(item.nextReviewDate) <= now);
  }, [reviewQueue]);

  const xpToNextLevel = 250;
  const xpInCurrentLevel = tracks.lifetimeXp % xpToNextLevel;
  const xpProgress = Math.round((xpInCurrentLevel / xpToNextLevel) * 100);

  const topicEntries = Object.entries(tracks.topicMastery);

  const getMasteryLabel = (pct: number) =>
    pct >= 75 ? 'Dominado' : pct >= 40 ? 'A Praticar' : 'A Iniciar';
  const getMasteryColor = (pct: number) =>
    pct >= 75 ? 'bg-sacred-brand' : pct >= 40 ? 'bg-gold-radiant' : 'bg-slate-300 dark:bg-slate-600';
  const getMasteryBadge = (pct: number) =>
    pct >= 75
      ? 'bg-sacred-brand/10 text-sacred-brand border-sacred-brand/30'
      : pct >= 40
      ? 'bg-gold-radiant/10 text-gold-radiant border-gold-radiant/30'
      : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-canvas dark:bg-dark-canvas text-slate-800 dark:text-slate-100 font-display transition-colors duration-200">
      {/* ── Header ── */}
      <header className="flex items-center justify-between p-4 pb-2 shrink-0">
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="size-9 rounded-full bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-slate-500"
          title="Voltar"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>

        <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Estatísticas
        </h2>

        <button
          onClick={() => showToast('Preferências de privacidade guardadas.', 'shield')}
          className="size-9 rounded-full bg-white dark:bg-slate-800 shadow-soft flex items-center justify-center text-slate-500"
          title="Privacidade"
        >
          <span className="material-symbols-outlined text-[18px]">shield</span>
        </button>
      </header>

      {/* ── Tabs 4 abas (G0 / Codex Plan §9) ── */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 rounded-2xl p-1">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all leading-tight ${
                tab === t.id
                  ? 'bg-sacred-brand text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content by tab ── */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 pb-28">
        {/* ══ TAB 1: VISÃO GERAL ══ */}
        {tab === 'overview' && (
          <div className="space-y-4 max-w-sm mx-auto w-full pt-2">
            {/* Profile row */}
            <div className="flex items-center gap-3.5">
              <div className="size-16 rounded-full bg-sacred-brand/10 border-2 border-sacred-brand/30 flex items-center justify-center text-sacred-brand shrink-0">
                <span className="material-symbols-outlined text-3xl">person</span>
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sacred-brand/10 text-sacred-brand border border-sacred-brand/20">
                  Nível {tracks.walkLevel}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {DIVISION_LABELS[tracks.weeklyLeague] ?? 'Discípulo'}
                </h3>
                <p className="text-xs text-slate-400">{tracks.streakDays} dias em sequência · {tracks.masteryStars} estrelas de domínio</p>
              </div>
            </div>

            {/* XP de Caminhada (Trilha 1) */}
            <div className="p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">XP de Caminhada</span>
                <span className="text-sacred-brand font-black">{xpInCurrentLevel} / {xpToNextLevel} XP</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-sacred-brand h-full rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold">
                Total: {tracks.lifetimeXp.toLocaleString('pt')} XP · Faltam {xpToNextLevel - xpInCurrentLevel} XP para o nível {tracks.walkLevel + 1}
              </p>
            </div>

            {/* 2-col: Streak + Domínio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft">
                <div className="size-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">{tracks.streakDays}</h4>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dias Seguidos</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">Pausa planeada disponível</p>
              </div>
              <div className="p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft">
                <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">{tracks.masteryStars}</h4>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Estrelas Domínio</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">3ª estrela por retenção</p>
              </div>
            </div>

            {/* Liga semanal */}
            <div className="p-4 rounded-2xl bg-gold-radiant/10 border border-gold-radiant/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-gold-radiant" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Talentos da Semana (Liga)</p>
                <p className="text-xl font-black text-gold-radiant">{tracks.weeklyTalents.toLocaleString('pt')}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Zeram toda segunda-feira · Apenas para ranking semanal</p>
              </div>
            </div>

            {/* Revisões pendentes */}
            {dueReviews.length > 0 && (
              <button
                onClick={() => setTab('review')}
                className="w-full p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3 text-left"
              >
                <span className="material-symbols-outlined text-xl text-indigo-500 shrink-0">history_edu</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{dueReviews.length} revisões aguardam</p>
                  <p className="text-[11px] text-indigo-500 dark:text-indigo-400">Rever agora fortalece a 3ª estrela de domínio</p>
                </div>
                <span className="material-symbols-outlined text-indigo-400">chevron_right</span>
              </button>
            )}
          </div>
        )}

        {/* ══ TAB 2: DOMÍNIO POR TEMA ══ */}
        {tab === 'mastery' && (
          <div className="space-y-3 max-w-sm mx-auto w-full pt-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Domínio mede a compreensão e retenção real de cada tema — não apenas respostas certas imediatas. A 3ª estrela exige revisão após 3 dias.
            </p>
            {topicEntries.map(([topic, pct]) => (
              <div key={topic} className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{topic}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getMasteryBadge(pct)}`}>
                    {getMasteryLabel(pct)}
                  </span>
                </div>
                <div className="bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`${getMasteryColor(pct)} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{pct}% de domínio</span>
                  {pct < 75 && (
                    <button
                      onClick={() => setTab('review')}
                      className="text-indigo-500 font-bold"
                    >
                      Revisar →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ TAB 3: FILA DE REVISÃO ESPAÇADA ══ */}
        {tab === 'review' && (
          <div className="space-y-3 max-w-sm mx-auto w-full pt-2">
            {dueReviews.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    {dueReviews.length} revisão{dueReviews.length > 1 ? 'ões' : ''} pronta{dueReviews.length > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => {
                      showToast(`Iniciando revisão de ${Math.min(3, dueReviews.length)} passagens`, 'history_edu');
                      requestGameMode('true-false');
                      onNavigate('screen-jogo-licao');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    Revisar {Math.min(3, dueReviews.length)} agora →
                  </button>
                </div>

                {dueReviews.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-indigo-100 dark:border-indigo-900 shadow-soft">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-indigo-400 text-lg shrink-0 mt-0.5">history_edu</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{item.prompt}</p>
                        <p className="text-[10px] text-sacred-brand mt-0.5">{item.reference}</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold">{item.topic}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 font-bold">
                            {item.failedCount} erro{item.failedCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-sacred-brand/40 block mb-3">check_circle</span>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sem revisões pendentes!</p>
                <p className="text-xs text-slate-400 mt-1">Continue respondendo questões para construir a fila de domínio.</p>
              </div>
            )}

            {/* Revisões futuras */}
            {reviewQueue.filter((i) => new Date(i.nextReviewDate) > new Date()).length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Próximas Revisões</p>
                {reviewQueue
                  .filter((i) => new Date(i.nextReviewDate) > new Date())
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="flex justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[65%]">{item.reference}</span>
                      <span className="text-slate-400 shrink-0">{new Date(item.nextReviewDate).toLocaleDateString('pt', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 4: HISTÓRICO ══ */}
        {tab === 'history' && (
          <div className="space-y-3 max-w-sm mx-auto w-full pt-2">
            <p className="text-xs text-slate-400">Apenas visível para si. Ajuste a privacidade nas definições.</p>

            {/* Calendário de Sequência */}
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft">
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-3">Dias de prática este mês</p>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }, (_, i) => {
                  const hasActivity = i % 3 !== 2;
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md ${hasActivity ? 'bg-sacred-brand' : 'bg-slate-100 dark:bg-slate-800'}`}
                      title={`Dia ${i + 1}`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="size-3 rounded-sm bg-sacred-brand" />
                <span className="text-[10px] text-slate-400">Prática confirmada</span>
                <div className="size-3 rounded-sm bg-slate-200 dark:bg-slate-700 ml-2" />
                <span className="text-[10px] text-slate-400">Sem atividade</span>
              </div>
            </div>

            {/* Conquistas */}
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Conquistas Recentes</p>
              {[
                { icon: 'menu_book', label: 'Primeira Passagem', desc: 'Abriu o texto a partir de uma questão', date: '07/11/2026', color: 'text-sacred-brand bg-sacred-brand/10' },
                { icon: 'local_fire_department', label: '7 Dias Seguidos', desc: 'Sete dias de prática consecutiva', date: '08/11/2026', color: 'text-orange-500 bg-orange-500/10' },
                { icon: 'military_tech', label: 'Primeira Fase', desc: 'Concluiu a primeira fase da jornada', date: '07/11/2026', color: 'text-gold-radiant bg-gold-radiant/10' },
              ].map((ach) => (
                <div key={ach.label} className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${ach.color}`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{ach.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ach.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{ach.desc}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{ach.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
