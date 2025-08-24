import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

jest.mock('../lib/axiom', () => ({ initAxiom: jest.fn(), logEvent: jest.fn() }));
jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn(), initialize: jest.fn() }));
jest.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));
jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter' }) }));

describe('service worker registration', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete (navigator as any).serviceWorker;
  });

  it('does not register service worker in development', async () => {
    process.env.NODE_ENV = 'development';
    const register = jest.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    const MyApp = require('../pages/_app').default;
    render(<MyApp Component={() => <div />} pageProps={{}} />);

    await act(async () => {});

    expect(register).not.toHaveBeenCalled();
  });
});
