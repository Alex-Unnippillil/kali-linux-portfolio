const localizedPaths = {
  '/': { en: '/', es: '/es' },
  '/security-education': {
    en: '/security-education',
    es: '/es/educacion-de-seguridad',
  },
  '/es/educacion-de-seguridad': {
    en: '/security-education',
    es: '/es/educacion-de-seguridad',
  },
};

export function localizePath(path, locale) {
  const base = path.split('?')[0];
  const mapping = localizedPaths[base];
  if (mapping) return mapping[locale];
  return base;
}
