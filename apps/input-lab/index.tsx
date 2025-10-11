'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

const SAVE_KEY = 'input-lab:text';

const schema = z.object({
  text: z.string().min(1, 'Text is required'),
});

type DeviceInfo = {
  supported: boolean;
  message: string;
  lastInput?: string;
  lastUpdated?: string;
};

type DevicePanelProps = {
  id: string;
  title: string;
  description: string;
  info: DeviceInfo;
};

const formatTime = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString();
};

const DevicePanel: React.FC<DevicePanelProps> = ({
  id,
  title,
  description,
  info,
}) => (
  <section
    aria-labelledby={`${id}-title`}
    className="rounded border border-gray-800 bg-gray-900 p-4"
  >
    <h2 id={`${id}-title`} className="text-lg font-semibold">
      {title}
    </h2>
    <p className="mt-1 text-sm text-gray-300">{description}</p>
    <p
      className={`mt-2 text-sm font-medium ${
        info.supported ? 'text-green-400' : 'text-red-300'
      }`}
    >
      {info.supported ? 'Supported' : 'Not supported'}
    </p>
    <p className="mt-1 text-sm text-gray-200" role="status" aria-live="polite">
      {info.message}
    </p>
    {info.lastInput ? (
      <p className="mt-2 rounded bg-gray-800 p-2 text-xs font-mono" role="log">
        {info.lastInput}
      </p>
    ) : null}
    {info.lastUpdated ? (
      <p className="mt-1 text-xs text-gray-500">Updated: {formatTime(info.lastUpdated)}</p>
    ) : null}
  </section>
);

const mergeDeviceInfo = (prev: DeviceInfo, patch: Partial<DeviceInfo>): DeviceInfo => {
  const hasLastInput = Object.prototype.hasOwnProperty.call(patch, 'lastInput');
  const hasLastUpdated = Object.prototype.hasOwnProperty.call(patch, 'lastUpdated');
  const hasMessage = Object.prototype.hasOwnProperty.call(patch, 'message');
  const hasSupported = Object.prototype.hasOwnProperty.call(patch, 'supported');

  const next: DeviceInfo = {
    supported:
      hasSupported && typeof patch.supported !== 'undefined'
        ? patch.supported
        : prev.supported,
    message:
      hasMessage && typeof patch.message !== 'undefined'
        ? patch.message
        : prev.message,
    lastInput: hasLastInput ? patch.lastInput : prev.lastInput,
    lastUpdated: hasLastUpdated ? patch.lastUpdated : prev.lastUpdated,
  };

  if (
    next.supported === prev.supported &&
    next.message === prev.message &&
    next.lastInput === prev.lastInput &&
    next.lastUpdated === prev.lastUpdated
  ) {
    return prev;
  }

  return next;
};

