import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Window from '../components/base/window';
import {
  compactWindowBounds,
  getViewportPolicy,
  isCompactWindowViewport,
} from '../utils/compactWindow';

jest.mock('react-draggable', () => ({ __esModule: true, default: ({ children, disabled }: any) => <div data-testid="drag-controller" data-disabled={disabled}>{children}</div> }));
const windowProps = { id: 'compact-test', title: 'Test app', focus: jest.fn(), hasMinimised: jest.fn(), closed: jest.fn(), openApp: jest.fn(), screen: () => <input aria-label="Application search" /> };
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });
test('phone landscape is compact but tablet and desktop layouts are retained', () => {
  expect(isCompactWindowViewport(390, 844)).toBe(true);
  expect(isCompactWindowViewport(844, 390, true)).toBe(true);
  expect(isCompactWindowViewport(844, 390, false)).toBe(false);
  expect(isCompactWindowViewport(768, 1024, true)).toBe(false);
  expect(isCompactWindowViewport(1440, 900)).toBe(false);
});

const policyTarget = ({
  width,
  height,
  coarse = false,
  fine = false,
  hover = false,
  visual,
  keyboardHeight = 0,
}: {
  width: number;
  height: number;
  coarse?: boolean;
  fine?: boolean;
  hover?: boolean;
  visual?: { width: number; height: number; offsetLeft?: number; offsetTop?: number };
  keyboardHeight?: number;
}) => ({
  innerWidth: width,
  innerHeight: height,
  visualViewport: visual,
  matchMedia: (query: string) => ({
    matches: query.includes('coarse') ? coarse : query.includes('fine') ? fine : hover,
  }),
  navigator: keyboardHeight ? { virtualKeyboard: { boundingRect: { height: keyboardHeight } } } : {},
});

test.each([
  ['phone portrait', policyTarget({ width: 390, height: 844, coarse: true }), true],
  ['phone landscape', policyTarget({ width: 844, height: 390, coarse: true }), true],
  ['tablet', policyTarget({ width: 768, height: 1024, coarse: true }), false],
  ['hybrid laptop', policyTarget({ width: 1366, height: 768, coarse: true, fine: true, hover: true }), false],
  ['desktop touchscreen', policyTarget({ width: 1920, height: 1080, coarse: true, fine: true }), false],
] as const)('%s gets a stable presentation mode', (_name, target, compact) => {
  const policy = getViewportPolicy(target as any);
  expect(policy.presentation.compact).toBe(compact);
  expect(policy.input.hybrid).toBe(target.matchMedia('(any-pointer: coarse)').matches
    && (target.matchMedia('(any-pointer: fine)').matches || target.matchMedia('(any-hover: hover)').matches));
});

test('virtual keyboard changes visible work area, not stable phone presentation', () => {
  const target = policyTarget({
    width: 390,
    height: 844,
    coarse: true,
    visual: { width: 390, height: 480, offsetTop: 0 },
    keyboardHeight: 364,
  });
  const policy = getViewportPolicy(target as any, { bottom: 8, left: 4 });
  expect(policy.presentation).toEqual({ mode: 'compact', compact: true });
  expect(policy.workingArea.layout).toEqual({ width: 390, height: 844 });
  expect(policy.workingArea.visibleBounds).toEqual({ width: 390, height: 480, left: 0, top: 0 });
  expect(policy.workingArea.obstruction.bottom).toBe(364);
  expect(policy.workingArea.virtualKeyboard).toEqual({ visible: true, height: 364 });
  expect(policy.workingArea.safeArea).toEqual({ top: 0, right: 0, bottom: 8, left: 4 });
});
test('compact bounds respect the navbar, dock, safe areas and visible viewport', () => {
  expect(compactWindowBounds({ width: 390, height: 844, left: 0, top: 0 }, 66, 58, { left: 4, right: 4 })).toEqual({ x: 4, y: 66, width: 382, height: 720 });
  expect(compactWindowBounds({ width: 390, height: 80, left: 0, top: 10 }, 66, 58).height).toBe(0);
});
test('focusing an app field is not stolen by window promotion', () => {
  const { rerender } = render(<Window {...windowProps} isFocused={false} />);
  const input = screen.getByRole('textbox', { name: 'Application search' });
  act(() => input.focus());
  rerender(<Window {...windowProps} isFocused />);
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: 'search keeps working' } });
  expect(input).toHaveValue('search keeps working');
});
test('compact windows keep app controls, disable dragging and leave saved desktop geometry alone', () => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  const changed = jest.fn(); const ref = React.createRef<any>();
  const { unmount } = render(<Window {...windowProps} ref={ref} onSizeChange={changed} />);
  expect(screen.getByTestId('drag-controller')).toHaveAttribute('data-disabled', 'true');
  expect(document.querySelector('[data-window-compact="true"]')).not.toBeNull();
  expect(screen.getByTitle('Close')).toBeEnabled();
  expect(screen.getByTitle('Minimize')).toBeEnabled();
  expect(screen.getByTitle('Maximize')).toBeDisabled();
  expect(changed).not.toHaveBeenCalled();
  act(() => ref.current.persistLayout());
  expect(localStorage.getItem('window-layout:compact-test')).toBeNull();
  unmount();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});
