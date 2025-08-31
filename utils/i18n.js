import en from '../public/locales/en/common.json';
import es from '../public/locales/es/common.json';

const messages = { en, es };

export function t(locale, key) {
  const segments = key.split('.');
  let message = messages[locale];
  for (const segment of segments) {
    message = message ? message[segment] : undefined;
  }
  if (message === undefined) {
    message = messages.en;
    for (const segment of segments) {
      message = message ? message[segment] : undefined;
    }
  }
  if (message === undefined) {
    message = messages.en.fallback.missing;
  }
  return message;
}
