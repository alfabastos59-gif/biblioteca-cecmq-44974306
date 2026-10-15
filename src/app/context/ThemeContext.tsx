// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'alegre' | 'emerald' | 'dark' | 'ocean' | 'kinetic' | 'purple' | 'light';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isAlegre: boolean;
  isDark: boolean;
  isKinetic: boolean;
  isClassicDark: boolean;
  isOcean: boolean;
  isPurple: boolean;
  isEmerald: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tema alegre escolar e comunitário da Biblioteca Maria Quitéria
  const [theme, setThemeState] = useState<AppTheme>('alegre');

  useEffect(() => {
    localStorage.setItem('bmq_theme', 'alegre');
    const root = document.documentElement;
    root.classList.remove('purple', 'dark', 'kinetic', 'ocean', 'emerald');
    root.classList.add('alegre', 'light');
    document.body.style.backgroundColor = '#fbf8ef';
    document.body.style.color = '#1e293b';
  }, []);

  const toggleTheme = () => {};
  const setTheme = (t: AppTheme) => {
    setThemeState(t);
  };

  const isAlegre = theme === 'alegre';
  const isDark = false;
  const isEmerald = false;
  const isPurple = false;
  const isKinetic = false;
  const isClassicDark = false;
  const isOcean = false;
  const isLight = true;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isAlegre,
        isDark,
        isKinetic,
        isClassicDark,
        isOcean,
        isPurple,
        isEmerald,
        isLight,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

const defaultThemeValue: ThemeContextType = {
  theme: 'alegre',
  setTheme: () => {},
  toggleTheme: () => {},
  isAlegre: true,
  isDark: false,
  isKinetic: false,
  isClassicDark: false,
  isOcean: false,
  isPurple: false,
  isEmerald: false,
  isLight: true,
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return defaultThemeValue;
  }
  return context;
};
