import {
  DefaultAppKind,
  getDefaultApp,
  setDefaultApp,
  getBuiltinDefault,
} from '../../utils/settings/defaultApps';

export interface LinkLaunchRequest {
  url?: string;
  mimeType?: string;
  payload?: Record<string, unknown>;
  referrer?: string;
  allowPrompt?: boolean;
}

interface HandlerDefinition {
  id: string;
  label: string;
  description?: string;
  launch: (request: LinkLaunchRequest) => boolean | Promise<boolean>;
}

export interface HandlerDescriptor {
  id: string;
  label: string;
  description?: string;
}

interface RegistrySnapshot {
  protocols: Record<string, HandlerDescriptor[]>;
  mimes: Record<string, HandlerDescriptor[]>;
}

interface InternalRegistry {
  protocol: Record<string, HandlerDefinition[]>;
  mime: Record<string, HandlerDefinition[]>;
}

const registry: InternalRegistry = {
  protocol: {},
  mime: {},
};

const registeredHandlers = new Set<string>();

const SYSTEM_MAIL_HANDLER_ID = 'system-mail';
const EXTERNAL_BROWSER_HANDLER_ID = 'external-browser';

const isBrowser = () => typeof window !== 'undefined';

const dispatchOpenApp = (id: string) => {
  if (!isBrowser()) return false;
  window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  return true;
};

const navigateChrome = (url: string) => {
  if (!isBrowser()) return false;
  try {
    // Throw for malformed URLs so handlers can abort gracefully.
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    return false;
  }
  try {
    window.sessionStorage?.setItem('chrome-last-url', url);
  } catch {
    /* ignore sessionStorage issues */
  }
  const detail = { url };
  try {
    window.dispatchEvent(new CustomEvent('chrome:navigate', { detail }));
    // Fire again on the next task in case the browser isn't mounted yet.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('chrome:navigate', { detail }));
    }, 0);
  } catch {
    /* ignore */
  }
  dispatchOpenApp('chrome');
  return true;
};

const openExternalTab = (url: string) => {
  if (!isBrowser()) return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
  } catch {
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

const openMailto = (url: string) => {
  if (!isBrowser()) return false;
  if (!/^mailto:/i.test(url)) return false;
  window.location.href = url;
  return true;
};

const registerHandler = (kind: DefaultAppKind, type: string, handler: HandlerDefinition) => {
  const key = `${kind}:${type}:${handler.id}`;
  if (registeredHandlers.has(key)) return;
  registeredHandlers.add(key);
  if (!registry[kind][type]) {
    registry[kind][type] = [];
  }
  registry[kind][type].push(handler);
};

const getHandlers = (kind: DefaultAppKind, type: string) => registry[kind][type] || [];

const toDescriptor = (handler: HandlerDefinition): HandlerDescriptor => ({
  id: handler.id,
  label: handler.label,
  description: handler.description,
});

const promptForHandler = (
  kind: DefaultAppKind,
  type: string,
  handlers: HandlerDefinition[],
): HandlerDefinition | null => {
  if (!isBrowser()) return null;
  const header =
    kind === 'protocol'
      ? `Choose how to open ${type} links:`
      : `Choose how to open ${type} content:`;
  const body = handlers
    .map((handler, index) => `${index + 1}. ${handler.label}`)
    .join('\n');
  const message = `${header}\n${body}\nCancel to abort.`;
  const selection = window.prompt(message, '1');
  if (!selection) {
    // Preserve ask-every-time behaviour.
    setDefaultApp(kind, type, 'ask');
    return null;
  }
  const index = Number.parseInt(selection, 10) - 1;
  if (Number.isNaN(index) || index < 0 || index >= handlers.length) {
    return null;
  }
  const chosen = handlers[index];
  const remember = window.confirm('Remember this choice for future items?');
  setDefaultApp(kind, type, remember ? chosen.id : 'ask');
  return chosen;
};

const resolveHandler = (
  kind: DefaultAppKind,
  type: string,
  allowPrompt: boolean,
): HandlerDefinition | null => {
  const candidates = getHandlers(kind, type);
  if (!candidates.length) return null;
  const pref = getDefaultApp(kind, type);
  if (pref && pref !== 'ask') {
    const match = candidates.find((handler) => handler.id === pref);
    if (match) return match;
  }
  if (!allowPrompt) return null;
  return promptForHandler(kind, type, candidates);
};

const extractScheme = (url: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol.replace(/:$/, '').toLowerCase();
  } catch {
    const match = /^([a-z0-9+.-]+):/i.exec(url);
    return match ? match[1].toLowerCase() : null;
  }
};

