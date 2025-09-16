import { render } from '@testing-library/react';
import DisplayModeClient from '../components/DisplayModeClient';

const DISPLAY_MODE_QUERY = '(display-mode: standalone)';

type Listener = (event: MediaQueryListEvent) => void;

type MatchMediaStubOptions = {
  supportEventListener?: boolean;
  supportListener?: boolean;
};

type MatchMediaStub = {
  mediaQueryList: MediaQueryList & {
    addEventListener?: jest.Mock;
    removeEventListener?: jest.Mock;
    addListener?: jest.Mock;
    removeListener?: jest.Mock;
  };
  emit: (matches: boolean) => void;
};

const createMatchMediaStub = (
  initialMatches: boolean,
  options: MatchMediaStubOptions = {},
): MatchMediaStub => {
  const { supportEventListener = true, supportListener = true } = options;
  const listeners = new Set<Listener>();

  const addEventListenerMock = jest.fn((eventName: string, listener: EventListener) => {
    if (eventName === 'change') {
      listeners.add(listener as unknown as Listener);
    }
  });

  const removeEventListenerMock = jest.fn((eventName: string, listener: EventListener) => {
    if (eventName === 'change') {
      listeners.delete(listener as unknown as Listener);
    }
  });

  const addListenerMock = jest.fn((listener: MediaQueryListListener) => {
    if (listener) {
      listeners.add(listener as unknown as Listener);
    }
  });

  const removeListenerMock = jest.fn((listener: MediaQueryListListener) => {
    if (listener) {
      listeners.delete(listener as unknown as Listener);
    }
  });

  const mediaQueryList = {
    matches: initialMatches,
    media: DISPLAY_MODE_QUERY,
    onchange: null,
    addEventListener: supportEventListener ? addEventListenerMock : undefined,
    removeEventListener: supportEventListener ? removeEventListenerMock : undefined,
    addListener: supportListener ? addListenerMock : undefined,
    removeListener: supportListener ? removeListenerMock : undefined,
    dispatchEvent: jest.fn(),
  } as unknown as MatchMediaStub['mediaQueryList'];

  const emit = (matches: boolean) => {
    mediaQueryList.matches = matches;
    const event = { matches } as MediaQueryListEvent;
    listeners.forEach((listener) => listener.call(mediaQueryList, event));
  };

  return {
    mediaQueryList,
    emit,
  };
};

describe('DisplayModeClient', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    document.documentElement.className = '';
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      delete (window as any).matchMedia;
    }
  });

  test('toggles the installed class based on display mode changes', () => {
    const stub = createMatchMediaStub(true);
    window.matchMedia = jest.fn().mockReturnValue(stub.mediaQueryList);

    const { unmount } = render(<DisplayModeClient />);

    expect(document.documentElement.classList.contains('installed')).toBe(true);

    stub.emit(false);
    expect(document.documentElement.classList.contains('installed')).toBe(false);

    unmount();
    expect(document.documentElement.classList.contains('installed')).toBe(false);
  });

  test('adds the installed class when standalone mode activates', () => {
    const stub = createMatchMediaStub(false);
    window.matchMedia = jest.fn().mockReturnValue(stub.mediaQueryList);

    render(<DisplayModeClient />);

    expect(document.documentElement.classList.contains('installed')).toBe(false);

    stub.emit(true);
    expect(document.documentElement.classList.contains('installed')).toBe(true);

    stub.emit(false);
    expect(document.documentElement.classList.contains('installed')).toBe(false);
  });

  test('supports the legacy addListener API', () => {
    const stub = createMatchMediaStub(true, { supportEventListener: false, supportListener: true });
    window.matchMedia = jest.fn().mockReturnValue(stub.mediaQueryList);

    const { unmount } = render(<DisplayModeClient />);

    expect(document.documentElement.classList.contains('installed')).toBe(true);

    stub.emit(false);
    expect(document.documentElement.classList.contains('installed')).toBe(false);

    unmount();
    expect(document.documentElement.classList.contains('installed')).toBe(false);
  });
});
