export type NavLabelSet = {
  applications: string;
  status: string;
};

const DEFAULT_LABELS: NavLabelSet = {
  applications: 'Applications',
  status: 'System status'
};

const KALI_LABELS: NavLabelSet = {
  applications: 'Kali Apps',
  status: 'Kali system status'
};

export function getNavLabels(theme?: string): NavLabelSet {
  const currentTheme =
    theme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : undefined);
  if (currentTheme === 'kali') {
    return KALI_LABELS;
  }
  return DEFAULT_LABELS;
}
