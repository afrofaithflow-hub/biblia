/**
 * BiblIA — Catálogo de estrutura bíblica e traduções identificadas
 * 66 livros do cânon protestante, metadados e amostras locais herdadas do protótipo.
 */

export interface BibleBook {
  id: string;
  name: string;
  abbrev: string;
  testament: 'AT' | 'NT';
  category: 
    | 'Pentateuco'
    | 'Históricos'
    | 'Poéticos'
    | 'Profetas Maiores'
    | 'Profetas Menores'
    | 'Evangelhos'
    | 'Histórico NT'
    | 'Epístolas Paulinas'
    | 'Epístolas Gerais'
    | 'Profético';
  totalChapters: number;
}

export interface BibleVerse {
  num: number;
  text: string;
}

export type ChapterCompleteness = 'complete' | 'partial' | 'unavailable';

export interface BibleChapterData {
  book: string;
  chapter: number;
  title: string;
  subtitle: string;
  verses: BibleVerse[];
  translation: string;
  /** True only when this exact text edition and its source have been verified. */
  sourceVerified: boolean;
  isAvailable: boolean;
  completeness: ChapterCompleteness;
  totalCanonicalVerses?: number;
  presentVersesCount: number;
  isComplete: boolean;
  notice?: string;
}

export interface BibleTranslation {
  id: string;
  name: string;
  abbrev: string;
  description: string;
  language: 'pt' | 'en' | 'es';
  dialect: string;
  contentStatus: 'sample' | 'not-imported' | 'partial' | 'complete';
  rightsStatus: 'unverified' | 'open-license-declared' | 'permission-required';
  sourceUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  attribution?: string;
  permissions: {
    inAppDisplay: 'declared-license' | 'permission-required' | 'unverified';
    offlineDistribution: 'declared-license' | 'permission-required' | 'unverified';
    ttsAudio: 'declared-license' | 'permission-required' | 'unverified';
    gameUse: 'declared-license' | 'permission-required' | 'unverified';
    aiUse: 'declared-license' | 'permission-required' | 'unverified';
  };
  statusLabel: string;
  isAvailable: boolean;
  statusText?: string;
}

/** Edition distributed in the bundled, fully licensed Portuguese corpus. */
export const DEFAULT_BIBLE_TRANSLATION_ID = 'blivre';
/** Kept only to migrate identifiers saved by earlier prototype builds. */
export const LEGACY_LOCAL_TRANSLATION_ID = 'pt-local-legacy';

