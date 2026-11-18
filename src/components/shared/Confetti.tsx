import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
  count?: number;
}

const COLORS = ['#D4AF37', '#2d7a7c', '#F5D76E', '#3dd6d8', '#ffffff', '#A0522D'];

export const Confetti: React.FC<ConfettiProps> = ({ active, count = 36 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Respeita a preferência de acessibilidade do sistema para redução de movimento (W3C / WCAG)
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const left = Math.random() * 100;
      const size = Math.random() * 6 + 5;
      const delay = Math.random() * 0.6;
      const duration = Math.random() * 0.8 + 1.4;

      particle.className = 'confetti-particle';
      particle.style.cssText = `
        left: ${left}%;
        top: -10px;
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(particle);
    }
  }, [active, count]);

  if (!active) return null;

  return <div ref={containerRef} className="confetti-container" aria-hidden="true" />;
};
