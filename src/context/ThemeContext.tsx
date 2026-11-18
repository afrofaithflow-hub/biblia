import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'claro' | 'escuro' | 'sistema';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('biblia-theme') as ThemeMode;
    return saved === 'claro' || saved === 'escuro' || saved === 'sistema' ? saved : 'sistema';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const applyTheme = () => {
      let isDark = true;
      if (themeMode === 'escuro') {
        isDark = true;
      } else if (themeMode === 'claro') {
        isDark = false;
      } else {
        // sistema
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setResolvedTheme(isDark ? 'dark' : 'light');

      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (themeMode === 'sistema') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('biblia-theme', mode);
  };

  const cycleTheme = () => {
    if (themeMode === 'sistema') setThemeMode('claro');
    else if (themeMode === 'claro') setThemeMode('escuro');
    else setThemeMode('sistema');
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, resolvedTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
