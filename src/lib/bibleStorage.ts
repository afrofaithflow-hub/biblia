/**
 * BiblIA — Serviço de Persistência Local para Leitura Bíblica
 * Gerencia destaques coloridos, anotações pessoais, favoritos, histórico e preferências.
 */

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'rose' | 'purple';

export interface VerseHighlight {
  id: string; // Ex: "João_3_16"
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  createdAt: string;
}

export interface VerseNote {
  id: string; // Ex: "João_3_16_note"
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
  noteText: string;
  updatedAt: string;
}

export interface FavoriteVerse {
  id: string; // Ex: "João_3_16"
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  savedAt: string;
}

export interface ReaderSettings {
  translation: string; // ID da edição/corpus selecionado
  fontSize: number; // 14 a 26
  fontFamily: 'serif' | 'sans' | 'scripture';
  lineHeight: 'normal' | 'relaxed' | 'loose';
  readingTheme: 'clean' | 'sepia' | 'night'; // claro, papiro/sépia, noturno profundo
  distractionFree: boolean;
}

export interface LastReadPosition {
  book: string;
  chapter: number;
  verse: number;
  translation: string;
  timestamp: string;
}

export interface ChapterProgressRecord {
  book: string;
  chapter: number;
  read: boolean;
  listened: boolean;
  readAt?: string;
  listenedAt?: string;
}

export interface ChapterVerseProgress {
  book: string;
  chapter: number;
  translation: string;
  readVerses: number[];
  listenedVerses: number[];
  updatedAt: string;
}

const STORAGE_KEYS = {
  HIGHLIGHTS: 'biblia_verse_highlights',
  NOTES: 'biblia_verse_notes',
  FAVORITES: 'biblia_verse_favorites',
  SETTINGS: 'biblia_reader_settings',
  LAST_READ: 'biblia_last_read',
  READ_CHAPTERS: 'biblia_read_chapters',
  DETAILED_PROGRESS: 'biblia_chapter_progress_v2',
  VERSE_PROGRESS: 'biblia_verse_progress_v1',
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  translation: 'blivre',
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  readingTheme: 'clean',
  distractionFree: false,
};

const LEGACY_TRANSLATION_ID = 'pt-local-legacy';
const UNVERIFIED_LEGACY_TRANSLATION_IDS = new Set(['nvi', 'ara', 'arc', 'nvt', 'kjv']);

function normalizeTranslationId(translation: unknown): string {
  if (typeof translation !== 'string' || !translation.trim()) return 'blivre';
  return translation === LEGACY_TRANSLATION_ID || UNVERIFIED_LEGACY_TRANSLATION_IDS.has(translation.toLowerCase())
    ? 'blivre'
    : translation;
}

// ── Destaques Marca-Texto ─────────────────────────
export function getHighlights(): Record<string, HighlightColor> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveHighlight(book: string, chapter: number, verse: number, color: HighlightColor): void {
  const highlights = getHighlights();
  const key = `${book}_${chapter}_${verse}`;
  highlights[key] = color;
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));
}

export function removeHighlight(book: string, chapter: number, verse: number): void {
  const highlights = getHighlights();
  const key = `${book}_${chapter}_${verse}`;
  delete highlights[key];
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));
}

// ── Anotações Pessoais ────────────────────────────
export function getVerseNotes(): Record<string, VerseNote> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveVerseNote(
  book: string,
  chapter: number,
  verse: number,
  verseText: string,
  noteText: string
): VerseNote {
  const notes = getVerseNotes();
  const key = `${book}_${chapter}_${verse}`;
  const note: VerseNote = {
    id: key,
    book,
    chapter,
    verse,
    verseText,
    noteText,
    updatedAt: new Date().toISOString(),
  };
  notes[key] = note;
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  return note;
}

export function deleteVerseNote(book: string, chapter: number, verse: number): void {
  const notes = getVerseNotes();
  const key = `${book}_${chapter}_${verse}`;
  delete notes[key];
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

// ── Versículos Favoritos ──────────────────────────
export function getFavorites(): Record<string, FavoriteVerse> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!raw) return {};
    const favorites = JSON.parse(raw) as Record<string, FavoriteVerse>;
    let migrated = false;
    for (const favorite of Object.values(favorites)) {
      const translation = normalizeTranslationId(favorite.translation);
      if (translation !== favorite.translation) {
        favorite.translation = translation;
        migrated = true;
      }
    }
    if (migrated) localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return favorites;
  } catch {
    return {};
  }
}

