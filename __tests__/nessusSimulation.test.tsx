import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Nessus from '../apps/nessus';

const pluginFixture = [
  {
    id: 1,
    name: 'Plugin 1',
    severity: 'High',
    description: 'Test plugin',
    tags: ['web'],
  },
];

const scanFixture = {
  findings: [
    { plugin: 1, severity: 'High' },
    { plugin: 2, severity: 'Medium' },
  ],
};

describe('Nessus dev simulation controls', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('plugins')) {
        return Promise.resolve({ json: async () => pluginFixture } as Response);
      }
      if (url.includes('scanA') || url.includes('scanB')) {
        return Promise.resolve({ json: async () => scanFixture } as Response);
      }
      return Promise.resolve({ json: async () => ({}) } as Response);
    }) as jest.Mock;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.resetAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error allow cleanup when fetch was undefined
      delete global.fetch;
    }
  });

  it('pauses and resumes simulated request metrics', async () => {
    render(<Nessus />);

    await act(async () => {
      await Promise.resolve();
    });

    const requestsValue = await screen.findByTestId('nessus-requests-value');
    expect(requestsValue.textContent).toBe('0');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    const afterRun = Number(requestsValue.textContent);
    expect(afterRun).toBeGreaterThan(0);

    const pauseButton = await screen.findByTestId('nessus-pause');
    fireEvent.click(pauseButton);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(Number(requestsValue.textContent)).toBe(afterRun);

    const resumeButton = await screen.findByTestId('nessus-resume');
    fireEvent.click(resumeButton);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(Number(requestsValue.textContent)).toBeGreaterThan(afterRun);
  });
});

