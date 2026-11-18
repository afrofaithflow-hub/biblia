import React, { useState, useMemo } from 'react';
import { BIBLE_BOOKS, BibleBook } from '../../data/bibleData';

interface BookSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentChapter: number;
  onSelect: (book: string, chapter: number) => void;
}

type TabType = 'all' | 'AT' | 'NT';

export const BookSelectorModal: React.FC<BookSelectorModalProps> = ({
  isOpen,
  onClose,
  currentBook,
  currentChapter,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookObj, setSelectedBookObj] = useState<BibleBook | null>(() => {
    return BIBLE_BOOKS.find((b) => b.name === currentBook) || BIBLE_BOOKS[42]; // Default João
  });
  const [step, setStep] = useState<'book' | 'chapter'>('book');

  // Filtragem de livros
  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter((b) => {
      const matchesTab = activeTab === 'all' || b.testament === activeTab;
      const matchesSearch =
        searchQuery.trim() === '' ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.abbrev.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  if (!isOpen) return null;

  const handleBookClick = (book: BibleBook) => {
    setSelectedBookObj(book);
    setStep('chapter');
  };

  const handleChapterClick = (chapNum: number) => {
    if (selectedBookObj) {
      onSelect(selectedBookObj.name, chapNum);
      onClose();
      setStep('book');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'chapter' ? (
              <button
                onClick={() => setStep('book')}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                title="Voltar aos Livros"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
            ) : (
              <span className="material-symbols-outlined text-primary dark:text-primary-light">
                menu_book
              </span>
            )}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                {step === 'book' ? 'Cânon Sagrado — 66 Livros' : `${selectedBookObj?.name} — Escolha o Capítulo`}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {step === 'book'
                  ? '39 no Antigo Testamento • 27 no Novo Testamento'
                  : `Selecione um capítulo de 1 a ${selectedBookObj?.totalChapters}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Step: Book Selection */}
        {step === 'book' && (
          <>
            {/* Search and Tabs */}
            <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-dark-canvas/50">
              {/* Search Bar */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar por livro (ex: Salmos, Mt, Gn)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-surface-dark-alt border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-200 dark:bg-gray-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-surface-dark text-primary dark:text-primary-light shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Todos ({BIBLE_BOOKS.length})
                </button>
                <button
                  onClick={() => setActiveTab('AT')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeTab === 'AT'
                      ? 'bg-white dark:bg-surface-dark text-primary dark:text-primary-light shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Antigo Testamento (39)
                </button>
                <button
                  onClick={() => setActiveTab('NT')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    activeTab === 'NT'
                      ? 'bg-white dark:bg-surface-dark text-primary dark:text-primary-light shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Novo Testamento (27)
                </button>
              </div>
            </div>

            {/* Books List Grid */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[50vh] space-y-4">
              {filteredBooks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2">menu_book</span>
                  <p className="text-xs">Nenhum livro encontrado para "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredBooks.map((b) => {
                    const isCurrent = b.name === currentBook;
                    return (
                      <button
                        key={b.id}
                        onClick={() => handleBookClick(b)}
                        className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between group ${
                          isCurrent
                            ? 'bg-primary/10 border-primary dark:border-primary text-primary dark:text-primary-light font-bold shadow-sm'
                            : 'bg-white dark:bg-surface-dark-alt/50 border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold leading-tight group-hover:text-primary transition-colors">
                            {b.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {b.abbrev}
                          </span>
                        </div>
                        <div className="flex items-center justify-between w-full mt-1.5">
                          <span className="text-[9.5px] text-gray-400 dark:text-gray-500 truncate">
                            {b.category}
                          </span>
                          <span className="text-[9.5px] text-primary/80 font-medium">
                            {b.totalChapters} cap.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Content Step: Chapter Selection */}
        {step === 'chapter' && selectedBookObj && (
          <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
            <div className="mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{selectedBookObj.category}</span>
              <span className="font-mono">{selectedBookObj.totalChapters} Capítulos no Total</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {Array.from({ length: selectedBookObj.totalChapters }, (_, i) => i + 1).map((chapNum) => {
                const isSelected =
                  selectedBookObj.name === currentBook && chapNum === currentChapter;
                return (
                  <button
                    key={chapNum}
                    onClick={() => handleChapterClick(chapNum)}
                    className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105'
                        : 'bg-gray-100 dark:bg-surface-dark-alt hover:bg-primary/10 hover:text-primary text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50'
                    }`}
                  >
                    {chapNum}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

