import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UbuntuApp from '../components/base/ubuntu_app';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt?: string }) => <img alt={alt} {...props} />,
}));

describe('UbuntuApp pointer capture', () => {
  const renderApp = () =>
    render(
      <UbuntuApp
        id="demo-app"
        name="Demo App"
        icon="/themes/Yaru/apps/demo.png"
        openApp={() => {}}
      />
    );

  it('captures and releases pointer events on desktop icons', () => {
    renderApp();

    const icon = screen.getByRole('button', { name: /demo app/i }) as HTMLElement & {
      setPointerCapture: jest.Mock;
      releasePointerCapture: jest.Mock;
    };
    icon.setPointerCapture = jest.fn();
    icon.releasePointerCapture = jest.fn();

    fireEvent.pointerDown(icon, { pointerId: 3 });
    expect(icon.setPointerCapture).toHaveBeenCalledWith(3);

    fireEvent.pointerUp(icon, { pointerId: 3 });
    expect(icon.releasePointerCapture).toHaveBeenCalledWith(3);
  });

  it('releases pointer capture when dragging is cancelled', () => {
    renderApp();

    const icon = screen.getByRole('button', { name: /demo app/i }) as HTMLElement & {
      setPointerCapture: jest.Mock;
      releasePointerCapture: jest.Mock;
    };
    icon.setPointerCapture = jest.fn();
    icon.releasePointerCapture = jest.fn();

    fireEvent.pointerDown(icon, { pointerId: 5 });
    expect(icon.setPointerCapture).toHaveBeenCalledWith(5);

    fireEvent.pointerCancel(icon, { pointerId: 5 });
    expect(icon.releasePointerCapture).toHaveBeenCalledWith(5);
  });
});
