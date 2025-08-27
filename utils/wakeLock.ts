let wakeLock: WakeLockSentinel | null = null;
let enabled = false;

async function requestLock(): Promise<void> {
  if (!('wakeLock' in navigator)) {
    throw new Error('Wake Lock API is not supported');
  }
  wakeLock = await navigator.wakeLock.request('screen');
}

async function releaseLock(): Promise<void> {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
}

async function handleVisibility(): Promise<void> {
  if (document.visibilityState === 'visible' && enabled && !wakeLock) {
    try {
      await requestLock();
    } catch {
      // Ignore re-acquisition errors
    }
  } else if (document.visibilityState !== 'visible' && wakeLock) {
    await releaseLock();
  }
}

export async function setWakeLock(on: boolean): Promise<void> {
  enabled = on;
  if (on) {
    await requestLock();
    document.addEventListener('visibilitychange', handleVisibility);
  } else {
    document.removeEventListener('visibilitychange', handleVisibility);
    await releaseLock();
  }
}
