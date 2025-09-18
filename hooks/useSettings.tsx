import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  getAccent as loadAccent,
  setAccent as saveAccent,
  getWallpaper as loadWallpaper,
  setWallpaper as saveWallpaper,
  getDensity as loadDensity,
  setDensity as saveDensity,
  getReducedMotion as loadReducedMotion,
  setReducedMotion as saveReducedMotion,
  getFontScale as loadFontScale,
  setFontScale as saveFontScale,
  getHighContrast as loadHighContrast,
  setHighContrast as saveHighContrast,
  getLargeHitAreas as loadLargeHitAreas,
  setLargeHitAreas as saveLargeHitAreas,
  getPongSpin as loadPongSpin,
  setPongSpin as savePongSpin,
  getAllowNetwork as loadAllowNetwork,
  setAllowNetwork as saveAllowNetwork,
  getHaptics as loadHaptics,
  setHaptics as saveHaptics,
  getProxyProfile as loadProxyProfile,
  setProxyProfile as saveProxyProfile,
  getProxyEnabled as loadProxyEnabled,
  setProxyEnabled as saveProxyEnabled,
  getLastKnownProxyState as loadLastKnownProxyState,
  setLastKnownProxyState as saveLastKnownProxyState,
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
import { setActiveProxySnapshot } from '../lib/fetchProxy';
type Density = 'regular' | 'compact';

export interface ProxyProfile {
  id: string;
  label: string;
  type?: string;
  description?: string;
  checkUrl?: string;
  timeout?: number;
}

export interface ActiveProxyProfile extends ProxyProfile {
  enabled: boolean;
}

interface ProxyStateSnapshot {
  profile: string;
  enabled: boolean;
}

export const PROXY_PROFILES: ProxyProfile[] = [
  {
    id: 'direct',
    label: 'Direct Connection',
    type: 'direct',
    description: 'Bypass the proxy and reach services directly.',
    checkUrl: '/favicon.ico',
  },
  {
    id: 'sim-tor',
    label: 'Tor Gateway (Simulated)',
    type: 'tor',
    description: 'Route traffic through a simulated Tor entry node.',
    timeout: 8000,
    checkUrl: '/favicon.ico?via=tor',
  },
  {
    id: 'sim-proxychain',
    label: 'ProxyChains (Simulated)',
    type: 'chain',
    description: 'Emulate chained corporate proxies with additional latency.',
    timeout: 6000,
    checkUrl: '/favicon.ico?via=chain',
  },
];

const FALLBACK_PROXY_PROFILE_ID = PROXY_PROFILES[0]?.id ?? 'direct';

const resolveProxyProfile = (id: string): ProxyProfile =>
  PROXY_PROFILES.find((profile) => profile.id === id) ?? PROXY_PROFILES[0];

const DEFAULT_PROXY_STATE: ProxyStateSnapshot = {
  profile: defaults.proxyProfile ?? FALLBACK_PROXY_PROFILE_ID,
  enabled: defaults.proxyEnabled ?? false,
};

const DEFAULT_ACTIVE_PROXY: ActiveProxyProfile = {
  ...resolveProxyProfile(DEFAULT_PROXY_STATE.profile),
  enabled: DEFAULT_PROXY_STATE.enabled,
};

// Predefined accent palette exposed to settings UI
export const ACCENT_OPTIONS = [
  '#1793d1', // kali blue (default)
  '#e53e3e', // red
  '#d97706', // orange
  '#38a169', // green
  '#805ad5', // purple
  '#ed64a6', // pink
];

