import React, { useState } from 'react';
import { getBibleTranslationLabel } from '../../data/bibleData';

interface ShareVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  verseNum: number;
  verseText: string;
  translation: string;
  showToast: (msg: string, icon?: string) => void;
}

type CardStyle = 'sacred' | 'gold' | 'dawn' | 'minimal';

export const ShareVerseModal: React.FC<ShareVerseModalProps> = ({
  isOpen,
  onClose,
  book,
  chapter,
  verseNum,
  verseText,
  translation,
  showToast,
}) => {
  const [style, setStyle] = useState<CardStyle>('sacred');

  if (!isOpen) return null;

  const translationLabel = getBibleTranslationLabel(translation);
  const fullQuote = `"${verseText}"\n\n— ${book} ${chapter}:${verseNum} (${translationLabel} • BiblIA)`;

  const handleCopyText = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullQuote);
      showToast('Versículo copiado com sucesso!', 'check_circle');
      onClose();
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${book} ${chapter}:${verseNum} — BiblIA`,
          text: fullQuote,
        });
        showToast('Compartilhado com sucesso!', 'share');
        onClose();
      } catch {
        // usuário cancelou a partilha nativa
      }
    } else {
      handleCopyText();
    }
  };

  const getStyleClasses = () => {
    switch (style) {
      case 'sacred':
        return 'bg-gradient-to-br from-sacred-deep via-sacred-brand to-teal-800 text-white shadow-teal-900/40';
      case 'gold':
        return 'bg-gradient-to-br from-amber-700 via-yellow-700 to-amber-900 text-amber-50 shadow-amber-900/40';
      case 'dawn':
        return 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-purple-100 shadow-purple-950/40';
      case 'minimal':
        return 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 shadow-slate-300/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-primary-light">
              image
            </span>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Card de Compartilhamento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Style Selector Chips */}
        <div className="flex justify-center gap-2">
          {(
            [
              { id: 'sacred', label: 'Verde Sagrado' },
              { id: 'gold', label: 'Ouro Real' },
              { id: 'dawn', label: 'Crepúsculo' },
              { id: 'minimal', label: 'Minimalista' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                style === s.id
                  ? 'bg-primary text-white shadow-sm scale-105'
                  : 'bg-gray-100 dark:bg-surface-dark-alt text-gray-600 dark:text-gray-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Live Visual Card */}
        <div
          id="verse-share-card"
          className={`relative p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[220px] transition-all duration-300 ${getStyleClasses()}`}
        >
          {/* Top Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
              Palavra Viva
            </span>
            <span className="text-[10px] font-mono opacity-70">
              {translationLabel}
            </span>
          </div>

          {/* Scripture Verse */}
          <p className="font-serif italic text-base leading-relaxed my-auto">
            "{verseText}"
          </p>

          {/* Bottom Reference */}
          <div className="mt-4 pt-3 border-t border-white/20 dark:border-gray-700/40 flex items-center justify-between text-xs">
            <span className="font-extrabold tracking-wide">
              {book} {chapter}:{verseNum}
            </span>
            <span className="text-[10px] opacity-80 font-display">BiblIA</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCopyText}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
            <span>Copiar Texto</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-base">share</span>
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

