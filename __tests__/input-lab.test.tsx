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


  it('supports pausing logging and filtering events', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<InputLab />);

    const input = screen.getByLabelText('Text');
    await user.type(input, 'A');

    expect(screen.getByText(/Total events:/)).toHaveTextContent('Total events:');
    expect(screen.getByText(/Total events:/)).not.toHaveTextContent('Total events: 0');

    const pauseButton = screen.getByRole('button', { name: 'Pause logging' });
    await user.click(pauseButton);
    await user.type(input, 'BC');

    expect(screen.getByRole('button', { name: 'Resume logging' })).toHaveAttribute('aria-pressed', 'true');

    const totalEventsText = screen.getByText(/Total events:/).textContent || '';
    const totalEvents = Number(totalEventsText.replace(/[^0-9]/g, ''));

    await user.click(screen.getByRole('button', { name: 'Resume logging' }));
    await user.type(input, 'D');

    const updatedTotalText = screen.getByText(/Total events:/).textContent || '';
    const updatedTotal = Number(updatedTotalText.replace(/[^0-9]/g, ''));
    expect(updatedTotal).toBeGreaterThan(totalEvents);

    const filter = screen.getByLabelText('Filter events');
    await user.selectOptions(filter, 'keydown');

    expect(screen.getByText(/"type": "keydown"/)).toBeInTheDocument();
  });

});
