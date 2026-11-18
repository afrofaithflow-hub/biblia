import React, { useState, useEffect, useRef } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../context/AudioContext';
import { getLastRead } from '../../lib/bibleStorage';
import { DEFAULT_BIBLE_TRANSLATION_ID, loadBibleChapter, getBibleTranslationLabel } from '../../data/bibleData';

interface HomeScreenProps {
  onNavigate: (screenId: string) => void;
  showToast: (message: string, icon?: string) => void;
}

const XP_TOTAL = 500;
const XP_CURRENT = 350;

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, showToast }) => {
  const { currentPlan, openPricingModal } = useSubscription();
  const { themeMode, setThemeMode } = useTheme();
  const { loadTrack, play } = useAudio();
  const lastRead = getLastRead();
  const [passageVerseText, setPassageVerseText] = useState('');
  useEffect(() => {
    let active = true;
    loadBibleChapter(lastRead.book, lastRead.chapter, DEFAULT_BIBLE_TRANSLATION_ID).then((passage) => {
      const verse = passage.verses.find((item) => item.num === lastRead.verse) || passage.verses[0];
      if (active) setPassageVerseText(verse?.text || '');
    }).catch(() => { if (active) setPassageVerseText(''); });
    return () => { active = false; };
  }, [lastRead.book, lastRead.chapter, lastRead.verse]);

  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [xpWidth, setXpWidth] = useState(0);
  const themeRef = useRef<HTMLDivElement>(null);

  // Animate XP bar on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setXpWidth((XP_CURRENT / XP_TOTAL) * 100);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Close theme menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleShareVerse = () => {
    const text = '"Lâmpada para os meus pés é a tua palavra e luz para o meu caminho." — Salmos 119:105 (BiblIA)';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Versículo copiado!', 'check_circle');
    } else {
      showToast('Salmos 119:105', 'share');
    }
  };

  const handleQuickPlayAudio = async () => {
    const loaded = await loadTrack(lastRead.book, lastRead.chapter, `${lastRead.book} ${lastRead.chapter}`, DEFAULT_BIBLE_TRANSLATION_ID, lastRead.verse);
    if (!loaded) { showToast('Não foi possível abrir esta passagem.', 'warning'); return; }
    play();
    showToast(`A ouvir ${lastRead.book} ${lastRead.chapter}:${lastRead.verse} · BL`, 'headphones');
    onNavigate('screen-audio');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas text-slate-900 dark:text-slate-100 font-display transition-colors duration-300 pb-28">
      {/* ── Header Section (Protótipo 2.1) ── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 z-20 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md border-b border-slate-200/60 dark:border-dark-border transition-colors">
        <div className="flex flex-col gap-0.5 text-left animate-fade-in">
          <h1 className="text-slate-900 dark:text-white text-2xl font-extrabold leading-tight tracking-tight">
            Olá, João 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
            Vamos continuar sua caminhada?
          </p>
        </div>

        <div className="flex items-center gap-2 animate-fade-in">
          {/* Theme Switcher Button */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center justify-center size-9 rounded-full bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border shadow-sm text-slate-700 dark:text-slate-200 hover:border-sacred-brand transition-all active:scale-95"
              title={`Tema: ${themeMode}`}
            >
              {themeMode === 'claro' && (
                <span className="material-symbols-outlined text-[18px] text-amber-500">light_mode</span>
              )}
              {themeMode === 'escuro' && (
                <span className="material-symbols-outlined text-[18px] text-sacred-neon">dark_mode</span>
              )}
              {themeMode === 'sistema' && (
                <span className="material-symbols-outlined text-[18px] text-slate-400">devices</span>
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card-base rounded-2xl shadow-elevated border border-slate-200 dark:border-dark-border py-1.5 z-50 animate-scale-in text-xs overflow-hidden text-left">
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1">
                  Aparência
                </div>
                {([
                  { key: 'claro', icon: 'light_mode', label: 'Claro', color: 'text-amber-500' },
                  { key: 'escuro', icon: 'dark_mode', label: 'Escuro', color: 'text-sacred-neon' },
                  { key: 'sistema', icon: 'devices', label: 'Sistema', color: 'text-slate-400' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setThemeMode(opt.key);
                      setShowThemeMenu(false);
                      showToast(`Tema ${opt.label} ativado!`, opt.icon);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      themeMode === opt.key
                        ? 'text-sacred-brand dark:text-sacred-neon font-bold bg-sacred-light/40 dark:bg-sacred-neon/10'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-base ${opt.color}`}>{opt.icon}</span>
                    <span>{opt.label}</span>
                    {themeMode === opt.key && (
                      <span className="material-symbols-outlined text-sm ml-auto text-sacred-brand dark:text-sacred-neon">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Avatar */}
          <button
            onClick={() => onNavigate('screen-perfil')}
            className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-gold-radiant/60 shadow-sm transition-transform hover:scale-105 active:scale-95"
            title="Ver Perfil"
          >
            <img
              alt="Foto de João"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAK9KKr7Y21m-qaMZTLU1Jes5mmeftJGVnlQAExsiE6fEeWw1hnhju4LfZbAHhwG9tCCulmsTgAUuGAB_9zvWf0tIu5aWDvlYtCCi3onDkuKGbdDZ6U_QPxOdaZM8whk8_2lR99ha5i-KasXafoufTX6shzhPzle63_pJUBx9djSurblSHUFJKHgMF_vZYSM0FDST6zjgVgbWQ_ny9eiwWtDec2_f1yd76QJXB1ZkDmxiHvkAutfXzktV5eSZq9na_li7Cq9NQS4pc"
            />
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-canvas" />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex flex-col gap-4 px-4 pt-3 text-left">
        {/* 1. Spiritual Progress Hero Card (Protótipo 2.1) */}
        <div className="w-full rounded-2xl bg-white dark:bg-dark-card-base p-5 shadow-soft border border-slate-200/80 dark:border-dark-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gold-radiant/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 dark:text-slate-500">
                  Nível Atual
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <span className="text-base font-extrabold text-sacred-brand dark:text-sacred-neon">
                    Missionário II
                  </span>
                </div>
              </div>

              {/* Flame Streak Badge */}
              <button
                onClick={() => onNavigate('screen-desafio-diario')}
                className="badge-streak dark:badge-streak-dark shadow-sm hover:scale-105 active:scale-95 transition-transform"
                title="Ver Ofensiva Diária"
              >
                <span className="material-symbols-outlined text-base animate-flame-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
                <span className="text-xs font-black">5</span>
                <span className="text-[10px] opacity-80">dias</span>
              </button>
            </div>

            {/* XP Progress Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Progresso</span>
                <span className="font-bold text-gold-talent dark:text-gold-radiant tabular-nums">
                  {XP_CURRENT}<span className="text-slate-400 font-normal">/{XP_TOTAL} Talentos</span>
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-talent to-gold-radiant transition-all duration-1000 ease-out shadow-glow"
                  style={{ width: `${xpWidth}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                150 Talentos para avançar ao Nível III
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => onNavigate('screen-biblia')} className="w-full rounded-2xl bg-white dark:bg-dark-card-base p-4 border border-sacred-brand/20 shadow-soft text-left flex items-center gap-3">
          <span className="size-11 rounded-xl bg-sacred-brand/10 text-sacred-brand flex items-center justify-center material-symbols-outlined">menu_book</span>
          <span className="flex-1 min-w-0"><span className="block text-sm font-extrabold">Continuar leitura</span><span className="block text-xs text-slate-500 truncate">{lastRead.book} {lastRead.chapter}:{lastRead.verse} · {getBibleTranslationLabel(DEFAULT_BIBLE_TRANSLATION_ID, true)}{passageVerseText ? ` — ${passageVerseText}` : ''}</span></span>
          <span className="material-symbols-outlined text-sacred-brand">arrow_forward</span>
        </button>
        {/* 2. Primary CTA — Continuar Jornada (Stitch 3D Duolingo Button Style) */}
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="w-full flex items-center justify-between bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 p-1.5 pr-3.5 rounded-2xl shadow-duo-primary dark:shadow-[0_4px_0_#0f766e] active:translate-y-1 active:shadow-none hover:brightness-105 transition-all group overflow-hidden h-[70px]"
        >
          <div className="flex items-center justify-center bg-white/20 dark:bg-slate-950/15 h-full aspect-square rounded-xl ml-1">
            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
              map
            </span>
          </div>
          <div className="flex flex-col items-start flex-1 ml-3.5">
            <span className="text-base font-extrabold leading-tight tracking-tight">Continuar Jornada</span>
            <span className="text-xs opacity-85 font-medium mt-0.5">Próximo: O Sermão da Montanha · Lição 3</span>
          </div>
          <div className="bg-white dark:bg-slate-950 text-sacred-brand dark:text-sacred-neon rounded-full p-2 group-hover:translate-x-1 transition-transform shrink-0">
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </div>
        </button>

        {/* 3. Verse of the Day Card (Protótipo 2.1 — Stitch Bimodal Typography) */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sacred-card h-[290px] group cursor-pointer">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-5 text-left">
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase mb-2">
                <span className="material-symbols-outlined text-xs text-amber-300">bookmark</span>
                Versículo do Dia
              </span>
              <blockquote className="text-white text-lg font-serif italic leading-snug mb-2 drop-shadow-md">
                "Lâmpada para os meus pés é a tua palavra e luz para o meu caminho."
              </blockquote>
              <p className="text-amber-300 text-xs font-bold border-l-2 border-amber-400 pl-2">
                Salmos 119:105 • BLIVRE
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('screen-biblia')}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/10 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>Ler Capítulo</span>
              </button>
              <button
                onClick={handleQuickPlayAudio}
                className="bg-sacred-brand hover:bg-sacred-dark active:scale-95 text-white py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                title="Ouvir Narração com Áudio Real"
              >
                <span className="material-symbols-outlined text-base">headphones</span>
                <span className="text-xs font-bold">Ouvir</span>
              </button>
              <button
                onClick={handleShareVerse}
                className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl transition-all aspect-square flex items-center justify-center active:scale-95"
                title="Partilhar"
              >
                <span className="material-symbols-outlined text-base">share</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Quick Actions Bento Grid (Protótipo 2.1) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Oração do Dia */}
          <button
            onClick={() => setShowPrayerModal(true)}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-blue-50 dark:bg-blue-950/40 size-9 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">volunteer_activism</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Oração do Dia</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Renove sua fé</p>
            </div>
          </button>

          {/* Perguntar à IA */}
          <button
            onClick={() => onNavigate('screen-ai')}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-purple-50 dark:bg-purple-950/40 size-9 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Perguntar à IA</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Tire suas dúvidas</p>
            </div>
          </button>

          {/* Planos de Leitura */}
          <button
            onClick={() => onNavigate('screen-planos')}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-emerald-50 dark:bg-emerald-950/40 size-9 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Planos de Leitura</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">30 dias · Dia 12</p>
            </div>
          </button>

          {/* Áudio Bíblia Funcional */}
          <button
            onClick={handleQuickPlayAudio}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-amber-50 dark:bg-amber-950/40 size-9 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">headphones</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Áudio Bíblia</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Salmos 23 narrado</p>
            </div>
          </button>
        </div>

        {/* 5. Membership Upgrade Banner */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-sacred-brand/10 via-sacred-brand/5 to-gold-talent/10 border border-sacred-brand/20 dark:border-sacred-neon/30 flex items-center justify-between gap-3 overflow-hidden relative">
          <div className="flex items-center gap-3 relative z-10">
            <div className="size-10 rounded-xl bg-sacred-brand text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-xl">workspace_premium</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-sacred-brand dark:text-sacred-neon">
                  Plano {currentPlan}
                </span>
                {currentPlan === 'FREE' && (
                  <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/25 uppercase tracking-wide">
                    Gratuito
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                {currentPlan === 'FREE'
                  ? 'Desbloqueie ferramentas de comunidade e personalização.'
                  : 'Acesso ampliado a recursos de comunidade e estudos.'}
              </p>
            </div>
          </div>
          <button
            onClick={openPricingModal}
            className="relative z-10 shrink-0 bg-sacred-brand dark:bg-sacred-neon hover:brightness-110 text-white dark:text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
          >
            {currentPlan === 'FREE' ? 'Melhorar' : 'Gerir'}
          </button>
        </div>
      </main>

      {/* ── Prayer Modal ── */}
      {showPrayerModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrayerModal(false);
          }}
        >
          <div className="bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-left animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  volunteer_activism
                </span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Oração de Gratidão</h3>
                <p className="text-[11px] text-slate-400">Momento de comunhão com Deus</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif italic mb-6 border-l-2 border-sacred-brand pl-3">
              "Senhor meu Deus, que a Tua Palavra seja hoje luz para os meus passos e consolo para o meu coração. Concede-me sabedoria para discernir a Tua vontade e mansidão para amar o meu próximo. Amém."
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  showToast('Oração guardada no diário espiritual!', 'favorite');
                  setShowPrayerModal(false);
                }}
                className="flex-1 btn-duo-primary dark:btn-duo-primary-dark text-xs py-3"
              >
                ✦ Amém
              </button>
              <button
                onClick={() => setShowPrayerModal(false)}
                className="px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
