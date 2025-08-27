import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExternalFrame from '../components/apps/chrome/ExternalFrame';

describe('ExternalFrame', () => {
  const src = 'https://example.com';

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows offline banner and reloads on click', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    const { container } = render(<ExternalFrame title="Test" src={src} />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const setSpy = jest.spyOn(iframe, 'src', 'set');
    fireEvent.click(screen.getByText(/try again/i));
    expect(setSpy).toHaveBeenCalled();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  it('hides loader after load event', () => {
    jest.useFakeTimers();
    const { container, queryByText } = render(<ExternalFrame title="Test" src={src} />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    fireEvent.load(iframe);
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('shows error on timeout', () => {
    jest.useFakeTimers();
    render(<ExternalFrame title="Test" src={src} />);
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('mounts without navigator', () => {
    const original = (global as any).navigator;
    // @ts-ignore
    delete (global as any).navigator;
    expect(() => render(<ExternalFrame title="Test" src={src} />)).not.toThrow();
    (global as any).navigator = original;
  });
});

