import type { BiblePathBookRecord } from '../data/bibleData';

const DATABASE_NAME = 'biblia-scripture-cache';
const STORE_NAME = 'blivre-books';
let databasePromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = new Promise((resolve) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }
  return databasePromise;
}

export async function readCachedBibleBook(filename: string): Promise<BiblePathBookRecord | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(filename);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

export async function cacheBibleBook(filename: string, book: BiblePathBookRecord): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(book, filename);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}
