import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
}

export const Toast: React.FC<ToastProps> = ({ message, icon = 'check_circle' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [message]);

  if (!message) return null;

  return (
    <div
      className={`
        fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[200]
        flex items-center gap-2.5 px-4 py-3 rounded-2xl
        bg-gray-900/95 dark:bg-gray-800/95 text-white text-sm font-semibold
        shadow-2xl backdrop-blur-md border border-white/10
        transition-all duration-300 max-w-[320px] w-max
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95 pointer-events-none'}
      `}
      role="status"
      aria-live="polite"
    >
      <span
        className="material-symbols-outlined text-[20px] text-primary shrink-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <span className="leading-tight">{message}</span>
    </div>
  );
};