export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  {
    id: 'blivre',
    name: 'Bíblia Livre',
    abbrev: 'BL',
    description: 'Bíblia completa em português do Brasil, edição Textus Receptus',
    language: 'pt',
    dialect: 'Brasil',
    contentStatus: 'complete',
    rightsStatus: 'open-license-declared',
    permissions: {
      inAppDisplay: 'declared-license',
      offlineDistribution: 'declared-license',
      ttsAudio: 'declared-license',
      gameUse: 'declared-license',
      aiUse: 'unverified',
    },
    sourceUrl: 'https://www.ebible.org/details.php?id=porbr2018',
    licenseName: 'Creative Commons Atribuição 4.0 Brasil (CC BY 4.0)',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/br/',
    attribution: 'Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio e Marco Teles, http://sites.google.com/site/biblialivre/ — fevereiro de 2018. Licença Creative Commons Atribuição 4.0 (https://creativecommons.org/licenses/by/4.0/). Formatação do pacote BiblePath: notas, títulos de secção e marcações removidos; espaçamento e pontuação corrigidos. Atos 17:24: “tempos” corrigido para “templos”.',
    statusLabel: 'Disponível',
    isAvailable: true,
    statusText: 'Acervo completo disponível offline. A edição base é Textus Receptus; o pacote declara alterações de formatação e correções editoriais. Revisão local independente pendente.',
  },
  {
    id: 'nvi',
    name: 'Nova Versão Internacional',
    abbrev: 'NVI',
    description: 'Edição licenciada em português; integração comercial depende de autorização',
    language: 'pt',
    dialect: 'Português do Brasil',
    contentStatus: 'not-imported',
    rightsStatus: 'permission-required',
    permissions: {
      inAppDisplay: 'permission-required',
      offlineDistribution: 'permission-required',
      ttsAudio: 'permission-required',
      gameUse: 'permission-required',
      aiUse: 'permission-required',
    },
    sourceUrl: 'https://www.biblica.com/permissions/',
    statusLabel: 'Direitos pendentes',
    isAvailable: false,
    statusText: 'Requer autorização para app, áudio/TTS, offline e usos com IA conforme o âmbito do produto.',
  },
  {
    id: 'ara',
    name: 'Almeida Revista e Atualizada',
    abbrev: 'ARA',
    description: 'Tradicional, solene, amplamente adotada nos estudos teológicos',
    language: 'pt',
    dialect: 'Brasil',
    contentStatus: 'not-imported',
    rightsStatus: 'permission-required',
    permissions: {
      inAppDisplay: 'permission-required',
      offlineDistribution: 'permission-required',
      ttsAudio: 'permission-required',
      gameUse: 'permission-required',
      aiUse: 'permission-required',
    },
    statusLabel: 'Direitos pendentes',
    isAvailable: false,
    statusText: 'Texto e autorização para os usos do app ainda não integrados.',
  },
  {
    id: 'arc',
    name: 'Almeida Revista e Corrigida',
    abbrev: 'ARC',
    description: 'Clássica, linguagem histórica e poética consagrada por gerações',
    language: 'pt',
    dialect: 'Português; edição exata por definir',
    contentStatus: 'not-imported',
    rightsStatus: 'unverified',
    permissions: {
      inAppDisplay: 'unverified',
      offlineDistribution: 'unverified',
      ttsAudio: 'unverified',
      gameUse: 'unverified',
      aiUse: 'unverified',
    },
    statusLabel: 'Edição por confirmar',
    isAvailable: false,
    statusText: 'Não tratar uma edição histórica como ARC sem confirmar edição, fonte e direitos.',
  },
  {
    id: 'nvt',
    name: 'Nova Versão Transformadora',
    abbrev: 'NVT',
    description: 'Linguagem contemporânea, viva e altamente acessível ao leitor',
    language: 'pt',
    dialect: 'Brasil',
    contentStatus: 'not-imported',
    rightsStatus: 'permission-required',
    permissions: {
      inAppDisplay: 'permission-required',
      offlineDistribution: 'permission-required',
      ttsAudio: 'permission-required',
      gameUse: 'permission-required',
      aiUse: 'permission-required',
    },
    statusLabel: 'Direitos pendentes',
    isAvailable: false,
    statusText: 'Texto e autorização para os usos do app ainda não integrados.',
  },
  {
    id: 'kjv',
    name: 'King James Version',
    abbrev: 'KJV',
    description: 'Monumento histórico da língua inglesa de 1611',
    language: 'en',
    dialect: 'Inglês',
    contentStatus: 'not-imported',
    rightsStatus: 'unverified',
    permissions: {
      inAppDisplay: 'unverified',
      offlineDistribution: 'unverified',
      ttsAudio: 'unverified',
      gameUse: 'unverified',
      aiUse: 'unverified',
    },
    statusLabel: 'Fora do escopo atual',
    isAvailable: false,
    statusText: 'Edição em inglês; fonte e direitos ainda não avaliados para o produto.',
  },
];

