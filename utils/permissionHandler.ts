export type PermissionKind = 'camera' | 'microphone' | 'screenCapture' | 'fileSystemAccess';
export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

type NavigatorPermissionState = 'granted' | 'denied' | 'prompt';

type GlobalWithFileSystem = typeof globalThis & {
  showDirectoryPicker?: () => Promise<unknown>;
  showOpenFilePicker?: () => Promise<unknown[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<unknown>;
};

const getGlobalObject = (): GlobalWithFileSystem | undefined =>
  typeof globalThis === 'undefined' ? undefined : (globalThis as GlobalWithFileSystem);

const getNavigator = (): Navigator | undefined => getGlobalObject()?.navigator as Navigator | undefined;

interface PermissionDetails {
  title: string;
  description: string;
}

const PERMISSION_DETAILS: Record<PermissionKind, PermissionDetails> = {
  camera: {
    title: 'Camera',
    description: 'Used to scan QR codes or capture images.',
  },
  microphone: {
    title: 'Microphone',
    description: 'Required for apps that capture audio.',
  },
  screenCapture: {
    title: 'Screen capture',
    description: 'Needed to record or share your screen.',
  },
  fileSystemAccess: {
    title: 'File system access',
    description: 'Allows selecting folders and saving files.',
  },
};

const mapPermissionState = (state: NavigatorPermissionState | undefined): PermissionState => {
  if (!state) return 'prompt';
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
};

export const getPermissionDetails = (kind: PermissionKind): PermissionDetails =>
  PERMISSION_DETAILS[kind];

type ExtendedPermissionDescriptor = PermissionDescriptor | { name: 'camera' | 'microphone' | 'file-system' };

const queryPermission = async (
  descriptor: ExtendedPermissionDescriptor,
): Promise<PermissionStatus | null> => {
  const navigatorRef = getNavigator();
  try {
    if (!navigatorRef?.permissions?.query) return null;
    return await navigatorRef.permissions.query(descriptor as PermissionDescriptor);
  } catch {
    return null;
  }
};

export const getPermissionStatus = async (kind: PermissionKind): Promise<PermissionState> => {
  try {
    const navigatorRef = getNavigator();
    const globalRef = getGlobalObject();

    switch (kind) {
      case 'camera': {
        if (!navigatorRef?.mediaDevices?.getUserMedia) return 'unsupported';
        const status = await queryPermission({ name: 'camera' });
        return mapPermissionState(status?.state as NavigatorPermissionState | undefined);
      }
      case 'microphone': {
        if (!navigatorRef?.mediaDevices?.getUserMedia) return 'unsupported';
        const status = await queryPermission({ name: 'microphone' });
        return mapPermissionState(status?.state as NavigatorPermissionState | undefined);
      }
      case 'screenCapture': {
        if (!navigatorRef?.mediaDevices?.getDisplayMedia) return 'unsupported';
        // Permissions API does not expose display capture yet.
        return 'prompt';
      }
      case 'fileSystemAccess': {
        if (!globalRef?.showOpenFilePicker && !globalRef?.showDirectoryPicker) {
          return 'unsupported';
        }
        const status = await queryPermission({ name: 'file-system' });
        return mapPermissionState(status?.state as NavigatorPermissionState | undefined);
      }
      default:
        return 'unsupported';
    }
  } catch {
    return 'denied';
  }
};

const stopStream = (stream: MediaStream | null | undefined) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // ignore
    }
  });
};

const ensureHandlePermission = async (handle: unknown): Promise<PermissionState> => {
  const permissionFn = (handle as { requestPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'> })?.requestPermission;
  if (typeof permissionFn !== 'function') return 'granted';
  try {
    const result = await permissionFn.call(handle, { mode: 'read' });
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
};

export const requestPermission = async (kind: PermissionKind): Promise<PermissionState> => {
  try {
    const navigatorRef = getNavigator();
    const globalRef = getGlobalObject();

    switch (kind) {
      case 'camera': {
        if (!navigatorRef?.mediaDevices?.getUserMedia) return 'unsupported';
        const stream = await navigatorRef.mediaDevices.getUserMedia({ video: true });
        stopStream(stream);
        return 'granted';
      }
      case 'microphone': {
        if (!navigatorRef?.mediaDevices?.getUserMedia) return 'unsupported';
        const stream = await navigatorRef.mediaDevices.getUserMedia({ audio: true });
        stopStream(stream);
        return 'granted';
      }
      case 'screenCapture': {
        if (!navigatorRef?.mediaDevices?.getDisplayMedia) return 'unsupported';
        const stream = await navigatorRef.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .catch(async () => navigatorRef.mediaDevices?.getDisplayMedia({ video: true }).catch(() => null));
        if (!stream) return 'denied';
        stopStream(stream);
        return 'granted';
      }
      case 'fileSystemAccess': {
        const directoryPicker = typeof globalRef?.showDirectoryPicker === 'function'
          ? await globalRef.showDirectoryPicker()
          : undefined;
        if (directoryPicker) {
          const status = await ensureHandlePermission(directoryPicker);
          if (status !== 'granted') return 'denied';
          return 'granted';
        }

        const filePicker = typeof globalRef?.showOpenFilePicker === 'function'
          ? await globalRef.showOpenFilePicker()
          : undefined;
        const handle = Array.isArray(filePicker) ? filePicker[0] : undefined;
        if (handle) {
          const status = await ensureHandlePermission(handle);
          if (status !== 'granted') return 'denied';
          return 'granted';
        }

        return 'unsupported';
      }
      default:
        return 'unsupported';
    }
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
      return 'denied';
    }
    return 'denied';
  }
};

export const checkPermissions = async (
  kinds: PermissionKind[],
): Promise<Record<PermissionKind, PermissionState>> => {
  const entries = await Promise.all(
    kinds.map(async (kind) => [kind, await getPermissionStatus(kind)] as const),
  );
  return Object.fromEntries(entries) as Record<PermissionKind, PermissionState>;
};

export const requestPermissions = async (
  kinds: PermissionKind[],
): Promise<Record<PermissionKind, PermissionState>> => {
  const result: Partial<Record<PermissionKind, PermissionState>> = {};
  for (const kind of kinds) {
    result[kind] = await requestPermission(kind);
  }
  return result as Record<PermissionKind, PermissionState>;
};
