import { ensureHandlePermission } from '../../services/fileExplorer/permissions';

describe('ensureHandlePermission', () => {
  it('returns false when handle is missing', async () => {
    expect(await ensureHandlePermission(null)).toBe(false);
  });

  it('grants access when permission APIs are missing', async () => {
    const handle = {};
    expect(await ensureHandlePermission(handle)).toBe(true);
  });

  it('returns true when permission already granted', async () => {
    const handle = {
      queryPermission: jest.fn().mockResolvedValue('granted'),
      requestPermission: jest.fn(),
    };
    expect(await ensureHandlePermission(handle as any)).toBe(true);
    expect(handle.requestPermission).not.toHaveBeenCalled();
  });

  it('requests permission when not granted', async () => {
    const handle = {
      queryPermission: jest.fn().mockResolvedValue('prompt'),
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    expect(await ensureHandlePermission(handle as any)).toBe(true);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('returns false when permission is denied', async () => {
    const handle = {
      queryPermission: jest.fn().mockResolvedValue('prompt'),
      requestPermission: jest.fn().mockResolvedValue('denied'),
    };
    expect(await ensureHandlePermission(handle as any)).toBe(false);
  });

  it('handles rejected permission promises gracefully', async () => {
    const handle = {
      queryPermission: jest.fn().mockRejectedValue(new Error('fail')),
      requestPermission: jest.fn().mockRejectedValue(new Error('fail')),
    };
    expect(await ensureHandlePermission(handle as any)).toBe(false);
  });
});
