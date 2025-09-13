/* eslint-env browser */
(function () {
  const I18N_PATH = '/assets/i18n/';
  const DEFAULT_LOCALE = 'en';
  let translations = {};

  function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && Object.prototype.hasOwnProperty.call(translations, key)) {
        el.textContent = translations[key];
      }
    });
  }

  async function loadLocale(locale) {
    const res = await fetch(`${I18N_PATH}${locale}.json`);
    translations = await res.json();
    applyTranslations();
  }

  window.setLocale = async function (locale) {
    await loadLocale(locale);
    try {
      window.localStorage.setItem('locale', locale);
    } catch (e) {
      // ignore storage errors
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    let locale = DEFAULT_LOCALE;
    try {
      locale = window.localStorage.getItem('locale') || DEFAULT_LOCALE;
    } catch (e) {
      locale = DEFAULT_LOCALE;
    }
    loadLocale(locale);
  });
})();
