import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PrefetchJumpList from '@apps/prefetch-jumplist';

describe('PrefetchJumpList', () => {
  it('shows error for unsupported format', async () => {
    class MockWorker {
      onmessage: any;
      postMessage() {
        if (this.onmessage) this.onmessage({ data: { error: 'Unsupported format' } });
      }
      terminate() {}
    }
    // @ts-ignore
    global.Worker = MockWorker;

    const { getByTestId, findByTestId } = render(<PrefetchJumpList />);
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const error = await findByTestId('error');
    expect(error.textContent).toMatch(/Unsupported/);
  });

  it('highlights anomalies', async () => {
    const anomalyEvent = {
      time: Date.now() + 1000,
      source: 'Prefetch',
      file: 'test',
      runCount: 0,
      anomaly: true,
    };
    class MockWorker {
      onmessage: any;
      postMessage() {
        if (this.onmessage) this.onmessage({ data: { events: [anomalyEvent] } });
      }
      terminate() {}
    }
    // @ts-ignore
    global.Worker = MockWorker;

    const { getByTestId, findByTestId } = render(<PrefetchJumpList />);
    const file = new File([''], 'a.pf');
    const input = getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const table = await findByTestId('timeline');
    const row = table.querySelector('tbody tr');
    expect(row).toHaveClass('bg-red-900');
  });
});
