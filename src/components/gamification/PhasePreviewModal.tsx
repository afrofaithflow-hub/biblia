import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PhasePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  phaseData?: {
    title: string;
    testament: string;
    level: number;
    xpReward: number;
    difficulty: string;
    duration: string;
    heartsRequired: number;
    summary: string;
    tags: string[];
    nextPhase: string;
    coverImg: string;
  };
}

export const PhasePreviewModal: React.FC<PhasePreviewModalProps> = ({
  isOpen,
  onClose,
  onStart,
  phaseData = {
    title: 'Gênesis: O Início',
    testament: 'Antigo Testamento',
    level: 3,
    xpReward: 50,
    difficulty: 'Média',
    duration: '5 min',
    heartsRequired: 1,
    summary:
      'Explore a história da criação e descubra como a luz foi separada das trevas. Neste desafio, você ordenará os dias da criação e responderá perguntas sobre os primeiros humanos.',
    tags: ['Ordem da Criação', 'Personagens Chave'],
    nextPhase: 'Fase 2: A Queda',
    coverImg:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBgjB5pPbuRAphaPOmslTiu1FP0-DvVV5RRXGO1UXHAasnUeeYbrK9q6qdiAnbApNHW0m9jAruYPCzNfZDBVwv7CSEJdnRjyi96XtjMlHso7ghyKQXtY-0sg1IBNQSI6ijKieQIL3MaIxjDQuYowhTs6Ieb5jtBKxAJM44pNrjv8DqLpeaNQQ_GXeL5ggTBQDP8ylGOuMBzyzBprI0deBdsYNfMIu9p7wIacjWK0ZmF3g6jlIX5To7dphUcVPvhrEJbZYzoOySDKAc',
  },
}) => {
  // Prevent background scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden border border-slate-200/80 dark:border-white/10 relative animate-slide-up">
        {/* Handle for mobile drawer */}
        <div className="w-full flex justify-center py-2 sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Top bar — shrink-0 to prevent compression */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-2 pb-2 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center size-9 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sacred-brand/10 dark:bg-sacred-neon/10 border border-sacred-brand/20 dark:border-sacred-neon/20">
            <span
              className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <span className="text-xs font-bold text-sacred-brand dark:text-sacred-neon uppercase tracking-wider">
              Nível {phaseData.level} Desbloqueado
            </span>
          </div>

          <div className="size-9" /> {/* Spacer */}
        </div>

        {/* Scrollable content with min-h-0 to guarantee scrollability on low-height viewports */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 sm:px-6 pb-4 space-y-4">
          {/* Cover card with responsive height */}
          <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden shadow-md group mt-1 shrink-0">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${phaseData.coverImg}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2.5 py-0.5 rounded-lg shadow-sm flex items-center gap-1.5 border border-white/20">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">Novo</span>
            </div>

            <div className="absolute bottom-0 left-0 p-4 sm:p-5 w-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-secondary text-white text-[10px] font-bold uppercase tracking-wider">
                  {phaseData.testament}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight drop-shadow-md">
                {phaseData.title}
              </h2>
            </div>
          </div>

          {/* 4 Stats Grid: 2 cols on mobile, 4 cols on tablet/desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Recompensa */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col items-start gap-0.5">
              <div className="size-7 rounded-full bg-gold-radiant/20 flex items-center justify-center text-gold-talent mb-0.5">
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  emoji_events
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Recompensa</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">+{phaseData.xpReward} XP</span>
            </div>

            {/* 2. Dificuldade */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col items-start gap-0.5">
              <div className="size-7 rounded-full bg-sacred-brand/15 dark:bg-sacred-neon/15 flex items-center justify-center text-sacred-brand dark:text-sacred-neon mb-0.5">
                <span className="material-symbols-outlined text-[18px]">signal_cellular_alt</span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Dificuldade</span>
              <div className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-gold-radiant text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="material-symbols-outlined text-gold-radiant text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[14px]">
                  star
                </span>
                <span className="text-xs font-bold ml-1 text-gray-900 dark:text-white">
                  {phaseData.difficulty}
                </span>
              </div>
            </div>

            {/* 3. Tempo */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col items-start gap-0.5">
              <div className="size-7 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500 mb-0.5">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Tempo Estimado</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{phaseData.duration}</span>
            </div>

            {/* 4. Requisitos */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col items-start gap-0.5">
              <div className="size-7 rounded-full bg-red-500/15 flex items-center justify-center text-red-500 mb-0.5">
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Requisitos</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {phaseData.heartsRequired} Coração
              </span>
            </div>
          </div>

          {/* Mission summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Resumo da Missão</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {phaseData.summary}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {phaseData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5"
                >
                  <span className="size-1.5 rounded-full bg-sacred-brand dark:bg-sacred-neon" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA Button — shrink-0 to NEVER be hidden or overlapped */}
        <div className="p-4 sm:p-5 pt-3 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-white/5 shrink-0 z-10">
          <button
            onClick={() => {
              onClose();
              onStart();
            }}
            className="w-full btn-duo-primary py-3.5 text-base flex items-center justify-center gap-2 shadow-duo-primary dark:shadow-[0_4px_0_#0e302c]"
          >
            <span>Iniciar Desafio</span>
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
          <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2">
            Completar esta fase desbloqueia {phaseData.nextPhase}
          </p>
        </div>
      </div>
    </div>
  );

  // Render via portal directly to document.body to escape any container stacking context
  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
};
