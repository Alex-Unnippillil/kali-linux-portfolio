import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../../components/base/EmptyState';

describe('EmptyState', () => {
  it('renders copy and triggers primary action', () => {
    const onPrimary = jest.fn();
    render(
      <EmptyState
        icon={<span aria-hidden="true">🌤️</span>}
        title="Track your first city"
        description="Add a location to start monitoring forecasts."
        primaryAction={{ label: 'Add sample city', onClick: onPrimary }}
      />,
    );

    expect(screen.getByText('Track your first city')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add sample city' }));
    expect(onPrimary).toHaveBeenCalled();
  });

  it('supports multiple documentation links', () => {
    render(
      <EmptyState
        icon={<span aria-hidden="true">📚</span>}
        title="No active requests"
        description="Kick off a fetch to watch the proxy record live telemetry."
        primaryAction={{ label: 'Run demo request', onClick: () => {} }}
        secondaryAction={{
          label: 'Review Fetch API docs',
          href: 'https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch',
        }}
        extraActions={[
          {
            label: 'Inspect performance entries',
            href: 'https://developer.mozilla.org/docs/Web/API/PerformanceResourceTiming',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Review Fetch API docs' }),
    ).toHaveAttribute('href', expect.stringContaining('Using_Fetch'));
    expect(
      screen.getByRole('link', { name: 'Inspect performance entries' }),
    ).toBeInTheDocument();
  });
});