export function toggleFavorite(
  book: string,
  chapter: number,
  verse: number,
  text: string,
  translation: string = 'blivre'
): boolean {
  const favorites = getFavorites();
  const key = `${book}_${chapter}_${verse}`;
  const exists = !!favorites[key];

  if (exists) {
    delete favorites[key];
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return false;
  } else {
    favorites[key] = {
      id: key,
      book,
      chapter,
      verse,
      text,
      translation,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return true;
  }
}

// ── Configurações de Leitura ──────────────────────
export function getReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_READER_SETTINGS;
    const parsed = JSON.parse(raw);
    const settings = {
      ...DEFAULT_READER_SETTINGS,
      ...parsed,
      translation: normalizeTranslationId(parsed.translation),
    };
    if (settings.translation !== parsed.translation) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
    return settings;
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const current = getReaderSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

// ── Última Leitura (Progresso Canônico) ───────────
export function getLastRead(): LastReadPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_READ);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        book: parsed.book || 'João',
        chapter: parsed.chapter || 3,
        verse: parsed.verse || 1,
        translation: normalizeTranslationId(parsed.translation),
        timestamp: parsed.timestamp || new Date().toISOString(),
      };
    }
    return {
      book: 'João',
      chapter: 3,
      verse: 1,
      translation: 'blivre',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      book: 'João',
      chapter: 3,
      verse: 1,
      translation: 'blivre',
      timestamp: new Date().toISOString(),
    };
  }
}

export function saveLastRead(
  book: string,
  chapter: number,
  verse: number = 1,
  translation: string = 'blivre'
): void {
  const pos: LastReadPosition = {
    book,
    chapter,
    verse,
    translation,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(pos));
}

// ── Progresso com Semântica de Modalidade (Lido vs Ouvido) ──
export function getDetailedChapterProgress(): Record<string, ChapterProgressRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DETAILED_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordChapterProgress(
  book: string,
  chapter: number,
  mode: 'read' | 'listened',
  completed = true
): ChapterProgressRecord {
  const progressMap = getDetailedChapterProgress();
  const key = `${book}_${chapter}`;
  const now = new Date().toISOString();

  const current: ChapterProgressRecord = progressMap[key] || {
    book,
    chapter,
    read: false,
    listened: false,
  };

  if (mode === 'read') {
    current.read = completed;
    if (completed) current.readAt = now;
  } else if (mode === 'listened') {
    current.listened = completed;
    if (completed) current.listenedAt = now;
  }

  progressMap[key] = current;
  localStorage.setItem(STORAGE_KEYS.DETAILED_PROGRESS, JSON.stringify(progressMap));

  // Sincronizar também com o array de retrocompatibilidade
  const legacySet = new Set(getReadChapters());
  if (current.read || current.listened) {
    legacySet.add(key);
  } else {
    legacySet.delete(key);
  }
  localStorage.setItem(STORAGE_KEYS.READ_CHAPTERS, JSON.stringify(Array.from(legacySet)));

  return current;
}

export function getVerseProgress(
  book: string,
  chapter: number,
  translation = 'blivre'
): ChapterVerseProgress {
  const key = `${translation}:${book}_${chapter}`;
  const empty: ChapterVerseProgress = {
    book,
    chapter,
    translation,
    readVerses: [],
    listenedVerses: [],
    updatedAt: new Date(0).toISOString(),
  };
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.VERSE_PROGRESS) || '{}') as Record<string, ChapterVerseProgress>;
    const saved = all[key];
    if (!saved) return empty;
    return {
      ...empty,
      ...saved,
      readVerses: Array.isArray(saved.readVerses) ? saved.readVerses : [],
      listenedVerses: Array.isArray(saved.listenedVerses) ? saved.listenedVerses : [],
    };
  } catch {
    return empty;
  }
}

export function recordVerseProgress(
  book: string,
  chapter: number,
  verse: number,
  mode: 'read' | 'listened',
  translation = 'blivre'
): ChapterVerseProgress {
  if (!Number.isInteger(verse) || verse < 1) return getVerseProgress(book, chapter, translation);
  const key = `${translation}:${book}_${chapter}`;
  let all: Record<string, ChapterVerseProgress> = {};
  try {
    all = JSON.parse(localStorage.getItem(STORAGE_KEYS.VERSE_PROGRESS) || '{}');
  } catch {
    all = {};
  }
  const current = all[key] || getVerseProgress(book, chapter, translation);
  const field = mode === 'read' ? 'readVerses' : 'listenedVerses';
  current[field] = Array.from(new Set([...current[field], verse])).sort((a, b) => a - b);
  current.updatedAt = new Date().toISOString();
  all[key] = current;
  localStorage.setItem(STORAGE_KEYS.VERSE_PROGRESS, JSON.stringify(all));
  return current;
}

// ── Capítulos Concluídos / Lidos (Retrocompatibilidade) ──
export function getReadChapters(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READ_CHAPTERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleChapterRead(book: string, chapter: number): boolean {
  const progressMap = getDetailedChapterProgress();
  const key = `${book}_${chapter}`;
  const currentRead = !!progressMap[key]?.read;
  const nextRead = !currentRead;

  recordChapterProgress(book, chapter, 'read', nextRead);
  return nextRead;
}


