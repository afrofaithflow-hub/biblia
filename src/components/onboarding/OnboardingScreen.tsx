import React, { useState } from 'react';

interface OnboardingScreenProps {
  onComplete: () => void;
  showToast: (msg: string, icon?: string) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, showToast }) => {
  const [objectives, setObjectives] = useState<string[]>(['constancia']);
  const [learningPreference, setLearningPreference] = useState<'leitura' | 'audio' | 'game'>('leitura');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<5 | 10 | 20>(10);

  const toggleObjective = (id: string) => {
    setObjectives((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((item) => item !== id)
          : prev
        : [...prev, id]
    );
  };

  const handleStart = () => {
    localStorage.setItem(
      'biblia_user_goals',
      JSON.stringify({
        objectives,
        learningPreference,
        dailyGoalMinutes,
        completedAt: new Date().toISOString(),
      })
    );
    showToast('Plano personalizado com sucesso! Boa jornada.', 'check_circle');
    onComplete();
  };

  return (
    <div className="relative flex flex-col min-h-screen w-full overflow-x-hidden max-w-md mx-auto bg-bg-canvas dark:bg-dark-canvas text-slate-900 dark:text-slate-100 font-display transition-colors duration-300">
      {/* Background Subtle Warmth / Glow */}
      <div className="absolute top-0 right-0 w-full h-80 bg-[radial-gradient(circle_at_100%_0%,rgba(217,119,6,0.12)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_100%_0%,rgba(45,212,191,0.15)_0%,transparent_50%)] pointer-events-none z-0"></div>

      {/* Header Section */}
      <header className="relative z-10 pt-10 px-6 pb-2 flex flex-col items-start gap-3">
        <div className="size-12 rounded-2xl bg-sacred-light dark:bg-sacred-deep/60 border border-sacred-brand/20 dark:border-sacred-neon/30 flex items-center justify-center text-sacred-brand dark:text-sacred-neon mb-1 shadow-sm">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_stories
          </span>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Bem-vindo ao <span className="text-sacred-brand dark:text-sacred-neon">BiblIA</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[90%]">
            Vamos personalizar sua jornada espiritual. Configure seu plano de estudos.
          </p>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="relative z-10 flex-1 px-6 pb-32 space-y-7 mt-4">
        {/* Section 1: Objectives (Custom Multi/Single Selection) */}
        <section>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-xl">flag</span>
            <span>Qual é seu principal objetivo?</span>
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              {
                id: 'constancia',
                title: 'Constância na Leitura',
                desc: 'Criar um hábito diário sólido',
                icon: 'event_repeat',
                iconBg: 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
              },
              {
                id: 'entender',
                title: 'Entender as Escrituras',
                desc: 'Estudos aprofundados e teologia',
                icon: 'school',
                iconBg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
              },
              {
                id: 'fortalecimento',
                title: 'Fortalecimento Espiritual',
                desc: 'Meditações e devocionais',
                icon: 'spa',
                iconBg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
              },
            ].map((item) => {
              const checked = objectives.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleObjective(item.id)}
                  className={`group relative flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
                    checked
                      ? 'border-sacred-brand dark:border-sacred-neon bg-sacred-light/60 dark:bg-sacred-neon/10 ring-1 ring-sacred-brand/30 dark:ring-sacred-neon/30'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card-base hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`size-10 shrink-0 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </div>
                  <div className="flex flex-col grow">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </div>
                  <div
                    className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      checked
                        ? 'border-sacred-brand bg-sacred-brand dark:border-sacred-neon dark:bg-sacred-neon text-white dark:text-slate-950'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {checked && <span className="material-symbols-outlined text-sm font-black">check</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Learning Method (Radio List Style) */}
        <section>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-xl">psychology</span>
            <span>Como você prefere aprender?</span>
          </h3>
          <div className="space-y-2.5">
            {[
              {
                id: 'leitura',
                title: 'Leitura Guiada',
                desc: 'Textos explicativos diários',
                icon: 'menu_book',
              },
              {
                id: 'audio',
                title: 'Bíblia em Áudio',
                desc: 'Escute a Palavra narrada no caminho',
                icon: 'headphones',
              },
              {
                id: 'game',
                title: 'BiblIA Game',
                desc: 'Quizzes bíblicos e desafios interativos',
                icon: 'sports_esports',
              },
            ].map((item) => {
              const selected = learningPreference === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setLearningPreference(item.id as any)}
                  className={`flex items-center gap-3.5 rounded-2xl border p-3.5 cursor-pointer transition-all ${
                    selected
                      ? 'border-sacred-brand dark:border-sacred-neon bg-sacred-light/60 dark:bg-sacred-neon/10 ring-1 ring-sacred-brand/30 dark:ring-sacred-neon/30'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card-base hover:border-slate-300'
                  }`}
                >
                  <div className="size-10 shrink-0 rounded-xl bg-sacred-light dark:bg-sacred-deep/50 text-sacred-brand dark:text-sacred-neon flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </div>
                  <div className="flex grow flex-col">
                    <p className="text-slate-900 dark:text-white text-sm font-bold">{item.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{item.desc}</p>
                  </div>
                  <div
                    className={`size-5 rounded-full border-2 flex items-center justify-center ${
                      selected
                        ? 'border-sacred-brand dark:border-sacred-neon bg-sacred-brand dark:bg-sacred-neon'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selected && <div className="size-2 rounded-full bg-white dark:bg-slate-950" />}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Time Commitment */}
        <section>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-xl">schedule</span>
            <span>Meta diária</span>
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { min: 5, label: 'Relaxado', isIdeal: false },
              { min: 10, label: 'Normal', isIdeal: true },
              { min: 20, label: 'Intenso', isIdeal: false },
            ].map((goal) => {
              const selected = dailyGoalMinutes === goal.min;
              return (
                <div
                  key={goal.min}
                  onClick={() => setDailyGoalMinutes(goal.min as any)}
                  className={`relative cursor-pointer p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                    selected
                      ? 'border-sacred-brand dark:border-sacred-neon bg-sacred-light/60 dark:bg-sacred-neon/15 shadow-sm'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card-base text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {goal.isIdeal && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold-radiant text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10 whitespace-nowrap">
                      Ideal
                    </div>
                  )}
                  <span
                    className={`text-2xl font-black transition-colors ${
                      selected
                        ? 'text-sacred-brand dark:text-sacred-neon'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {goal.min}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                      selected
                        ? 'text-sacred-brand dark:text-sacred-neon'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    MIN
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {goal.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Sticky Footer CTA with Stitch Duolingo 3D button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-5 bg-gradient-to-t from-bg-canvas via-bg-canvas/95 to-transparent dark:from-dark-canvas dark:via-dark-canvas/95 pointer-events-none flex justify-center max-w-md mx-auto">
        <button
          onClick={handleStart}
          className="pointer-events-auto w-full btn-duo-primary dark:btn-duo-primary-dark text-base py-4"
        >
          <span>Começar minha jornada</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
