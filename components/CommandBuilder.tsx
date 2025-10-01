import { ChangeEvent, RefObject, useMemo, useRef, useState } from 'react';
import TerminalOutput from './TerminalOutput';
import { quotePosix, sanitizeShellInput } from '../utils/sanitizeCommand';
import type { SanitizationWarning } from '../utils/sanitizeCommand';

interface BuilderProps {
  doc: string;
  build: (params: Record<string, string>) => string;
}

type BuilderField = 'target' | 'opts';

interface FieldWarning extends SanitizationWarning {
  field: BuilderField;
}

export default function CommandBuilder({ doc, build }: BuilderProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const targetRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLInputElement>(null);

  const schedule = (callback: () => void) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      callback();
      return;
    }

    window.requestAnimationFrame(callback);
  };

  const update = (key: BuilderField) => (e: ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [key]: e.target.value });
  };

  const wrapSelection = (key: BuilderField, ref: RefObject<HTMLInputElement>) => () => {
    const input = ref.current;

    if (!input) return;

    const { selectionStart, selectionEnd, value } = input;
    const hasSelection =
      selectionStart !== null &&
      selectionEnd !== null &&
      selectionStart !== selectionEnd &&
      selectionStart >= 0 &&
      selectionEnd >= 0;

    const selectedText = hasSelection ? value.slice(selectionStart, selectionEnd) : value;
    const quoted = quotePosix(selectedText);
    const nextValue = hasSelection
      ? value.slice(0, selectionStart) + quoted + value.slice(selectionEnd)
      : quoted;

    setParams({ ...params, [key]: nextValue });

    schedule(() => {
      const nextSelectionStart = hasSelection ? selectionStart : nextValue.length;
      const nextSelectionEnd = hasSelection ? selectionStart + quoted.length : nextValue.length;
      input.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  };

  const sanitized = useMemo(() => {
    const targetResult = sanitizeShellInput(params.target || '');
    const optsResult = sanitizeShellInput(params.opts || '');

    const warnings: FieldWarning[] = [
      ...targetResult.warnings.map((warning) => ({ ...warning, field: 'target' as const })),
      ...optsResult.warnings.map((warning) => ({ ...warning, field: 'opts' as const })),
    ];

    return {
      target: targetResult.sanitized,
      opts: optsResult.sanitized,
      warnings,
    };
  }, [params]);

  const command = useMemo(
    () =>
      build({
        ...params,
        target: sanitized.target,
        opts: sanitized.opts,
      }),
    [build, params, sanitized.target, sanitized.opts],
  );

  const applyFix = (warning: FieldWarning) => {
    if (!warning.fixValue) return;

    setParams((prev) => ({
      ...prev,
      [warning.field]: warning.fixValue ?? prev[warning.field],
    }));

    const ref = warning.field === 'target' ? targetRef : optionsRef;
    const input = ref.current;
    if (!input) return;

    schedule(() => {
      const value = warning.fixValue as string;
      input.setSelectionRange(value.length, value.length);
    });
  };

  const renderWarnings = () =>
    sanitized.warnings.map((warning) => (
      <div
        key={`${warning.field}-${warning.id}`}
        className="mb-2 rounded border border-yellow-600 bg-yellow-900/60 p-2 text-yellow-100"
        role="alert"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold">
              Potentially unsafe operator detected: <code>{warning.indicator}</code>
            </p>
            <p className="text-xs">{warning.message}</p>
          </div>
          {warning.fixLabel && warning.fixValue && (
            <button
              type="button"
              onClick={() => applyFix(warning)}
              className="self-start rounded bg-yellow-700 px-2 py-1 text-xs font-semibold text-black hover:bg-yellow-500"
            >
              {warning.fixLabel}
            </button>
          )}
        </div>
      </div>
    ));

  return (
    <form className="text-xs" onSubmit={(e) => e.preventDefault()} aria-label="command builder">
      <p className="mb-2" aria-label="inline docs">
        {doc}
      </p>

      {renderWarnings()}

      <label className="mb-1 block">
        <div className="mb-1 flex items-center justify-between">
          <span className="mr-1">Target</span>
          <button
            type="button"
            onClick={wrapSelection('target', targetRef)}
            className="rounded bg-gray-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-gray-600"
          >
            Quote selection
          </button>
        </div>
        <input
          ref={targetRef}
          aria-label="target"
          value={params.target || ''}
          onChange={update('target')}
          className="w-full border p-1 text-black"
        />
      </label>
      <label className="mb-1 block">
        <div className="mb-1 flex items-center justify-between">
          <span className="mr-1">Options</span>
          <button
            type="button"
            onClick={wrapSelection('opts', optionsRef)}
            className="rounded bg-gray-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-gray-600"
          >
            Quote selection
          </button>
        </div>
        <input
          ref={optionsRef}
          aria-label="options"
          value={params.opts || ''}
          onChange={update('opts')}
          className="w-full border p-1 text-black"
        />
      </label>
      <div className="mt-2">
        <TerminalOutput text={command} ariaLabel="command output" />
      </div>
    </form>
  );
}
