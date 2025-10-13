import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import InputLab from '../apps/input-lab';

describe('Input Lab status region', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('announces validation errors politely', () => {
    render(<InputLab />);

    act(() => {
      jest.runAllTimers();
    });

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveTextContent('Error: Text is required');
  });

  it('announces saved state politely', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<InputLab />);

    const input = screen.getByLabelText('Text');
    await user.type(input, 'Hello world');

    act(() => {
      jest.runOnlyPendingTimers();
    });

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveTextContent('Saved');
  });
});