export const openLink = async (
  request: LinkLaunchRequest,
): Promise<boolean> => {
  const { url, mimeType, allowPrompt = true } = request;
  if (url) {
    const scheme = extractScheme(url);
    if (scheme) {
      const handler = resolveHandler('protocol', scheme, allowPrompt);
      if (handler) {
        const result = await handler.launch(request);
        return result !== false;
      }
    }
  }
  if (mimeType) {
    const handler = resolveHandler('mime', mimeType.toLowerCase(), allowPrompt);
    if (handler) {
      const result = await handler.launch(request);
      return result !== false;
    }
  }
  if (allowPrompt && url) {
    const scheme = extractScheme(url);
    const options = (scheme && getHandlers('protocol', scheme)) || [];
    if (options.length && isBrowser()) {
      window.alert(
        `No handler selected for ${scheme} links. Configure one in Default Apps.`,
      );
    }
  }
  return false;
};

export const getRegistrySnapshot = (): RegistrySnapshot => {
  const build = (kind: DefaultAppKind): Record<string, HandlerDescriptor[]> => {
    const source = registry[kind];
    return Object.keys(source)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, HandlerDescriptor[]>>((acc, key) => {
        acc[key] = source[key].map(toDescriptor);
        return acc;
      }, {});
  };
  return {
    protocols: build('protocol'),
    mimes: build('mime'),
  };
};

const chromeHandler: HandlerDefinition = {
  id: 'chrome',
  label: 'Kali Browser',
  description: 'Open inside the simulated browser.',
  launch: ({ url }) => (url ? navigateChrome(url) : false),
};

const externalHandler: HandlerDefinition = {
  id: EXTERNAL_BROWSER_HANDLER_ID,
  label: 'Open in new tab',
  description: 'Launch in a separate browser tab.',
  launch: ({ url }) => (url ? openExternalTab(url) : false),
};

const contactHandler: HandlerDefinition = {
  id: 'contact',
  label: 'Contact app',
  description: 'Use the built-in contact form.',
  launch: () => dispatchOpenApp('contact'),
};

const mailHandler: HandlerDefinition = {
  id: SYSTEM_MAIL_HANDLER_ID,
  label: 'System email client',
  description: 'Delegate to the browser mailto handler.',
  launch: ({ url }) => (url ? openMailto(url) : false),
};

const sshHandler: HandlerDefinition = {
  id: 'ssh',
  label: 'SSH command builder',
  description: 'Open the SSH helper to craft commands.',
  launch: () => dispatchOpenApp('ssh'),
};

const vscodeHandler: HandlerDefinition = {
  id: 'vscode',
  label: 'VS Code sandbox',
  description: 'Open the in-browser editor.',
  launch: () => dispatchOpenApp('vscode'),
};

// Register built-in mappings.
registerHandler('protocol', 'http', chromeHandler);
registerHandler('protocol', 'http', externalHandler);
registerHandler('protocol', 'https', chromeHandler);
registerHandler('protocol', 'https', externalHandler);
registerHandler('protocol', 'mailto', mailHandler);
registerHandler('protocol', 'mailto', contactHandler);
registerHandler('protocol', 'ssh', sshHandler);

registerHandler('mime', 'text/html', chromeHandler);
registerHandler('mime', 'text/plain', vscodeHandler);
registerHandler('mime', 'application/json', vscodeHandler);

export const getHandlerOptions = (
  kind: DefaultAppKind,
  type: string,
): HandlerDescriptor[] => getHandlers(kind, type).map(toDescriptor);

export const getBuiltinHandlerId = (kind: DefaultAppKind, type: string): string | undefined =>
  getBuiltinDefault(kind, type);

export const handlersForKind = (
  kind: DefaultAppKind,
): Record<string, HandlerDescriptor[]> => {
  const entries = registry[kind];
  return Object.keys(entries).reduce<Record<string, HandlerDescriptor[]>>(
    (acc, key) => {
      acc[key] = entries[key].map(toDescriptor);
      return acc;
    },
    {},
  );
};