export function getBibleTranslationLabel(translationId: string, short = false): string {
  const translation = BIBLE_TRANSLATIONS.find((item) => item.id === translationId);
  return translation ? (short ? translation.abbrev : translation.name) : translationId.toUpperCase();
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Antigo Testamento - Pentateuco (5)
  { id: 'gn', name: 'Gênesis', abbrev: 'Gn', testament: 'AT', category: 'Pentateuco', totalChapters: 50 },
  { id: 'ex', name: 'Êxodo', abbrev: 'Êx', testament: 'AT', category: 'Pentateuco', totalChapters: 40 },
  { id: 'lv', name: 'Levítico', abbrev: 'Lv', testament: 'AT', category: 'Pentateuco', totalChapters: 27 },
  { id: 'nm', name: 'Números', abbrev: 'Nm', testament: 'AT', category: 'Pentateuco', totalChapters: 36 },
  { id: 'dt', name: 'Deuteronômio', abbrev: 'Dt', testament: 'AT', category: 'Pentateuco', totalChapters: 34 },

  // Antigo Testamento - Históricos (12)
  { id: 'js', name: 'Josué', abbrev: 'Js', testament: 'AT', category: 'Históricos', totalChapters: 24 },
  { id: 'jz', name: 'Juízes', abbrev: 'Jz', testament: 'AT', category: 'Históricos', totalChapters: 21 },
  { id: 'rt', name: 'Rute', abbrev: 'Rt', testament: 'AT', category: 'Históricos', totalChapters: 4 },
  { id: '1sm', name: '1 Samuel', abbrev: '1Sm', testament: 'AT', category: 'Históricos', totalChapters: 31 },
  { id: '2sm', name: '2 Samuel', abbrev: '2Sm', testament: 'AT', category: 'Históricos', totalChapters: 24 },
  { id: '1rs', name: '1 Reis', abbrev: '1Rs', testament: 'AT', category: 'Históricos', totalChapters: 22 },
  { id: '2rs', name: '2 Reis', abbrev: '2Rs', testament: 'AT', category: 'Históricos', totalChapters: 25 },
  { id: '1cr', name: '1 Crônicas', abbrev: '1Cr', testament: 'AT', category: 'Históricos', totalChapters: 29 },
  { id: '2cr', name: '2 Crônicas', abbrev: '2Cr', testament: 'AT', category: 'Históricos', totalChapters: 36 },
  { id: 'ed', name: 'Esdras', abbrev: 'Ed', testament: 'AT', category: 'Históricos', totalChapters: 10 },
  { id: 'ne', name: 'Neemias', abbrev: 'Ne', testament: 'AT', category: 'Históricos', totalChapters: 13 },
  { id: 'et', name: 'Ester', abbrev: 'Et', testament: 'AT', category: 'Históricos', totalChapters: 10 },

  // Antigo Testamento - Poéticos e Sabedoria (5)
  { id: 'job', name: 'Jó', abbrev: 'Jó', testament: 'AT', category: 'Poéticos', totalChapters: 42 },
  { id: 'sl', name: 'Salmos', abbrev: 'Sl', testament: 'AT', category: 'Poéticos', totalChapters: 150 },
  { id: 'pv', name: 'Provérbios', abbrev: 'Pv', testament: 'AT', category: 'Poéticos', totalChapters: 31 },
  { id: 'ec', name: 'Eclesiastes', abbrev: 'Ec', testament: 'AT', category: 'Poéticos', totalChapters: 12 },
  { id: 'ct', name: 'Cânticos', abbrev: 'Ct', testament: 'AT', category: 'Poéticos', totalChapters: 8 },

  // Antigo Testamento - Profetas Maiores (5)
  { id: 'is', name: 'Isaías', abbrev: 'Is', testament: 'AT', category: 'Profetas Maiores', totalChapters: 66 },
  { id: 'jr', name: 'Jeremias', abbrev: 'Jr', testament: 'AT', category: 'Profetas Maiores', totalChapters: 52 },
  { id: 'lm', name: 'Lamentações', abbrev: 'Lm', testament: 'AT', category: 'Profetas Maiores', totalChapters: 5 },
  { id: 'ez', name: 'Ezequiel', abbrev: 'Ez', testament: 'AT', category: 'Profetas Maiores', totalChapters: 48 },
  { id: 'dn', name: 'Daniel', abbrev: 'Dn', testament: 'AT', category: 'Profetas Maiores', totalChapters: 12 },

  // Antigo Testamento - Profetas Menores (12)
  { id: 'os', name: 'Oseias', abbrev: 'Os', testament: 'AT', category: 'Profetas Menores', totalChapters: 14 },
  { id: 'jl', name: 'Joel', abbrev: 'Jl', testament: 'AT', category: 'Profetas Menores', totalChapters: 3 },
  { id: 'am', name: 'Amós', abbrev: 'Am', testament: 'AT', category: 'Profetas Menores', totalChapters: 9 },
  { id: 'ob', name: 'Obadias', abbrev: 'Ob', testament: 'AT', category: 'Profetas Menores', totalChapters: 1 },
  { id: 'jn', name: 'Jonas', abbrev: 'Jn', testament: 'AT', category: 'Profetas Menores', totalChapters: 4 },
  { id: 'mq', name: 'Miqueias', abbrev: 'Mq', testament: 'AT', category: 'Profetas Menores', totalChapters: 7 },
  { id: 'na', name: 'Naum', abbrev: 'Na', testament: 'AT', category: 'Profetas Menores', totalChapters: 3 },
  { id: 'hc', name: 'Habacuque', abbrev: 'Hc', testament: 'AT', category: 'Profetas Menores', totalChapters: 3 },
  { id: 'sf', name: 'Sofonias', abbrev: 'Sf', testament: 'AT', category: 'Profetas Menores', totalChapters: 3 },
  { id: 'ag', name: 'Ageu', abbrev: 'Ag', testament: 'AT', category: 'Profetas Menores', totalChapters: 2 },
  { id: 'zc', name: 'Zacarias', abbrev: 'Zc', testament: 'AT', category: 'Profetas Menores', totalChapters: 14 },
  { id: 'ml', name: 'Malaquias', abbrev: 'Ml', testament: 'AT', category: 'Profetas Menores', totalChapters: 4 },

  // Novo Testamento - Evangelhos (4)
  { id: 'mt', name: 'Mateus', abbrev: 'Mt', testament: 'NT', category: 'Evangelhos', totalChapters: 28 },
  { id: 'mc', name: 'Marcos', abbrev: 'Mc', testament: 'NT', category: 'Evangelhos', totalChapters: 16 },
  { id: 'lc', name: 'Lucas', abbrev: 'Lc', testament: 'NT', category: 'Evangelhos', totalChapters: 24 },
  { id: 'jo', name: 'João', abbrev: 'Jo', testament: 'NT', category: 'Evangelhos', totalChapters: 21 },

  // Novo Testamento - Histórico (1)
  { id: 'at', name: 'Atos', abbrev: 'At', testament: 'NT', category: 'Histórico NT', totalChapters: 28 },

  // Novo Testamento - Epístolas Paulinas (14)
  { id: 'rm', name: 'Romanos', abbrev: 'Rm', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 16 },
  { id: '1co', name: '1 Coríntios', abbrev: '1Co', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 16 },
  { id: '2co', name: '2 Coríntios', abbrev: '2Co', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 13 },
  { id: 'gl', name: 'Gálatas', abbrev: 'Gl', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 6 },
  { id: 'ef', name: 'Efésios', abbrev: 'Ef', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 6 },
  { id: 'fp', name: 'Filipenses', abbrev: 'Fp', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 4 },
  { id: 'cl', name: 'Colossenses', abbrev: 'Cl', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 4 },
  { id: '1ts', name: '1 Tessalonicenses', abbrev: '1Ts', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 5 },
  { id: '2ts', name: '2 Tessalonicenses', abbrev: '2Ts', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 3 },
  { id: '1tm', name: '1 Timóteo', abbrev: '1Tm', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 6 },
  { id: '2tm', name: '2 Timóteo', abbrev: '2Tm', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 4 },
  { id: 'tt', name: 'Tito', abbrev: 'Tt', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 3 },
  { id: 'fm', name: 'Filemom', abbrev: 'Fm', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 1 },
  { id: 'hb', name: 'Hebreus', abbrev: 'Hb', testament: 'NT', category: 'Epístolas Paulinas', totalChapters: 13 },

  // Novo Testamento - Epístolas Gerais (7)
  { id: 'tg', name: 'Tiago', abbrev: 'Tg', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 5 },
  { id: '1pe', name: '1 Pedro', abbrev: '1Pe', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 5 },
  { id: '2pe', name: '2 Pedro', abbrev: '2Pe', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 3 },
  { id: '1jo', name: '1 João', abbrev: '1Jo', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 5 },
  { id: '2jo', name: '2 João', abbrev: '2Jo', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 1 },
  { id: '3jo', name: '3 João', abbrev: '3Jo', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 1 },
  { id: 'jd', name: 'Judas', abbrev: 'Jd', testament: 'NT', category: 'Epístolas Gerais', totalChapters: 1 },

  // Novo Testamento - Profético (1)
  { id: 'ap', name: 'Apocalipse', abbrev: 'Ap', testament: 'NT', category: 'Profético', totalChapters: 22 },
];

