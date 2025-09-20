import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import WindowTilingHotkeys from '../components/WindowTilingHotkeys';

describe('WindowTilingHotkeys', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const createWindow = (id = 'test-window') => {
    const element = document.createElement('div');
    element.id = id;
    element.className = 'opened-window';
    document.body.appendChild(element);
    return element;
  };

  it('snaps focused window to the left half with Meta+ArrowLeft', () => {
    const element = createWindow();
    render(<WindowTilingHotkeys enabled getFocusedWindowId={() => element.id} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true });
    expect(element.style.width).toBe('50%');
    expect(element.style.height).toBe('100%');
    expect(element.style.inset).toBe('0 auto 0 0');
    expect(element.dataset.snapState).toBe('left');
  });

  it('creates a top-left quarter when pressing Meta+ArrowLeft then Meta+ArrowUp', () => {
    const element = createWindow();
    render(<WindowTilingHotkeys enabled getFocusedWindowId={() => element.id} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true });
    expect(element.style.width).toBe('50%');
    expect(element.style.height).toBe('50%');
    expect(element.style.inset).toBe('0 auto auto 0');
    expect(element.dataset.snapState).toBe('top-left');
  });

  it('falls back to the visible focused window when no id is provided', () => {
    const focused = createWindow('focused-window');
    const hidden = createWindow('background-window');
    hidden.classList.add('notFocused');
    render(<WindowTilingHotkeys enabled />);
    fireEvent.keyDown(window, { key: 'ArrowRight', metaKey: true });
    expect(focused.dataset.snapState).toBe('right');
    expect(focused.style.inset).toBe('0 0 0 auto');
    expect(hidden.dataset.snapState).toBeUndefined();
  });

  it('snaps to the bottom half from a floating window', () => {
    const element = createWindow();
    render(<WindowTilingHotkeys enabled getFocusedWindowId={() => element.id} />);
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    expect(element.style.height).toBe('50%');
    expect(element.style.inset).toBe('auto 0 0 0');
    expect(element.dataset.snapState).toBe('bottom');
  });

  it('transitions from a left half to a bottom-left quarter on Meta+ArrowDown', () => {
    const element = createWindow();
    render(<WindowTilingHotkeys enabled getFocusedWindowId={() => element.id} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown', metaKey: true });
    expect(element.dataset.snapState).toBe('bottom-left');
    expect(element.style.inset).toBe('auto auto 0 0');
  });
});
