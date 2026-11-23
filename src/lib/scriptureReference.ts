import { BIBLE_BOOKS, BibleBook } from '../data/bibleData';

export const PENDING_BIBLE_REFERENCE_KEY = 'biblia_pending_reference';

export interface ParsedScriptureReference {
  raw: string;
  book: string;
  bookId: string;
  chapter: number;
  targetVerses: number[];
  contextStartVerse: number;
  contextEndVerse: number;
  label: string;
}

export function normalizeBookToken(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

const BOOK_LOOKUP = new Map<string, BibleBook>();
for (const book of BIBLE_BOOKS) {
  BOOK_LOOKUP.set(normalizeBookToken(book.name), book);
  BOOK_LOOKUP.set(normalizeBookToken(book.abbrev), book);
  BOOK_LOOKUP.set(normalizeBookToken(book.id), book);
}

// Aliases comuns presentes em referências portuguesas/abreviadas
const BOOK_ALIASES: Record<string, string> = {
  gen: 'Gênesis',
  genesis: 'Gênesis',
  exodo: 'Êxodo',
  levitico: 'Levítico',
  numeros: 'Números',
  deuteronomio: 'Deuteronômio',
  josue: 'Josué',
  juizes: 'Juízes',
  salmo: 'Salmos',
  salmos: 'Salmos',
  proverbios: 'Provérbios',
  canticos: 'Cânticos',
  cantares: 'Cânticos',
  'cantico dos canticos': 'Cânticos',
  isaias: 'Isaías',
  lamentacoes: 'Lamentações',
  oseias: 'Oseias',
  amos: 'Amós',
  miqueias: 'Miqueias',
  joao: 'João',
  actos: 'Atos',
  'atos dos apostolos': 'Atos',
  galatas: 'Gálatas',
  efesios: 'Efésios',
  '1 corintios': '1 Coríntios',
  '2 corintios': '2 Coríntios',
  '1 tessalonicenses': '1 Tessalonicenses',
  '2 tessalonicenses': '2 Tessalonicenses',
  '1 timoteo': '1 Timóteo',
  '2 timoteo': '2 Timóteo',
  '1 joao': '1 João',
  '2 joao': '2 João',
  '3 joao': '3 João',
};

export function findBibleBookByName(rawBookName: string): BibleBook | undefined {
  const token = normalizeBookToken(rawBookName);
  const direct = BOOK_LOOKUP.get(token);
  if (direct) return direct;
  const aliasTarget = BOOK_ALIASES[token];
  if (aliasTarget) return BOOK_LOOKUP.get(normalizeBookToken(aliasTarget));
  return undefined;
}

/**
 * Converte uma referência textual (ex: "Gênesis 1:3", "Génesis 41:15–16",
 * "1 Samuel 17:45", "Gênesis 1–11") em referência estruturada validada contra BIBLE_BOOKS.
 */
export function parseScriptureReference(raw: string): ParsedScriptureReference | null {
  if (!raw || typeof raw !== 'string') return null;

  // Normaliza travessões e espaços
  const cleaned = raw
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');

  // Caso especial: referência com formato "Livro Cap a Cap" (ex: "Gênesis 1 a 11")
  const toChapterNormalized = cleaned.replace(/\s+a\s+/i, '-');

  const match = toChapterNormalized.match(
    /^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?|\s*-\s*(\d+))?$/
  );
  if (!match) return null;

  const [, bookRaw, chapterRaw, verseStartRaw, verseEndRaw] = match;
  const book = findBibleBookByName(bookRaw);
  const chapter = Number.parseInt(chapterRaw, 10);

  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.totalChapters) {
    return null;
  }

  let targetVerses: number[];
  let contextStartVerse: number;
  let contextEndVerse: number;

  if (verseStartRaw) {
    const vStart = Math.max(1, Number.parseInt(verseStartRaw, 10));
    const vEndParsed = verseEndRaw ? Number.parseInt(verseEndRaw, 10) : vStart;
    const vEnd = vEndParsed >= vStart ? Math.min(vEndParsed, vStart + 12) : vStart;

    targetVerses = [];
    for (let v = vStart; v <= vEnd; v++) {
      targetVerses.push(v);
    }

    if (targetVerses.length === 1) {
      contextStartVerse = Math.max(1, vStart - 1);
      contextEndVerse = Math.max(vStart + 2, contextStartVerse + 3);
    } else if (vEnd - vStart <= 4) {
      contextStartVerse = Math.max(1, vStart - 1);
      contextEndVerse = Math.max(vEnd + 1, contextStartVerse + 3);
    } else {
      contextStartVerse = vStart;
      contextEndVerse = Math.min(vEnd, vStart + 4);
    }
  } else {
    // Referência de capítulo(s) inteiro(s) (ex: "Gênesis 1–11" ou "Êxodo 14")
    targetVerses = [1];
    contextStartVerse = 1;
    contextEndVerse = 4;
  }

  const versePart = verseStartRaw
    ? verseEndRaw && Number(verseEndRaw) > Number(verseStartRaw)
      ? `:${targetVerses[0]}–${targetVerses[targetVerses.length - 1]}`
      : `:${targetVerses[0]}`
    : '';

  return {
    raw,
    book: book.name,
    bookId: book.id,
    chapter,
    targetVerses,
    contextStartVerse,
    contextEndVerse,
    label: `${book.name} ${chapter}${versePart}`,
  };
}

export function clampContextToChapter(
  contextStartVerse: number,
  contextEndVerse: number,
  totalChapterVerses: number
): { start: number; end: number } {
  const safeTotal = Math.max(1, totalChapterVerses);
  const start = Math.min(Math.max(1, contextStartVerse), safeTotal);
  const end = Math.min(Math.max(start, contextEndVerse), safeTotal);
  return { start, end };
}

/**
 * Calcula tempo mínimo de leitura visível proporcional ao volume real de palavras
 * do bloco destacado (calibrado entre 5s e 12s para leitura natural sem travar).
 */
export function computeMinReadSeconds(wordCount: number): number {
  const safeWords = Math.max(0, wordCount);
  if (safeWords === 0) return 5;
  return Math.min(12, Math.max(5, Math.round(safeWords / 3.2)));
}

/**
 * Grava pedido transitório no formato esperado pelo BibleReader.
 */
export function queueBibleReference(rawReference: string): ParsedScriptureReference | null {
  const parsed = parseScriptureReference(rawReference);
  if (!parsed) return null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        PENDING_BIBLE_REFERENCE_KEY,
        JSON.stringify({
          book: parsed.book,
          chapter: parsed.chapter,
          verses: parsed.targetVerses,
          label: parsed.label,
        })
      );
    }
  } catch {
    // Ignora falha de storage em ambientes restritos
  }

  return parsed;
}