interface BiblePathChapter {
  d?: string;
  v: string[];
}

interface BiblePathBook {
  n: string;
  c: BiblePathChapter[];
}

export type BiblePathBookRecord = BiblePathBook;

import BLIVRE_BOOK_INDEX from './bible/blivre/book-index.json';

const BLIVRE_JSON_FILES = import.meta.glob<Partial<BiblePathBook>>(['./bible/blivre/*.json', '!./bible/blivre/manifest.json', '!./bible/blivre/book-index.json'], {
  import: 'default',
});
const BLIVRE_BOOKS_BY_NAME = new Map<string, BiblePathBook>();
import { cacheBibleBook, readCachedBibleBook } from '../lib/bibleOfflineStore';
const normalizeBibleName = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');


/**
 * Contagem canônica oficial e verificável de versículos por capítulo das Escrituras.
 * Dados universais do cânon bíblico protestante (66 livros).
 */
export const CANONICAL_CHAPTER_VERSE_COUNTS: Record<string, number> = {
  'Gênesis_1': 31,
  'Salmos_1': 6,
  'Salmos_23': 6,
  'Salmos_91': 16,
  'Salmos_119': 176,
  'Salmos_121': 8,
  'Mateus_5': 48,
  'Mateus_6': 34,
  'João_1': 51,
  'João_3': 36,
  'Romanos_8': 39,
  '1 Coríntios_13': 13,
  'Efésios_6': 24,
  'Filipenses_4': 23,
  'Hebreus_11': 40,
  'Apocalipse_21': 27,
};

