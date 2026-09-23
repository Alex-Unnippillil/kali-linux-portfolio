import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';
import useFocusTrap from '../hooks/useFocusTrap';

describe('launcher delayed autofocus preserves editing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback =>
      window.setTimeout(() => callback(0), 0));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle =>
      window.clearTimeout(handle));
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it.each([[0, 10], [3, 3]])('preserves the active selection %i:%i through the autofocus retry', (start, end) => {
    render(<WhiskerMenu />);
    fireEvent.keyDown(window, { key: 'F1', altKey: true });
    act(() => { jest.advanceTimersByTime(20); });
    const input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Calculator' } });
    input.focus();
    input.setSelectionRange(start, end);
    expect(input).toHaveFocus();
    act(() => { jest.advanceTimersByTime(200); });
    expect(input.selectionStart).toBe(start);
    expect(input.selectionEnd).toBe(end);
    expect(input).toHaveValue('Calculator');
  });

  it.each([[0, 10], [3, 3]])('preserves immediate selection %i:%i before the focus trap zero-delay retry', (start, end) => {
    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Applications menu' }));
    const input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Calculator' } });
    input.focus();
    input.setSelectionRange(start, end);
    // A visitor can select text before any scheduled autofocus callback runs.
    act(() => { jest.advanceTimersByTime(200); });
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(start);
    expect(input.selectionEnd).toBe(end);
    expect(input).toHaveValue('Calculator');
  });

  it('keeps a newly focused launcher action selected through all autofocus retries', () => {
    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Applications menu' }));
    const action = screen.getByRole('button', { name: 'Open Terminal', exact: true });
    action.focus();
    act(() => { jest.advanceTimersByTime(200); });
    expect(action).toHaveFocus();
  });

  it('preserves a replacement selection on reopening and restores focus on close', () => {
    const { unmount } = render(<WhiskerMenu />);
    const trigger = screen.getByRole('button', { name: 'Applications menu' });
    fireEvent.click(trigger);
    let input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Calculator' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    act(() => { jest.advanceTimersByTime(200); });
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    input.focus();
    input.select();
    act(() => { jest.advanceTimersByTime(200); });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(10);
    input.setRangeText('Project Gallery', input.selectionStart!, input.selectionEnd!, 'end');
    fireEvent.input(input);
    expect(input).toHaveValue('Project Gallery');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

function FocusHarness({
  children,
  active = true,
  initialFocusRef,
}: {
  children: React.ReactNode;
  active?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, active, { initialFocusRef });
  return <div ref={containerRef} tabIndex={-1}>{children}</div>;
}

describe('launcher focus-trap candidate safety', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback =>
      window.setTimeout(() => callback(0), 0));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle =>
      window.clearTimeout(handle));
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    { name: 'hidden control', content: <button hidden>Unavailable</button> },
    { name: 'hidden ancestor', content: <div hidden><button>Unavailable</button></div> },
    { name: 'inert control', content: <button inert>Unavailable</button> },
    { name: 'inert ancestor', content: <div inert><button>Unavailable</button></div> },
    { name: 'aria-hidden control', content: <button aria-hidden="true">Unavailable</button> },
    { name: 'aria-hidden ancestor', content: <div aria-hidden="true"><button>Unavailable</button></div> },
    { name: 'disabled control', content: <button disabled>Unavailable</button> },
    { name: 'disabled fieldset', content: <fieldset disabled><legend>Unavailable group</legend><button>Unavailable</button></fieldset> },
    { name: 'negative tab index', content: <button tabIndex={-1}>Unavailable</button> },
  ])('skips $name during autofocus and both Tab boundaries', ({ content }) => {
    const { rerender } = render(
      <FocusHarness>{content}<button>Available</button></FocusHarness>,
    );
    const available = screen.getByRole('button', { name: 'Available' });
    expect(available).toHaveFocus();
    expect(fireEvent.keyDown(available, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(available).toHaveFocus();

    rerender(<FocusHarness><button>Available</button>{content}</FocusHarness>);
    const movedAvailable = screen.getByRole('button', { name: 'Available' });
    movedAvailable.focus();
    expect(fireEvent.keyDown(movedAvailable, { key: 'Tab' })).toBe(false);
    expect(movedAvailable).toHaveFocus();
  });

  it('keeps the first legend of a disabled fieldset keyboard accessible', () => {
    render(
      <FocusHarness>
        <fieldset disabled>
          <legend><button>Available legend</button></legend>
          <button>Unavailable field</button>
        </fieldset>
      </FocusHarness>,
    );
    const legendButton = screen.getByRole('button', { name: 'Available legend' });
    expect(legendButton).toHaveFocus();
    expect(fireEvent.keyDown(legendButton, { key: 'Tab' })).toBe(false);
    expect(legendButton).toHaveFocus();
  });

  it('ignores a hidden preferred initial focus target', () => {
    const preferred = React.createRef<HTMLInputElement>();
    render(
      <FocusHarness initialFocusRef={preferred}>
        <input ref={preferred} hidden aria-label="Hidden preferred input" />
        <button>Available fallback</button>
      </FocusHarness>,
    );
    expect(screen.getByRole('button', { name: 'Available fallback' })).toHaveFocus();
  });

  it.each(['number', 'email', 'date', 'time', 'range', 'checkbox', 'color', 'file'])(
    'focuses %s inputs without calling an unsupported selection API', (type) => {
      const selection = jest.spyOn(HTMLInputElement.prototype, 'setSelectionRange');
      expect(() => render(
        <FocusHarness><input type={type} aria-label="Initial control" /></FocusHarness>,
      )).not.toThrow();
      act(() => { jest.advanceTimersByTime(200); });
      expect(screen.getByLabelText('Initial control')).toHaveFocus();
      expect(selection).not.toHaveBeenCalled();
    },
  );

  it.each(['text', 'search', 'url', 'tel', 'password'])(
    'retains caret placement and visitor selections for %s inputs', (type) => {
      render(
        <FocusHarness><input type={type} aria-label="Text control" defaultValue="hello" /></FocusHarness>,
      );
      const input = screen.getByLabelText('Text control') as HTMLInputElement;
      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(5);
      expect(input.selectionEnd).toBe(5);
      input.setSelectionRange(1, 3);
      act(() => { jest.advanceTimersByTime(200); });
      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(3);
    },
  );

  it('retains caret placement and visitor selections for textareas', () => {
    render(<FocusHarness><textarea aria-label="Draft" defaultValue="hello" /></FocusHarness>);
    const textarea = screen.getByLabelText('Draft') as HTMLTextAreaElement;
    expect(textarea.selectionStart).toBe(5);
    textarea.setSelectionRange(1, 3);
    act(() => { jest.advanceTimersByTime(200); });
    expect(textarea.selectionStart).toBe(1);
    expect(textarea.selectionEnd).toBe(3);
  });

  it('restores focus and removes retries when the trap is deactivated', () => {
    const view = (active: boolean) => (
      <>
        <button>Launcher trigger</button>
        <FocusHarness active={active}><input type="number" aria-label="Numeric control" /></FocusHarness>
      </>
    );
    const { rerender, unmount } = render(view(false));
    const trigger = screen.getByRole('button', { name: 'Launcher trigger' });
    trigger.focus();
    rerender(view(true));
    expect(screen.getByLabelText('Numeric control')).toHaveFocus();
    rerender(view(false));
    expect(trigger).toHaveFocus();
    expect(jest.getTimerCount()).toBe(0);
    unmount();
  });
});
