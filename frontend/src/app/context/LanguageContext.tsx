import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { Language } from '../types/auth';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load language preference from localStorage and user data
  useEffect(() => {
    // First check localStorage (user's manual selection)
    const stored = localStorage.getItem('preferredLanguage') as Language | null;
    if (stored && (stored === 'en' || stored === 'ru')) {
      setLanguageState(stored);
      setIsHydrated(true);
      return;
    }

    // Then check if we have user data with preferred language
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.user?.preferredLanguage) {
          const userLang = parsed.user.preferredLanguage as Language;
          if (userLang === 'en' || userLang === 'ru') {
            setLanguageState(userLang);
            setIsHydrated(true);
            return;
          }
        }
      } catch {}
    }

    setIsHydrated(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferredLanguage', lang);
    // Also update HTML lang attribute
    document.documentElement.lang = lang;
  };

  if (!isHydrated) {
    return null; // or a loading spinner
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return context;
}
