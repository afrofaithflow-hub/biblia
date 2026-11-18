import { BIBLE_BOOKS, DEFAULT_BIBLE_TRANSLATION_ID, loadBibleChapter } from '../data/bibleData';
import type { ScriptureReference } from './assistantService';

const MAX_REFERENCES_PER_REPLY = 6;
const MAX_VERSES_PER_REFERENCE = 20;

const formatVerseList = (verses: number[]) => {
  if (verses.length === 1) return String(verses[0]);
  const consecutive = verses.every((verse, index) => index === 0 || verse === verses[index - 1] + 1);
  return consecutive ? `${verses[0]}–${verses[verses.length - 1]}` : verses.join(', ');
};

/**
 * The Edge Function filters book/chapter shape. This second guard resolves the
 * exact BLIVRE chapter the user has installed, so an invalid verse never becomes
 * a clickable citation in the application.
 */
export async function resolveAssistantReferences(references: ScriptureReference[]): Promise<ScriptureReference[]> {
  const candidates = references.slice(0, MAX_REFERENCES_PER_REPLY);
  const resolved = await Promise.all(candidates.map(async (reference) => {
    const book = BIBLE_BOOKS.find((item) => item.name === reference.book);
    if (!book || !Number.isInteger(reference.chapter) || reference.chapter < 1 || reference.chapter > book.totalChapters) return null;

    try {
      const chapter = await loadBibleChapter(book.name, reference.chapter, DEFAULT_BIBLE_TRANSLATION_ID);
      if (!chapter.isComplete) return null;
      const existingVerses = new Set(chapter.verses.map((verse) => verse.num));
      const verses = [...new Set(reference.verses.map(Number))]
        .filter((verse) => Number.isInteger(verse) && existingVerses.has(verse))
        .sort((left, right) => left - right)
        .slice(0, MAX_VERSES_PER_REFERENCE);
      if (!verses.length) return null;
      return {
        book: book.name,
        chapter: reference.chapter,
        verses,
        label: `${book.name} ${reference.chapter}:${formatVerseList(verses)}`,
      } satisfies ScriptureReference;
    } catch {
      return null;
    }
  }));

  return resolved.filter((reference): reference is ScriptureReference => Boolean(reference));
}
