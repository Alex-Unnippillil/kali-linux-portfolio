'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ConditionEvaluator,
  ValidationResult,
} from '../../../../utils/validation';
import { validateCondition, validateRegex } from '../../../../utils/validation';

type WindowRule = {
  id: string;
  name?: string;
  appIdPattern?: string;
  titlePattern?: string;
  condition?: string;
  width?: number | null;
  height?: number | null;
  enabled?: boolean;
};

type ActiveWindowSnapshot = {
  id: string;
  title: string;
  width: number;
  height: number;
  isMaximized: boolean;
};

type RuleDiagnostics = {
  appId: ValidationResult<RegExp>;
  title: ValidationResult<RegExp>;
  condition: ValidationResult<ConditionEvaluator>;
};

type RuleEvaluation = {
  rule: WindowRule;
  diagnostics: RuleDiagnostics;
  matches: boolean;
  errors: string[];
};

const PREVIEW_EVENT = 'window-rule-preview';
const REVERT_EVENT = 'window-rule-preview-revert';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const readWindowSnapshot = (targetId?: string): ActiveWindowSnapshot | null => {
  if (typeof window === 'undefined') return null;

  let element: HTMLElement | null = null;
  if (targetId) {
    const candidate = document.getElementById(targetId);
    if (candidate instanceof HTMLElement && candidate.classList.contains('opened-window')) {
      element = candidate;
    }
  }

  if (!element) {
    const focused = document.querySelector<HTMLElement>('.opened-window.z-30');
    if (focused) {
      element = focused;
    }
  }

  if (!element) return null;

  const computed = window.getComputedStyle(element);
  const widthPercent = (() => {
    const dataWidth = parseFloat(element.getAttribute('data-window-width') || '');
    if (!Number.isNaN(dataWidth) && Number.isFinite(dataWidth)) {
      return dataWidth;
    }
    const inlineWidth = parseFloat(element.style.width);
    if (!Number.isNaN(inlineWidth) && Number.isFinite(inlineWidth)) {
      return inlineWidth;
    }
    const computedWidth = parseFloat(computed.width);
    return window.innerWidth
      ? (computedWidth / window.innerWidth) * 100
      : computedWidth;
  })();
  const heightPercent = (() => {
    const dataHeight = parseFloat(element.getAttribute('data-window-height') || '');
    if (!Number.isNaN(dataHeight) && Number.isFinite(dataHeight)) {
      return dataHeight;
    }
    const inlineHeight = parseFloat(element.style.height);
    if (!Number.isNaN(inlineHeight) && Number.isFinite(inlineHeight)) {
      return inlineHeight;
    }
    const computedHeight = parseFloat(computed.height);
    return window.innerHeight
      ? (computedHeight / window.innerHeight) * 100
      : computedHeight;
  })();

  const title =
    element.getAttribute('aria-label') || element.dataset.title || element.id;
  const isMaximized = element.getAttribute('data-maximized') === 'true';

  return {
    id: element.id,
    title,
    width: widthPercent,
    height: heightPercent,
    isMaximized,
  };
};

const dispatchPreviewEvent = (
  windowId: string,
  payload?: { width?: number; height?: number }
) => {
  if (typeof window === 'undefined') return;
  const element = document.getElementById(windowId);
  if (!(element instanceof HTMLElement)) return;

  if (payload && (payload.width !== undefined || payload.height !== undefined)) {
    element.dispatchEvent(
      new CustomEvent(PREVIEW_EVENT, { detail: payload as Record<string, unknown> })
    );
    return;
  }

  element.dispatchEvent(new CustomEvent(REVERT_EVENT));
};

interface TesterProps {
  rules?: WindowRule[];
}

