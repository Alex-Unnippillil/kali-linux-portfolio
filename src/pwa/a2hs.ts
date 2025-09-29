interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

async function announceInstallReady() {
  try {
    const { broadcastStatus, STATUS_DEFAULT_MESSAGES } = await import('./status');
    broadcastStatus({
      type: 'install-ready',
      action: 'install',
      message: STATUS_DEFAULT_MESSAGES['install-ready'],
    });
  } catch (error) {
    console.warn('Failed to announce install availability', error);
  }
}

export function initA2HS() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    const event = e as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = event;
    window.dispatchEvent(new Event('a2hs:available'));
    announceInstallReady();
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
