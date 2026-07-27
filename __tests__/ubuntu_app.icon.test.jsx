import React from 'react';
import { render, fireEvent, act, createEvent } from '@testing-library/react';
import UbuntuApp from '../components/base/ubuntu_app';

describe('UbuntuApp icon interactions', () => {
  const createProps = (override = {}) => ({
    id: 'terminal',
    name: 'Terminal',
    icon: './icons/terminal.png',
    openApp: jest.fn(),
    ...override,
  });

  const renderIcon = (override = {}) => {
    const props = createProps(override);
    const utils = render(<UbuntuApp {...props} />);
    const label = props.displayName ?? props.name ?? '';
    const icon = utils.getByRole('button', { name: label });
    return { icon, props, ...utils };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('exposes ARIA attributes and handles pointer activation', () => {
    const onPointerDown = jest.fn();
    const onPointerUp = jest.fn();
    const { icon, props } = renderIcon({ onPointerDown, onPointerUp });

    expect(icon).toHaveAttribute('role', 'button');
    expect(icon).toHaveAttribute('aria-label', props.name);
    expect(icon).toHaveAttribute('tabindex', '0');
    expect(icon).toHaveAttribute('data-app-id', props.id);

    const pointerDownEvent = createEvent.pointerDown(icon, { pointerId: 1 });
    Object.defineProperty(pointerDownEvent, 'pointerType', { value: 'touch' });
    fireEvent(icon, pointerDownEvent);
    expect(onPointerDown).toHaveBeenCalledTimes(1);

    const pointerUpEvent = createEvent.pointerUp(icon, { pointerId: 1 });
    Object.defineProperty(pointerUpEvent, 'pointerType', { value: 'touch' });
    fireEvent(icon, pointerUpEvent);
    expect(onPointerUp).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runAllTimers();
    });

    expect(props.openApp).toHaveBeenCalledTimes(1);
    expect(props.openApp).toHaveBeenCalledWith(props.id);
  });

  it('applies dragging styles and prevents activation while dragging', () => {
    const { icon, props } = renderIcon();

    expect(icon.className).not.toContain('opacity-70');

    fireEvent.dragStart(icon);
    expect(icon.className).toContain('opacity-70');

    fireEvent.pointerUp(icon, { pointerType: 'touch' });

    act(() => {
      jest.runAllTimers();
    });

    expect(props.openApp).not.toHaveBeenCalled();

    fireEvent.dragEnd(icon);
    expect(icon.className).not.toContain('opacity-70');
  });

  it('respects external dragging flag', () => {
    const { icon, props } = renderIcon({ isBeingDragged: true });

    expect(icon.className).toContain('opacity-70');

    fireEvent.pointerUp(icon, { pointerType: 'touch' });

    act(() => {
      jest.runAllTimers();
    });

    expect(props.openApp).not.toHaveBeenCalled();
  });

  it('does not activate when disabled and removes focusability', () => {
    const { icon, props } = renderIcon({ disabled: true });

    expect(icon).toHaveAttribute('aria-disabled', 'true');
    expect(icon).toHaveAttribute('tabindex', '-1');

    fireEvent.pointerUp(icon, { pointerType: 'touch' });

    const enterEvent = createEvent.keyDown(icon, { key: 'Enter' });
    enterEvent.preventDefault = jest.fn();
    fireEvent(icon, enterEvent);

    act(() => {
      jest.runAllTimers();
    });

    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(props.openApp).not.toHaveBeenCalled();
  });

  it('prefetches only once across hover and focus', () => {
    const prefetch = jest.fn();
    const { icon } = renderIcon({ prefetch });

    fireEvent.mouseEnter(icon);
    fireEvent.focus(icon);

    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard activation with Enter and Space', () => {
    const { icon, props } = renderIcon();

    const enterEvent = createEvent.keyDown(icon, { key: 'Enter' });
    enterEvent.preventDefault = jest.fn();
    fireEvent(icon, enterEvent);

    const spaceEvent = createEvent.keyDown(icon, { key: ' ' });
    spaceEvent.preventDefault = jest.fn();
    fireEvent(icon, spaceEvent);

    act(() => {
      jest.runAllTimers();
    });

    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(spaceEvent.preventDefault).toHaveBeenCalled();
    expect(props.openApp).toHaveBeenCalledTimes(2);
    expect(props.openApp).toHaveBeenNthCalledWith(1, props.id);
    expect(props.openApp).toHaveBeenNthCalledWith(2, props.id);
  });
});