export default function Tester({ rules = [] }: TesterProps) {
  const [activeWindow, setActiveWindow] = useState<ActiveWindowSnapshot | null>(null);
  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<string | null>(null);

  const refreshActiveWindow = useCallback((targetId?: string) => {
    const snapshot = readWindowSnapshot(targetId);
    setActiveWindow(snapshot);
    return snapshot;
  }, []);

  useEffect(() => {
    refreshActiveWindow();
  }, [refreshActiveWindow]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>;
      refreshActiveWindow(custom.detail?.id);
    };
    window.addEventListener('desktop-active-window', handler as EventListener);
    return () => {
      window.removeEventListener('desktop-active-window', handler as EventListener);
    };
  }, [refreshActiveWindow]);

  useEffect(() => {
    return () => {
      if (previewTarget) {
        dispatchPreviewEvent(previewTarget);
      }
    };
  }, [previewTarget]);

  useEffect(() => {
    if (!previewRuleId || !previewTarget) return;
    if (!activeWindow || activeWindow.id !== previewTarget) {
      dispatchPreviewEvent(previewTarget);
      setPreviewRuleId(null);
      setPreviewTarget(null);
    }
  }, [activeWindow, previewRuleId, previewTarget]);

  const evaluations: RuleEvaluation[] = useMemo(() => {
    return rules.map((rule) => {
      const diagnostics: RuleDiagnostics = {
        appId: validateRegex(rule.appIdPattern || '', 'i'),
        title: validateRegex(rule.titlePattern || '', 'i'),
        condition: validateCondition(rule.condition || ''),
      };
      const errors: string[] = [];

      if (rule.appIdPattern && !diagnostics.appId.valid) {
        errors.push(`App ID regex: ${diagnostics.appId.error ?? 'invalid'}`);
      }
      if (rule.titlePattern && !diagnostics.title.valid) {
        errors.push(`Title regex: ${diagnostics.title.error ?? 'invalid'}`);
      }
      if (rule.condition?.trim() && !diagnostics.condition.valid) {
        errors.push(`Condition: ${diagnostics.condition.error ?? 'invalid'}`);
      }

      let matches = false;
      if (activeWindow) {
        const idMatches =
          !rule.appIdPattern ||
          (diagnostics.appId.valid &&
            diagnostics.appId.value?.test(activeWindow.id));
        const titleMatches =
          !rule.titlePattern ||
          (diagnostics.title.valid &&
            diagnostics.title.value?.test(activeWindow.title));
        let conditionMatches = true;
        if (rule.condition?.trim()) {
          if (!diagnostics.condition.valid || !diagnostics.condition.value) {
            conditionMatches = false;
          } else {
            try {
              conditionMatches = Boolean(
                diagnostics.condition.value({
                  appId: activeWindow.id,
                  title: activeWindow.title,
                  width: activeWindow.width,
                  height: activeWindow.height,
                  isMaximized: activeWindow.isMaximized,
                })
              );
            } catch (error) {
              conditionMatches = false;
              errors.push(
                `Condition runtime error: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }
        }
        matches =
          rule.enabled !== false && idMatches && titleMatches && conditionMatches;
      }

      return {
        rule,
        diagnostics,
        matches,
        errors,
      };
    });
  }, [rules, activeWindow]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeWindow || evaluations.length === 0) return;
    const rows = evaluations.map((evaluation) => ({
      id: evaluation.rule.id,
      name: evaluation.rule.name || '(untitled)',
      enabled: evaluation.rule.enabled !== false,
      matches: evaluation.matches,
      errors: evaluation.errors.join('; ') || 'None',
    }));
    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `[WindowRules] Evaluation for ${activeWindow.title || activeWindow.id}`
    );
    // eslint-disable-next-line no-console
    console.table(rows);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }, [evaluations, activeWindow]);

  const firstApplicableMatch = useMemo(
    () =>
      evaluations.find(
        (evaluation) =>
          evaluation.matches &&
          (typeof evaluation.rule.width === 'number' ||
            typeof evaluation.rule.height === 'number')
      ) || null,
    [evaluations]
  );

  const hasMatchWithoutActions = useMemo(
    () =>
      evaluations.some(
        (evaluation) =>
          evaluation.matches &&
          typeof evaluation.rule.width !== 'number' &&
          typeof evaluation.rule.height !== 'number'
      ),
    [evaluations]
  );

  const applyDisabled =
    !activeWindow || !firstApplicableMatch || !activeWindow.id.length;
  const revertDisabled = !previewTarget;

  const handleApply = useCallback(() => {
    if (!activeWindow || !firstApplicableMatch) return;

    if (previewTarget) {
      dispatchPreviewEvent(previewTarget);
    }

    const { rule } = firstApplicableMatch;
    const payload: { width?: number; height?: number } = {};
    if (typeof rule.width === 'number' && Number.isFinite(rule.width)) {
      payload.width = clamp(rule.width, 10, 100);
    }
    if (typeof rule.height === 'number' && Number.isFinite(rule.height)) {
      payload.height = clamp(rule.height, 10, 100);
    }

    if (payload.width === undefined && payload.height === undefined) {
      setPreviewRuleId(rule.id);
      setPreviewTarget(activeWindow.id);
      return;
    }

    dispatchPreviewEvent(activeWindow.id, payload);
    setPreviewRuleId(rule.id);
    setPreviewTarget(activeWindow.id);
    refreshActiveWindow(activeWindow.id);
  }, [
    activeWindow,
    firstApplicableMatch,
    previewTarget,
    refreshActiveWindow,
  ]);

  const handleRevert = useCallback(() => {
    if (!previewTarget) return;
    dispatchPreviewEvent(previewTarget);
    setPreviewRuleId(null);
    setPreviewTarget(null);
    refreshActiveWindow(previewTarget);
  }, [previewTarget, refreshActiveWindow]);

  const applyLabel =
    previewRuleId &&
    previewTarget &&
    firstApplicableMatch?.rule.id === previewRuleId &&
    previewTarget === activeWindow?.id
      ? 'Reapply preview'
      : 'Apply preview';

  return (
    <section className="space-y-3 rounded-lg border border-gray-800 bg-black/40 p-4 text-ubt-grey">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Window rule tester</h3>
          <p className="text-sm text-ubt-grey">
            Preview how the current rules affect the focused window before you save
            changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshActiveWindow(activeWindow?.id)}
          className="rounded bg-ub-orange px-3 py-1 text-sm text-white"
        >
          Refresh
        </button>
      </div>

      {activeWindow ? (
        <div className="rounded border border-gray-700 bg-black/30 p-3 text-xs">
          <p>
            <span className="font-semibold text-white">Active window:</span>{' '}
            {activeWindow.title} <span className="text-ubt-grey">({activeWindow.id})</span>
          </p>
          <p className="mt-1">
            Size:{' '}
            {activeWindow.width.toFixed(1)}% × {activeWindow.height.toFixed(1)}%
          </p>
          <p className="mt-1">
            State: {activeWindow.isMaximized ? 'Maximized' : 'Floating'}
          </p>
        </div>
      ) : (
        <p className="text-sm text-red-400">
          Focus a window and click refresh to capture a snapshot for testing.
        </p>
      )}

      <ul className="space-y-2">
        {evaluations.length === 0 && (
          <li className="rounded border border-dashed border-gray-700 p-3 text-sm text-ubt-grey">
            No rules defined yet. Add a rule to start testing.
          </li>
        )}
        {evaluations.map((evaluation) => {
          const { rule, matches, errors } = evaluation;
          const disabled = rule.enabled === false;
          return (
            <li
              key={rule.id}
              className={`rounded border p-3 text-sm ${
                matches
                  ? 'border-green-500/70 bg-green-500/10'
                  : 'border-gray-800 bg-black/30'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  {rule.name || 'Untitled rule'}
                </span>
                <span
                  className={`text-xs ${
                    matches ? 'text-green-400' : 'text-ubt-grey'
                  }`}
                >
                  {disabled
                    ? 'Disabled'
                    : matches
                    ? 'Matches active window'
                    : 'No match'}
                </span>
              </div>
              <p className="mt-2 text-xs text-ubt-grey">
                → width: {rule.width ?? '—'}% • height: {rule.height ?? '—'}%
              </p>
              {errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-400">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {hasMatchWithoutActions && (
        <p className="text-xs text-yellow-300">
          A rule matches but does not provide any size adjustments. Add width or
          height values to see a preview.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleRevert}
          disabled={revertDisabled}
          className={`rounded px-3 py-1 text-sm ${
            revertDisabled
              ? 'cursor-not-allowed bg-gray-700 text-gray-400'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          Revert preview
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={applyDisabled}
          className={`rounded px-3 py-1 text-sm ${
            applyDisabled
              ? 'cursor-not-allowed bg-ubt-grey text-gray-400'
              : 'bg-ub-orange text-white hover:bg-orange-500'
          }`}
        >
          {applyLabel}
        </button>
      </div>
    </section>
  );
}
