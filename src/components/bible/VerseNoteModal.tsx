import React, { useState, useEffect } from 'react';

interface VerseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  verseNum: number;
  verseText: string;
  initialNote?: string;
  onSave: (noteText: string) => void;
  onDelete?: () => void;
}

export const VerseNoteModal: React.FC<VerseNoteModalProps> = ({
  isOpen,
  onClose,
  book,
  chapter,
  verseNum,
  verseText,
  initialNote = '',
  onSave,
  onDelete,
}) => {
  const [noteContent, setNoteContent] = useState(initialNote);

  useEffect(() => {
    setNoteContent(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!noteContent.trim() && onDelete) {
      onDelete();
    } else {
      onSave(noteContent.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-2xl p-5 shadow-2xl animate-scale-in flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">edit_note</span>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Anotação Espiritual
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Reference Context */}
        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border-l-3 border-amber-500 rounded-r-xl">
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 mb-0.5">
            {book} {chapter}:{verseNum}
          </p>
          <p className="text-xs italic text-gray-700 dark:text-gray-300 line-clamp-3">
            "{verseText}"
          </p>
        </div>

        {/* Note Textarea */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Sua reflexão, oração ou revelação pessoal:
          </label>
          <textarea
            rows={5}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="O que o Espírito Santo falou ao seu coração com este versículo? Escreva aqui..."
            className="w-full p-3 rounded-xl text-xs bg-gray-50 dark:bg-surface-dark-alt border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          {initialNote && onDelete ? (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span>Excluir</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark transition-all shadow-sm"
            >
              Salvar Nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

