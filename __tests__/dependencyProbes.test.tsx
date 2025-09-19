import React from 'react';
import { render, screen } from '@testing-library/react';
import WarningBanner from '../components/WarningBanner';
import { runDependencyProbes } from '../lib/dependencyProbes';

describe('dependency probes', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('summarises missing dependencies in a single message', () => {
    const result = runDependencyProbes({
      window: {},
      env: {},
    });

    expect(result.missing.length).toBeGreaterThan(1);
    expect(result.summary).toMatch(/^Missing dependencies:/);
    expect(result.summary.match(/Missing dependencies:/g)).toHaveLength(1);
    expect(result.messages.length).toBe(result.missing.length);
  });

  it('renders a consolidated warning banner for multiple issues', () => {
    const result = runDependencyProbes({
      window: {},
      env: {},
    });

    render(
      <WarningBanner
        title={result.summary}
        messages={result.messages}
        actionHref="/docs/getting-started.md#environment"
      />
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /fix it/i })).toHaveAttribute(
      'href',
      '/docs/getting-started.md#environment',
    );
    result.messages.forEach((message) => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  it('passes when dependencies are available', () => {
    const fakeWindow = {
      localStorage: {
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      fetch: () => Promise.resolve(),
      indexedDB: {},
      crypto: {
        getRandomValues: () => new Uint8Array(1),
      },
    };

    const result = runDependencyProbes({
      window: fakeWindow,
      env: {
        NEXT_PUBLIC_SERVICE_ID: 'service',
        NEXT_PUBLIC_TEMPLATE_ID: 'template',
        NEXT_PUBLIC_USER_ID: 'user',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_ANON_KEY: 'server-anon',
        FEATURE_TOOL_APIS: 'enabled',
        FEATURE_HYDRA: 'disabled',
      },
    });

    expect(result.missing).toHaveLength(0);
    expect(result.summary).toBe('All dependency checks passed.');
  });
});
