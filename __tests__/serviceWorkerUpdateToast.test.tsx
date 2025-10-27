import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyApp from '../pages/_app';

jest.mock('next/font/google', () => ({
  Rajdhani: () => ({ className: 'mocked-font' }),
}));

jest.mock('@vercel/analytics/next', () => ({
  Analytics: function AnalyticsMock({ children, beforeSend }: any) {
    return (
      <div data-testid="analytics" data-before-send={typeof beforeSend === 'function'}>
        {children}
      </div>
    );
  },
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: function SpeedInsightsMock() {
    return <div data-testid="speed-insights" />;
  },
}));

jest.mock('../components/common/ShortcutOverlay', () => {
  const MockShortcutOverlay: React.FC = function MockShortcutOverlay() {
    return <div data-testid="shortcut-overlay" />;
  };
  return MockShortcutOverlay;
});

jest.mock('../components/common/NotificationCenter', () => {
  const MockNotificationCenter: React.FC<{ children?: React.ReactNode }> = function MockNotificationCenter({
    children,
  }) {
    return <div data-testid="notification-center">{children}</div>;
  };
  return MockNotificationCenter;
});

jest.mock('../components/common/PipPortal', () => {
  const MockPipPortal: React.FC<{ children?: React.ReactNode }> = function MockPipPortal({ children }) {
    return <div data-testid="pip-portal">{children}</div>;
  };
  return MockPipPortal;
});

jest.mock('../components/core/ErrorBoundary', () => {
  const MockErrorBoundary: React.FC<{ children?: React.ReactNode }> = function MockErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
  return MockErrorBoundary;
});

jest.mock('../hooks/useSettings', () => ({
  SettingsProvider: function SettingsProviderMock({ children }: { children: React.ReactNode }) {
    return <div data-testid="settings">{children}</div>;
  },
}));

describe('service worker update toast', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalServiceWorker = (navigator as Navigator & {
    serviceWorker?: ServiceWorkerContainer;
  }).serviceWorker;

  const setupNavigatorMock = (registration: Partial<ServiceWorkerRegistration>) => {
    const serviceWorkerMock: Partial<ServiceWorkerContainer> = {
      controller: {},
      register: jest.fn().mockResolvedValue(registration),
      getRegistration: jest.fn().mockResolvedValue(registration),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerMock,
      configurable: true,
    });

    return serviceWorkerMock;
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    });
  });

  const renderApp = () => {
    const DummyComponent = () => <div>dummy</div>;
    render(<MyApp Component={DummyComponent as any} pageProps={{}} />);
  };

  it('shows a toast when a waiting service worker is detected', async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const registration: Partial<ServiceWorkerRegistration> = {
      waiting: {} as ServiceWorker,
      update: updateMock,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const serviceWorkerMock = setupNavigatorMock(registration);

    renderApp();

    await waitFor(() => {
      expect(serviceWorkerMock.register).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('A new version is available.')).toBeInTheDocument();
    });
  });

  it('updates the service worker and reloads when the toast action is clicked', async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const registration: Partial<ServiceWorkerRegistration> = {
      waiting: {} as ServiceWorker,
      update: updateMock,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const serviceWorkerMock = setupNavigatorMock(registration);

    renderApp();

    await waitFor(() => {
      expect(serviceWorkerMock.register).toHaveBeenCalled();
    });

    const actionButton = await screen.findByRole('button', { name: 'Reload now' });
    const initialCalls = updateMock.mock.calls.length;

    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(initialCalls + 1);
    });

    await waitFor(() => {
      expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();
    });
  });
});
