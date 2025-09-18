const fs = require('fs');
const path = require('path');

const cache = new Map();

const loadNamespace = (namespace = 'common') => {
  if (cache.has(namespace)) return cache.get(namespace);
  const filePath = path.join(__dirname, '..', 'public', 'locales', 'en', `${namespace}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    cache.set(namespace, data);
    return data;
  } catch {
    cache.set(namespace, {});
    return {};
  }
};

const createI18n = () => {
  const listeners = new Set();
  let currentLocale = 'en';
  return {
    language: currentLocale,
    changeLanguage: async (locale) => {
      currentLocale = locale;
      listeners.forEach((listener) => listener(locale));
      return locale;
    },
    on: (event, handler) => {
      if (event === 'languageChanged') {
        listeners.add(handler);
      }
    },
    off: (event, handler) => {
      if (event === 'languageChanged') {
        listeners.delete(handler);
      }
    },
    dir: () => 'ltr',
  };
};

const resolveKey = (resources, key) => {
  return key.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return acc[part];
    }
    return undefined;
  }, resources);
};

const mockUseTranslation = (namespace = 'common') => {
  const resources = loadNamespace(Array.isArray(namespace) ? namespace[0] : namespace);
  return {
    t: (key) => {
      if (!key) return '';
      const value = resolveKey(resources, key);
      return typeof value === 'string' ? value : key;
    },
    i18n: createI18n(),
  };
};

module.exports = {
  appWithTranslation: (Component) => Component,
  useTranslation: mockUseTranslation,
};
