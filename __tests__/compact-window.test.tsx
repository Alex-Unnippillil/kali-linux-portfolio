import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Window from '../components/base/window';
import { compactWindowBounds, isCompactWindowViewport } from '../utils/compactWindow';

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
