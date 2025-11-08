import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import tr from './locales/tr/translation.json';

const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const browser = typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage || '').toLowerCase() : '';
const fallbackLang = browser.startsWith('tr') ? 'tr' : 'en';
const initialLang = saved || fallbackLang;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: initialLang,
    fallbackLng: 'en',
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

// persist language changes
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('lang', lng);
    document.documentElement.lang = lng;
  } catch {}
});

export default i18n;


