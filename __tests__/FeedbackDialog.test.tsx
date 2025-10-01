import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedbackDialog from '../components/common/FeedbackDialog';
import { logEvent } from '../utils/analytics';
import { trackEvent } from '../lib/analytics-client';
import { redactText } from '../utils/redaction';

jest.mock('../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../lib/analytics-client', () => ({
  trackEvent: jest.fn(),
}));

describe('FeedbackDialog', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="__next"></div>';
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it('validates required fields before submitting', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackDialog
        isOpen
        onClose={() => {}}
        submitFeedback={submitFeedback}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /send report/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/provide a short summary/i)).toBeInTheDocument();
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it('packages diagnostics with consent and redaction', async () => {
    const submitFeedback = jest.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 user@example.com',
      configurable: true,
    });

    const getStateSnapshot = () => ({
      path: '/apps',
      token: 'token=abc123abc123abc123abc123',
      contact: 'user@example.com',
    });

    const hashString = (input: string) => {
      let hash = 0;
      for (let i = 0; i < input.length; i += 1) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
      }
      return hash.toString(16);
    };

    const sanitizedState = {
      path: '/apps',
      token: 'token= [redacted-token]',
      contact: '[redacted-email]',
    };
    const expectedHash = hashString(JSON.stringify(sanitizedState));

    render(
      <FeedbackDialog
        isOpen
        onClose={() => {}}
        submitFeedback={submitFeedback}
        getStateSnapshot={getStateSnapshot}
      />,
    );

    fireEvent.change(screen.getByLabelText(/summary/i), {
      target: { value: 'App issue from user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: {
        value: 'Steps to reproduce token=abc123abc123abc123abc123 and bearer ABC123ABC123',
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /send report/i }));

    await waitFor(() => expect(submitFeedback).toHaveBeenCalled());

    const payload = submitFeedback.mock.calls[0][0];
    expect(payload.summary).not.toContain('user@example.com');
    expect(payload.summary).toContain('[redacted-email]');
    expect(payload.description).toContain('[redacted-token]');
    expect(payload.includeDiagnostics).toBe(true);
    expect(payload.diagnostics).toBeTruthy();
    expect(payload.diagnostics?.stateHash).toBe(expectedHash);
    expect(payload.diagnostics?.vitals.userAgent).toBe(redactText('Mozilla/5.0 user@example.com'));

    expect((logEvent as jest.Mock).mock.calls[0][0]).toEqual({
      category: 'feedback',
      action: 'submit',
      label: 'with_diagnostics',
    });
    expect(trackEvent).toHaveBeenCalledWith('feedback_submit', { includeDiagnostics: true });

  });
});
