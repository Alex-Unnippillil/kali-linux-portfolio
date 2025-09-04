import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginManager from '../components/apps/plugin-manager';

describe('PluginManager', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:mock');
    (global as any).URL.revokeObjectURL = jest.fn();
    const nodeCrypto = require('crypto');
    (global as any).crypto = {
      subtle: {
        digest: (_alg: string, data: ArrayBuffer) => {
          const hash = nodeCrypto
            .createHash('sha256')
            .update(Buffer.from(data))
            .digest();
          const ab = hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
          return Promise.resolve(ab);
        },
      },
    } as any;
    (global as any).TextEncoder = require('util').TextEncoder;
    (window as any).crypto = (global as any).crypto;

    class MockWorker {
      onmessage: ((e: { data: any }) => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_url: string) {
        setTimeout(() => {
          this.onmessage && this.onmessage({ data: 'content' });
        }, 0);
      }
      postMessage() {}
      terminate() {}
    }
    (global as any).Worker = MockWorker;

    // fetch will be mocked per test
  });

  test('warns if signature verification fails', async () => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url === '/api/plugins') {
        return Promise.resolve({
          json: () => Promise.resolve([{ id: 'demo', file: 'demo.json' }]),
        });
      }
      if (url === '/api/plugins/demo.json') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              id: 'demo',
              sandbox: 'worker',
              code: "self.postMessage('content');",
              signature: 'bad',
            }),
        });
      }
      return Promise.reject(new Error('unknown url'));
    });
    render(<PluginManager />);
    const button = await screen.findByText('Install');
    fireEvent.click(button);
    expect(
      await screen.findByText('Plugin verification failed')
    ).toBeInTheDocument();
  });
});
