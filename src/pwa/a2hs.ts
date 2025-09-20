interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __a2hsAvailable?: boolean;
  }
}

const AVAILABLE_EVENT = 'a2hs:available';
const CONSUMED_EVENT = 'a2hs:consumed';
const INSTALLED_EVENT = 'a2hs:installed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

const dispatchAvailable = () => {
  if (typeof window === 'undefined') return;
  window.__a2hsAvailable = true;
  window.dispatchEvent(new Event(AVAILABLE_EVENT));
};

const dispatchConsumed = () => {
  if (typeof window === 'undefined') return;
  window.__a2hsAvailable = false;
  window.dispatchEvent(new Event(CONSUMED_EVENT));
};

export function initA2HS() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  window.__a2hsAvailable ||= false;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    const event = e as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = event;
    dispatchAvailable();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    dispatchConsumed();
    window.dispatchEvent(new Event(INSTALLED_EVENT));
  });
}

export async function showA2HS() {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;

  try {
    await promptEvent.prompt();
    await promptEvent.userChoice;
    return true;
  } finally {
    dispatchConsumed();
  }
}
