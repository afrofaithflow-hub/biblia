import React, { useState, useEffect, useCallback } from 'react';
import { TutorialStep } from '../../lib/tutorialService';

interface TutorialSpotlightProps {
  steps: TutorialStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const currentStep = steps[currentStepIndex];

  const updateTargetPosition = useCallback(() => {
    if (!currentStep) return;
    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Scroll se o elemento estiver fora do ecrã visível
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    } else {
      // Se não encontrar o seletor alvo, aguarda um momento ou avança
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;
    // Pequeno atraso para aguardar a montagem do layout
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 250);

    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isActive, currentStepIndex, updateTargetPosition]);

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Determinar posicionamento do balão explicativo com clamping inteligente para tela cheia e mobile
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const padding = 6;
  const highlightTop = targetRect ? Math.max(4, targetRect.top - padding) : windowHeight / 2 - 40;
  const highlightLeft = targetRect ? Math.max(4, targetRect.left - padding) : 20;
  const highlightWidth = targetRect ? targetRect.width + padding * 2 : (typeof window !== 'undefined' ? window.innerWidth - 40 : 360);
  const highlightHeight = targetRect ? targetRect.height + padding * 2 : 80;

  // Altura aproximada do balão de tutorial (~190px)
  const balloonHeight = 195;
  const spaceAbove = highlightTop;
  const spaceBelow = windowHeight - (highlightTop + highlightHeight);

  // Decisão de posição: respeita a sugestão apenas se houver espaço mínimo (200px)
  let chosenPosition: 'top' | 'bottom' = 'bottom';
  if (currentStep.position === 'top' && spaceAbove >= balloonHeight + 10) {
    chosenPosition = 'top';
  } else if (currentStep.position === 'bottom' && spaceBelow >= balloonHeight + 10) {
    chosenPosition = 'bottom';
  } else if (spaceBelow >= balloonHeight + 10) {
    chosenPosition = 'bottom';
  } else if (spaceAbove >= balloonHeight + 10) {
    chosenPosition = 'top';
  } else {
    // Escolhe o lado com maior espaço disponível
    chosenPosition = spaceBelow >= spaceAbove ? 'bottom' : 'top';
  }

  // Cálculo seguro do topo com margens de segurança na tela
  const balloonTop =
    chosenPosition === 'top'
      ? Math.max(16, highlightTop - balloonHeight - 12)
      : Math.min(windowHeight - balloonHeight - 16, highlightTop + highlightHeight + 12);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto select-none overflow-hidden animate-fade-in">
      {/* SVG com Máscara de Recorte Translúcido */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tutorial-spotlight-mask">
            {/* Fundo Branco (visível/escurecido) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Recorte Preto (transparente onde brilha o alvo) */}
            {targetRect && (
              <rect
                x={highlightLeft}
                y={highlightTop}
                width={highlightWidth}
                height={highlightHeight}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Camada escura que obedece à máscara */}
        <rect
          x="0"
          y="0"
          width="100%" height="100%"
          fill="rgba(5, 13, 12, 0.78)"
          mask="url(#tutorial-spotlight-mask)"
        />
      </svg>

      {/* Anel de Pulso Sagrado em volta do elemento-alvo */}
      {targetRect && (
        <div
          style={{
            top: `${highlightTop}px`,
            left: `${highlightLeft}px`,
            width: `${highlightWidth}px`,
            height: `${highlightHeight}px`,
          }}
          className="absolute rounded-2xl border-2 border-sacred-neon/80 shadow-[0_0_24px_rgba(45,212,191,0.4)] pointer-events-none transition-all duration-300 animate-pulse"
        />
      )}

      {/* Balão de Explicação Interativo */}
      <div
        style={{
          top: `${balloonTop}px`,
        }}
        className="absolute left-4 right-4 max-w-sm mx-auto bg-[#0d1e1c]/95 backdrop-blur-md border border-sacred-neon/30 text-white p-5 rounded-2xl shadow-2xl transition-all duration-300"
      >
        {/* Cabeçalho do Balão */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sacred-neon animate-ping" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-sacred-neon font-mono">
              Passo {currentStepIndex + 1} de {steps.length}
            </span>
          </div>
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            Saltar
          </button>
        </div>

        {/* Título & Descrição */}
        <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-sacred-neon">auto_awesome</span>
          {currentStep.title}
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
              currentStepIndex === 0
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Anterior
          </button>
          <button
            onClick={handleNext}
            className="bg-sacred-neon text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
          >
            {isLastStep ? 'Concluir' : 'Próximo'}
            <span className="material-symbols-outlined text-sm font-bold">
              {isLastStep ? 'check' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
