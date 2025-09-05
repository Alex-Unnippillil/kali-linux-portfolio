export interface ParoleConfig {
  autoplay: boolean;
}

const defaultParoleConfig: ParoleConfig = {
  autoplay: false,
};

const KEY = 'parole-config';

export function loadParoleConfig(): ParoleConfig {
  if (typeof window === 'undefined') return defaultParoleConfig;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultParoleConfig, ...JSON.parse(raw) } : defaultParoleConfig;
  } catch {
    return defaultParoleConfig;
  }
}

export function saveParoleConfig(config: ParoleConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(config));
}

export { defaultParoleConfig };
