import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PrefetchJumpList from '../apps/prefetch-jumplist';

describe('PrefetchJumpList', () => {
  beforeEach(() => {
    class MockWorker {
      onmessage: any;
      postMessage() {
        if (this.onmessage) this.onmessage({ data: { error: 'Unsupported format' } });
      }
      terminate() {}
    }
    // @ts-ignore
    global.Worker = MockWorker;
  });

  it('shows error for unsupported format', async () => {
    const { getByTestId, findByTestId } = render(<PrefetchJumpList />);
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const error = await findByTestId('error');
    expect(error.textContent).toMatch(/Unsupported/);
  });
});
