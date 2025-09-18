import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import LegacyDesktop from '../screen/desktop';
import VoiceHUD from '../accessibility/VoiceHUD';
import useVoiceCommands, { VoiceCommandEvent } from '../../hooks/useVoiceCommands';
import { useSettings } from '../../hooks/useSettings';
import appsConfig from '../../apps.config';

type LegacyDesktopProps = React.ComponentProps<typeof LegacyDesktop>;

type HotkeyMatcher = {
  key: string | null;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

const normalizeKeyName = (raw: string) => {
  const value = raw.trim().toLowerCase();
  switch (value) {
    case 'ctrl':
    case 'control':
      return 'ctrl';
    case 'shift':
      return 'shift';
    case 'alt':
    case 'option':
      return 'alt';
    case 'meta':
    case 'command':
    case 'cmd':
      return 'meta';
    case 'space':
    case 'spacebar':
      return ' ';
    default:
      return raw.trim();
  }
};

const parseHotkey = (hotkey: string): HotkeyMatcher => {
  const matcher: HotkeyMatcher = { key: null, ctrl: false, shift: false, alt: false, meta: false };
  hotkey
    .split('+')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const normalized = normalizeKeyName(segment);
      switch (normalized.toLowerCase()) {
        case 'ctrl':
          matcher.ctrl = true;
          break;
        case 'shift':
          matcher.shift = true;
          break;
        case 'alt':
          matcher.alt = true;
          break;
        case 'meta':
          matcher.meta = true;
          break;
        default:
          matcher.key = normalized;
      }
    });
  return matcher;
};

const matchesHotkey = (event: KeyboardEvent, matcher: HotkeyMatcher) => {
  if (matcher.ctrl !== event.ctrlKey) return false;
  if (matcher.shift !== event.shiftKey) return false;
  if (matcher.alt !== event.altKey) return false;
  if (matcher.meta !== event.metaKey) return false;
  if (!matcher.key) return true;
  const eventKey = event.key.length === 1 ? event.key : event.key.toLowerCase();
  const expected = matcher.key.length === 1 ? matcher.key : matcher.key.toLowerCase();
  if (expected === ' ') {
    return eventKey === ' ' || eventKey.toLowerCase() === 'spacebar';
  }
  return eventKey.toLowerCase() === expected;
};

const focusableElement = (element: Element | null): (HTMLInputElement | HTMLTextAreaElement | HTMLElement) | null => {
  if (!element) return null;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element;
  if ((element as HTMLElement).isContentEditable) return element as HTMLElement;
  return null;
};

const insertText = (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement, text: string) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const nextValue = element.value.slice(0, start) + text + element.value.slice(end);
    element.value = nextValue;
    const caret = start + text.length;
    element.setSelectionRange(caret, caret);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (element.isContentEditable) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      document.execCommand('insertText', false, text);
      return;
    }
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
  }
};

const Desktop: React.FC<LegacyDesktopProps> = (props) => {
  const desktopRef = useRef<any>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const { voiceControlEnabled, voiceControlHotkey, voiceConfirmation } = useSettings();

  const appAliases = useMemo(() => {
    const map: Record<string, string> = {};
    const catalog = Array.isArray(appsConfig) ? appsConfig : [];
    catalog.forEach((app: any) => {
      if (!app || !app.id) return;
      const id = String(app.id);
      const title = typeof app.title === 'string' ? app.title : id;
      map[id.toLowerCase()] = id;
      map[id.replace(/[-_]/g, ' ')] = id;
      map[title.toLowerCase()] = id;
      if (Array.isArray(app.voiceAliases)) {
        app.voiceAliases.forEach((alias: string) => {
          map[alias.toLowerCase()] = id;
        });
      }
    });
    return map;
  }, []);

  const handleVoiceIntent = useCallback(
    (intent: VoiceCommandEvent) => {
      const target = desktopRef.current;
      if (!target) return;
      switch (intent.type) {
        case 'open-app': {
          const appId = intent.payload?.appId as string | undefined;
          if (appId) {
            target.openApp?.(appId);
          }
          break;
        }
        case 'cycle-window': {
          const direction = (intent.payload?.direction as string) === 'previous' ? -1 : 1;
          target.cycleApps?.(direction);
          break;
        }
        case 'cycle-instance': {
          const direction = (intent.payload?.direction as string) === 'previous' ? -1 : 1;
          target.cycleAppWindows?.(direction);
          break;
        }
        case 'close-window': {
          const focusedId = target.getFocusedWindowId?.();
          if (focusedId) {
            target.closeApp?.(focusedId);
          }
          break;
        }
        case 'show-desktop': {
          target.minimizeAllWindows?.();
          break;
        }
        case 'dictation': {
          const text = intent.payload?.text as string | undefined;
          const element = focusableElement(activeElementRef.current);
          if (text && element) {
            insertText(element, text);
          }
          break;
        }
        default:
          break;
      }
    },
    [],
  );

  const voice = useVoiceCommands({
    enabled: voiceControlEnabled,
    appAliases,
    requireConfirmation: voiceConfirmation,
    onCommand: handleVoiceIntent,
  });

  const hotkey = voiceControlHotkey || 'Ctrl+Shift+Space';
  const matcher = useMemo(() => parseHotkey(hotkey), [hotkey]);
  const {
    listening,
    initializing,
    transcript,
    partialTranscript,
    history,
    pendingConfirmation,
    error,
    toggleListening,
    confirmPending,
    cancelPending,
  } = voice;

  useEffect(() => {
    if (!voiceControlEnabled) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (!voiceControlEnabled) return;
      if (matchesHotkey(event, matcher)) {
        event.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [matcher, toggleListening, voiceControlEnabled]);

  useEffect(() => {
    const recordFocus = (event: FocusEvent) => {
      activeElementRef.current = focusableElement(event.target as HTMLElement) as HTMLElement | null;
    };
    const clearFocus = (event: FocusEvent) => {
      if (activeElementRef.current === event.target) {
        activeElementRef.current = null;
      }
    };
    document.addEventListener('focusin', recordFocus);
    document.addEventListener('focusout', clearFocus);
    return () => {
      document.removeEventListener('focusin', recordFocus);
      document.removeEventListener('focusout', clearFocus);
    };
  }, []);

  return (
    <>
      <LegacyDesktop ref={desktopRef} {...props} />
      {voiceControlEnabled && (
        <VoiceHUD
          listening={listening}
          initializing={initializing}
          transcript={transcript}
          partialTranscript={partialTranscript}
          history={history}
          pendingConfirmation={pendingConfirmation}
          hotkey={hotkey}
          error={error}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        />
      )}
    </>
  );
};

export default Desktop;
