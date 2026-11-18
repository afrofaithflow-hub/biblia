import React from 'react';
import { HighlightColor } from '../../lib/bibleStorage';

interface VerseActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  verseNum: number;
  verseText: string;
  currentHighlight?: HighlightColor;
  isFavorite: boolean;
  hasNote: boolean;
  onHighlight: (color: HighlightColor) => void;
  onRemoveHighlight: () => void;
  onToggleFavorite: () => void;
  onOpenNote: () => void;
  onCopy: () => void;
  onShareCard: () => void;
  onAskAI: () => void;
}

export const VerseActionSheet: React.FC<VerseActionSheetProps> = ({
  isOpen,
  onClose,
  book,
  chapter,
  verseNum,
  verseText,
  currentHighlight,
  isFavorite,
  hasNote,
  onHighlight,
  onRemoveHighlight,
  onToggleFavorite,
  onOpenNote,
  onCopy,
  onShareCard,
  onAskAI,
}) => {
  if (!isOpen) return null;

  const colorOptions: { color: HighlightColor; bgClass: string; label: string }[] = [
    { color: 'yellow', bgClass: 'bg-amber-300 dark:bg-amber-400', label: 'Dourado' },
    { color: 'green', bgClass: 'bg-emerald-300 dark:bg-emerald-400', label: 'Esperança' },
    { color: 'blue', bgClass: 'bg-sky-300 dark:bg-sky-400', label: 'Celestial' },
    { color: 'rose', bgClass: 'bg-rose-300 dark:bg-rose-400', label: 'Graça' },
    { color: 'purple', bgClass: 'bg-purple-300 dark:bg-purple-400', label: 'Realeza' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark w-full max-w-lg rounded-t-3xl border-t border-gray-200 dark:border-gray-800 p-5 shadow-2xl animate-slide-up space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle & Header */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mb-3" />
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-primary dark:text-primary-light uppercase">
                Versículo Selecionado
              </span>
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {book} {chapter}:{verseNum}
              </h4>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Verse Snippet */}
        <p className="text-xs italic text-gray-600 dark:text-gray-300 line-clamp-2 border-l-2 border-primary/50 pl-2.5 py-0.5 bg-gray-50 dark:bg-dark-canvas/50 rounded-r-lg">
          "{verseText}"
        </p>

        {/* Highlight Colors Palette */}
        <div>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2 block">
            Marca-Texto
          </span>
          <div className="flex items-center gap-2.5">
            {colorOptions.map(({ color, bgClass, label }) => {
              const isSelected = currentHighlight === color;
              return (
                <button
                  key={color}
                  onClick={() => onHighlight(color)}
                  className={`size-8 rounded-full ${bgClass} transition-all transform hover:scale-110 flex items-center justify-center shadow-xs ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'opacity-90'
                  }`}
                  title={label}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-xs text-gray-900 font-bold">
                      check
                    </span>
                  )}
                </button>
              );
            })}

            {/* Clear highlight button */}
            {currentHighlight && (
              <button
                onClick={onRemoveHighlight}
                className="size-8 rounded-full border border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:text-rose-500 hover:border-rose-400 transition-all ml-1"
                title="Remover destaque"
              >
                <span className="material-symbols-outlined text-sm">format_color_reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          {/* Favorite */}
          <button
            onClick={onToggleFavorite}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
              isFavorite
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-500 font-bold'
                : 'bg-gray-50 dark:bg-surface-dark-alt border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            <span
              className="material-symbols-outlined text-xl mb-1 text-rose-500"
              style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
            <span className="text-[10px] leading-tight font-medium">
              {isFavorite ? 'Favorito' : 'Favoritar'}
            </span>
          </button>

          {/* Notes */}
          <button
            onClick={onOpenNote}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
              hasNote
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-600 font-bold'
                : 'bg-gray-50 dark:bg-surface-dark-alt border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            <span
              className="material-symbols-outlined text-xl mb-1 text-amber-500"
              style={{ fontVariationSettings: hasNote ? "'FILL' 1" : "'FILL' 0" }}
            >
              edit_note
            </span>
            <span className="text-[10px] leading-tight font-medium">
              {hasNote ? 'Ver Nota' : 'Anotação'}
            </span>
          </button>

          {/* Share Card */}
          <button
            onClick={onShareCard}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border bg-gray-50 dark:bg-surface-dark-alt border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1 text-sky-500">
              image
            </span>
            <span className="text-[10px] leading-tight font-medium">Card Arte</span>
          </button>

          {/* Copy */}
          <button
            onClick={onCopy}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border bg-gray-50 dark:bg-surface-dark-alt border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-all"
          >
            <span className="material-symbols-outlined text-xl mb-1 text-teal-600">
              content_copy
            </span>
            <span className="text-[10px] leading-tight font-medium">Copiar</span>
          </button>
        </div>

        {/* AI Theological Consultation Shortcut */}
        <button
          onClick={onAskAI}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:brightness-110 active:scale-[0.99] transition-all"
        >
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          <span>Consultar Assistente Teológico com IA</span>
        </button>
      </div>
    </div>
  );
};

