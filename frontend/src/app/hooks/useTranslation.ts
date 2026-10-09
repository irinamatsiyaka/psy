import { useLanguageContext } from '../context/LanguageContext';
import { translations, type TranslationKey } from '../i18n/translations';

export function useTranslation() {
  const { language, setLanguage } = useLanguageContext();

  const t = (key: TranslationKey, replacements?: Record<string, string | number>): string => {
    let text = translations[language][key] ?? translations['en'][key] ?? key;

    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        text = text.replace(`{{${key}}}`, String(value));
      });
    }

    return text;
  };

  return { t, language, setLanguage };
}
