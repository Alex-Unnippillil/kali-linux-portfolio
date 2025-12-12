import { Worker } from 'node:worker_threads';
import {
  createErrorResponse,
  serializeError,
  WorkerRequest,
} from '../workers/protocol';

describe('worker protocol', () => {
  it('serializes errors emitted from worker threads', async () => {
    const request: WorkerRequest<null> = { type: 'explode', id: 'req-1', payload: null };

    const worker = new Worker(
      `
        const { parentPort, workerData } = require('node:worker_threads');
        const serializeError = eval(workerData.serializeError);

        parentPort.on('message', (message) => {
          try {
            throw new Error('Kaboom');
          } catch (error) {
            parentPort.postMessage({ ok: false, id: message.id, error: serializeError(error) });
          }
        });
      `,
      { eval: true, workerData: { serializeError: serializeError.toString() } }
    );

    const response: any = await new Promise((resolve, reject) => {
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.postMessage(request);
    });

    worker.terminate();

    const expected = createErrorResponse(request.id, new Error('Kaboom'));
    expect(response).toMatchObject({
      ok: false,
      id: request.id,
      error: {
        message: expected.error.message,
        name: expected.error.name,
      },
    });
    expect(response.error.stack).toEqual(expect.any(String));
  });
});
