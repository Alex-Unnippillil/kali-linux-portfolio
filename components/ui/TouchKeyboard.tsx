'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

type EditableElement = HTMLInputElement | HTMLTextAreaElement;

const DISALLOWED_INPUT_TYPES = new Set([
  'button',
  'submit',
  'reset',
  'checkbox',
  'radio',
  'file',
  'color',
  'image',
  'range',
]);

const KEY_LAYOUT: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
  ['Space', 'Enter', 'Hide'],
];

const isEditableElement = (target: EventTarget | null): target is EditableElement => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLInputElement) {
    if (DISALLOWED_INPUT_TYPES.has(target.type)) return false;
    return !target.readOnly && !target.disabled;
  }
  return false;
};

const TouchKeyboard = () => {
  const { touchMode } = useSettings();
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<EditableElement | null>(null);
  const [shift, setShift] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!touchMode) {
      setVisible(false);
      setTarget(null);
      setShift(false);
      return;
    }

    const handleFocus = (event: FocusEvent) => {
      const element = event.target as HTMLElement | null;
      if (isEditableElement(element)) {
        setTarget(element);
        setVisible(true);
      } else if (!overlayRef.current?.contains(element)) {
        setVisible(false);
        setTarget(null);
        setShift(false);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [touchMode]);

  const ensureTarget = useCallback(() => {
    if (!target || !target.isConnected) {
      setTarget(null);
      setVisible(false);
      setShift(false);
      return false;
    }
    return true;
  }, [target]);

  const commitValue = useCallback(
    (value: string, selection: number) => {
      if (!ensureTarget() || !target) return;
      target.value = value;
      try {
        target.setSelectionRange(selection, selection);
      } catch {
        /* ignored */
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
    },
    [ensureTarget, target],
  );

  const insertText = useCallback(
    (text: string) => {
      if (!ensureTarget() || !target) return;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const nextValue = target.value.slice(0, start) + text + target.value.slice(end);
      const caret = start + text.length;
      commitValue(nextValue, caret);
    },
    [commitValue, ensureTarget, target],
  );

  const handleBackspace = useCallback(() => {
    if (!ensureTarget() || !target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    if (start === 0 && end === 0) return;
    const deleteStart = start === end ? Math.max(start - 1, 0) : start;
    const nextValue = target.value.slice(0, deleteStart) + target.value.slice(end);
    commitValue(nextValue, deleteStart);
  }, [commitValue, ensureTarget, target]);

  const handleEnter = useCallback(() => {
    if (!ensureTarget() || !target) return;
    if (target instanceof HTMLTextAreaElement) {
      insertText('\n');
      return;
    }
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    const form = target.form;
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    }
    setVisible(false);
    setTarget(null);
    setShift(false);
  }, [ensureTarget, insertText, target]);

  const handleKey = useCallback(
    (key: string) => {
      if (!ensureTarget() || !target) return;
      target.focus({ preventScroll: true });
      switch (key) {
        case 'Shift':
          setShift((prev) => !prev);
          break;
        case '⌫':
          handleBackspace();
          break;
        case 'Space':
          insertText(' ');
          break;
        case 'Enter':
          handleEnter();
          break;
        case 'Hide':
          setVisible(false);
          setTarget(null);
          setShift(false);
          target.blur();
          break;
        default: {
          const character = shift ? key.toUpperCase() : key;
          insertText(character);
          if (shift) setShift(false);
          break;
        }
      }
    },
    [ensureTarget, handleBackspace, handleEnter, insertText, shift, target],
  );

  const renderedKeys = useMemo(() => KEY_LAYOUT, []);

  if (!touchMode && !visible) {
    return null;
  }

  const keyboardState = visible && target ? 'open' : 'closed';

  return (
    <div
      ref={overlayRef}
      data-testid="touch-keyboard"
      data-state={keyboardState}
      className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-200 ${
        keyboardState === 'open'
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-full opacity-0'
      }`}
      aria-hidden={keyboardState !== 'open'}
    >
      <div className="mx-auto max-w-4xl rounded-t-2xl border border-black/30 bg-ub-cool-grey px-[var(--space-4)] py-[var(--space-4)] shadow-2xl">
        <div className="mb-[var(--space-3)] flex items-center justify-between text-sm text-ubt-grey">
          <span>Touch keyboard</span>
          <button
            type="button"
            className="hit-area rounded-full bg-white/10 px-[var(--space-2)] text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/20"
            onPointerDown={(event) => event.preventDefault()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setVisible(false);
              setTarget(null);
              setShift(false);
              target?.blur();
            }}
            data-testid="touch-keyboard-hide"
          >
            Hide
          </button>
        </div>
        <div className="flex flex-col gap-[var(--space-2)]">
          {renderedKeys.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex w-full justify-center gap-[var(--space-2)]"
            >
              {row.map((key) => {
                const isShift = key === 'Shift';
                const isSpace = key === 'Space';
                const isHide = key === 'Hide';
                const isEnter = key === 'Enter';
                const widthClass = isSpace ? 'flex-[2] px-[var(--space-4)]' : 'px-[var(--space-3)]';
                const pressed = isShift && shift;
                const keyNameForTest = key === '⌫' ? 'backspace' : key.toLowerCase();
                const testId = `touch-keyboard-key-${keyNameForTest.replace(/[^a-z0-9]+/g, '-')}`;
                return (
                  <button
                    key={key}
                    type="button"
                    tabIndex={-1}
                    aria-pressed={pressed || undefined}
                    data-testid={testId}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleKey(key)}
                    className={`hit-area flex items-center justify-center rounded-lg bg-white/10 text-base capitalize text-white transition-colors hover:bg-white/20 ${widthClass} ${
                      pressed ? 'bg-white/30' : ''
                    } ${isHide ? 'text-xs font-semibold uppercase' : ''} ${
                      isEnter ? 'font-semibold' : ''
                    }`}
                  >
                    {key === 'Space' ? 'Space' : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TouchKeyboard;
