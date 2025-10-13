import React from 'react';
import { render, screen } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) => {
    const { alt, ...rest } = props;
    return <img alt={alt ?? ''} {...rest} />;
  },
}));
jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'demo-app', title: 'Demo App', icon: '/demo.svg', favourite: true },
    { id: 'second-app', title: 'Second App', icon: '/second.svg' },
  ],
}));
jest.mock('../utils/safeStorage', () => ({
  safeLocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('../utils/recentStorage', () => ({
  readRecentAppIds: jest.fn(() => []),
}));
jest.mock('../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ activate: jest.fn(), deactivate: jest.fn() }),
}));

const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }),
  });
};

describe('WhiskerMenu accessibility', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mockMatchMedia();
  });

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      const globalWindow = window as typeof window & { matchMedia?: typeof window.matchMedia };
      delete globalWindow.matchMedia;
    }
  });

  it('exposes the launcher button with a stable identifier', () => {
    render(<WhiskerMenu />);

    const launcherButton = screen.getByRole('button', { name: /applications/i });
    expect(launcherButton).toBeInTheDocument();
    expect(launcherButton).toHaveAttribute('id', 'desktop-launcher');
    expect(launcherButton).toHaveProperty('tabIndex', 0);
  });
});
