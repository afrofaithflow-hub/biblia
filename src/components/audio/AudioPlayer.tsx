import React, { useState, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { BIBLE_BOOKS, getBibleTranslationLabel } from '../../data/bibleData';
import { BookSelectorModal } from '../bible/BookSelectorModal';
import { AudioSettingsDrawer } from './AudioSettingsDrawer';
import { SacredOrb } from '../ai/SacredOrb';

interface AudioPlayerProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ onNavigate, showToast }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    selectedVoice,
    availableVoices,
    selectedSystemVoiceURI,
    installedSystemVoices,
    selectedAmbient,
    currentVerseIndex,
    currentVerseText,
    allChapterVerses,
    isSpeechSupported,
    sleepTimerRemainingSec,
    isLoopingVerse,
    isFocusMode,
    togglePlay,
    seek,
    seekToVerse,
    nextVerse,
    prevVerse,
    skip,
    setSpeed,
    setSleepTimer,
    toggleLoopVerse,
    toggleFocusMode,
    loadTrack,
  } = useAudio();

  const {
    planTier,
    openPricingModal,
  } = useSubscription();

  // Modais e Gavetas
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);

  // Banner de Apoio Missionário: Controle Manual (X) e Auto-Fechamento (8s)
  const [isDonationDismissed, setIsDonationDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('biblia_audio_donation_dismissed') === 'true';
    }
    return false;
  });
  const [donationSecondsLeft, setDonationSecondsLeft] = useState<number>(8);

  useEffect(() => {
    if (isDonationDismissed) return;

    const timer = setInterval(() => {
      setDonationSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dismissDonationBanner(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDonationDismissed]);

  const dismissDonationBanner = (manual = true) => {
    setIsDonationDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('biblia_audio_donation_dismissed', 'true');
    }
    if (manual) {
      showToast('Aviso de apoio dispensado', 'check');
    }
  };

  // Time format helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  const formatSleepTimer = (sec: number | null) => {
    if (sec === null) return null;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(Math.round(ratio * duration));
  };

  const isOldTestament =
    ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cânticos', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'].includes(
      currentTrack.book
    );

  const currentVoiceConfig = availableVoices.find((v) => v.id === selectedVoice);
  const activeVoiceName = currentVoiceConfig
    ? currentVoiceConfig.name
    : installedSystemVoices.find((voice) => voice.voiceURI === selectedSystemVoiceURI)?.name || 'Voz do dispositivo';

  // Lista de Capítulos Devocionais Recomendados
  const featuredTracks = [
    { book: 'Salmos', chapter: 23, title: 'Salmos 23', subtitle: 'O Senhor é o Meu Pastor' },
    { book: 'Salmos', chapter: 91, title: 'Salmos 91', subtitle: 'O Abrigo do Altíssimo' },
    { book: 'Salmos', chapter: 121, title: 'Salmos 121', subtitle: 'O Protetor de Israel' },
    { book: 'Mateus', chapter: 5, title: 'Mateus 5', subtitle: 'O Sermão do Monte e as Bem-Aventuranças' },
    { book: 'Mateus', chapter: 6, title: 'Mateus 6', subtitle: 'A Oração do Pai Nosso' },
    { book: 'João', chapter: 3, title: 'João 3', subtitle: 'O Novo Nascimento e Amor de Deus' },
    { book: 'Romanos', chapter: 8, title: 'Romanos 8', subtitle: 'Mais que Vencedores em Cristo' },
    { book: '1 Coríntios', chapter: 13, title: '1 Coríntios 13', subtitle: 'O Hino ao Amor Sagrado' },
    { book: 'Filipenses', chapter: 4, title: 'Filipenses 4', subtitle: 'A Paz que Excede o Entendimento' },
    { book: 'Gênesis', chapter: 1, title: 'Gênesis 1', subtitle: 'A Criação dos Céus e da Terra' },
  ];

  const prevVerseText = currentVerseIndex > 0 ? allChapterVerses[currentVerseIndex - 1] : null;
  const nextVerseText =
    currentVerseIndex + 1 < allChapterVerses.length
      ? allChapterVerses[currentVerseIndex + 1]
      : null;

  /* ── MODO FOCO / ORAÇÃO NOTURNA (OLED DEEP MEDITATION) ── */
  if (isFocusMode) {
    return (
      <div
        onClick={toggleFocusMode}
        className="fixed inset-0 z-50 bg-[#020807] text-white flex flex-col justify-between p-6 cursor-pointer animate-fade-in select-none"
      >
        {/* Top Header Zen */}
        <div className="flex items-center justify-between text-xs text-white/50 pt-2">
          <span className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-[10px]">
            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
            Modo Meditação & Oração Noturna
          </span>
          <span className="text-[11px] font-mono text-white/40">Toque para sair</span>
        </div>

        {/* Center Illuminated Scripture */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto text-center px-4 space-y-4">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400/90 font-mono">
            {currentTrack.book} {currentTrack.chapter}:{currentVerseIndex + 1}
          </span>
          <blockquote className="font-serif italic text-xl sm:text-2xl leading-relaxed text-amber-100 drop-shadow-[0_2px_15px_rgba(245,158,11,0.25)] animate-fade-in">
            "{currentVerseText || currentTrack.quote}"
          </blockquote>
          <p className="text-xs text-slate-400 font-medium">
            {currentTrack.title} • {activeVoiceName}
          </p>
        </div>

        {/* Bottom Playback Scrubber & Quick Play/Pause */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xs mx-auto flex flex-col items-center gap-3 pb-6"
        >
          <div
            onClick={handleProgressBarClick}
            className="w-full h-1 bg-white/10 rounded-full cursor-pointer relative py-1"
          >
            <div
              className="absolute left-0 top-0 h-full bg-amber-400 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-white/40 font-mono">
            <span>{formatTime(currentTime)}</span>
            {sleepTimerRemainingSec !== null && (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">bedtime</span>
                {formatSleepTimer(sleepTimerRemainingSec)}
              </span>
            )}
            <span>{formatTime(duration)}</span>
          </div>

          <button
            onClick={togglePlay}
            className="size-14 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-glow"
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-300 pb-28">
      {/* ── HEADER SUPERIOR REORGANIZADO (Sem o banner 'TOCANDO AGORA' que desperdiçava espaço) ── */}
      <header className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 justify-between border-b border-black/5 dark:border-white/5">
        <button
          onClick={() => onNavigate('screen-home')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-800 dark:text-slate-100"
          title="Minimizar player"
        >
          <span className="material-symbols-outlined text-2xl">expand_more</span>
        </button>

        {/* Título Centralizado com Acesso Imediato aos Capítulos */}
        <button
          onClick={() => setIsPlaylistModalOpen(true)}
          className="flex flex-col items-center group cursor-pointer text-center px-2"
        >
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-sacred-brand dark:group-hover:text-sacred-neon transition-colors">
              {currentTrack.book} {currentTrack.chapter}
            </h2>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {getBibleTranslationLabel(currentTrack.translationId, true)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]">
            {currentTrack.subtitle}
          </span>
        </button>

        {/* Ações da Direita: Modo Foco e Lista de Capítulos */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFocusMode}
            className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-amber-500 dark:text-amber-400"
            title="Modo Foco / Meditação Noturna"
          >
            <span className="material-symbols-outlined text-xl">bedtime</span>
          </button>
          <button
            onClick={() => setIsPlaylistModalOpen(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-800 dark:text-slate-100"
            title="Capítulos Bíblicos"
          >
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </button>
        </div>
      </header>

      {/* ── ÁREA PRINCIPAL DO PLAYER: FOCO TOTAL NA ESCRITURA ── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-1 pb-4 w-full max-w-md mx-auto">
        {/* Aviso de Incompatibilidade de Voz (Caso Raro em Browsers Legados) */}
        {!isSpeechSupported && (
          <div className="w-full mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">info</span>
            <span>A síntese de voz nativa não está habilitada neste navegador.</span>
          </div>
        )}

        {/* Orbe Sagrada 3D Viva com Efeito de Fala / Respiração */}
        <div className="flex flex-col items-center justify-center my-2 select-none">
          <div className="relative flex items-center justify-center">
            <SacredOrb state={isPlaying ? 'speaking' : 'idle'} size={145} />
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon border border-sacred-brand/20 dark:border-sacred-neon/30 text-[11px] font-bold">
            <span className="material-symbols-outlined text-sm">auto_stories</span>
            <span>{isOldTestament ? 'Antigo Testamento' : 'Novo Testamento'}</span>
            <span className="size-1 rounded-full bg-sacred-brand dark:bg-sacred-neon opacity-60" />
            <span className="font-mono text-[10px] opacity-80">
              Versículo {currentVerseIndex + 1} de {allChapterVerses.length || 6}
            </span>
          </div>
        </div>

        {/* Título & Subtítulo Dinâmico do Capítulo */}
        <div className="text-center my-1">
          <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900 dark:text-white tracking-tight">
            {currentTrack.book} {currentTrack.chapter}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {currentTrack.subtitle}
          </p>
        </div>

        {/* ── CONTAINER DE LEITURA BÍBLICA (Centralizado, Fluido & Sempre Nítido) ── */}
        <div className="w-full flex-1 flex flex-col justify-center min-h-[140px] max-h-[220px] my-auto py-1 space-y-1.5 text-center">
          {/* Versículo Anterior (Contexto suave) */}
          {prevVerseText && (
            <div
              onClick={prevVerse}
              className="px-3 py-1 cursor-pointer opacity-40 hover:opacity-75 transition-opacity text-slate-500 dark:text-slate-400"
              title="Clique para voltar a este versículo"
            >
              <p className="font-serif italic text-xs line-clamp-1">
                <span className="font-mono font-bold text-[10px] mr-1">v.{currentVerseIndex}</span>
                "{prevVerseText}"
              </p>
            </div>
          )}

          {/* VERSÍCULO ATUAL EM LEITURA (Destaque Sagrado e Revelação Contínua) */}
          <div className="relative w-full rounded-2xl bg-white/70 dark:bg-[#122320]/80 backdrop-blur-xs border border-sacred-brand/20 dark:border-sacred-neon/30 p-4 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1 text-sacred-brand dark:text-sacred-neon font-mono">
                <span className={`size-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                v.{currentVerseIndex + 1}
              </span>
              <span className="text-slate-400 font-medium">{activeVoiceName}</span>
            </div>

            <blockquote className="font-serif text-base sm:text-lg font-medium leading-relaxed text-slate-900 dark:text-amber-50">
              "{currentVerseText || currentTrack.quote}"
            </blockquote>
          </div>

          {/* Versículo Seguinte (Contexto suave) */}
          {nextVerseText && (
            <div
              onClick={nextVerse}
              className="px-3 py-1 cursor-pointer opacity-40 hover:opacity-75 transition-opacity text-slate-500 dark:text-slate-400"
              title="Clique para avançar para este versículo"
            >
              <p className="font-serif italic text-xs line-clamp-1">
                <span className="font-mono font-bold text-[10px] mr-1">v.{currentVerseIndex + 2}</span>
                "{nextVerseText}"
              </p>
            </div>
          )}
        </div>

        {/* ── BARRA DE PROGRESSO / SCRUBBER SAGRADO ── */}
        <div className="w-full flex flex-col gap-1.5 mt-2 mb-4">
          <div
            onClick={handleProgressBarClick}
            className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer group/progress py-1"
          >
            <div
              className="absolute left-0 top-0 h-full bg-sacred-brand dark:bg-sacred-neon rounded-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute h-3.5 w-3.5 bg-sacred-brand dark:bg-sacred-neon rounded-full top-1/2 -translate-y-1/2 shadow-md transition-transform group-hover/progress:scale-125"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
            <span>{formatTime(currentTime)}</span>
            {sleepTimerRemainingSec !== null && (
              <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-xs">bedtime</span>
                {formatSleepTimer(sleepTimerRemainingSec)}
              </span>
            )}
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── CONTROLES DE REPRODUÇÃO (Com Versículo Anterior / Próximo e Replay/Forward 10s) ── */}
        <div className="flex items-center justify-between w-full max-w-[320px] mb-4">
          {/* Versículo Anterior */}
          <button
            onClick={prevVerse}
            disabled={currentVerseIndex === 0}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90"
            title="Versículo anterior"
          >
            <span className="material-symbols-outlined text-2xl">skip_previous</span>
          </button>

          {/* Recuar 10 segundos */}
          <button
            onClick={() => skip(-10)}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90"
            title="Recuar 10 segundos"
          >
            <span className="material-symbols-outlined text-2xl">replay_10</span>
          </button>

          {/* Botão Play / Pause Sagrado Circular 3D */}
          <button
            onClick={togglePlay}
            className="relative flex items-center justify-center size-16 rounded-full bg-sacred-brand hover:bg-sacred-brand-dark dark:bg-sacred-neon text-white dark:text-slate-950 shadow-duo-primary active:scale-95 transition-all"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            <span
              className="material-symbols-outlined text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          {/* Avançar 10 segundos */}
          <button
            onClick={() => skip(10)}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90"
            title="Avançar 10 segundos"
          >
            <span className="material-symbols-outlined text-2xl">forward_10</span>
          </button>

          {/* Próximo Versículo */}
          <button
            onClick={nextVerse}
            disabled={currentVerseIndex + 1 >= allChapterVerses.length}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90"
            title="Próximo versículo"
          >
            <span className="material-symbols-outlined text-2xl">skip_next</span>
          </button>
        </div>

        {/* ── CONTROLOS SECUNDÁRIOS ── */}
        <div className="flex items-center justify-between w-full gap-2 mb-3">
          <label className="flex-1 min-w-0 relative">
            <span className="sr-only">Velocidade de leitura</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-slate-500">speed</span>
            <select
              aria-label="Velocidade de leitura"
              value={playbackSpeed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="w-full min-h-11 appearance-none rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 pl-8 pr-7 text-[12px] font-bold text-slate-700 dark:text-slate-200"
            >
              <option value={0.75}>0,75× · Lenta</option>
              <option value={0.9}>0,90× · Calma</option>
              <option value={1}>1,00× · Normal</option>
              <option value={1.15}>1,15× · Fluida</option>
              <option value={1.3}>1,30× · Rápida</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-slate-500">expand_more</span>
          </label>

          {/* 2. Pílula Central de Voz (Abre a gaveta modal de vozes e trilhas) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 py-2 px-3 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-sacred-brand text-slate-800 dark:text-white transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 group"
            title="Escolher Voz e Fundo Sonoro"
          >
            {/* Equalizador animado na pílula */}
            <div className="flex items-end gap-[2px] h-3">
              <span
                className={`w-0.5 bg-sacred-brand dark:bg-sacred-neon rounded-full transition-all ${
                  isPlaying ? 'animate-soundwave-1' : 'h-1.5'
                }`}
              />
              <span
                className={`w-0.5 bg-sacred-brand dark:bg-sacred-neon rounded-full transition-all ${
                  isPlaying ? 'animate-soundwave-2' : 'h-2.5'
                }`}
              />
              <span
                className={`w-0.5 bg-sacred-brand dark:bg-sacred-neon rounded-full transition-all ${
                  isPlaying ? 'animate-soundwave-3' : 'h-1.5'
                }`}
              />
            </div>
            <span className="text-xs font-bold truncate">
              {activeVoiceName}
            </span>
          </button>

        </div>

        {/* ── BANNER DE APOIO MISSIONÁRIO (Canônico, Fechável Manualmente e Auto-Fechamento em 8s) ── */}
        {!isDonationDismissed && (
          <div className="relative w-full rounded-2xl bg-gradient-to-r from-sacred-terracotta/20 via-surface-light dark:via-dark-card to-sacred-terracotta/10 border border-sacred-terracotta/30 p-3.5 shadow-md text-left text-slate-900 dark:text-white transition-all animate-fade-in overflow-hidden">
            {/* Barra de Progresso Regressiva de Auto-Fechamento */}
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-sacred-terracotta transition-all duration-1000 ease-linear"
              style={{ width: `${(donationSecondsLeft / 8) * 100}%` }}
            />

            {/* Botão Fechar Manual (X) no Canto Superior Direito */}
            <button
              onClick={() => dismissDonationBanner(true)}
              className="absolute top-2 right-2 size-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              title="Fechar aviso de apoio"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="p-2 bg-sacred-terracotta/20 text-sacred-terracotta dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-xl">volunteer_activism</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h5 className="font-extrabold text-xs text-sacred-terracotta dark:text-amber-200">
                    Ajude a levar a Palavra mais longe
                  </h5>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    ({donationSecondsLeft}s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  Sua contribuição apoia o desenvolvimento de vozes nativas em línguas sagradas.
                </p>
              </div>
            </div>

            <button
              onClick={() => openPricingModal()}
              className="w-full mt-2.5 py-2 px-3 rounded-xl bg-sacred-terracotta hover:bg-sacred-terracotta-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-duo-terracotta active:scale-[0.98] transition-all"
            >
              <span>Apoiar Projeto</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        )}
      </main>

      {/* ── MODAIS E GAVETAS DE APOIO ── */}

      {/* 1. Bottom Sheet de Vozes e Trilhas 432Hz */}
      <AudioSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showToast={showToast}
      />

      {/* 2. Modal de Escolha de Capítulos de Áudio */}
      {isPlaylistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col space-y-3 animate-scale-in max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon">
                  queue_music
                </span>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Capítulos em Áudio
                </h3>
              </div>
              <button
                onClick={() => setIsPlaylistModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Acompanhar com Texto Bíblico */}
            <button
              onClick={() => {
                setIsPlaylistModalOpen(false);
                onNavigate('screen-biblia');
                showToast(`Abrindo o leitor bíblico de ${currentTrack.book} ${currentTrack.chapter}...`, 'menu_book');
              }}
              className="w-full p-2.5 rounded-xl border border-sacred-brand/30 bg-sacred-brand/10 text-sacred-brand dark:text-sacred-neon font-bold text-xs flex items-center justify-center gap-2 hover:bg-sacred-brand/20 transition-colors"
            >
              <span className="material-symbols-outlined text-base">menu_book</span>
              <span>Ler Texto Completo deste Capítulo</span>
            </button>

            {/* Seletor Canônico dos 66 Livros */}
            <button
              onClick={() => {
                setIsPlaylistModalOpen(false);
                setIsBookSelectorOpen(true);
              }}
              className="w-full p-3 rounded-2xl bg-sacred-brand hover:bg-sacred-brand-dark dark:bg-sacred-neon text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-duo-primary transition-colors"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
              <span>Escolher Qualquer um dos 66 Livros</span>
            </button>

            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block pt-1">
              Passagens Meditativas Populares:
            </span>

            <div className="space-y-2 overflow-y-auto max-h-[44vh] pr-1">
              {featuredTracks.map((tr) => {
                const isCurrent =
                  currentTrack.book === tr.book && currentTrack.chapter === tr.chapter;
                return (
                  <button
                    key={`${tr.book}_${tr.chapter}`}
                    onClick={async () => {
                      const loaded = await loadTrack(tr.book, tr.chapter, tr.title, currentTrack.translationId);
                      setIsPlaylistModalOpen(false);
                      showToast(
                        loaded ? `Carregando ${tr.title}...` : `O texto de ${tr.book} ${tr.chapter} não está integrado nesta edição.`,
                        loaded ? 'headphones' : 'info'
                      );
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'border-sacred-brand bg-sacred-brand/10 text-sacred-brand dark:border-sacred-neon dark:text-sacred-neon font-bold shadow-xs'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark-alt hover:border-sacred-brand/40 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-bold">{tr.title}</h5>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {tr.subtitle}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg">
                      {isCurrent && isPlaying ? 'volume_up' : 'play_circle'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Seletor Universal de 66 Livros */}
      <BookSelectorModal
        isOpen={isBookSelectorOpen}
        onClose={() => setIsBookSelectorOpen(false)}
        currentBook={currentTrack.book}
        currentChapter={currentTrack.chapter}
        onSelect={async (b, c) => {
          const loaded = await loadTrack(b, c, `${b} ${c}`, currentTrack.translationId);
          showToast(
            loaded ? `Carregando narração de ${b} ${c}...` : `O texto de ${b} ${c} não está integrado nesta edição.`,
            loaded ? 'headphones' : 'info'
          );
        }}
      />
    </div>
  );
};
