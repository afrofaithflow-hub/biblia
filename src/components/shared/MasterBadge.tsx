import React from 'react';

interface MasterBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const MasterBadge: React.FC<MasterBadgeProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'text-[13px]',
    md: 'text-[16px]',
    lg: 'text-[20px]',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-black rounded-full bg-secondary/20 text-secondary border border-secondary/50 shadow-gold-glow uppercase tracking-wider relative overflow-hidden ${sizeClasses}`}
      title="Selo Dourado MASTER Oficial"
    >
      {/* Light shimmer sweep reflection */}
      <span className="absolute inset-0 shimmer-gold opacity-40 pointer-events-none" />

      <span
        className={`material-symbols-outlined ${iconSizes} text-secondary drop-shadow-[0_0_6px_rgba(212,175,55,0.6)] relative z-10 animate-bounce-slight`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        crown
      </span>
      {showText && <span className="relative z-10">{showText ? 'MASTER' : ''}</span>}
    </span>
  );
};
