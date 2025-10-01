import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HashConverter from '../components/apps/converter/HashConverter';
import { enqueueJob, resetBackpressureForTests } from '../utils/backpressure';

declare global {
  // eslint-disable-next-line no-var
  var Worker: any;
}

describe('HashConverter backpressure UI', () => {
  beforeAll(() => {
    class MockWorker {
      onmessage: ((event: any) => void) | null = null;

      postMessage() {}

      terminate() {}
    }

    global.Worker = MockWorker;
  });

  beforeEach(() => {
    resetBackpressureForTests();
  });

  afterEach(() => {
    act(() => {
      resetBackpressureForTests();
    });
  });

  test('shows queue notice when hashing is delayed', async () => {
    enqueueJob(
      'hash:compute',
      {
        run: () => new Promise<void>(() => {}),
      },
      { id: 'hash:hold' },
    );

    render(<HashConverter />);

    const fileInput = screen.getByLabelText('Drag & drop a file or click to select');

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(['test'], 'test.txt')] },
      });
      await Promise.resolve();
    });

    const notice = await screen.findByTestId('backpressure-message');
    expect(notice.textContent).toMatch(/Waiting/);
  });
});
