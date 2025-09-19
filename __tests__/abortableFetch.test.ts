import { abortableFetch } from '@/utils';

test('abortableFetch can be aborted', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((_input: any, init?: RequestInit) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }) as any;
  });

  const { promise, abort } = abortableFetch('https://example.com');
  abort();
  await expect(promise).rejects.toHaveProperty('name', 'AbortError');
  fetchSpy.mockRestore();
});
