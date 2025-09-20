import { useEffect, useState } from 'react';

export type LocaleDirection = 'ltr' | 'rtl';

export const getDocumentDirection = (): LocaleDirection => {
  if (typeof document === 'undefined') return 'ltr';
  const dir = document.documentElement.getAttribute('dir');
  return dir === 'rtl' ? 'rtl' : 'ltr';
};

const useLocaleDirection = (): LocaleDirection => {
  const [direction, setDirection] = useState<LocaleDirection>(() => getDocumentDirection());

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const update = () => setDirection(getDocumentDirection());

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });

    window.addEventListener('languagechange', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('languagechange', update);
    };
  }, []);

  return direction;
};

export default useLocaleDirection;
