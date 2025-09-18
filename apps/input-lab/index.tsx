'use client';

import React, { useEffect, useMemo, useState } from 'react';
import IntlMessageFormat from 'intl-messageformat';
import {
  isArgumentElement,
  isDateElement,
  isNumberElement,
  isPluralElement,
  isSelectElement,
  isTagElement,
  isTimeElement,
  type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser';

const SAVE_KEY = 'input-lab:text';
const DEFAULT_MESSAGE =
  'Hello, {name}! You have {count, plural, one {# notification} other {# notifications}} waiting.';
const DEFAULT_LOCALES = ['en', 'fr'];

type ArgumentKind = 'string' | 'number' | 'date' | 'time' | 'plural' | 'select';

interface ArgumentMeta {
  kind: ArgumentKind;
  options?: string[];
  pluralType?: Intl.PluralRulesOptions['type'];
}

type ArgumentMap = Record<string, ArgumentMeta>;

type FormatterValues = Record<string, string>;

interface PreviewResult {
  locale: string;
  value?: string;
  error?: string;
}

interface EventLogEntry {
  time: string;
  type: string;
  [key: string]: unknown;
}

const extractArguments = (elements: MessageFormatElement[]): ArgumentMap => {
  const result: ArgumentMap = {};
  const visit = (nodes: MessageFormatElement[]) => {
    for (const node of nodes) {
      if (isTagElement(node)) {
        visit(node.children);
        continue;
      }
      if (isArgumentElement(node)) {
        result[node.value] = { kind: 'string' };
        continue;
      }
      if (isNumberElement(node)) {
        result[node.value] = { kind: 'number' };
        continue;
      }
      if (isDateElement(node)) {
        result[node.value] = { kind: 'date' };
        continue;
      }
      if (isTimeElement(node)) {
        result[node.value] = { kind: 'time' };
        continue;
      }
      if (isPluralElement(node)) {
        result[node.value] = {
          kind: 'plural',
          options: Object.keys(node.options),
          pluralType: node.pluralType,
        };
        for (const option of Object.values(node.options)) {
          visit(option.value);
        }
        continue;
      }
      if (isSelectElement(node)) {
        result[node.value] = {
          kind: 'select',
          options: Object.keys(node.options),
        };
        for (const option of Object.values(node.options)) {
          visit(option.value);
        }
      }
    }
  };
  visit(elements);
  return result;
};

const normalizeLocaleInput = (value: string): string[] => {
  const parsed = value
    .split(',')
    .map((locale) => locale.trim())
    .filter((locale) => locale.length > 0);
  return Array.from(new Set(parsed));
};

const formatPreviewValue = (
  formatter: IntlMessageFormat,
  values: Record<string, string | number>,
): string => {
  const formatted = formatter.format(values);
  if (Array.isArray(formatted)) {
    return formatted.join('');
  }
  return String(formatted);
};

export default function InputLab() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [locales, setLocales] = useState<string[]>(DEFAULT_LOCALES);
  const [localeInput, setLocaleInput] = useState<string>(
    DEFAULT_LOCALES.join(', '),
  );
  const [values, setValues] = useState<FormatterValues>({});
  const [status, setStatus] = useState('');
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);

  const logEvent = (type: string, details: Record<string, unknown> = {}) => {
    setEventLog((prev) => [
      ...prev,
      { time: new Date().toISOString(), type, ...details },
    ]);
  };

  const handleCaret = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement, Event>,
    extra: Record<string, unknown> = {},
  ) => {
    const { selectionStart, selectionEnd } = e.currentTarget;
    logEvent('caret', { start: selectionStart, end: selectionEnd, ...extra });
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(eventLog, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'input-lab-log.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (typeof parsed === 'string') {
        setMessage(parsed);
        return;
      }
      if (parsed && typeof parsed === 'object') {
        const data = parsed as {
          message?: string;
          locales?: unknown;
          values?: Record<string, unknown>;
        };
        if (typeof data.message === 'string') {
          setMessage(data.message);
        }
        if (Array.isArray(data.locales) && data.locales.length > 0) {
          const parsedLocales = data.locales
            .map((loc) => (typeof loc === 'string' ? loc : ''))
            .filter((loc) => loc.length > 0);
          if (parsedLocales.length > 0) {
            setLocales(parsedLocales);
            setLocaleInput(parsedLocales.join(', '));
          }
        }
        if (data.values) {
          const normalized: FormatterValues = {};
          for (const [key, value] of Object.entries(data.values)) {
            if (value === undefined || value === null) continue;
            normalized[key] = String(value);
          }
          if (Object.keys(normalized).length > 0) {
            setValues(normalized);
          }
        }
      }
    } catch {
      setMessage(saved);
    }
  }, []);

  const { argumentMeta, syntaxError } = useMemo(() => {
    if (!message.trim()) {
      return { argumentMeta: {} as ArgumentMap, syntaxError: '' };
    }
    try {
      const formatter = new IntlMessageFormat(message, 'en');
      return {
        argumentMeta: extractArguments(formatter.getAst()),
        syntaxError: '',
      };
    } catch (err) {
      return {
        argumentMeta: {} as ArgumentMap,
        syntaxError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [message]);

  useEffect(() => {
    setValues((prev) => {
      const next: FormatterValues = {};
      let changed = false;
      for (const [name, meta] of Object.entries(argumentMeta)) {
        let existing = prev[name];
        if (existing === undefined) {
          if (meta.kind === 'plural' || meta.kind === 'number') {
            existing = '1';
          } else if (meta.kind === 'select' && meta.options?.length) {
            [existing] = meta.options;
          } else {
            existing = 'Sample';
          }
          changed = true;
        }
        next[name] = existing;
        if (prev[name] !== existing) {
          changed = true;
        }
      }
      if (Object.keys(prev).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [argumentMeta]);

  const numberValueErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const [name, meta] of Object.entries(argumentMeta)) {
      if (meta.kind === 'plural' || meta.kind === 'number') {
        const raw = values[name];
        if (raw && raw.trim().length > 0 && Number.isNaN(Number(raw))) {
          errors[name] = 'Enter a valid number';
        }
      }
    }
    return errors;
  }, [argumentMeta, values]);

  const formattedValues = useMemo(() => {
    const mapped: Record<string, string | number> = {};
    for (const [name, meta] of Object.entries(argumentMeta)) {
      const raw = values[name] ?? '';
      if (meta.kind === 'plural' || meta.kind === 'number') {
        const parsed = Number(raw);
        mapped[name] = Number.isNaN(parsed) ? 0 : parsed;
      } else {
        mapped[name] = raw;
      }
    }
    return mapped;
  }, [argumentMeta, values]);

  const messageError = message.trim().length === 0 ? 'Message text is required' : '';
  const localeError = locales.length === 0 ? 'Add at least one locale to preview' : '';
  const blockingError = messageError || syntaxError || localeError;

  const getLocaleDisplayName = (locale: string): string => {
    if (typeof Intl.DisplayNames === 'undefined') {
      return locale;
    }
    try {
      const display = new Intl.DisplayNames([locale], { type: 'language' });
      const label = display.of(locale);
      if (label) {
        return label.charAt(0).toUpperCase() + label.slice(1);
      }
    } catch {
      /* ignore invalid locale values */
    }
    return locale;
  };

  const previewResults = useMemo<PreviewResult[]>(() => {
    if (localeError) {
      return [];
    }
    return locales.map((locale) => {
      if (blockingError && !localeError) {
        return { locale, error: blockingError };
      }
      try {
        const formatter = new IntlMessageFormat(message, locale || 'en');
        return {
          locale,
          value: formatPreviewValue(formatter, formattedValues),
        };
      } catch (err) {
        return {
          locale,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  }, [blockingError, formattedValues, localeError, locales, message]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = window.setTimeout(() => {
      if (blockingError) {
        setStatus(`Error: ${blockingError}`);
        return;
      }
      try {
        window.localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ message, locales, values }),
        );
        setStatus('Saved');
      } catch (err) {
        setStatus(
          err instanceof Error ? `Error: ${err.message}` : 'Unable to save',
        );
      }
    }, 600);
    return () => window.clearTimeout(handle);
  }, [blockingError, locales, message, values]);

  useEffect(() => {
    const parsed = normalizeLocaleInput(localeInput);
    setLocales((prev) => {
      if (
        parsed.length === prev.length &&
        parsed.every((locale, index) => locale === prev[index])
      ) {
        return prev;
      }
      return parsed;
    });
  }, [localeInput]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl font-semibold">Input Lab</h1>
      <p className="mb-6 text-sm text-gray-300">
        Prototype ICU message strings, tweak variables, and preview how they
        render across locales before saving.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label
              id="input-lab-message-label"
              htmlFor="input-lab-message"
              className="mb-2 block text-sm font-medium"
            >
              Message (ICU syntax)
            </label>
            <textarea
              id="input-lab-message"
              aria-labelledby="input-lab-message-label"
              className="h-40 w-full rounded border border-gray-700 bg-gray-800 p-3 font-mono text-sm text-white"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
            />
            {messageError && (
              <p className="mt-2 text-sm text-red-400">{messageError}</p>
            )}
            {!messageError && syntaxError && (
              <p className="mt-2 text-sm text-red-400">{syntaxError}</p>
            )}
          </div>
          <div>
            <label
              id="input-lab-locales-label"
              htmlFor="input-lab-locales"
              className="mb-2 block text-sm font-medium"
            >
              Locales (comma separated)
            </label>
            <input
              id="input-lab-locales"
              type="text"
              aria-labelledby="input-lab-locales-label"
              value={localeInput}
              onChange={(e) => setLocaleInput(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
            />
            {localeError && (
              <p className="mt-2 text-sm text-red-400">{localeError}</p>
            )}
          </div>
          <div className="rounded border border-gray-800 bg-gray-800 p-4">
            <h2 className="mb-3 text-lg font-semibold">Variables</h2>
            {Object.keys(argumentMeta).length === 0 ? (
              <p className="text-sm text-gray-300">
                No placeholders detected. Add ICU arguments like{' '}
                <code className="font-mono">{`{name}`}</code> or{' '}
                <code className="font-mono">
                  {`{count, plural, one {...} other {...}}`}
                </code>{' '}
                to configure inputs.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(argumentMeta).map(([name, meta]) => (
                  <div key={name} className="space-y-1">
                    <label
                      id={`input-lab-label-${name}`}
                      htmlFor={`input-lab-var-${name}`}
                      className="block text-sm font-medium"
                    >
                      {name}
                      <span className="ml-1 text-xs uppercase text-gray-400">
                        {meta.kind}
                        {meta.kind === 'plural' && meta.pluralType
                          ? ` · ${meta.pluralType}`
                          : ''}
                      </span>
                    </label>
                    {meta.kind === 'select' && meta.options ? (
                      <select
                        id={`input-lab-var-${name}`}
                        aria-labelledby={`input-lab-label-${name}`}
                        value={values[name] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [name]: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
                      >
                        {meta.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`input-lab-var-${name}`}
                        aria-labelledby={`input-lab-label-${name}`}
                        type={
                          meta.kind === 'plural' || meta.kind === 'number'
                            ? 'number'
                            : 'text'
                        }
                        value={values[name] ?? ''}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [name]: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
                      />
                    )}
                    {numberValueErrors[name] && (
                      <p className="text-xs text-red-400">
                        {numberValueErrors[name]}
                      </p>
                    )}
                    {meta.kind === 'plural' && (
                      <p className="text-xs text-gray-400">
                        Adjust quantity to test plural branches. Use whole
                        numbers for best results.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded border border-gray-800 bg-gray-800 p-4">
            <h2 className="mb-3 text-lg font-semibold">Preview</h2>
            {localeError ? (
              <p className="text-sm text-red-400">{localeError}</p>
            ) : previewResults.length === 0 ? (
              <p className="text-sm text-gray-300">
                Configure locales to see formatted output.
              </p>
            ) : (
              <div className="space-y-3">
                {previewResults.map((preview) => (
                  <div key={preview.locale} className="rounded bg-gray-900 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm text-gray-300">
                      <span className="font-semibold text-white">
                        {preview.locale}
                      </span>
                      <span>{getLocaleDisplayName(preview.locale)}</span>
                    </div>
                    {preview.error ? (
                      <p className="whitespace-pre-wrap break-words text-sm text-red-300">
                        {preview.error}
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm text-white">
                        {preview.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold">Event log</h2>
            {eventLog.length > 0 ? (
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs text-gray-200">
                {JSON.stringify(eventLog, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-300">
                Start typing in the message editor to capture caret and IME
                activity.
              </p>
            )}
            <button
              type="button"
              onClick={exportLog}
              className="mt-3 rounded bg-blue-600 px-3 py-1 text-sm"
            >
              Export Log
            </button>
          </div>
        </div>
      </div>
      <div
        role="status"
        aria-live="polite"
        className={`mt-6 text-sm ${
          status.startsWith('Error') ? 'text-red-400' : 'text-green-400'
        }`}
      >
        {status}
      </div>
    </div>
  );
}

