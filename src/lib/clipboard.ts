const SECURE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

type GlobalClipboardContext = typeof globalThis & {
  location?: Location;
  isSecureContext?: boolean;
};

const getGlobalContext = (): GlobalClipboardContext | undefined => {
  if (typeof globalThis !== 'undefined') {
    return globalThis as GlobalClipboardContext;
  }

  if (typeof window !== 'undefined') {
    return window as unknown as GlobalClipboardContext;
  }

  return undefined;
};

const isSecureEnvironment = (): boolean => {
  const globalContext = getGlobalContext();
  if (!globalContext) {
    return false;
  }

  if (typeof globalContext.isSecureContext === 'boolean') {
    return globalContext.isSecureContext;
  }

  const { location } = globalContext;
  if (!location) {
    return false;
  }

  const { protocol, hostname } = location;
  return protocol === 'https:' || SECURE_HOSTS.has(hostname);
};

/**
 * Copy arbitrary text to the clipboard using the asynchronous Clipboard API.
 * The API requires a secure context (HTTPS or localhost) which aligns with
 * Terminal and Files quick-copy workflows in the desktop simulation.
 */
export async function copy(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  if (!isSecureEnvironment()) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default copy;
