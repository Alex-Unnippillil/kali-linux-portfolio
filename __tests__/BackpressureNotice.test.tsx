import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import BackpressureNotice from '../components/system/BackpressureNotice';
import {
  enqueueJob,
  registerJobType,
  resetBackpressureForTests,
} from '../utils/backpressure';

describe('BackpressureNotice', () => {
  beforeEach(() => {
    resetBackpressureForTests();
    registerJobType('ui:test', { label: 'UI test job', concurrency: 1 });
  });

  afterEach(() => {
    act(() => {
      resetBackpressureForTests();
    });
  });

  test('shows queue messaging with cancel and resume controls', async () => {
    enqueueJob(
      'ui:test',
      {
        run: () => new Promise<void>(() => {}),
      },
      { id: 'ui:running' },
    );

    const queued = enqueueJob(
      'ui:test',
      {
        run: async () => undefined,
      },
      { id: 'ui:queued', label: 'Queued job' },
    );

    render(
      <BackpressureNotice jobId={queued.id} description="Queued demo job" />,
    );

    expect(screen.getByTestId('backpressure-title')).toHaveTextContent(
      'Queued demo job',
    );
    expect(screen.getByTestId('backpressure-message').textContent).toMatch(
      /Waiting/,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await Promise.resolve();
    });

    expect(screen.getByTestId('backpressure-message').textContent).toMatch(
      /paused/,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
      await Promise.resolve();
    });

    expect(screen.getByTestId('backpressure-message').textContent).toMatch(
      /Waiting/,
    );
  });
});
