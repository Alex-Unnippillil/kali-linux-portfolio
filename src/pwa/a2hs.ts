interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

export function initA2HS() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    const event = e as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = event;
    window.dispatchEvent(new Event('a2hs:available'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event('a2hs:installed'));
  });
}

export async function showA2HS() {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  await promptEvent.userChoice;
  return true;
}
