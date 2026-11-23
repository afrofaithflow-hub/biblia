import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  getBibleChapter,
  loadBibleChapter,
  getBibleTranslationLabel,
  BibleVerse,
} from '../../data/bibleData';
import {
  getHighlights,
  saveHighlight,
  removeHighlight,
  getVerseNotes,
  saveVerseNote,
  deleteVerseNote,
  getFavorites,
  toggleFavorite,
  getReaderSettings,
  saveReaderSettings,
  getLastRead,
  saveLastRead,
  getReadChapters,
  getDetailedChapterProgress,
  recordChapterProgress,
  recordVerseProgress,
  toggleChapterRead,
  HighlightColor,
  ReaderSettings,
} from '../../lib/bibleStorage';
import { BookSelectorModal } from './BookSelectorModal';
import { VerseActionSheet } from './VerseActionSheet';
import { VerseNoteModal } from './VerseNoteModal';
import { ShareVerseModal } from './ShareVerseModal';
import type { RecoverySession } from '../../types/gameContracts';
import {
  clampContextToChapter,
  computeMinReadSeconds,
  findBibleBookByName,
} from '../../lib/scriptureReference';
import {
  cancelReadingRecovery,
  loadActiveLessonSession,
  updateReadingProgress,
} from '../../lib/gameRecovery';

interface BibleReaderProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const BibleReader: React.FC<BibleReaderProps> = ({ onNavigate, showToast }) => {
  // Posição de Leitura e Versículo Memorizado
  const lastRead = useMemo(() => getLastRead(), []);
  const [currentBook, setCurrentBook] = useState<string>(lastRead.book || 'João');
  const [currentChapter, setCurrentChapter] = useState<number>(lastRead.chapter || 3);
  const currentVerseRef = useRef<number>(lastRead.verse || 1);

