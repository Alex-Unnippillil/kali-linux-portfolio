import { abortableFetch } from '../utils/abortableFetch';
import { createCancelScope } from '../utils/cancel';

test('abortableFetch can be aborted', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((_input: any, init?: RequestInit) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }) as any;
  });

  const cancel = createCancelScope('test-fetch');
  const { promise, cancel: scope } = abortableFetch('https://example.com', { cancel });
  expect(fetchSpy).toHaveBeenCalledWith(
    'https://example.com',
    expect.objectContaining({ signal: cancel.signal }),
  );
  scope.abort({ message: 'abort test' });
  await expect(promise).rejects.toHaveProperty('name', 'AbortError');
  fetchSpy.mockRestore();
});
