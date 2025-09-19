import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../components/core/ErrorBoundary';

jest.mock('../lib/client-error-reporter', () => ({
  reportClientError: jest.fn().mockResolvedValue(undefined),
}));

describe('ErrorBoundary', () => {
  it('renders fallback with copyable error id and bug report link', async () => {
    const Problem: React.FC = () => {
      throw new Error('explode');
    };

    render(
      <ErrorBoundary>
        <Problem />
      </ErrorBoundary>
    );

    const bugLink = await screen.findByRole('link', { name: /Report bug/i });
    expect(bugLink.getAttribute('href')).toContain('errorId=');
    expect(screen.getByRole('button', { name: /Copy error ID/i })).toBeInTheDocument();
  });
});

