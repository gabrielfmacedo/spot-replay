import { useState, useCallback, createContext, useContext } from 'react';
import { Lang, T, TKey } from './translations';

const LS_KEY = 'spot_replay_lang';

export function getStoredLang(): Lang {
  const v = localStorage.getItem(LS_KEY);
  if (v === 'pt' || v === 'en' || v === 'es') return v;
  // Auto-detect from browser
  const br = navigator.language?.toLowerCase() ?? '';
  if (br.startsWith('pt')) return 'pt';
  if (br.startsWith('es')) return 'es';
  return 'pt'; // default
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(getStoredLang);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(LS_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback((key: TKey): string => {
    return T[key][lang] ?? T[key]['pt'];
  }, [lang]);

  return { lang, setLang, t };
}

// ── Context (so all components share the same language instance) ──────────────
import React from 'react';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

export const LanguageContext = createContext<LangCtx>({
  lang: 'pt',
  setLang: () => {},
  t: (key) => T[key]['pt'],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useLanguage();
  return React.createElement(LanguageContext.Provider, { value }, children);
};

export const useLang = () => useContext(LanguageContext);