export default function InputLab() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [eventLog, setEventLog] = useState<
    { time: string; type: string; [key: string]: unknown }[]
  >([]);
  const [keyboardInfo, setKeyboardInfo] = useState<DeviceInfo>({
    supported: false,
    message: 'Detecting keyboard support…',
  });
  const [mouseInfo, setMouseInfo] = useState<DeviceInfo>({
    supported: false,
    message: 'Detecting mouse support…',
  });
  const [touchInfo, setTouchInfo] = useState<DeviceInfo>({
    supported: false,
    message: 'Detecting touch support…',
  });
  const [gamepadInfo, setGamepadInfo] = useState<DeviceInfo>({
    supported: false,
    message: 'Detecting gamepad support…',
  });

  const logEvent = useCallback(
    (type: string, details: Record<string, unknown> = {}) => {
      setEventLog((prev) => [
        ...prev,
        { time: new Date().toISOString(), type, ...details },
      ]);
    },
    [],
  );

  const updateDevice = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<DeviceInfo>>,
      patch: Partial<DeviceInfo>,
    ) => {
      setter((prev) => mergeDeviceInfo(prev, patch));
    },
    [],
  );

  const handleCaret = useCallback(
    (
      e: React.SyntheticEvent<HTMLInputElement, Event>,
      extra: Record<string, unknown> = {},
    ) => {
      const { selectionStart, selectionEnd } = e.currentTarget;
      logEvent('caret', { start: selectionStart, end: selectionEnd, ...extra });
    },
    [logEvent],
  );

  const registerKeyboardInput = useCallback(
    (event: KeyboardEvent) => {
      const payload = {
        key: event.key,
        code: event.code,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      };
      const iso = new Date().toISOString();
      updateDevice(setKeyboardInfo, {
        supported: true,
        message: 'Keyboard input detected.',
        lastInput: `Key: ${event.key} (${event.code}) • modifiers: ${[
          event.ctrlKey ? 'Ctrl' : null,
          event.altKey ? 'Alt' : null,
          event.shiftKey ? 'Shift' : null,
          event.metaKey ? 'Meta' : null,
        ]
          .filter(Boolean)
          .join(' ') || 'none'}`,
        lastUpdated: iso,
      });
      logEvent('keyboard', payload);
    },
    [logEvent, updateDevice],
  );

  const registerMouseInput = useCallback(
    (label: string, coordinates: { clientX: number; clientY: number }) => {
      const { clientX, clientY } = coordinates;
      const iso = new Date().toISOString();
      updateDevice(setMouseInfo, {
        supported: true,
        message: 'Mouse activity detected.',
        lastInput: `${label} at (${Math.round(clientX)}, ${Math.round(clientY)})`,
        lastUpdated: iso,
      });
      logEvent('mouse', { label, clientX, clientY });
    },
    [logEvent, updateDevice],
  );

  const registerTouchInput = useCallback(
    (label: string, coordinates: { clientX: number; clientY: number }) => {
      const { clientX, clientY } = coordinates;
      const iso = new Date().toISOString();
      updateDevice(setTouchInfo, {
        supported: true,
        message: 'Touch interaction detected.',
        lastInput: `${label} at (${Math.round(clientX)}, ${Math.round(clientY)})`,
        lastUpdated: iso,
      });
      logEvent('touch', { label, clientX, clientY });
    },
    [logEvent, updateDevice],
  );

  const exportLog = useCallback(() => {
    if (eventLog.length === 0) return;
    const blob = new Blob([JSON.stringify(eventLog, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'input-lab-log.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [eventLog]);

  // Load saved text on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (saved) setText(saved);
  }, []);

  // Validate and autosave
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = window.setTimeout(() => {
      const result = schema.safeParse({ text });
      if (!result.success) {
        const msg = result.error.issues[0].message;
        setError(msg);
        setStatus(`Error: ${msg}`);
        logEvent('validation-error', { message: msg });
        return;
      }
      setError('');
      window.localStorage.setItem(SAVE_KEY, text);
      const savedMessage = text
        ? `Saved ${text.length} characters.`
        : 'Ready to capture input.';
      setStatus(savedMessage);
      logEvent('autosave', { length: text.length });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [text, logEvent]);

  // Keyboard detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasKeyboard = 'onkeydown' in window;
    updateDevice(setKeyboardInfo, {
      supported: hasKeyboard,
      message: hasKeyboard
        ? 'Keyboard ready. Press keys to see updates.'
        : 'Keyboard events are not available in this environment.',
    });
    if (!hasKeyboard) return;

    const onKeyDown = (event: KeyboardEvent) => {
      registerKeyboardInput(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [registerKeyboardInput, updateDevice]);

  // Mouse and touch detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = window.navigator as Navigator & { maxTouchPoints?: number };
    const hasPointerEvent = 'onpointerdown' in window;
    const hasMouseEvent = 'onmousedown' in window;
    const supportsTouch =
      'ontouchstart' in window ||
      (typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 0);

    updateDevice(setMouseInfo, {
      supported: hasPointerEvent || hasMouseEvent,
      message:
        hasPointerEvent || hasMouseEvent
          ? 'Move the mouse or click to capture pointer data.'
          : 'Mouse events are not available in this browser.',
    });

    updateDevice(setTouchInfo, {
      supported: supportsTouch,
      message: supportsTouch
        ? 'Tap or swipe to capture touch data.'
        : 'Touch events are not available on this device.',
    });

    const pointerHandler = (event: PointerEvent) => {
      const { clientX, clientY, pointerType } = event;
      if (pointerType === 'mouse') {
        registerMouseInput(event.type, { clientX, clientY });
      } else if (pointerType === 'touch') {
        registerTouchInput(event.type, { clientX, clientY });
      }
    };

    const mouseHandler = (event: MouseEvent) => {
      registerMouseInput(event.type, event);
    };

    const touchHandler = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) return;
      registerTouchInput(event.type, touch);
    };

    if (hasPointerEvent) {
      window.addEventListener('pointerdown', pointerHandler);
      window.addEventListener('pointermove', pointerHandler);
    } else if (hasMouseEvent) {
      window.addEventListener('mousedown', mouseHandler);
      window.addEventListener('mousemove', mouseHandler);
    }

    if (supportsTouch) {
      window.addEventListener('touchstart', touchHandler, { passive: true });
      window.addEventListener('touchmove', touchHandler, { passive: true });
    }

    return () => {
      if (hasPointerEvent) {
        window.removeEventListener('pointerdown', pointerHandler);
        window.removeEventListener('pointermove', pointerHandler);
      } else if (hasMouseEvent) {
        window.removeEventListener('mousedown', mouseHandler);
        window.removeEventListener('mousemove', mouseHandler);
      }

      if (supportsTouch) {
        window.removeEventListener('touchstart', touchHandler);
        window.removeEventListener('touchmove', touchHandler);
      }
    };
  }, [registerMouseInput, registerTouchInput, updateDevice]);

  // Gamepad detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = window.navigator as Navigator & {
      getGamepads?: () => (Gamepad | null)[];
    };
    const hasGamepad = typeof nav.getGamepads === 'function';

    updateDevice(setGamepadInfo, {
      supported: hasGamepad,
      message: hasGamepad
        ? 'Connect a controller and press any button to monitor input.'
        : 'Gamepad API not supported in this browser.',
    });

    if (!hasGamepad) {
      return;
    }

    let previousFingerprint = '';
    const sampleGamepads = () => {
      if (!nav.getGamepads) return;
      const pads = nav.getGamepads();
      const active = pads.filter(Boolean) as Gamepad[];

      if (active.length === 0) {
        if (previousFingerprint !== 'none') {
          previousFingerprint = 'none';
          updateDevice(setGamepadInfo, {
            supported: true,
            message: 'Awaiting gamepad input…',
            lastInput: undefined,
          });
        }
        return;
      }

      const [firstPad] = active;
      const pressed = firstPad.buttons
        .map((button, index) => (button.pressed ? index : null))
        .filter((index) => index !== null) as number[];
      const axes = firstPad.axes.map((axis) => axis.toFixed(2)).join(', ');
      const fingerprint = `${firstPad.id}|${pressed.join(',')}|${axes}`;
      if (fingerprint === previousFingerprint) {
        return;
      }
      previousFingerprint = fingerprint;

      const iso = new Date().toISOString();
      updateDevice(setGamepadInfo, {
        supported: true,
        message: `Connected: ${firstPad.id}`,
        lastInput:
          pressed.length > 0
            ? `Buttons pressed: ${pressed.join(', ')}`
            : `Axes: ${axes}`,
        lastUpdated: iso,
      });
      logEvent('gamepad-sample', {
        id: firstPad.id,
        pressed,
        axes: firstPad.axes,
      });
    };

    const interval = window.setInterval(sampleGamepads, 500);
    sampleGamepads();

    const handleConnected = (event: GamepadEvent) => {
      updateDevice(setGamepadInfo, {
        supported: true,
        message: `Connected: ${event.gamepad.id}`,
        lastInput: 'Listening for button presses…',
        lastUpdated: new Date().toISOString(),
      });
      logEvent('gamepadconnected', { id: event.gamepad.id });
    };

    const handleDisconnected = (event: GamepadEvent) => {
      updateDevice(setGamepadInfo, {
        supported: true,
        message: 'Gamepad disconnected',
        lastInput: undefined,
        lastUpdated: new Date().toISOString(),
      });
      logEvent('gamepaddisconnected', { id: event.gamepad.id });
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
      window.clearInterval(interval);
    };
  }, [logEvent, updateDevice]);

  const devicePanels = [
    {
      id: 'input-lab-keyboard',
      title: 'Keyboard',
      description: 'Monitor key presses, caret movement, and composition events.',
      info: keyboardInfo,
    },
    {
      id: 'input-lab-mouse',
      title: 'Mouse / Pointer',
      description: 'Track pointer movement and clicks for precision devices.',
      info: mouseInfo,
    },
    {
      id: 'input-lab-touch',
      title: 'Touch',
      description: 'Validate taps and swipes across touch-enabled hardware.',
      info: touchInfo,
    },
    {
      id: 'input-lab-gamepad',
      title: 'Gamepad',
      description: 'Ensure controllers register button and axis updates.',
      info: gamepadInfo,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="text-2xl font-semibold">Input Lab</h1>
      <p className="mt-1 text-sm text-gray-300">
        Test keyboard, pointer, touch, and gamepad APIs with live telemetry and exportable logs.
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="input-lab-text"
            className="mb-1 block text-sm font-medium"
            id="input-lab-text-label"
          >
            Text
          </label>
          <input
            id="input-lab-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={(e) =>
              logEvent('input', { length: e.currentTarget.value.length })
            }
            onCompositionStart={(e) =>
              logEvent('compositionstart', { data: e.data })
            }
            onCompositionUpdate={(e) =>
              logEvent('compositionupdate', { data: e.data })
            }
            onCompositionEnd={(e) =>
              logEvent('compositionend', { data: e.data })
            }
            onSelect={handleCaret}
            onKeyUp={(e) => {
              if (
                [
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ].includes(e.key)
              ) {
                handleCaret(e);
              }
            }}
            onClick={handleCaret}
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            aria-labelledby="input-lab-text-label"
          />
          {error ? (
            <p className="mt-1 text-sm text-red-400">{error}</p>
          ) : null}
        </div>
      </form>
      <div role="status" aria-live="polite" className="mt-4 text-sm text-green-400">
        {status}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {devicePanels.map((panel) => (
          <DevicePanel key={panel.id} {...panel} />
        ))}
      </div>

      <section className="mt-6" aria-labelledby="input-lab-log-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="input-lab-log-title" className="text-lg font-semibold">
            Event log
          </h2>
          <button
            type="button"
            onClick={exportLog}
            disabled={eventLog.length === 0}
            className={`rounded px-3 py-1 text-sm transition ${
              eventLog.length === 0
                ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            Export log
          </button>
        </div>
        {eventLog.length > 0 ? (
          <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-3 text-xs">
            {JSON.stringify(eventLog, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-gray-400">
            Interact with any supported device to populate the log. Keyboard, pointer, touch,
            and gamepad events will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
