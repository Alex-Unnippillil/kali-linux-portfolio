import { safeLocalStorage } from '../../utils/safeStorage';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type InitOptions = {
  navigationThreshold?: number;
};

const DEFAULT_NAVIGATION_THRESHOLD = 3;
const A2HS_AVAILABLE_EVENT = 'a2hs:available';
const DISMISSAL_STORAGE_KEY = 'a2hs.dismissedAt';
const DISMISSAL_SUPPRESSION_MS = 30 * 24 * 60 * 60 * 1000;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let navigationThreshold = DEFAULT_NAVIGATION_THRESHOLD;
let navigationCount = 0;
let availabilityDispatched = false;
let hasSupport = false;

const isWithinSuppressionWindow = (timestamp: number) => {
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp < DISMISSAL_SUPPRESSION_MS;
};

export const isBeforeInstallPromptSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'onbeforeinstallprompt' in window;
};

export const isA2HSSuppressed = () => {
  const stored = safeLocalStorage?.getItem(DISMISSAL_STORAGE_KEY);
  if (!stored) return false;
  const timestamp = Number.parseInt(stored, 10);
  return isWithinSuppressionWindow(timestamp);
};

const maybeDispatchAvailability = () => {
  if (!deferredPrompt || availabilityDispatched) return;
  if (navigationCount < navigationThreshold) return;
  if (isA2HSSuppressed()) return;
  availabilityDispatched = true;
  window.dispatchEvent(new Event(A2HS_AVAILABLE_EVENT));
};

export function initA2HS(options: InitOptions = {}) {
  if (typeof window === 'undefined' || initialized) return;
  hasSupport = isBeforeInstallPromptSupported();
  if (!hasSupport) return;

  initialized = true;
  navigationThreshold = Math.max(1, options.navigationThreshold ?? DEFAULT_NAVIGATION_THRESHOLD);

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    const event = e as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = event;
    availabilityDispatched = false;
    navigationCount = Math.max(navigationCount, 0);
    maybeDispatchAvailability();
  });
}

export const recordNavigationEvent = () => {
  if (typeof window === 'undefined' || !hasSupport) return;
  navigationCount += 1;
  maybeDispatchAvailability();
};

export const dismissA2HS = () => {
  safeLocalStorage?.setItem(DISMISSAL_STORAGE_KEY, Date.now().toString());
  availabilityDispatched = false;
  deferredPrompt = null;
  navigationCount = 0;
};

export const clearA2HSDismissal = () => {
  safeLocalStorage?.removeItem(DISMISSAL_STORAGE_KEY);
};

export async function showA2HS() {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  await promptEvent.userChoice;
  navigationCount = 0;
  availabilityDispatched = false;
  return true;
}
