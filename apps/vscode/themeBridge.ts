import { THEME_KEY } from '../../utils/theme';

type ScheduledCallback = (() => void) & { cancel: () => void };

const SYSTEM_TOKENS = [
  '--color-bg',
  '--color-text',
  '--color-primary',
  '--color-secondary',
  '--color-muted',
  '--color-border',
  '--color-surface',
  '--color-inverse',
  '--color-accent',
  '--color-terminal',
  '--color-focus-ring',
  '--color-selection',
] as const;

const SYSTEM_TO_VSCODE: Record<
  (typeof SYSTEM_TOKENS)[number],
  readonly string[]
> = {
  '--color-bg': [
    '--vscode-editor-background',
    '--vscode-sideBar-background',
    '--vscode-activityBar-background',
    '--vscode-panel-background',
    '--vscode-statusBar-background',
    '--vscode-titleBar-activeBackground',
    '--vscode-terminal-background',
  ],
  '--color-text': [
    '--vscode-editor-foreground',
    '--vscode-sideBar-foreground',
    '--vscode-activityBar-foreground',
    '--vscode-panel-foreground',
    '--vscode-statusBar-foreground',
    '--vscode-titleBar-activeForeground',
    '--vscode-editorWidget-foreground',
    '--vscode-terminal-foreground',
  ],
  '--color-primary': [
    '--vscode-button-background',
    '--vscode-editorCursor-foreground',
    '--vscode-textLink-activeForeground',
  ],
  '--color-secondary': [
    '--vscode-titleBar-inactiveBackground',
    '--vscode-tab-activeBackground',
    '--vscode-editorGroupHeader-tabsBackground',
  ],
  '--color-muted': [
    '--vscode-tab-inactiveBackground',
    '--vscode-editorLineNumber-foreground',
    '--vscode-statusBar-noFolderBackground',
  ],
  '--color-border': [
    '--vscode-contrastBorder',
    '--vscode-editorGroup-border',
    '--vscode-sideBar-border',
    '--vscode-panel-border',
  ],
  '--color-surface': [
    '--vscode-editorWidget-background',
    '--vscode-panelSection-background',
  ],
  '--color-inverse': [
    '--vscode-button-foreground',
    '--vscode-editor-selectionForeground',
  ],
  '--color-accent': [
    '--vscode-focusBorder',
    '--vscode-textLink-foreground',
    '--vscode-notifications-foreground',
  ],
  '--color-terminal': [
    '--vscode-terminal-ansiGreen',
    '--vscode-terminal-ansiBrightGreen',
    '--vscode-terminalCursor-foreground',
  ],
  '--color-focus-ring': ['--vscode-focusBorder'],
  '--color-selection': [
    '--vscode-editor-selectionBackground',
    '--vscode-list-activeSelectionBackground',
    '--vscode-list-focusOutline',
  ],
};

type SystemToken = (typeof SYSTEM_TOKENS)[number];

type SystemTokenMap = Partial<Record<SystemToken, string>>;

type VsCodeColorMap = Record<string, string>;

interface BridgeState {
  colors: VsCodeColorMap;
  system: SystemTokenMap;
  scheme: 'light' | 'dark';
}

const readSystemTokens = (): SystemTokenMap => {
  const style = window.getComputedStyle(document.documentElement);
  return SYSTEM_TOKENS.reduce<SystemTokenMap>((acc, token) => {
    const value = style.getPropertyValue(token).trim();
    if (value) {
      acc[token] = value;
    }
    return acc;
  }, {});
};

