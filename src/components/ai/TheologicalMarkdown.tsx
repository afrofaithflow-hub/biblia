import React, { useMemo } from 'react';
import { BIBLE_BOOKS } from '../../data/bibleData';
import type { ScriptureReference } from '../../lib/assistantService';

interface TheologicalMarkdownProps {
  content: string;
  onOpenReference?: (ref: ScriptureReference) => void;
}

// Lista ordenada por comprimento decrescente para evitar falso match de prefixos (ex: "1 João" antes de "João")
const BOOK_NAMES = BIBLE_BOOKS.map((b) => b.name).sort((a, b) => b.length - a.length);

// Regex para detectar referências bíblicas no texto: Ex: "Provérbios 6:6-11", "João 3:16", "2 Tessalonicenses 3:10"
const SCRIPTURE_REGEX = new RegExp(
  `\\b(${BOOK_NAMES.join('|')})\\s+(\\d+):(\\d+)(?:[–\\-](\\d+))?\\b`,
  'gi'
);

function parseScriptureMatch(match: string): ScriptureReference | null {
  const parts = match.match(/^(.+?)\s+(\d+):(\d+)(?:[–\-](\d+))?$/);
  if (!parts) return null;
  const bookName = parts[1].trim();
  const matchedBook = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
  if (!matchedBook) return null;

  const chapter = parseInt(parts[2], 10);
  const startVerse = parseInt(parts[3], 10);
  const endVerse = parts[4] ? parseInt(parts[4], 10) : startVerse;

  const verses: number[] = [];
  for (let v = startVerse; v <= Math.min(endVerse, startVerse + 25); v++) {
    verses.push(v);
  }

  return {
    book: matchedBook.name,
    chapter,
    verses,
    label: match,
  };
}

/**
 * Renderiza texto em linha processando negrito (**), itálico (*), código e referências bíblicas clicáveis.
 */
const InlineText: React.FC<{ text: string; onOpenReference?: (ref: ScriptureReference) => void }> = ({
  text,
  onOpenReference,
}) => {
  // 1. Divide por negrito **...**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          const innerBold = bPart.slice(2, -2);
          return (
            <strong key={bIdx} className="font-extrabold text-slate-900 dark:text-white">
              <InlineTextWithScripture text={innerBold} onOpenReference={onOpenReference} />
            </strong>
          );
        }
        return <InlineTextWithScripture key={bIdx} text={bPart} onOpenReference={onOpenReference} />;
      })}
    </>
  );
};

