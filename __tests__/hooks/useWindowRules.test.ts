import { renderHook, act } from '@testing-library/react';
import useWindowRules from '../../hooks/useWindowRules';

describe('useWindowRules', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  test('adds, updates, and removes rules', () => {
    const { result } = renderHook(() => useWindowRules());

    let ruleId = '';
    act(() => {
      ruleId = result.current.addRule({
        name: 'Tile terminal',
        match: { appId: 'terminal' },
        actions: { layout: 'tile', alwaysOnTop: true },
      });
    });

    expect(result.current.rules).toHaveLength(1);
    expect(result.current.rules[0].match.appId).toBe('terminal');

    act(() => {
      result.current.updateRule(ruleId, {
        match: { appId: 'calculator' },
        actions: { layout: 'float', opacity: 0.45 },
      });
    });

    expect(result.current.rules[0].match.appId).toBe('calculator');
    expect(result.current.rules[0].actions.opacity).toBeCloseTo(0.45);

    act(() => {
      result.current.removeRule(ruleId);
    });

    expect(result.current.rules).toHaveLength(0);
  });

  test('evaluates rules using matchers and prioritises later matches', () => {
    const { result } = renderHook(() => useWindowRules());

    act(() => {
      result.current.setMonitors([
        {
          id: 'primary',
          primary: true,
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        },
        {
          id: 'aux',
          bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
        },
      ]);
    });

    act(() => {
      result.current.addRule({
        name: 'Reader windows',
        match: { title: { pattern: 'Reader', flags: 'i' } },
        actions: { opacity: 0.4 },
      });
    });

    act(() => {
      result.current.addRule({
        name: 'Secondary monitor',
        match: { monitorId: 'aux' },
        actions: { alwaysOnTop: true },
      });
    });

    act(() => {
      result.current.addRule({
        name: 'Override layout',
        match: { appId: 'pdfviewer' },
        actions: { layout: 'tile' },
      });
    });

    act(() => {
      result.current.addRule({
        name: 'Float takes precedence',
        match: { appId: 'pdfviewer' },
        actions: { layout: 'float' },
      });
    });

    const evaluation = result.current.evaluateWindowRules({
      appId: 'pdfviewer',
      title: 'PDF Reader',
      monitorId: 'aux',
    });

    expect(evaluation.opacity).toBeCloseTo(0.4);
    expect(evaluation.alwaysOnTop).toBe(true);
    expect(evaluation.layout).toBe('float');

    act(() => {
      result.current.addRule({
        name: 'Invalid regex is ignored',
        match: { title: { pattern: '[' } },
        actions: { layout: 'tile' },
      });
    });

    const noMatch = result.current.evaluateWindowRules({
      appId: 'notes',
      title: 'Notes',
      monitorId: 'primary',
    });

    expect(noMatch.layout).toBeUndefined();
    expect(noMatch.alwaysOnTop).toBeUndefined();
    expect(noMatch.opacity).toBeUndefined();
  });
});
