export type PermissionMode = 'read' | 'readwrite';

interface PermissionHandle {
  queryPermission?: (options: { mode: PermissionMode }) => Promise<PermissionState> | PermissionState;
  requestPermission?: (options: { mode: PermissionMode }) => Promise<PermissionState> | PermissionState;
}

function resolvePermission(result: PermissionState | Promise<PermissionState> | undefined, fallback: PermissionState) {
  if (result instanceof Promise) {
    return result.catch(() => fallback);
  }
  return Promise.resolve(result ?? fallback);
}

export async function ensureHandlePermission<T extends PermissionHandle>(
  handle: T | null | undefined,
  mode: PermissionMode = 'readwrite',
): Promise<boolean> {
  if (!handle) return false;

  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const current = await resolvePermission(handle.queryPermission({ mode }), 'prompt');
  if (current === 'granted') return true;
  const next = await resolvePermission(handle.requestPermission({ mode }), 'denied');
  return next === 'granted';
}
