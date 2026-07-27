export const SITE_URL = 'https://unnippillil.com';
export const SITE_NAME = 'Alex Unnippillil Portfolio';
export const DEFAULT_TITLE = 'Alex Unnippillil | Offensive Security Portfolio';
export const DEFAULT_DESCRIPTION =
  'Alex Unnippillil showcases a Kali-inspired desktop portfolio with simulated security tooling, games, and productivity apps.';
export const DEFAULT_IMAGE = '/images/logos/logo_1200.png';
export const SOCIAL_TWITTER_HANDLE = '@unnippillil';
export const DEFAULT_KEYWORDS = [
  'Alex Unnippillil',
  'security portfolio',
  'Kali Linux desktop',
  'cybersecurity student',
  'penetration testing projects',
  'cyber range simulations',
  'Next.js portfolio',
];

export const DEFAULT_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Alex Unnippillil',
    url: SITE_URL,
    jobTitle: 'Offensive Security Enthusiast',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-CA',
  },
];
