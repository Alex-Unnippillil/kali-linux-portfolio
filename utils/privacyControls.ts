import ReactGA from 'react-ga4';

const analyticsEnvEnabled =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

export interface PrivacyRuntimeState {
  analyticsEnabled: boolean;
  telemetryEnabled: boolean;
}

const runtimeState: PrivacyRuntimeState = {
  analyticsEnabled: analyticsEnvEnabled,
  telemetryEnabled: true,
};

type Listener = (state: PrivacyRuntimeState) => void;
const listeners = new Set<Listener>();

let originalEvent: ((...args: Parameters<typeof ReactGA.event>) => void) | null = null;
let originalSend: ((...args: Parameters<typeof ReactGA.send>) => void) | null = null;

const patchedEvent = (...args: Parameters<typeof ReactGA.event>) => {
  if (!runtimeState.analyticsEnabled || !originalEvent) return;
  try {
    originalEvent(...args);
  } catch {
    // ignore analytics errors
  }
};

const patchedSend = (...args: Parameters<typeof ReactGA.send>) => {
  if (!runtimeState.analyticsEnabled || !originalSend) return;
  try {
    originalSend(...args);
  } catch {
    // ignore analytics errors
  }
};

const ensurePatchedReactGa = () => {
  if (typeof window === 'undefined') return;
  if (typeof ReactGA.event === 'function' && ReactGA.event !== patchedEvent) {
    originalEvent = ReactGA.event.bind(ReactGA);
    ReactGA.event = patchedEvent;
  }
  if (typeof ReactGA.send === 'function' && ReactGA.send !== patchedSend) {
    originalSend = ReactGA.send.bind(ReactGA);
    ReactGA.send = patchedSend;
  }
};

const notify = () => {
  const snapshot: PrivacyRuntimeState = { ...runtimeState };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore listener errors
    }
  });
};

export const subscribePrivacyRuntime = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setAnalyticsEnabled = (enabled: boolean) => {
  runtimeState.analyticsEnabled = enabled;
  ensurePatchedReactGa();
  notify();
};

export const setTelemetryEnabled = (enabled: boolean) => {
  runtimeState.telemetryEnabled = enabled;
  notify();
};

export const isAnalyticsEnabled = () => runtimeState.analyticsEnabled;

export const isTelemetryEnabled = () => runtimeState.telemetryEnabled;
