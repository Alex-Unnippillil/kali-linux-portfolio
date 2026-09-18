import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UbuntuApp from '../components/base/ubuntu_app';
jest.mock('next/image', () => ({ __esModule: true, default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
const setup = (extra = {}) => {
  const openApp = jest.fn();
  render(<UbuntuApp id="youtube" name="YouTube" icon="/youtube.svg" openApp={openApp} {...extra} />);
  return { icon: screen.getByRole('button', { name: 'YouTube' }), openApp };
};
function pointer(node: Element, type: string, values: Record<string, unknown> = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries({ pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 20, ...values }).forEach(([key, value]) => Object.defineProperty(event, key, { value }));
  fireEvent(node, event);
}

test('touch opens once, even when the browser synthesizes click and double-click', () => {
  const { icon, openApp } = setup({ launchOnClick: true });
  pointer(icon, 'pointerdown'); pointer(icon, 'pointerup');
  fireEvent.click(icon); fireEvent.doubleClick(icon);
  expect(openApp).toHaveBeenCalledTimes(1);
});
test('scrolling or dragging past an icon does not open it', () => {
  const { icon, openApp } = setup({ launchOnClick: true });
  pointer(icon, 'pointerdown'); pointer(icon, 'pointermove', { clientY: 70 }); pointer(icon, 'pointerup', { clientY: 70 });
  fireEvent.click(icon);
  expect(openApp).not.toHaveBeenCalled();
});
test('pointer cancellation does not leave an activation armed', () => {
  const { icon, openApp } = setup();
  pointer(icon, 'pointerdown'); pointer(icon, 'pointercancel'); pointer(icon, 'pointerup');
  expect(openApp).not.toHaveBeenCalled();
});
test('pen, mouse double click, and keyboard still work without changing modes', () => {
  const { icon, openApp } = setup();
  fireEvent.doubleClick(icon);
  fireEvent.keyDown(icon, { key: 'Enter' });
  fireEvent.keyDown(icon, { key: ' ', repeat: true });
  pointer(icon, 'pointerdown', { pointerType: 'pen' }); pointer(icon, 'pointerup', { pointerType: 'pen' });
  expect(openApp).toHaveBeenCalledTimes(3);
});
test('disabled icons do not activate', () => {
  const { icon, openApp } = setup({ disabled: true });
  pointer(icon, 'pointerdown'); pointer(icon, 'pointerup'); fireEvent.keyDown(icon, { key: 'Enter' });
  expect(openApp).not.toHaveBeenCalled();
});

test('does not double-launch when the desktop controller already handled activation', () => {
  const external = jest.fn();
  const { icon, openApp } = setup({ onPointerUp: (event: React.PointerEvent) => { event.preventDefault(); external(); } });
  pointer(icon, 'pointerdown', { pointerType: 'mouse' }); pointer(icon, 'pointerup', { pointerType: 'mouse' });
  fireEvent.click(icon); fireEvent.doubleClick(icon);
  expect(external).toHaveBeenCalledTimes(1);
  expect(openApp).not.toHaveBeenCalled();
});
test('secondary pointers and right-button pen clicks do not launch', () => {
  const { icon, openApp } = setup();
  pointer(icon, 'pointerdown', { isPrimary: false }); pointer(icon, 'pointerup', { isPrimary: false });
  pointer(icon, 'pointerdown', { pointerType: 'pen', button: 2 }); pointer(icon, 'pointerup', { pointerType: 'pen', button: 2 });
  expect(openApp).not.toHaveBeenCalled();
});