// Utility to lighten or darken a hex color by a percentage
const shadeColor = (color: string, percent: number): string => {
  const f = parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)}`;
};

interface SettingsContextValue {
  accent: string;
  wallpaper: string;
  density: Density;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
  proxyEnabled: boolean;
  proxyProfile: string;
  proxyProfiles: ProxyProfile[];
  proxyCheckInProgress: boolean;
  proxyError: string | null;
  activeProxy: ActiveProxyProfile;
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (value: boolean) => void;
  setFontScale: (value: number) => void;
  setHighContrast: (value: boolean) => void;
  setLargeHitAreas: (value: boolean) => void;
  setPongSpin: (value: boolean) => void;
  setAllowNetwork: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setTheme: (value: string) => void;
  setProxyEnabled: (value: boolean) => void;
  setProxyProfile: (profile: string) => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density as Density,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  proxyEnabled: DEFAULT_PROXY_STATE.enabled,
  proxyProfile: DEFAULT_PROXY_STATE.profile,
  proxyProfiles: PROXY_PROFILES,
  proxyCheckInProgress: false,
  proxyError: null,
  activeProxy: DEFAULT_ACTIVE_PROXY,
  setAccent: () => {},
  setWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setFontScale: () => {},
  setHighContrast: () => {},
  setLargeHitAreas: () => {},
  setPongSpin: () => {},
  setAllowNetwork: () => {},
  setHaptics: () => {},
  setTheme: () => {},
  setProxyEnabled: () => {},
  setProxyProfile: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);
  const [density, setDensity] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotion] = useState<boolean>(defaults.reducedMotion);
  const [fontScale, setFontScale] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrast] = useState<boolean>(defaults.highContrast);
  const [largeHitAreas, setLargeHitAreas] = useState<boolean>(defaults.largeHitAreas);
  const [pongSpin, setPongSpin] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetwork] = useState<boolean>(defaults.allowNetwork);
  const [haptics, setHaptics] = useState<boolean>(defaults.haptics);
  const [theme, setTheme] = useState<string>(() => loadTheme());
  const [proxyProfile, setProxyProfileState] = useState<string>(DEFAULT_PROXY_STATE.profile);
  const [proxyEnabled, setProxyEnabledState] = useState<boolean>(DEFAULT_PROXY_STATE.enabled);
  const [proxyCheckInProgress, setProxyCheckInProgress] = useState(false);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const fetchRef = useRef<typeof fetch | null>(null);
  const proxyRequestRef = useRef(0);
  const lastKnownGoodProxyRef = useRef<ProxyStateSnapshot>(DEFAULT_PROXY_STATE);

  useEffect(() => {
    (async () => {
      const [
        accentValue,
        wallpaperValue,
        densityValue,
        reducedMotionValue,
        fontScaleValue,
        highContrastValue,
        largeHitAreasValue,
        pongSpinValue,
        allowNetworkValue,
        hapticsValue,
        proxyProfileValue,
        proxyEnabledValue,
        lastGoodProxyValue,
      ] = await Promise.all([
        loadAccent(),
        loadWallpaper(),
        loadDensity(),
        loadReducedMotion(),
        loadFontScale(),
        loadHighContrast(),
        loadLargeHitAreas(),
        loadPongSpin(),
        loadAllowNetwork(),
        loadHaptics(),
        loadProxyProfile(),
        loadProxyEnabled(),
        loadLastKnownProxyState(),
      ]);

      setAccent(accentValue);
      setWallpaper(wallpaperValue);
      setDensity(densityValue as Density);
      setReducedMotion(reducedMotionValue);
      setFontScale(fontScaleValue);
      setHighContrast(highContrastValue);
      setLargeHitAreas(largeHitAreasValue);
      setPongSpin(pongSpinValue);
      setAllowNetwork(allowNetworkValue);
      setHaptics(hapticsValue);
      setProxyProfileState(proxyProfileValue ?? FALLBACK_PROXY_PROFILE_ID);
      setProxyEnabledState(!!proxyEnabledValue);
      lastKnownGoodProxyRef.current =
        lastGoodProxyValue &&
        typeof lastGoodProxyValue.profile === 'string' &&
        typeof lastGoodProxyValue.enabled === 'boolean'
          ? lastGoodProxyValue
          : {
              profile: proxyProfileValue ?? FALLBACK_PROXY_PROFILE_ID,
              enabled: !!proxyEnabledValue,
            };
      setTheme(loadTheme());
    })();
  }, []);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const border = shadeColor(accent, -0.2);
    const vars: Record<string, string> = {
      '--color-ub-orange': accent,
      '--color-ub-border-orange': border,
      '--color-primary': accent,
      '--color-accent': accent,
      '--color-focus-ring': accent,
      '--color-selection': accent,
      '--color-control-accent': accent,
    };
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    saveAccent(accent);
  }, [accent]);

  useEffect(() => {
    saveWallpaper(wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    const spacing: Record<Density, Record<string, string>> = {
      regular: {
        '--space-1': '0.25rem',
        '--space-2': '0.5rem',
        '--space-3': '0.75rem',
        '--space-4': '1rem',
        '--space-5': '1.5rem',
        '--space-6': '2rem',
      },
      compact: {
        '--space-1': '0.125rem',
        '--space-2': '0.25rem',
        '--space-3': '0.5rem',
        '--space-4': '0.75rem',
        '--space-5': '1rem',
        '--space-6': '1.5rem',
      },
    };
    const vars = spacing[density];
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    saveDensity(density);
  }, [density]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    saveReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-multiplier', fontScale.toString());
    saveFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    saveHighContrast(highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-hit-area', largeHitAreas);
    saveLargeHitAreas(largeHitAreas);
  }, [largeHitAreas]);

  useEffect(() => {
    savePongSpin(pongSpin);
  }, [pongSpin]);

  useEffect(() => {
    saveAllowNetwork(allowNetwork);
    if (typeof window === 'undefined') return;
    if (!fetchRef.current) fetchRef.current = window.fetch.bind(window);
    if (!allowNetwork) {
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : 'url' in input
              ? input.url
              : input.href;
        if (
          /^https?:/i.test(url) &&
          !url.startsWith(window.location.origin) &&
          !url.startsWith('/')
        ) {
          return Promise.reject(new Error('Network requests disabled'));
        }
        return fetchRef.current!(input, init);
      };
    } else {
      window.fetch = fetchRef.current!;
    }
  }, [allowNetwork]);

  useEffect(() => {
    saveHaptics(haptics);
  }, [haptics]);

  const proxyProfileConfig = useMemo(() => resolveProxyProfile(proxyProfile), [proxyProfile]);

  const activeProxy = useMemo<ActiveProxyProfile>(
    () => ({
      ...proxyProfileConfig,
      enabled: proxyEnabled,
    }),
    [proxyProfileConfig, proxyEnabled],
  );

  useEffect(() => {
    setActiveProxySnapshot(activeProxy);
  }, [activeProxy]);

  const runProxyHealthCheck = useCallback(async (profile: ProxyProfile) => {
    if (typeof window === 'undefined') return true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), profile.timeout ?? 5000);
    const checkTarget = profile.checkUrl ?? '/favicon.ico';
    try {
      const url = new URL(checkTarget, window.location.origin).toString();
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return true;
    } catch (err) {
      console.warn(`Connectivity check failed for proxy ${profile.id}`, err);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const applyProxyState = useCallback(
    async (nextState: ProxyStateSnapshot) => {
      if (nextState.profile === proxyProfile && nextState.enabled === proxyEnabled) {
        return;
      }

      setProxyProfileState(nextState.profile);
      setProxyEnabledState(nextState.enabled);

      if (typeof window === 'undefined') {
        lastKnownGoodProxyRef.current = nextState;
        return;
      }

      const requestId = ++proxyRequestRef.current;
      setProxyError(null);

      const profileConfig = resolveProxyProfile(nextState.profile);

      if (!nextState.enabled) {
        setProxyCheckInProgress(false);
        lastKnownGoodProxyRef.current = nextState;
        try {
          await Promise.all([
            saveProxyProfile(nextState.profile),
            saveProxyEnabled(nextState.enabled),
            saveLastKnownProxyState(nextState),
          ]);
        } catch (err) {
          console.warn('Failed to persist proxy settings', err);
        }
        return;
      }

      setProxyCheckInProgress(true);
      const success = await runProxyHealthCheck(profileConfig);

      if (proxyRequestRef.current !== requestId) {
        return;
      }

      if (success) {
        lastKnownGoodProxyRef.current = nextState;
        setProxyCheckInProgress(false);
        try {
          await Promise.all([
            saveProxyProfile(nextState.profile),
            saveProxyEnabled(nextState.enabled),
            saveLastKnownProxyState(nextState),
          ]);
        } catch (err) {
          console.warn('Failed to persist proxy settings', err);
        }
      } else {
        const fallback = lastKnownGoodProxyRef.current;
        const fallbackProfile = resolveProxyProfile(fallback.profile);
        setProxyCheckInProgress(false);
        setProxyError(
          `Connectivity failed for ${profileConfig.label}. Restored ${fallbackProfile.label}.`,
        );
        setProxyProfileState(fallback.profile);
        setProxyEnabledState(fallback.enabled);
        try {
          await Promise.all([
            saveProxyProfile(fallback.profile),
            saveProxyEnabled(fallback.enabled),
            saveLastKnownProxyState(fallback),
          ]);
        } catch (err) {
          console.warn('Failed to persist proxy settings', err);
        }
      }
    },
    [proxyProfile, proxyEnabled, runProxyHealthCheck],
  );

  const handleProxyEnabled = useCallback(
    (value: boolean) => {
      void applyProxyState({ profile: proxyProfile, enabled: value });
    },
    [applyProxyState, proxyProfile],
  );

  const handleProxyProfileChange = useCallback(
    (profileId: string) => {
      void applyProxyState({ profile: profileId, enabled: proxyEnabled });
    },
    [applyProxyState, proxyEnabled],
  );

  return (
    <SettingsContext.Provider
      value={{
        accent,
        wallpaper,
        density,
        reducedMotion,
        fontScale,
        highContrast,
        largeHitAreas,
        pongSpin,
        allowNetwork,
        haptics,
        theme,
        proxyEnabled,
        proxyProfile,
        proxyProfiles: PROXY_PROFILES,
        proxyCheckInProgress,
        proxyError,
        activeProxy,
        setAccent,
        setWallpaper,
        setDensity,
        setReducedMotion,
        setFontScale,
        setHighContrast,
        setLargeHitAreas,
        setPongSpin,
        setAllowNetwork,
        setHaptics,
        setTheme,
        setProxyEnabled: handleProxyEnabled,
        setProxyProfile: handleProxyProfileChange,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

