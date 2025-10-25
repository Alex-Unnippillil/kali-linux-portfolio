export interface RistrettoConfig {
  loop: boolean;
}

const defaultRistrettoConfig: RistrettoConfig = {
  loop: false,
};

const KEY = 'ristretto-config';

export function loadRistrettoConfig(): RistrettoConfig {
  if (typeof window === 'undefined') return defaultRistrettoConfig;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultRistrettoConfig, ...JSON.parse(raw) } : defaultRistrettoConfig;
  } catch {
    return defaultRistrettoConfig;
  }
}

export function saveRistrettoConfig(config: RistrettoConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(config));
}

export { defaultRistrettoConfig };