  // Configurações do Leitor
  const [settings, setSettings] = useState<ReaderSettings>(() => getReaderSettings());
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showTranslationsModal, setShowTranslationsModal] = useState(false);

  // Modais de Apoio
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedVerseObj, setSelectedVerseObj] = useState<BibleVerse | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Armazenamento Local Reativo
  const [highlights, setHighlights] = useState<Record<string, HighlightColor>>(() => getHighlights());
  const [verseNotes, setVerseNotes] = useState(() => getVerseNotes());
  const [favorites, setFavorites] = useState(() => getFavorites());
  const [readChapters, setReadChapters] = useState<string[]>(() => getReadChapters());
  const [chapterProgress, setChapterProgress] = useState(() => getDetailedChapterProgress());

  // Áudio Bíblico
  const { loadTrack, pause, togglePlay, currentVerseIndex, isPlaying, currentTrack } = useAudio();
  const { themeMode } = useTheme();

  // Scroll ref e referência pendente de salto
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollVerseRef = useRef<number | null>(null);

  // Estado da Leitura Orientada (Fluxo Ler -> Compreender -> Recuperar)
  const [recoverySession, setRecoverySession] = useState<RecoverySession | null>(() => {
    const rec = loadActiveLessonSession()?.recovery;
    if (rec && ['reading_pending', 'reading_in_progress', 'reading_validated'].includes(rec.status)) {
      return rec;
    }
    return null;
  });
  const sawStartRef = useRef<boolean>(recoverySession?.sawStartVerse ?? false);
  const sawEndRef = useRef<boolean>(recoverySession?.sawEndVerse ?? false);
  const visibleMsRef = useRef<number>(recoverySession?.accumulatedVisibleTimeMs ?? 0);

  // Dados do Capítulo Atual
  const [chapterData, setChapterData] = useState(() => getBibleChapter(currentBook, currentChapter, settings.translation));
  const [isChapterLoading, setIsChapterLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setIsChapterLoading(true);
    loadBibleChapter(currentBook, currentChapter, settings.translation)
      .then((data) => { if (active) setChapterData(data); })
      .catch(() => {
        if (active) setChapterData({
          ...getBibleChapter(currentBook, currentChapter, settings.translation),
          notice: 'Não foi possível carregar este livro. Verifique a ligação e tente novamente.',
        });
      })
      .finally(() => { if (active) setIsChapterLoading(false); });
    return () => { active = false; };
  }, [currentBook, currentChapter, settings.translation]);
  const chapterKey = `${currentBook}_${currentChapter}`;
  const isRead = chapterProgress[chapterKey]?.read ?? readChapters.includes(chapterKey);

  // Metadados do Livro Atual no Cânon
  const currentBookMeta = useMemo(() => {
    return BIBLE_BOOKS.find((b) => b.name === currentBook) || BIBLE_BOOKS[42];
  }, [currentBook]);

  // Se o áudio deste capítulo exato está tocando agora
  const isThisChapterPlaying =
    isPlaying &&
    currentTrack.book === currentBook &&
    currentTrack.chapter === currentChapter &&
    currentTrack.translationId === settings.translation;

  // Mantém a posição de texto alinhada com o versículo real acompanhado no áudio.
  useEffect(() => {
    const sameTrack =
      currentTrack.book === currentBook &&
      currentTrack.chapter === currentChapter &&
      currentTrack.translationId === settings.translation;
    const activeVerse = sameTrack ? chapterData.verses[currentVerseIndex] : undefined;
    if (activeVerse) currentVerseRef.current = activeVerse.num;
  }, [chapterData.verses, currentBook, currentChapter, currentTrack, currentVerseIndex, settings.translation]);

  // Navegação explícita protegida: grava a posição apenas em eventos reais de navegação
  const navigateToChapter = (book: string, chapter: number, verse: number = 1) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    currentVerseRef.current = verse;
    saveLastRead(book, chapter, verse, settings.translation);
  };

  // Referências do Assistente Teológico e da Jornada chegam por um pedido transitório.
  // Validamos e normalizamos acentos/abreviações antes de alterar a leitura.
  useEffect(() => {
    const rawReference = window.localStorage.getItem('biblia_pending_reference');
    if (!rawReference) return;
    window.localStorage.removeItem('biblia_pending_reference');

    try {
      const reference = JSON.parse(rawReference) as { book?: unknown; chapter?: unknown; verses?: unknown };
      const book = typeof reference.book === 'string'
        ? findBibleBookByName(reference.book)
        : undefined;
      const chapter = Number(reference.chapter);
      const firstVerse = Array.isArray(reference.verses)
        ? reference.verses.map(Number).find((verse) => Number.isInteger(verse) && verse > 0)
        : 1;

      if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.totalChapters || !firstVerse) {
        showToast('A referência recebida não é válida para o leitor.', 'error');
        return;
      }

      pendingScrollVerseRef.current = firstVerse;
      navigateToChapter(book.name, chapter, firstVerse);
    } catch {
      showToast('Não foi possível abrir a referência bíblica.', 'error');
    }
  }, []);

  // Scroll determinístico após o capítulo carregar: respeita pendingScrollVerseRef antes do topo
  const initialVerseScrolled = useRef(false);
  useEffect(() => {
    if (isChapterLoading) return;

    if (pendingScrollVerseRef.current !== null) {
      const target = pendingScrollVerseRef.current;
      pendingScrollVerseRef.current = null;
      const timer = setTimeout(() => {
        const el = document.getElementById(`verse-${target}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }

    if (!initialVerseScrolled.current && lastRead.verse && lastRead.verse > 1) {
      initialVerseScrolled.current = true;
      const timer = setTimeout(() => {
        const el = document.getElementById(`verse-${lastRead.verse}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentBook, currentChapter, isChapterLoading, lastRead]);

  // Camada A: Evidência de leitura orientada (versículo + contexto, tempo visível real e scroll)
  const recoveryContext = useMemo(() => {
    if (!recoverySession) return null;
    const isSameChapter =
      recoverySession.targetBook === currentBook &&
      recoverySession.targetChapter === currentChapter;
    const range = clampContextToChapter(
      recoverySession.contextStartVerse,
      recoverySession.contextEndVerse,
      Math.max(1, chapterData.verses.length)
    );
    const contextVerses = isSameChapter
      ? chapterData.verses.filter((v) => v.num >= range.start && v.num <= range.end)
      : [];
    const wordCount = contextVerses.reduce(
      (acc, v) => acc + v.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );
    const minReadSeconds = computeMinReadSeconds(wordCount);
    return { isSameChapter, range, minReadSeconds };
  }, [recoverySession, currentBook, currentChapter, chapterData.verses]);

  useEffect(() => {
    if (!recoverySession || !recoveryContext?.isSameChapter || isChapterLoading) return;
    if (chapterData.verses.length === 0) return;

    const root = mainScrollRef.current;
    const startEl = document.getElementById(`verse-${recoveryContext.range.start}`);
    const endEl = document.getElementById(`verse-${recoveryContext.range.end}`);

    let observer: IntersectionObserver | null = null;
    if (root && typeof IntersectionObserver !== 'undefined' && (startEl || endEl)) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (entry.target === startEl) sawStartRef.current = true;
            if (entry.target === endEl) sawEndRef.current = true;
          }
        },
        { root, threshold: 0.25 }
      );
      if (startEl) observer.observe(startEl);
      if (endEl) observer.observe(endEl);
    } else {
      sawStartRef.current = true;
      sawEndRef.current = true;
    }

    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.min(500, Math.max(0, now - lastTick));
      lastTick = now;

      if (document.visibilityState === 'visible' && sawStartRef.current) {
        visibleMsRef.current += delta;
      }

      const updated = updateReadingProgress({
        accumulatedVisibleTimeMs: visibleMsRef.current,
        sawStartVerse: sawStartRef.current,
        sawEndVerse: sawEndRef.current,
        minReadSeconds: recoveryContext.minReadSeconds,
      });
      if (updated) {
        setRecoverySession(updated);
      }
    }, 250);

    return () => {
      observer?.disconnect();
      window.clearInterval(interval);
    };
  }, [
    recoverySession?.questionId,
    recoveryContext?.isSameChapter,
    recoveryContext?.range.start,
    recoveryContext?.range.end,
    recoveryContext?.minReadSeconds,
    isChapterLoading,
    chapterData.verses.length,
  ]);

  // Durante leitura por texto, grava o versículo que ocupa a zona central do leitor.
  // A posição é pessoal/local e não declara o capítulo como concluído.
  useEffect(() => {
    const root = mainScrollRef.current;
    if (!root || isThisChapterPlaying || typeof IntersectionObserver === 'undefined') return;

    const verseElements = Array.from(root.querySelectorAll<HTMLElement>('[data-bible-verse]'));
    if (verseElements.length === 0) return;

    let completionTimer: ReturnType<typeof setTimeout> | null = null;
    let verseReadTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingVerseNumber = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const verseNumber = Number(activeEntry?.target.getAttribute('data-bible-verse'));
        if (Number.isInteger(verseNumber) && verseNumber > 0 && verseNumber !== currentVerseRef.current) {
          currentVerseRef.current = verseNumber;
          saveLastRead(currentBook, currentChapter, verseNumber, settings.translation);
        }

        if (activeEntry && verseNumber > 0 && verseNumber !== pendingVerseNumber) {
          if (verseReadTimer) clearTimeout(verseReadTimer);
          pendingVerseNumber = verseNumber;
          verseReadTimer = setTimeout(() => {
            if (currentVerseRef.current === verseNumber) {
              recordVerseProgress(currentBook, currentChapter, verseNumber, 'read', settings.translation);
            }
            verseReadTimer = null;
          }, 2500);
        }

        const finalVerseNumber = chapterData.verses[chapterData.verses.length - 1]?.num;
        const activeVerseNumber = Number(activeEntry?.target.getAttribute('data-bible-verse'));
        if (chapterData.isComplete && activeVerseNumber === finalVerseNumber && !isRead) {
          if (!completionTimer) {
            completionTimer = setTimeout(() => {
              if (currentVerseRef.current === finalVerseNumber) {
                recordChapterProgress(currentBook, currentChapter, 'read', true);
                setChapterProgress(getDetailedChapterProgress());
                setReadChapters(getReadChapters());
                showToast(`Leitura de ${currentBook} ${currentChapter} concluída.`, 'check_circle');
              }
              completionTimer = null;
            }, 2500);
          }
        } else if (completionTimer) {
          clearTimeout(completionTimer);
          completionTimer = null;
        }
      },
      { root, rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );

    verseElements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      if (completionTimer) clearTimeout(completionTimer);
      if (verseReadTimer) clearTimeout(verseReadTimer);
    };
  }, [chapterData, currentBook, currentChapter, isRead, isThisChapterPlaying, settings.translation, showToast]);

  // Actualiza os estados separados de leitura e audição depois de uma sessão de áudio.
  useEffect(() => {
    setChapterProgress(getDetailedChapterProgress());
    setReadChapters(getReadChapters());
  }, [currentTrack.id, isPlaying]);

  // Atualizar configurações salvas
  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    const updated = saveReaderSettings(newSettings);
    setSettings(updated);
  };

  // Navegação entre Capítulos com gravação no evento real
  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      navigateToChapter(currentBook, currentChapter - 1, 1);
    } else {
      // Ir para o livro anterior se houver
      const currentIndex = BIBLE_BOOKS.findIndex((b) => b.name === currentBook);
      if (currentIndex > 0) {
        const prevBook = BIBLE_BOOKS[currentIndex - 1];
        navigateToChapter(prevBook.name, prevBook.totalChapters, 1);
      } else {
        showToast('Você está no primeiro capítulo da Bíblia (Gênesis 1).', 'info');
      }
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < currentBookMeta.totalChapters) {
      navigateToChapter(currentBook, currentChapter + 1, 1);
    } else {
      // Ir para o próximo livro se houver
      const currentIndex = BIBLE_BOOKS.findIndex((b) => b.name === currentBook);
      if (currentIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentIndex + 1];
        navigateToChapter(nextBook.name, 1, 1);
      } else {
        showToast('Você chegou ao último capítulo das Escrituras (Apocalipse 22)!', 'celebration');
      }
    }
  };

  // Áudio Play/Pause com guarda de disponibilidade canônica
  const handleToggleAudio = async () => {
    if (chapterData.completeness === 'unavailable' || chapterData.verses.length === 0) {
      showToast('Áudio indisponível: este capítulo requer sincronização de texto canônico.', 'warning');
      return;
    }
    if (isThisChapterPlaying) {
      togglePlay();
    } else {
      const loaded = await loadTrack(
        currentBook,
        currentChapter,
        `${currentBook} ${currentChapter} — ${chapterData.title}`,
        settings.translation,
        currentVerseRef.current
      );
      if (!loaded) {
        showToast('Não foi possível carregar o texto desta edição para áudio.', 'warning');
        return;
      }
      if (!chapterData.sourceVerified) {
        showToast(
          `Áudio de amostra de ${currentBook} ${currentChapter}. Edição por confirmar; não conta para progresso nem XP.`,
          'headphones'
        );
      } else if (!chapterData.isComplete) {
        showToast(
          `Ouvindo passagem selecionada de ${currentBook} ${currentChapter} (${chapterData.presentVersesCount} vv.). Trecho parcial.`,
          'headphones'
        );
      } else {
        showToast(`Ouvindo ${currentBook} ${currentChapter} integral com voz serena...`, 'headphones');
      }
    }
  };

  // Marcar/Desmarcar Capítulo Lido (com registro semântico do progresso e guarda de integridade canônica)
  const handleToggleReadStatus = () => {
    // Guarda de fidelidade canônica: apenas capítulos 100% integrais e verificados podem ser concluídos
    if (!chapterData.isComplete) {
      showToast(
        chapterData.completeness === 'unavailable'
          ? 'Esta edição ainda não tem texto integrado para este capítulo.'
          : !chapterData.sourceVerified
          ? 'Esta amostra ainda não tem edição e fonte confirmadas. Não pode ser marcada como lida nem conceder XP.'
          : `Este texto é uma passagem parcial (${chapterData.presentVersesCount} de ${chapterData.totalCanonicalVerses || '?'} versículos). A conclusão formal de leitura exige o capítulo integral canônico.`,
        'lock'
      );
      return;
    }
    const finalVerseNumber = chapterData.verses[chapterData.verses.length - 1]?.num;
    if (!isRead && currentVerseRef.current !== finalVerseNumber) {
      showToast('Chegue ao último versículo para concluir a leitura deste capítulo.', 'menu_book');
      return;
    }
    const nextRead = toggleChapterRead(currentBook, currentChapter);
    setChapterProgress(getDetailedChapterProgress());
    setReadChapters(getReadChapters());
    if (nextRead) {
      showToast(`Capítulo ${currentBook} ${currentChapter} marcado como lido.`, 'check_circle');
    } else {
      showToast(`Marcação de leitura removida de ${currentBook} ${currentChapter}`, 'history');
    }
  };

  // Ações de Versículo e persistência da posição exata por versículo
  const handleVerseClick = (verse: BibleVerse) => {
    setSelectedVerseObj(verse);
    setIsActionSheetOpen(true);
    // Persistência granular: atualiza a posição da última leitura com o versículo exato tocado
    currentVerseRef.current = verse.num;
    saveLastRead(currentBook, currentChapter, verse.num, settings.translation);
  };

  const handleApplyHighlight = (color: HighlightColor) => {
    if (!selectedVerseObj) return;
    saveHighlight(currentBook, currentChapter, selectedVerseObj.num, color);
    setHighlights(getHighlights());
    setIsActionSheetOpen(false);
    showToast(`Versículo ${selectedVerseObj.num} destacado!`, 'palette');
  };

  const handleRemoveHighlight = () => {
    if (!selectedVerseObj) return;
    removeHighlight(currentBook, currentChapter, selectedVerseObj.num);
    setHighlights(getHighlights());
    setIsActionSheetOpen(false);
    showToast(`Destaque do versículo ${selectedVerseObj.num} removido.`, 'format_color_reset');
  };

  const handleToggleFavoriteVerse = () => {
    if (!selectedVerseObj) return;
    const isNowFav = toggleFavorite(
      currentBook,
      currentChapter,
      selectedVerseObj.num,
      selectedVerseObj.text,
      settings.translation
    );
    setFavorites(getFavorites());
    setIsActionSheetOpen(false);
    showToast(
      isNowFav ? `Versículo ${selectedVerseObj.num} guardado nos favoritos!` : 'Removido dos favoritos.',
      'favorite'
    );
  };

  const handleCopySelectedVerse = () => {
    if (!selectedVerseObj) return;
    const fullText = `"${selectedVerseObj.text}" — ${currentBook} ${currentChapter}:${selectedVerseObj.num} (${getBibleTranslationLabel(settings.translation)} • BiblIA)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      showToast(`Versículo ${selectedVerseObj.num} copiado!`, 'content_copy');
    }
    setIsActionSheetOpen(false);
  };

  const handleAskAITopic = () => {
    if (!selectedVerseObj) return;
    setIsActionSheetOpen(false);
    showToast(`Consultando IA sobre ${currentBook} ${currentChapter}:${selectedVerseObj.num}...`, 'auto_awesome');
    onNavigate('screen-ai');
  };

  // Estilização por Tema de Leitura
  const getThemeClasses = () => {
    if (settings.readingTheme === 'sepia') {
      return 'bg-[#FBF0D9] text-[#423120]';
    }
    if (settings.readingTheme === 'night') {
      return 'bg-[#061210] text-[#E2E8F0]';
    }
    return 'bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100';
  };

  // Estilização da Entrelinha
  const getLineHeightClass = () => {
    if (settings.lineHeight === 'loose') return 'leading-loose';
    if (settings.lineHeight === 'relaxed') return 'leading-relaxed';
    return 'leading-normal';
  };

  // Estilização da Fonte
  const getFontFamilyClass = () => {
    if (settings.fontFamily === 'serif') return 'font-serif';
    if (settings.fontFamily === 'sans') return 'font-sans';
    return 'font-scripture';
  };

  // Cor de marcação de versículo
  const getHighlightBg = (color?: HighlightColor) => {
    if (!color) return '';
    switch (color) {
      case 'yellow':
        return 'bg-amber-200/50 dark:bg-amber-400/20 text-amber-950 dark:text-amber-100';
      case 'green':
        return 'bg-emerald-200/50 dark:bg-emerald-400/20 text-emerald-950 dark:text-emerald-100';
      case 'blue':
        return 'bg-sky-200/50 dark:bg-sky-400/20 text-sky-950 dark:text-sky-100';
      case 'rose':
        return 'bg-rose-200/50 dark:bg-rose-400/20 text-rose-950 dark:text-rose-100';
      case 'purple':
        return 'bg-purple-200/50 dark:bg-purple-400/20 text-purple-950 dark:text-purple-100';
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-300 relative select-text ${getThemeClasses()}`}
    >
      {/* ── TOP HEADER (Barra Fixa Superior) ── */}
      {!settings.distractionFree && (
        <header className="flex-none bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex items-center justify-between px-3 py-2.5 max-w-md mx-auto w-full">
            {/* Voltar ao Início */}
            <button
              onClick={() => onNavigate('screen-home')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              title="Voltar ao Início"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>

            {/* Seletor Canônico de Livro e Capítulo */}
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-surface-dark-alt px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-all shadow-xs group"
            >
              <span className="font-extrabold text-sm text-primary dark:text-primary-light">
                {currentBook} {currentChapter}
              </span>
              <span className="material-symbols-outlined text-primary text-base group-hover:translate-y-0.5 transition-transform">
                expand_more
              </span>
            </button>

            {/* Ações da Direita */}
            <div className="flex items-center gap-1">
              {/* Botão Áudio Rápido */}
              <button
                onClick={handleToggleAudio}
                className={`p-2 rounded-full transition-all ${
                  isThisChapterPlaying
                    ? 'bg-primary text-white shadow-sm ring-2 ring-primary/40 animate-pulse'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isThisChapterPlaying ? 'Pausar Áudio' : 'Ouvir Capítulo'}
              >
                <span className="material-symbols-outlined text-xl">
                  {isThisChapterPlaying ? 'pause' : 'headphones'}
                </span>
              </button>

              {/* Botão Configurações Tipográficas */}
              <button
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className={`p-2 rounded-full transition-colors ${
                  showSettingsPanel
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Ajustes de Leitura"
              >
                <span className="material-symbols-outlined text-xl">text_fields</span>
              </button>
            </div>
          </div>

          {/* Tradução Ativa & Status Bar */}
          <div className="flex items-center justify-between px-4 pb-2 text-[11px] max-w-md mx-auto w-full text-gray-500 dark:text-gray-400">
            <button
              onClick={() => setShowTranslationsModal(true)}
              className="flex items-center gap-1 font-semibold text-primary dark:text-primary-light hover:underline"
            >
              <span>Tradução: {getBibleTranslationLabel(settings.translation)}</span>
              <span className="material-symbols-outlined text-[13px]">arrow_drop_down</span>
            </button>

            <span className="font-mono text-[10px]">
              {currentBookMeta.category} • {currentBookMeta.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
            </span>
          </div>
        </header>
      )}

      {/* ── PAINEL FLUTUANTE DE AJUSTES TIPOGRÁFICOS ── */}
      {showSettingsPanel && (
        <div className="absolute top-[88px] right-3 left-3 sm:left-auto sm:right-6 sm:w-80 z-50 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-scale-in text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">format_paint</span>
              Conforto de Leitura
            </h4>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Seletor de Tema Visual */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Tema de Fundo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => updateSettings({ readingTheme: 'clean' })}
                className={`py-2 px-1 rounded-xl text-center font-bold border transition-all ${
                  settings.readingTheme === 'clean'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                ☀️ Claro
              </button>
              <button
                onClick={() => updateSettings({ readingTheme: 'sepia' })}
                className={`py-2 px-1 rounded-xl text-center font-bold border transition-all ${
                  settings.readingTheme === 'sepia'
                    ? 'border-amber-700 bg-[#FBF0D9] text-amber-900 shadow-xs ring-1 ring-amber-700/30'
                    : 'border-amber-200 bg-[#FBF0D9] text-amber-800 opacity-80'
                }`}
              >
                📜 Sépia
              </button>
              <button
                onClick={() => updateSettings({ readingTheme: 'night' })}
                className={`py-2 px-1 rounded-xl text-center font-bold border transition-all ${
                  settings.readingTheme === 'night'
                    ? 'border-teal-500 bg-[#061210] text-teal-400 shadow-xs'
                    : 'border-gray-800 bg-[#061210] text-gray-400'
                }`}
              >
                🌙 Noturno
              </button>
            </div>
          </div>

          {/* Tamanho da Fonte */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              <span>Tamanho da Fonte</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {settings.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                className="size-7 rounded-lg bg-gray-100 dark:bg-surface-dark-alt font-bold text-xs hover:bg-gray-200 transition-colors"
              >
                A-
              </button>
              <input
                type="range"
                min="14"
                max="26"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <button
                onClick={() => updateSettings({ fontSize: Math.min(26, settings.fontSize + 1) })}
                className="size-7 rounded-lg bg-gray-100 dark:bg-surface-dark-alt font-bold text-xs hover:bg-gray-200 transition-colors"
              >
                A+
              </button>
            </div>
          </div>

          {/* Família da Fonte */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Estilo da Tipografia
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({ fontFamily: 'serif' })}
                className={`py-2 rounded-xl text-xs font-serif font-bold border transition-all ${
                  settings.fontFamily === 'serif'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Serifa Sagrada
              </button>
              <button
                onClick={() => updateSettings({ fontFamily: 'sans' })}
                className={`py-2 rounded-xl text-xs font-sans font-bold border transition-all ${
                  settings.fontFamily === 'sans'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Moderna Sans
              </button>
            </div>
          </div>

          {/* Espaçamento Entrelinha */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Espaçamento de Linhas
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'normal', label: 'Normal' },
                  { id: 'relaxed', label: 'Relaxado' },
                  { id: 'loose', label: 'Amplo' },
                ] as const
              ).map((lh) => (
                <button
                  key={lh.id}
                  onClick={() => updateSettings({ lineHeight: lh.id })}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    settings.lineHeight === lh.id
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500'
                  }`}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modo Sem Distrações */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
              Modo Zen (Sem Distrações)
            </span>
            <button
              onClick={() => {
                updateSettings({ distractionFree: !settings.distractionFree });
                setShowSettingsPanel(false);
                showToast(
                  !settings.distractionFree
                    ? 'Modo Zen ativado! Toque no topo para reexibir a barra.'
                    : 'Modo padrão restaurado.',
                  'visibility'
                );
              }}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-surface-dark-alt font-bold text-[11px] text-primary"
            >
              Ativar
            </button>
          </div>
        </div>
      )}

      {/* ── BOTÃO PARA REEXIBIR BARRAS NO MODO ZEN ── */}
      {settings.distractionFree && (
        <button
          onClick={() => updateSettings({ distractionFree: false })}
          className="fixed top-3 right-3 z-50 size-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
          title="Sair do Modo Zen"
        >
          <span className="material-symbols-outlined text-lg">fullscreen_exit</span>
        </button>
      )}

      {/* ── BANNER DE LEITURA ORIENTADA (FLUXO LER -> COMPREENDER -> RECUPERAR) ── */}
      {recoverySession && recoveryContext && (
        <div className="shrink-0 z-30 border-b border-sacred-brand/25 dark:border-sacred-neon/30 bg-sacred-light/95 dark:bg-[#0b2320]/95 backdrop-blur-md px-4 py-2.5">
          <div className="max-w-md mx-auto w-full space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-sacred-brand dark:text-sacred-neon shrink-0">
                  {recoverySession.status === 'reading_validated' ? 'verified' : 'auto_stories'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-sacred-deep dark:text-white truncate">
                    Leitura Orientada • {recoverySession.sourceReference}
                    {recoveryContext.isSameChapter
                      ? ` (vv. ${recoveryContext.range.start}–${recoveryContext.range.end})`
                      : ''}
                  </p>
                  <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {!recoveryContext.isSameChapter
                      ? `Abra ${recoverySession.sourceReference} para validar a leitura.`
                      : recoverySession.status === 'reading_validated'
                      ? 'Leitura validada! Avance para a questão de repescagem.'
                      : !recoverySession.sawEndVerse
                      ? `Role até o versículo ${recoveryContext.range.end} para ler o contexto.`
                      : `Leia com atenção (${Math.max(
                          1,
                          Math.ceil(
                            recoveryContext.minReadSeconds -
                              recoverySession.accumulatedVisibleTimeMs / 1000
                          )
                        )}s restantes)…`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  cancelReadingRecovery();
                  onNavigate('screen-jogo-licao');
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                Voltar
              </button>
            </div>

            {recoveryContext.isSameChapter && (
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sacred-brand dark:bg-sacred-neon transition-all duration-300"
                  style={{
                    width: `${
                      recoverySession.status === 'reading_validated'
                        ? 100
                        : Math.min(
                            98,
                            Math.round(
                              (recoverySession.accumulatedVisibleTimeMs /
                                (recoveryContext.minReadSeconds * 1000)) *
                                100
                            )
                          )
                    }%`,
                  }}
                />
              </div>
            )}

            {!recoveryContext.isSameChapter ? (
              <button
                onClick={() => {
                  const first = recoverySession.targetVerses[0] || 1;
                  pendingScrollVerseRef.current = first;
                  navigateToChapter(
                    recoverySession.targetBook,
                    recoverySession.targetChapter,
                    first
                  );
                }}
                className="w-full py-2 rounded-xl bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">menu_book</span>
                <span>Voltar para {recoverySession.sourceReference}</span>
              </button>
            ) : recoverySession.status === 'reading_validated' ? (
              <button
                onClick={() => onNavigate('screen-jogo-licao')}
                className="w-full py-2.5 rounded-xl bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-[0.99] transition-transform"
              >
                <span>Terminei a leitura → Fazer repescagem (+1 ❤️)</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── ÁREA PRINCIPAL DE LEITURA (SCROLLÁVEL) ── */}
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto relative scroll-smooth px-5 sm:px-8 py-6 pb-40"
      >
        <div className="max-w-xl mx-auto">
          {/* Cabeçalho do Capítulo */}
          <div className="text-center mb-6">
            <span className="text-[10px] font-extrabold tracking-widest text-primary dark:text-primary-light uppercase mb-1 block">
              {currentBookMeta.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 font-display tracking-tight">
              {currentBook} {currentChapter}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-normal">
              {chapterData.subtitle}
            </p>
          </div>

          {/* Badge de Integridade Textual Canônica */}
          <div className="flex justify-center mb-6">
            {chapterData.completeness === 'unavailable' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                <span className="material-symbols-outlined text-xs">sync</span>
                <span>Texto desta edição ainda não integrado</span>
              </span>
            ) : !chapterData.sourceVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                <span className="material-symbols-outlined text-xs">source_notes</span>
                <span>Amostra local — edição e fonte por confirmar</span>
              </span>
            ) : chapterData.isComplete ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>Capítulo Integral Canônico ({chapterData.presentVersesCount} de {chapterData.totalCanonicalVerses} versículos)</span>
              </span>
            ) : chapterData.completeness === 'partial' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                <span className="material-symbols-outlined text-xs">history_edu</span>
                <span>Passagem Bíblica Selecionada ({chapterData.presentVersesCount} de {chapterData.totalCanonicalVerses || '?'} versículos)</span>
              </span>
            ) : null}
          </div>

          {/* Barra de Ações Rápidas do Capítulo */}
          <div className="flex justify-center items-center gap-2 mb-8 flex-wrap">
            <button
              onClick={handleToggleAudio}
              disabled={chapterData.completeness === 'unavailable' || chapterData.verses.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs ${
                chapterData.completeness === 'unavailable' || chapterData.verses.length === 0
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'
                  : isThisChapterPlaying
                  ? 'bg-primary text-white border-primary shadow-primary/20'
                  : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
              }`}
              title={
                chapterData.completeness === 'unavailable' || chapterData.verses.length === 0
                  ? 'Áudio não disponível para este capítulo'
                  : isThisChapterPlaying
                  ? 'Pausar reprodução'
                  : 'Ouvir capítulo com áudio sintetizado'
              }
            >
              <span className="material-symbols-outlined text-[16px]">
                {isThisChapterPlaying ? 'pause' : 'headphones'}
              </span>
              <span>{isThisChapterPlaying ? 'Pausar Áudio' : 'Ouvir Capítulo'}</span>
            </button>

            <button
              onClick={() => {
                showToast(`Iniciando estudo teológico de ${currentBook} ${currentChapter}...`, 'auto_awesome');
                onNavigate('screen-ai');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/10 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-secondary/20 transition-all border border-secondary/20 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Explicar com IA</span>
            </button>

            <button
              onClick={handleToggleReadStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                !chapterData.isComplete
                  ? 'opacity-65 bg-gray-100 dark:bg-surface-dark-alt text-gray-500 border-dashed border-gray-300 dark:border-gray-700 cursor-not-allowed'
                  : isRead
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  : 'bg-gray-100 dark:bg-surface-dark-alt text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
              }`}
              title={
                !chapterData.isComplete
                  ? !chapterData.sourceVerified
                    ? chapterData.completeness === 'unavailable'
                      ? 'Conclusão bloqueada: texto desta edição ainda não integrado'
                      : 'Conclusão bloqueada: edição e fonte do texto por confirmar'
                    : 'Conclusão bloqueada: passagem bíblica parcial'
                  : isRead
                  ? 'Desmarcar leitura'
                  : 'Marcar capítulo como lido'
              }
            >
              <span className="material-symbols-outlined text-[16px]">
                {!chapterData.isComplete ? 'lock' : isRead ? 'task_alt' : 'check'}
              </span>
              <span>
                {!chapterData.isComplete
                  ? !chapterData.sourceVerified
                    ? chapterData.completeness === 'unavailable'
                      ? 'Texto não Integrado'
                      : 'Fonte por Confirmar'
                    : 'Passagem Parcial'
                  : isRead
                  ? 'Capítulo Lido'
                  : 'Marcar como Lido'}
              </span>
            </button>
          </div>

          {/* Subtítulo Temático da Seção */}
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5 font-display flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
            <span className="material-symbols-outlined text-primary text-lg">bookmark</span>
            <span>{chapterData.title}</span>
          </h2>

          {/* ── CONTEÚDO DO CAPÍTULO (CANÔNICO OU AVISO DE SINCRONIZAÇÃO) ── */}
          {isChapterLoading ? (
            <div className="my-8 py-12 text-center text-sm text-gray-500" role="status">A carregar {currentBook}…</div>
          ) : chapterData.completeness === 'unavailable' ? (
            <div className="my-6 p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 text-center space-y-4">
              <div className="size-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Texto desta edição indisponível
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {chapterData.notice ||
                    `O texto integral de ${currentBook} ${currentChapter} requer sincronização de base canônica autorizada.`}
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70 italic pt-1">
                  A BiblIA preserva a santidade da Palavra: não inventamos versículos nem recorremos a sínteses fictícias de IA.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`space-y-4 transition-all ${getFontFamilyClass()} ${getLineHeightClass()}`}
              style={{ fontSize: `${settings.fontSize}px` }}
            >
              {/* Banner de Esclarecimento se o Capítulo for Parcial */}
              {(!chapterData.sourceVerified || chapterData.completeness === 'partial') && (
                <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-left">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      Passagem Selecionada:{' '}
                    </span>
                    {chapterData.notice}
                  </div>
                </div>
              )}

              {chapterData.verses.map((verse, idx) => {
                const verseId = `${currentBook}_${currentChapter}_${verse.num}`;
                const highlight = highlights[verseId];
                const isFavorite = !!favorites[verseId];
                const note = verseNotes[verseId];
                const isSpokenNow = isThisChapterPlaying && currentVerseIndex === idx;
                const isTargetRecoveryVerse =
                  Boolean(recoveryContext?.isSameChapter) &&
                  Boolean(recoverySession?.targetVerses.includes(verse.num));
                const isContextRecoveryVerse =
                  Boolean(recoveryContext?.isSameChapter) &&
                  Boolean(recoveryContext) &&
                  verse.num >= recoveryContext!.range.start &&
                  verse.num <= recoveryContext!.range.end;

                return (
                  <div
                    key={verse.num}
                    id={`verse-${verse.num}`}
                    data-bible-verse={verse.num}
                    onClick={() => handleVerseClick(verse)}
                    className={`relative group rounded-xl p-2.5 -mx-2.5 transition-all cursor-pointer ${
                      isSpokenNow
                        ? 'bg-sacred-light/90 dark:bg-sacred-neon/15 border-l-4 border-sacred-brand dark:border-sacred-neon ring-1 ring-sacred-brand/20 shadow-sm'
                        : isTargetRecoveryVerse
                        ? 'bg-sacred-light/80 dark:bg-sacred-neon/15 border-l-4 border-sacred-brand dark:border-sacred-neon ring-1 ring-sacred-brand/25'
                        : isContextRecoveryVerse
                        ? 'bg-sacred-light/35 dark:bg-sacred-neon/5 border-l-2 border-sacred-brand/40 dark:border-sacred-neon/40'
                        : highlight
                        ? `${getHighlightBg(highlight)} rounded-lg`
                        : 'hover:bg-gray-100/60 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    {/* Badge do Versículo da Questão (Leitura Orientada) */}
                    {isTargetRecoveryVerse && !isSpokenNow && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sacred-brand/15 dark:bg-sacred-neon/20 text-sacred-brand dark:text-sacred-neon text-[9.5px] font-black uppercase tracking-wider mr-2 align-middle">
                        <span className="material-symbols-outlined text-[12px]">bookmark</span>
                        <span>Versículo da questão</span>
                      </span>
                    )}

                    {/* Badge de Fala do Áudio em Tempo Real */}
                    {isSpokenNow && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-[9.5px] font-black uppercase tracking-wider shadow-xs mb-1.5 animate-pulse">
                        <span className="material-symbols-outlined text-[12px]">volume_up</span>
                        <span>Ouvindo Agora</span>
                      </span>
                    )}

                    {/* Texto do Versículo */}
                    <p className="inline">
                      <sup className="text-[11px] font-sans font-bold text-primary dark:text-primary-light mr-1.5 select-none opacity-80">
                        {verse.num}
                      </sup>
                      <span>{verse.text}</span>
                    </p>

                    {/* Badges de Favorito ou Nota Pessoal */}
                    {(isFavorite || note) && (
                      <span className="inline-flex items-center gap-1 ml-2 align-middle">
                        {isFavorite && (
                          <span
                            className="material-symbols-outlined text-[14px] text-rose-500"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            title="Versículo Favoritado"
                          >
                            favorite
                          </span>
                        )}
                        {note && (
                          <span
                            className="material-symbols-outlined text-[14px] text-amber-500"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            title="Possui Nota Pessoal"
                          >
                            edit_note
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── NAVEGAÇÃO ENTRE CAPÍTULOS NO RODAPÉ ── */}
          <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
            <button
              onClick={handlePrevChapter}
              className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 dark:bg-surface-dark-alt hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center justify-center gap-2 transition-all border border-gray-200/50 dark:border-gray-700/50 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Anterior</span>
            </button>

            <button
              onClick={() => setIsBookModalOpen(true)}
              className="py-3 px-4 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all active:scale-95 border border-primary/20"
              title="Mudar de Livro ou Capítulo"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
            </button>

            <button
              onClick={handleNextChapter}
              className="flex-1 py-3 px-4 rounded-2xl bg-primary text-white hover:bg-primary-dark text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              <span>Próximo</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── MODAIS INTEGRADOS ── */}
      {/* 1. Seletor de Livros & Capítulos */}
      <BookSelectorModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        currentBook={currentBook}
        currentChapter={currentChapter}
        onSelect={(b, c) => {
          navigateToChapter(b, c, 1);
        }}
      />

      {/* 2. Menu de Ações no Versículo */}
      {selectedVerseObj && (
        <VerseActionSheet
          isOpen={isActionSheetOpen}
          onClose={() => setIsActionSheetOpen(false)}
          book={currentBook}
          chapter={currentChapter}
          verseNum={selectedVerseObj.num}
          verseText={selectedVerseObj.text}
          currentHighlight={highlights[`${currentBook}_${currentChapter}_${selectedVerseObj.num}`]}
          isFavorite={!!favorites[`${currentBook}_${currentChapter}_${selectedVerseObj.num}`]}
          hasNote={!!verseNotes[`${currentBook}_${currentChapter}_${selectedVerseObj.num}`]}
          onHighlight={handleApplyHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          onToggleFavorite={handleToggleFavoriteVerse}
          onOpenNote={() => {
            setIsActionSheetOpen(false);
            setIsNoteModalOpen(true);
          }}
          onCopy={handleCopySelectedVerse}
          onShareCard={() => {
            setIsActionSheetOpen(false);
            setIsShareModalOpen(true);
          }}
          onAskAI={handleAskAITopic}
        />
      )}

      {/* 3. Modal de Anotação Espiritual */}
      {selectedVerseObj && (
        <VerseNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          book={currentBook}
          chapter={currentChapter}
          verseNum={selectedVerseObj.num}
          verseText={selectedVerseObj.text}
          initialNote={verseNotes[`${currentBook}_${currentChapter}_${selectedVerseObj.num}`]?.noteText}
          onSave={(text) => {
            saveVerseNote(currentBook, currentChapter, selectedVerseObj.num, selectedVerseObj.text, text);
            setVerseNotes(getVerseNotes());
            showToast('Anotação guardada com amor!', 'edit_note');
          }}
          onDelete={() => {
            deleteVerseNote(currentBook, currentChapter, selectedVerseObj.num);
            setVerseNotes(getVerseNotes());
            showToast('Anotação removida.', 'delete');
          }}
        />
      )}

      {/* 4. Modal de Compartilhamento de Card */}
      {selectedVerseObj && (
        <ShareVerseModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          book={currentBook}
          chapter={currentChapter}
          verseNum={selectedVerseObj.num}
          verseText={selectedVerseObj.text}
          translation={settings.translation}
          showToast={showToast}
        />
      )}

      {/* 5. Modal de Escolha de Tradução Bíblica */}
      {showTranslationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col space-y-3 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">translate</span>
                Traduções das Escrituras
              </h3>
              <button
                onClick={() => setShowTranslationsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {BIBLE_TRANSLATIONS.map((tr) => {
                const isSelected = settings.translation === tr.id;
                const isAvailable = tr.isAvailable;
                return (
                  <button
                    key={tr.id}
                    disabled={!isAvailable}
                    onClick={() => {
                      if (!isAvailable) {
                        showToast(`A tradução ${tr.abbrev} ${tr.statusText || 'requer licenciamento'}.`, 'lock');
                        return;
                      }
                      updateSettings({ translation: tr.id });
                      saveLastRead(currentBook, currentChapter, currentVerseRef.current, tr.id);
                      setShowTranslationsModal(false);
                      showToast(`Versão alterada para ${tr.abbrev}`, 'check_circle');
                    }}
                    className={`w-full p-3 rounded-2xl text-left border transition-all flex items-start gap-3 ${
                      !isAvailable
                        ? 'opacity-60 cursor-not-allowed border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-surface-dark/40'
                        : isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark-alt hover:border-primary/40'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {tr.abbrev}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="font-bold text-xs text-gray-900 dark:text-white leading-tight">
                          {tr.name}
                        </h5>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {tr.statusLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-normal">
                        {tr.description}
                      </p>
                      {tr.statusText && (
                        <p className={`text-[9.5px] italic mt-0.5 ${isAvailable ? 'text-amber-700/80 dark:text-amber-400/80' : 'text-gray-500 dark:text-gray-400'}`}>
                          ℹ️ {tr.statusText}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
