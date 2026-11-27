import React from 'react';
import { SPIRITUAL_AVATARS } from '../profile/AvatarPickerModal';

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6 min-w-6 min-h-6 aspect-square', text: 'text-[10px]', icon: 'text-[13px]', border: 'border' },
  sm: { box: 'w-8 h-8 min-w-8 min-h-8 aspect-square', text: 'text-xs', icon: 'text-base', border: 'border' },
  md: { box: 'w-10 h-10 min-w-10 min-h-10 aspect-square', text: 'text-sm font-bold', icon: 'text-lg', border: 'border-2' },
  lg: { box: 'w-16 h-16 min-w-16 min-h-16 aspect-square', text: 'text-xl font-extrabold', icon: 'text-3xl', border: 'border-2' },
  xl: { box: 'w-24 h-24 min-w-24 min-h-24 aspect-square', text: 'text-3xl font-black', icon: 'text-4xl', border: 'border-2' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  displayName,
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const config = SIZE_MAP[size];
  const initial = (displayName?.trim()?.charAt(0) || 'D').toUpperCase();

  const spiritualPreset = SPIRITUAL_AVATARS.find((a) => a.url === avatarUrl);

  const borderClass = showBorder
    ? `${config.border} border-gold-radiant/60 dark:border-gold-radiant/40 shadow-sm`
    : '';

  // 1. Avatar espiritual canónico (Leão, Pomba, etc.)
  if (spiritualPreset) {
    return (
      <div
        className={`shrink-0 aspect-square rounded-full flex items-center justify-center bg-gradient-to-br shadow-sm select-none ${spiritualPreset.bgGradient} ${spiritualPreset.textColor} ${config.box} ${borderClass} ${className}`}
        title={spiritualPreset.name}
      >
        <span className={`material-symbols-outlined ${config.icon}`}>{spiritualPreset.symbol}</span>
      </div>
    );
  }

  // 2. Foto real (Google OAuth ou Gravatar)
  if (
    avatarUrl &&
    !imgError &&
    (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:'))
  ) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || 'Avatar'}
        className={`shrink-0 aspect-square rounded-full object-cover shadow-sm ${config.box} ${borderClass} ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // 3. Fallback: Inicial com estilo sagrado
  return (
    <div
      className={`shrink-0 aspect-square rounded-full flex items-center justify-center bg-sacred-brand/15 text-sacred-brand dark:bg-slate-800 dark:text-sacred-neon font-black shadow-sm select-none ${config.box} ${config.text} ${borderClass} ${className}`}
    >
      {initial}
    </div>
  );
};
