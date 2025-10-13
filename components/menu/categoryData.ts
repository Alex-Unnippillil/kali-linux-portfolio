export type CategorySource =
  | { type: 'home' }
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'recent' }
  | { type: 'ids'; appIds: readonly string[] };

export type CategoryDefinition = {
  id: string;
  label: string;
  icon: string;
} & CategorySource;

export const CATEGORY_STORAGE_KEY = 'whisker-menu-category';
export const DEFAULT_CATEGORY_ID = 'home';

export const CATEGORY_DEFINITIONS = [
  {
    id: DEFAULT_CATEGORY_ID,
    label: 'Home',
    icon: '/themes/Yaru/status/chrome_home.svg',
    type: 'home',
  },
  {
    id: 'all',
    label: 'All Applications',
    icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    type: 'all',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: '/themes/Yaru/status/projects.svg',
    type: 'favorites',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: '/themes/Yaru/status/process-working-symbolic.svg',
    type: 'recent',
  },
  {
    id: 'information-gathering',
    label: 'Information Gathering',
    icon: '/themes/Yaru/apps/radar-symbolic.svg',
    type: 'ids',
    appIds: ['nmap-nse', 'reconng', 'kismet', 'wireshark'],
  },
  {
    id: 'vulnerability-analysis',
    label: 'Vulnerability Analysis',
    icon: '/themes/Yaru/apps/nessus.svg',
    type: 'ids',
    appIds: ['nessus', 'openvas', 'nikto'],
  },
  {
    id: 'web-app-analysis',
    label: 'Web App Analysis',
    icon: '/themes/Yaru/apps/http.svg',
    type: 'ids',
    appIds: ['http', 'beef', 'metasploit'],
  },
  {
    id: 'password-attacks',
    label: 'Password Attacks',
    icon: '/themes/Yaru/apps/john.svg',
    type: 'ids',
    appIds: ['john', 'hashcat', 'hydra'],
  },
  {
    id: 'wireless-attacks',
    label: 'Wireless Attacks',
    icon: '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg',
    type: 'ids',
    appIds: ['kismet', 'reaver', 'wireshark'],
  },
  {
    id: 'exploitation-tools',
    label: 'Exploitation Tools',
    icon: '/themes/Yaru/apps/metasploit.svg',
    type: 'ids',
    appIds: ['metasploit', 'security-tools', 'beef'],
  },
  {
    id: 'sniffing-spoofing',
    label: 'Sniffing & Spoofing',
    icon: '/themes/Yaru/apps/ettercap.svg',
    type: 'ids',
    appIds: ['dsniff', 'ettercap', 'wireshark'],
  },
  {
    id: 'post-exploitation',
    label: 'Post Exploitation',
    icon: '/themes/Yaru/apps/msf-post.svg',
    type: 'ids',
    appIds: ['msf-post', 'mimikatz', 'volatility'],
  },
  {
    id: 'forensics-reporting',
    label: 'Forensics & Reporting',
    icon: '/themes/Yaru/apps/autopsy.svg',
    type: 'ids',
    appIds: ['autopsy', 'evidence-vault', 'project-gallery'],
  },
] as const satisfies readonly CategoryDefinition[];

export const isCategoryId = (
  value: string,
): value is (typeof CATEGORY_DEFINITIONS)[number]['id'] =>
  CATEGORY_DEFINITIONS.some(cat => cat.id === value);