const InlineTextWithScripture: React.FC<{ text: string; onOpenReference?: (ref: ScriptureReference) => void }> = ({
  text,
  onOpenReference,
}) => {
  // Divide por referências bíblicas reconhecíveis
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  SCRIPTURE_REGEX.lastIndex = 0;
  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    const start = match.index;
    const end = SCRIPTURE_REGEX.lastIndex;
    const matchedText = match[0];

    if (start > lastIndex) {
      elements.push(text.substring(lastIndex, start));
    }

    const scripture = parseScriptureMatch(matchedText);
    if (scripture && onOpenReference) {
      elements.push(
        <button
          key={`ref-${start}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenReference(scripture);
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-sacred-brand/10 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon font-bold hover:underline hover:bg-sacred-brand/20 transition-all cursor-pointer text-[11px]"
          title={`Abrir ${matchedText} na Bíblia`}
        >
          <span className="material-symbols-outlined text-[12px]">menu_book</span>
          <span>{matchedText}</span>
        </button>
      );
    } else {
      elements.push(matchedText);
    }

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return <>{elements}</>;
};

export const TheologicalMarkdown: React.FC<TheologicalMarkdownProps> = ({ content, onOpenReference }) => {
  // Limpeza robusta de JSON ou caracteres de escape indesejados
  const cleanMarkdown = useMemo(() => {
    let clean = content || '';

    // Remove eventual wrapper {"answer": "..."}
    if (clean.includes('"answer":') || clean.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(clean);
        if (typeof parsed.answer === 'string') clean = parsed.answer;
      } catch {
        const match = clean.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)/s);
        if (match && match[1]) {
          try {
            clean = JSON.parse(`"${match[1]}"`);
          } catch {
            clean = match[1];
          }
        }
      }
    }

    // Unescape de quebras de linha literais
    clean = clean
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .replace(/^\s*\{?\s*"answer"\s*:\s*"?/i, '')
      .replace(/"\s*,?\s*"(?:references|kind|suggested_questions)[\s\S]*$/i, '')
      .replace(/"?\s*\}?\s*$/i, '');

    return clean.trim();
  }, [content]);

  // Divide o texto em blocos separados por quebras de linha duplas
  const blocks = useMemo(() => {
    const rawBlocks = cleanMarkdown.split(/\n\s*\n/);
    return rawBlocks.map((b) => b.trim()).filter(Boolean);
  }, [cleanMarkdown]);

  return (
    <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-200 text-left">
      {blocks.map((block, idx) => {
        // 1. Título nível 1 ou 2 (# ou ##)
        if (block.startsWith('# ') || block.startsWith('## ')) {
          const title = block.replace(/^#+\s*/, '');
          return (
            <h3 key={idx} className="font-serif text-sm font-bold text-slate-900 dark:text-white pt-2 border-b border-slate-100 dark:border-white/10 pb-1">
              <InlineText text={title} onOpenReference={onOpenReference} />
            </h3>
          );
        }

        // 2. Título nível 3 (###)
        if (block.startsWith('### ')) {
          const title = block.replace(/^###\s*/, '');
          const isReflection = /reflex[aã]o|refletir|aplica[çc][aã]o/i.test(title);

          return (
            <div key={idx} className={`pt-2 ${isReflection ? 'flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-extrabold' : ''}`}>
              {isReflection && <span className="material-symbols-outlined text-sm">lightbulb</span>}
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
                <InlineText text={title} onOpenReference={onOpenReference} />
              </h4>
            </div>
          );
        }

        // 3. Caixa especial de Reflexão / Aplicação Prática ("Para refletir" ou "Aplicação")
        if (/^\*{0,2}(Para refletir|Reflexão|Aplicação Prática)/i.test(block)) {
          return (
            <div
              key={idx}
              className="rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 p-3 my-2 text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-1.5 font-extrabold text-[11px] text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">
                <span className="material-symbols-outlined text-sm">auto_stories</span>
                <span>Para Meditar</span>
              </div>
              <p className="italic text-[11px] leading-relaxed">
                <InlineText text={block.replace(/^\*{0,2}(Para refletir|Reflexão|Aplicação Prática):?\*{0,2}\s*/i, '')} onOpenReference={onOpenReference} />
              </p>
            </div>
          );
        }

        // 4. Blockquote (> citação)
        if (block.startsWith('>')) {
          const quoteLines = block.split('\n').map((l) => l.replace(/^>\s*/, '')).join('\n');
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-sacred-brand dark:border-sacred-neon pl-3 italic text-slate-600 dark:text-slate-300 my-2"
            >
              <InlineText text={quoteLines} onOpenReference={onOpenReference} />
            </blockquote>
          );
        }

        // 5. Lista com marcadores (- ou *)
        if (block.split('\n').every((l) => /^\s*[-*]\s+/.test(l))) {
          const items = block.split('\n').map((l) => l.replace(/^\s*[-*]\s+/, ''));
          return (
            <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-sacred-brand dark:marker:text-sacred-neon">
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <InlineText text={item} onOpenReference={onOpenReference} />
                </li>
              ))}
            </ul>
          );
        }

        // 6. Lista numerada (1. 2. 3.)
        if (block.split('\n').some((l) => /^\s*\d+\.\s+/.test(l))) {
          const items = block.split('\n');
          return (
            <div key={idx} className="space-y-2 my-1">
              {items.map((item, itemIdx) => {
                const matchNum = item.match(/^\s*(\d+)\.\s+(.*)$/);
                if (matchNum) {
                  return (
                    <div key={itemIdx} className="flex items-start gap-2">
                      <span className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {matchNum[1]}
                      </span>
                      <div className="flex-1">
                        <InlineText text={matchNum[2]} onOpenReference={onOpenReference} />
                      </div>
                    </div>
                  );
                }
                return (
                  <p key={itemIdx}>
                    <InlineText text={item} onOpenReference={onOpenReference} />
                  </p>
                );
              })}
            </div>
          );
        }

        // 7. Parágrafo padrão com espaçamento limpo
        return (
          <p key={idx} className="leading-relaxed">
            <InlineText text={block} onOpenReference={onOpenReference} />
          </p>
        );
      })}
    </div>
  );
};
