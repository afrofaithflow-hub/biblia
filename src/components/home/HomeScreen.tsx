import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { getLastRead } from '../../lib/bibleStorage';
import { DEFAULT_BIBLE_TRANSLATION_ID, loadBibleChapter, getBibleTranslationLabel } from '../../data/bibleData';
import { getMaputoDateKey, getUserProgressTracks } from '../../lib/gameSession';
import { getCurrentJourneyPhase } from '../../lib/gameJourney';
import { queueBibleReference } from '../../lib/scriptureReference';

interface HomeScreenProps {
  onNavigate: (screenId: string) => void;
  showToast: (message: string, icon?: string) => void;
}

interface DailyVerseEntry {
  book: string;
  chapter: number;
  verse: number;
  fallbackText: string;
}

interface PrayerEntry {
  id: string;
  text: string;
  createdAt: string;
}

const PRAYER_JOURNAL_KEY = 'biblia_prayer_journal_v1';

const DAILY_VERSES: DailyVerseEntry[] = [
  { book: 'Salmos', chapter: 119, verse: 105, fallbackText: 'Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.' },
  { book: 'Josué', chapter: 1, verse: 9, fallbackText: 'Não te mandei eu? Esforça-te, e tem bom ânimo; não temas, nem te espantes; porque o Senhor teu Deus é contigo por onde quer que andares.' },
  { book: 'Salmos', chapter: 23, verse: 1, fallbackText: 'O Senhor é o meu pastor, nada me faltará.' },
  { book: 'Provérbios', chapter: 3, verse: 5, fallbackText: 'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.' },
  { book: 'João', chapter: 3, verse: 16, fallbackText: 'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
  { book: 'Filipenses', chapter: 4, verse: 13, fallbackText: 'Posso todas as coisas em Cristo que me fortalece.' },
  { book: 'Romanos', chapter: 8, verse: 28, fallbackText: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu decreto.' },
  { book: 'Isaías', chapter: 41, verse: 10, fallbackText: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo.' },
  { book: 'Salmos', chapter: 46, verse: 1, fallbackText: 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.' },
  { book: 'Mateus', chapter: 11, verse: 28, fallbackText: 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.' },
  { book: 'Gênesis', chapter: 1, verse: 1, fallbackText: 'No princípio criou Deus os céus e a terra.' },
  { book: '1 Coríntios', chapter: 13, verse: 13, fallbackText: 'Agora, pois, permanecem a fé, a esperança e o amor, estes três; mas o maior destes é o amor.' },
  { book: 'Salmos', chapter: 91, verse: 1, fallbackText: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.' },
  { book: 'João', chapter: 14, verse: 6, fallbackText: 'Respondeu-lhe Jesus: Eu sou o caminho, a verdade e a vida; ninguém vem ao Pai senão por mim.' },
];

const DAILY_PRAYERS = [
  'Senhor meu Deus, que a Tua Palavra seja hoje luz para os meus passos e consolo para o meu coração. Concede-me sabedoria para discernir a Tua vontade e mansidão para amar o meu próximo. Amém.',
  'Pai celestial, agradeço-Te pelo fôlego de vida e pela Tua fidelidade que se renova a cada manhã. Firma os meus pensamentos na verdade das Escrituras e guia as minhas decisões hoje. Amém.',
  'Deus eterno, entrega nas Tuas mãos o meu trabalho, a minha família e as preocupações do meu coração. Ensina-me a confiar no Teu cuidado mesmo quando não compreendo o caminho. Amém.',
  'Senhor Jesus, fortalece a minha fé nos momentos de espera e torna o meu coração sensível à Tua voz e às necessidades dos que estão ao meu redor. Amém.',
];

function getDateIndex(dateKey: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < dateKey.length; i++) {
    sum = (sum * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return sum % length;
}

function loadPrayerJournal(): PrayerEntry[] {
  try {
    const raw = localStorage.getItem(PRAYER_JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, showToast }) => {
  const { currentPlan, openPricingModal } = useSubscription();
  const { themeMode, setThemeMode } = useTheme();
  const { loadTrack, play } = useAudio();
  const { user } = useAuth();
  const lastRead = getLastRead();
  const tracks = getUserProgressTracks();
  const nextPhase = getCurrentJourneyPhase();
  const xpTotal = 250;
  const xpCurrent = tracks.lifetimeXp % xpTotal;
  const displayName = String(user?.user_metadata?.display_name || user?.email?.split('@')[0] || '').trim();
  const todayKey = getMaputoDateKey();

  const todayVerse = useMemo(
    () => DAILY_VERSES[getDateIndex(todayKey, DAILY_VERSES.length)],
    [todayKey]
  );
  const todayPrayer = useMemo(
    () => DAILY_PRAYERS[getDateIndex(`${todayKey}:prayer`, DAILY_PRAYERS.length)],
    [todayKey]
  );

  const [todayVerseText, setTodayVerseText] = useState(todayVerse.fallbackText);
  const [passageVerseText, setPassageVerseText] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [prayerInput, setPrayerInput] = useState('');
  const [prayerJournal, setPrayerJournal] = useState<PrayerEntry[]>(loadPrayerJournal);
  const [xpWidth, setXpWidth] = useState(0);
  const themeRef = useRef<HTMLDivElement>(null);

  // Carrega o verso exato da última leitura
  useEffect(() => {
    let active = true;
    loadBibleChapter(lastRead.book, lastRead.chapter, DEFAULT_BIBLE_TRANSLATION_ID)
      .then((passage) => {
        const verse = passage.verses.find((item) => item.num === lastRead.verse) || passage.verses[0];
        if (active) setPassageVerseText(verse?.text || '');
      })
      .catch(() => {
        if (active) setPassageVerseText('');
      });
    return () => {
      active = false;
    };
  }, [lastRead.book, lastRead.chapter, lastRead.verse]);

  // Carrega o texto canónico BLIVRE do Versículo do Dia
  useEffect(() => {
    let active = true;
    setTodayVerseText(todayVerse.fallbackText);
    loadBibleChapter(todayVerse.book, todayVerse.chapter, DEFAULT_BIBLE_TRANSLATION_ID)
      .then((passage) => {
        const found = passage.verses.find((v) => v.num === todayVerse.verse);
        if (active && found?.text) {
          setTodayVerseText(found.text);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [todayVerse]);

  // Animate XP bar on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setXpWidth((xpCurrent / xpTotal) * 100);
    }, 300);
    return () => clearTimeout(timer);
  }, [xpCurrent]);

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

  const handleShareVerse = async () => {
    const refLabel = `${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`;
    const text = `"${todayVerseText}" — ${refLabel} (BLIVRE · BiblIA)`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Versículo do Dia — ${refLabel}`, text });
        return;
      } catch {
        // segue para clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast('Versículo do dia copiado!', 'check_circle');
    } else {
      showToast(refLabel, 'share');
    }
  };

  const handleOpenDailyVerseInBible = () => {
    queueBibleReference(`${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`);
    onNavigate('screen-biblia');
  };

  const handlePlayDailyVerseAudio = async () => {
    const loaded = await loadTrack(
      todayVerse.book,
      todayVerse.chapter,
      `${todayVerse.book} ${todayVerse.chapter}`,
      DEFAULT_BIBLE_TRANSLATION_ID,
      todayVerse.verse
    );
    if (!loaded) {
      showToast('Não foi possível carregar o áudio desta passagem.', 'warning');
      return;
    }
    play();
    showToast(`A ouvir ${todayVerse.book} ${todayVerse.chapter}:${todayVerse.verse}`, 'headphones');
    onNavigate('screen-audio');
  };

  const handleQuickPlayAudio = async () => {
    const loaded = await loadTrack(
      lastRead.book,
      lastRead.chapter,
      `${lastRead.book} ${lastRead.chapter}`,
      DEFAULT_BIBLE_TRANSLATION_ID,
      lastRead.verse
    );
    if (!loaded) {
      showToast('Não foi possível abrir esta passagem.', 'warning');
      return;
    }
    play();
    showToast(`A ouvir ${lastRead.book} ${lastRead.chapter}:${lastRead.verse} · BL`, 'headphones');
    onNavigate('screen-audio');
  };

  const handleSavePrayer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = prayerInput.trim();
    if (!clean) {
      setShowPrayerModal(false);
      return;
    }
    const next: PrayerEntry[] = [
      { id: `pr_${Date.now()}`, text: clean, createdAt: new Date().toISOString() },
      ...prayerJournal,
    ].slice(0, 20);
    setPrayerJournal(next);
    try {
      localStorage.setItem(PRAYER_JOURNAL_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setPrayerInput('');
    showToast('Intenção guardada neste dispositivo.', 'favorite');
  };

  const handleDeletePrayer = (id: string) => {
    const next = prayerJournal.filter((p) => p.id !== id);
    setPrayerJournal(next);
    try {
      localStorage.setItem(PRAYER_JOURNAL_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas text-slate-900 dark:text-slate-100 font-display transition-colors duration-300 pb-36">
      {/* Header Section */}
      <header className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 z-20 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md border-b border-slate-200/60 dark:border-dark-border transition-colors">
        <div className="flex flex-col gap-0.5 text-left animate-fade-in">
          <h1 className="text-slate-900 dark:text-white text-2xl font-extrabold leading-tight tracking-tight">
            {displayName ? `Olá, ${displayName}` : 'Bem-vindo(a)'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
            Vamos continuar a sua caminhada?
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
            className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-gold-radiant/60 bg-sacred-brand/10 dark:bg-sacred-neon/15 shadow-sm transition-transform hover:scale-105 active:scale-95"
            title="Ver Perfil"
          >
            {displayName ? (
              <span className="font-black text-sm text-sacred-brand dark:text-sacred-neon">
                {displayName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-xl text-sacred-brand dark:text-sacred-neon">person</span>
            )}
            {user && <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-canvas" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col gap-4 px-4 pt-3 text-left">
        {/* 1. Spiritual Progress Hero Card */}
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
                    Nível {tracks.walkLevel}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('screen-desafio-diario')}
                className="badge-streak dark:badge-streak-dark shadow-sm hover:scale-105 active:scale-95 transition-transform"
                title="Ver Ofensiva Diária"
              >
                <span className="material-symbols-outlined text-base animate-flame-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
                <span className="text-xs font-black">{tracks.streakDays}</span>
                <span className="text-[10px] opacity-80">{tracks.streakDays === 1 ? 'dia' : 'dias'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Progresso</span>
                <span className="font-bold text-gold-talent dark:text-gold-radiant tabular-nums">
                  {xpCurrent}<span className="text-slate-400 font-normal">/{xpTotal} XP</span>
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-talent to-gold-radiant transition-all duration-1000 ease-out shadow-glow"
                  style={{ width: `${xpWidth}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                {xpTotal - xpCurrent} XP para o próximo nível
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => onNavigate('screen-biblia')} className="w-full rounded-2xl bg-white dark:bg-dark-card-base p-4 border border-sacred-brand/20 shadow-soft text-left flex items-center gap-3">
          <span className="size-11 rounded-xl bg-sacred-brand/10 text-sacred-brand flex items-center justify-center material-symbols-outlined">menu_book</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-extrabold">Continuar leitura</span>
            <span className="block text-xs text-slate-500 truncate">
              {lastRead.book} {lastRead.chapter}:{lastRead.verse} · {getBibleTranslationLabel(DEFAULT_BIBLE_TRANSLATION_ID, true)}
              {passageVerseText ? ` — ${passageVerseText}` : ''}
            </span>
          </span>
          <span className="material-symbols-outlined text-sacred-brand">arrow_forward</span>
        </button>

        {/* 2. Primary CTA — Continuar Jornada (dinâmico) */}
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="w-full flex items-center justify-between bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 p-1.5 pr-3.5 rounded-2xl shadow-duo-primary dark:shadow-[0_4px_0_#0f766e] active:translate-y-1 active:shadow-none hover:brightness-105 transition-all group overflow-hidden h-[70px]"
        >
          <div className="flex items-center justify-center bg-white/20 dark:bg-slate-950/15 h-full aspect-square rounded-xl ml-1">
            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
              map
            </span>
          </div>
          <div className="flex flex-col items-start flex-1 ml-3.5 min-w-0">
            <span className="text-base font-extrabold leading-tight tracking-tight">Continuar Jornada</span>
            <span className="text-xs opacity-85 font-medium mt-0.5 truncate w-full text-left">
              Próximo: Fase {nextPhase.phaseNumber} · {nextPhase.title}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-950 text-sacred-brand dark:text-sacred-neon rounded-full p-2 group-hover:translate-x-1 transition-transform shrink-0">
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </div>
        </button>

        {/* 3. Verse of the Day Card (100% offline & dinâmico) */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sacred-card min-h-[250px] bg-gradient-to-br from-[#0b2320] via-sacred-deep to-[#1a3c38]">
          {/* Padrão geométrico sagrado SVG inline */}
          <svg className="absolute right-0 top-0 h-full w-48 opacity-10 pointer-events-none text-amber-200" viewBox="0 0 200 200" fill="none">
            <circle cx="150" cy="40" r="90" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="150" cy="40" r="60" stroke="currentColor" strokeWidth="1" />
            <path d="M150 -20 V100 M90 40 H210" stroke="currentColor" strokeWidth="1" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

          <div className="relative z-10 flex flex-col justify-between min-h-[250px] p-5 text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase mb-3">
                <span className="material-symbols-outlined text-xs text-amber-300">bookmark</span>
                Versículo do Dia
              </span>
              <blockquote className="text-white text-lg font-serif italic leading-snug mb-2.5 drop-shadow-md">
                "{todayVerseText}"
              </blockquote>
              <p className="text-amber-300 text-xs font-bold border-l-2 border-amber-400 pl-2">
                {todayVerse.book} {todayVerse.chapter}:{todayVerse.verse} • BLIVRE
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleOpenDailyVerseInBible}
                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/10 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>Ler Capítulo</span>
              </button>
              <button
                onClick={() => void handlePlayDailyVerseAudio()}
                className="bg-sacred-brand hover:bg-sacred-dark active:scale-95 text-white py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                title="Ouvir Versículo do Dia"
              >
                <span className="material-symbols-outlined text-base">headphones</span>
                <span className="text-xs font-bold">Ouvir</span>
              </button>
              <button
                onClick={() => void handleShareVerse()}
                className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-xl transition-all aspect-square flex items-center justify-center active:scale-95"
                title="Partilhar"
              >
                <span className="material-symbols-outlined text-base">share</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Quick Actions Bento Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowPrayerModal(true)}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-blue-50 dark:bg-blue-950/40 size-9 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">volunteer_activism</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Oração & Diário</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {prayerJournal.length > 0 ? `${prayerJournal.length} registo(s)` : 'Renove a sua fé'}
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('screen-ai')}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-purple-50 dark:bg-purple-950/40 size-9 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Perguntar à IA</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Tire as suas dúvidas</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('screen-planos')}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-emerald-50 dark:bg-emerald-950/40 size-9 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Planos de Leitura</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Escolha uma jornada ao seu ritmo</p>
            </div>
          </button>

          <button
            onClick={() => void handleQuickPlayAudio()}
            className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white dark:bg-dark-card-base border border-slate-200/80 dark:border-dark-border shadow-soft hover:shadow-card transition-all text-left group active:scale-95"
          >
            <div className="bg-amber-50 dark:bg-amber-950/40 size-9 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">headphones</span>
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Áudio Bíblia</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Continue em {lastRead.book} {lastRead.chapter}</p>
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
                  ? 'Apoie o projeto e desbloqueie jornadas temáticas completas.'
                  : 'Acesso ativo às jornadas e recursos de apoio.'}
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

      {/* Prayer & Devotional Journal Modal */}
      {showPrayerModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrayerModal(false);
          }}
        >
          <div className="bg-white dark:bg-dark-card-base border border-slate-200 dark:border-dark-border rounded-3xl p-5 max-w-sm w-full shadow-2xl relative text-left animate-slide-up max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    volunteer_activism
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Oração de Hoje</h3>
                  <p className="text-[11px] text-slate-400">Comunhão e diário espiritual</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrayerModal(false)}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-serif italic border-l-2 border-sacred-brand pl-3">
              "{todayPrayer}"
            </p>

            <form onSubmit={handleSavePrayer} className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                Escrever intenção ou gratidão pessoal (guardado no dispositivo)
              </label>
              <textarea
                rows={2}
                maxLength={400}
                value={prayerInput}
                onChange={(e) => setPrayerInput(e.target.value)}
                placeholder="Ex: Senhor, dá sabedoria à minha família esta semana..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-sacred-brand resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 btn-duo-primary dark:btn-duo-primary-dark text-xs py-2.5 font-bold"
                >
                  {prayerInput.trim() ? 'Guardar no Diário' : 'Amém'}
                </button>
              </div>
            </form>

            {prayerJournal.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Registos recentes ({prayerJournal.length})
                </p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {prayerJournal.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="text-slate-700 dark:text-slate-200 leading-snug">{entry.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(entry.createdAt).toLocaleDateString('pt')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePrayer(entry.id)}
                        className="text-slate-400 hover:text-rose-500 shrink-0"
                        title="Remover"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
