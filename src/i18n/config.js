import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';
import zhTranslation from './locales/zh.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';

const resources = {
  en: { translation: enTranslation },
  es: { translation: esTranslation },
  zh: { translation: zhTranslation },
  fr: { translation: frTranslation },
  de: { translation: deTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // Default language is Spanish
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
