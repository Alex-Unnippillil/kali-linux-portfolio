import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ThrottlePanel, {
  defaultThrottleConfig,
  generateTimeline,
} from '../components/apps/hydra/ThrottlePanel';

describe('ThrottlePanel', () => {
  it('generates an exponential timeline capped by lockout', () => {
    const timeline = generateTimeline({
      ...defaultThrottleConfig,
      throttleAfter: 2,
      lockoutAfter: 5,
      baseDelayMs: 400,
      attemptCount: 6,
    });
    expect(timeline).toHaveLength(5);
    expect(timeline[0].elapsedMs).toBe(0);
    expect(timeline[1].delayMs).toBe(400);
    expect(timeline[2].status).toBe('throttled');
    expect(timeline[4].status).toBe('locked');
  });

  it('virtualises large timelines to keep DOM work small', async () => {
    render(
      <ThrottlePanel
        config={{
          ...defaultThrottleConfig,
          attemptCount: 5000,
          lockoutAfter: 5000,
          throttleAfter: 4,
        }}
        onConfigChange={jest.fn()}
      />
    );

    await waitFor(() => {
      const rows = screen.getAllByTestId('timeline-row');
      expect(rows.length).toBeLessThan(200);
    });
  });

  it('imports configuration from JSON text input', () => {
    const handleChange = jest.fn();
    render(
      <ThrottlePanel
        config={defaultThrottleConfig}
        onConfigChange={handleChange}
      />
    );

    const textArea = screen.getByLabelText('Import JSON');
    fireEvent.change(textArea, {
      target: { value: JSON.stringify({ lockoutAfter: 12, throttleAfter: 3 }) },
    });
    fireEvent.click(screen.getByRole('button', { name: /Load JSON/i }));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ lockoutAfter: 12, throttleAfter: 3 })
    );
  });
});
