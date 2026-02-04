import { renderHook, act } from '@testing-library/react';
import useFileSystemNavigator from '../../hooks/useFileSystemNavigator';

describe('useFileSystemNavigator', () => {
  it('openPath does not create directories when navigating', async () => {
    const root = {
      name: 'root',
      entries: async function* entries() {},
      getDirectoryHandle: jest.fn(async (_segment, options) => {
        expect(options).toEqual({ create: false });
        const error = new Error('missing');
        // @ts-expect-error - assign a name for the test
        error.name = 'NotFoundError';
        throw error;
      }),
    } as unknown as FileSystemDirectoryHandle;

    const { result } = renderHook(() => useFileSystemNavigator());

    await act(async () => {
      await result.current.openHandle(root, { setAsRoot: true });
    });

    await act(async () => {
      await result.current.openPath('missing-folder');
    });

    expect(root.getDirectoryHandle).toHaveBeenCalledWith('missing-folder', {
      create: false,
    });
    expect(result.current.locationError).toBe('Path not found: missing-folder');
  });
});