export function getBibleChapter(
  bookName: string,
  chapter: number,
  translationId = DEFAULT_BIBLE_TRANSLATION_ID
): BibleChapterData {
  const bookMeta = BIBLE_BOOKS.find(
    (book) => normalizeBibleName(book.name) === normalizeBibleName(bookName) ||
      normalizeBibleName(book.abbrev) === normalizeBibleName(bookName)
  );
  const resolvedBookName = bookMeta?.name || bookName;
  const translation = BIBLE_TRANSLATIONS.find((item) => item.id === translationId);
  const chapterIndex = Number.isInteger(chapter) ? chapter - 1 : -1;

  if (translationId === DEFAULT_BIBLE_TRANSLATION_ID && bookMeta && chapterIndex >= 0) {
    const corpusBook = BLIVRE_BOOKS_BY_NAME.get(normalizeBibleName(bookMeta.name));
    const corpusChapter = corpusBook?.c[chapterIndex];
    const verses = corpusChapter?.v
      .map((text, index) => ({ num: index + 1, text: text.trim() }))
      .filter((verse) => verse.text.length > 0) || [];
    const structurallyComplete = Boolean(
      corpusChapter && verses.length > 0 && verses.length === corpusChapter.v.length &&
      verses.every((verse, index) => verse.num === index + 1)
    );
    const sourceVerified = Boolean(translation?.rightsStatus === 'open-license-declared');
    const isComplete = sourceVerified && structurallyComplete;

    if (corpusChapter && structurallyComplete) {
      return {
        book: resolvedBookName,
        chapter,
        title: corpusChapter.d || `${resolvedBookName} ${chapter}`,
        subtitle: `${bookMeta.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'} · Bíblia Livre (BLIVRE)`,
        verses,
        translation: translationId,
        sourceVerified,
        isAvailable: isComplete,
        completeness: isComplete ? 'complete' : 'partial',
        totalCanonicalVerses: verses.length,
        presentVersesCount: verses.length,
        isComplete,
      };
    }
  }

  const unavailableTranslation = translationId !== DEFAULT_BIBLE_TRANSLATION_ID;
  return {
    book: resolvedBookName,
    chapter,
    title: `${resolvedBookName} ${chapter}`,
    subtitle: bookMeta?.testament === 'NT' ? 'Novo Testamento' : 'Antigo Testamento',
    verses: [],
    translation: translationId,
    sourceVerified: false,
    isAvailable: false,
    completeness: 'unavailable',
    totalCanonicalVerses: CANONICAL_CHAPTER_VERSE_COUNTS[`${resolvedBookName}_${chapter}`],
    presentVersesCount: 0,
    isComplete: false,
    notice: unavailableTranslation
      ? `${translation?.name || translationId} ainda não está integrada. A única edição disponível é a Bíblia Livre (BLIVRE).`
      : !bookMeta || chapterIndex < 0 || chapter > (bookMeta?.totalChapters || 0)
      ? `Referência inválida: ${resolvedBookName} ${chapter}.`
      : `O capítulo ${resolvedBookName} ${chapter} não foi encontrado no pacote BLIVRE.`,
  };
}
/** Load only the requested book chunk; subsequent chapters reuse the in-memory book. */
export async function loadBibleChapter(
  bookName: string,
  chapter: number,
  translationId = DEFAULT_BIBLE_TRANSLATION_ID
): Promise<BibleChapterData> {
  const bookMeta = BIBLE_BOOKS.find(
    (book) => normalizeBibleName(book.name) === normalizeBibleName(bookName) ||
      normalizeBibleName(book.abbrev) === normalizeBibleName(bookName)
  );
  if (translationId !== DEFAULT_BIBLE_TRANSLATION_ID || !bookMeta) {
    return getBibleChapter(bookName, chapter, translationId);
  }
  const normalizedName = normalizeBibleName(bookMeta.name);
  if (!BLIVRE_BOOKS_BY_NAME.has(normalizedName)) {
    const filename = (BLIVRE_BOOK_INDEX as Record<string, string>)[bookMeta.name];
    const loader = filename ? BLIVRE_JSON_FILES[`./bible/blivre/${filename}`] : undefined;
    if (loader) {
      try {
        const loaded = await loader();
        if (loaded?.n && Array.isArray(loaded.c)) {
          BLIVRE_BOOKS_BY_NAME.set(normalizeBibleName(loaded.n), loaded as BiblePathBook);
          void cacheBibleBook(filename, loaded as BiblePathBook);
        }
      } catch {
        const cached = await readCachedBibleBook(filename);
        if (cached?.n && Array.isArray(cached.c)) BLIVRE_BOOKS_BY_NAME.set(normalizeBibleName(cached.n), cached);
      }
    }
  }
  return getBibleChapter(bookMeta.name, chapter, translationId);
}
