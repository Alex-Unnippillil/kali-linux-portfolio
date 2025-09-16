import { fireEvent } from '@testing-library/dom';
import { attach, register, __testing } from '../src/desktop/keymap';

describe('desktop keymap service', () => {
  let detach: () => void;

  beforeEach(() => {
    detach = attach(window);
  });

  afterEach(() => {
    detach();
    __testing.registry.clear();
    document.body.innerHTML = '';
  });

  it('invokes registered handler for matching combo and prevents default', () => {
    const handler = jest.fn();
    register('Alt+Enter', handler);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores input targets unless explicitly allowed', () => {
    const handler = jest.fn();
    register('Ctrl+K', handler);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();

    const handlerAllowed = jest.fn();
    register('Ctrl+K', handlerAllowed, { allowInInput: true });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(handlerAllowed).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