const mapSystemToVsCode = (tokens: SystemTokenMap): VsCodeColorMap => {
  const vsColors: VsCodeColorMap = {};

  (Object.keys(SYSTEM_TO_VSCODE) as SystemToken[]).forEach((token) => {
    const value = tokens[token];
    if (!value) return;
    SYSTEM_TO_VSCODE[token].forEach((vsToken) => {
      vsColors[vsToken] = value;
    });
  });

  const background = tokens['--color-bg'];
  const text = tokens['--color-text'];
  const accent =
    tokens['--color-selection'] ||
    tokens['--color-accent'] ||
    tokens['--color-primary'];
  const inverse = tokens['--color-inverse'] || text;
  const border = tokens['--color-border'];
  const muted = tokens['--color-muted'];
  const terminal = tokens['--color-terminal'] || accent;

  if (background) {
    vsColors['--vscode-editorGutter-background'] = background;
    vsColors['--vscode-terminal-selectionBackground'] = background;
  }

  if (text) {
    vsColors['--vscode-editorLineNumber-activeForeground'] = text;
    vsColors['--vscode-terminal-foreground'] = text;
  }

  if (accent) {
    if (!vsColors['--vscode-button-background']) {
      vsColors['--vscode-button-background'] = accent;
    }
    vsColors['--vscode-terminal-ansiBlue'] = accent;
    vsColors['--vscode-terminal-ansiBrightBlue'] = accent;
    vsColors['--vscode-list-highlightForeground'] = accent;
  }

  if (inverse) {
    vsColors['--vscode-button-foreground'] = inverse;
    vsColors['--vscode-editor-selectionForeground'] = inverse;
  }

  if (border) {
    vsColors['--vscode-editorWidget-border'] = border;
    vsColors['--vscode-scrollbarSlider-hoverBackground'] = border;
  }

  if (muted) {
    vsColors['--vscode-list-inactiveSelectionBackground'] = muted;
    vsColors['--vscode-editorLineNumber-foreground'] = muted;
  }

  if (terminal) {
    vsColors['--vscode-terminal-ansiGreen'] = terminal;
    vsColors['--vscode-terminal-ansiBrightGreen'] = terminal;
    vsColors['--vscode-terminalCursor-foreground'] = terminal;
  }

  return vsColors;
};

const getColorScheme = (): 'light' | 'dark' =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const computeBridgeState = (): BridgeState => {
  const system = readSystemTokens();
  return {
    system,
    colors: mapSystemToVsCode(system),
    scheme: getColorScheme(),
  };
};

const applyDocumentVariables = (colors: VsCodeColorMap): void => {
  const root = document.documentElement;
  Object.entries(colors).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
};

const applyIframeStyling = (
  iframe: HTMLIFrameElement,
  system: SystemTokenMap,
  scheme: 'light' | 'dark',
): void => {
  if (system['--color-bg']) {
    iframe.style.backgroundColor = system['--color-bg']!;
  }
  iframe.style.setProperty('color-scheme', scheme);
};

const postMessageToFrame = (
  iframe: HTMLIFrameElement,
  payload: BridgeState,
): void => {
  if (!iframe.contentWindow) return;

  try {
    iframe.contentWindow.postMessage(
      {
        source: 'kali-linux-portfolio',
        type: 'vscode-theme',
        payload: {
          colorScheme: payload.scheme,
          colors: payload.colors,
        },
      },
      '*',
    );
  } catch {
    // Ignore cross-origin messaging errors
  }
};

const scheduleApply = (
  callback: () => void,
): ScheduledCallback => {
  let frame = 0;

  const run = (() => {
    if (frame) {
      cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      callback();
    });
  }) as ScheduledCallback;

  run.cancel = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  return run;
};

export type ThemeBridgeCleanup = () => void;

export const attachThemeBridge = (
  iframe: HTMLIFrameElement | null,
): ThemeBridgeCleanup => {
  if (typeof window === 'undefined' || !iframe) {
    return () => {};
  }

  let destroyed = false;
  let lastSignature = '';

  const apply = () => {
    if (destroyed) return;

    const state = computeBridgeState();
    const signature = JSON.stringify({
      scheme: state.scheme,
      colors: state.colors,
    });

    if (signature === lastSignature) {
      return;
    }

    lastSignature = signature;
    applyDocumentVariables(state.colors);
    applyIframeStyling(iframe, state.system, state.scheme);
    postMessageToFrame(iframe, state);
  };

  const throttledApply = scheduleApply(apply);

  apply();

  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onMediaChange = () => throttledApply();

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onMediaChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onMediaChange);
    }
  }

  let observer: MutationObserver | undefined;

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => throttledApply());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) {
      throttledApply();
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    destroyed = true;
    throttledApply.cancel();

    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onMediaChange);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(onMediaChange);
      }
    }

    if (observer) {
      observer.disconnect();
    }

    window.removeEventListener('storage', onStorage);
  };
};

export default attachThemeBridge;
