import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { safeLocalStorage } from '../utils/safeStorage';

export const EDITOR_LAUNCH_STORAGE_KEY = 'apps-editor-launch-payload';

type LaunchQueueFileHandle = {
  getFile: () => Promise<File>;
};

type LaunchQueueParams = {
  files?: LaunchQueueFileHandle[];
};

type StoredLaunchFile = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string;
};

type LaunchPayload = {
  files: StoredLaunchFile[];
  openedAt: number;
};

const FileLaunchConsumer = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (router.pathname === '/share-target') return;

    const launchQueue = (window as unknown as {
      launchQueue?: { setConsumer?: (consumer: (params: LaunchQueueParams) => void) => void };
    }).launchQueue;

    const setConsumer = launchQueue?.setConsumer;
    if (typeof setConsumer !== 'function') return;

    const handleLaunch = async (launchParams: LaunchQueueParams) => {
      const handles = launchParams?.files ?? [];
      if (!handles.length) return;

      try {
        const results = await Promise.all(
          handles.map(async (handle) => {
            try {
              const file = await handle.getFile();
              const content = await file.text();

              return {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified,
                content,
              } as StoredLaunchFile;
            } catch (error) {
              console.error('Failed to read launched file', error);
              return null;
            }
          }),
        );

        const files = results.filter((item): item is StoredLaunchFile => Boolean(item));
        if (!files.length) return;

        const payload: LaunchPayload = {
          files,
          openedAt: Date.now(),
        };

        if (safeLocalStorage) {
          try {
            safeLocalStorage.setItem(EDITOR_LAUNCH_STORAGE_KEY, JSON.stringify(payload));
          } catch (storageError) {
            console.error('Failed to persist launched file payload', storageError);
          }
        }

        try {
          if (router.pathname === '/apps/editor') {
            await router.replace('/apps/editor');
          } else {
            await router.push('/apps/editor');
          }
        } catch (navigationError) {
          console.error('Failed to navigate to editor after file launch', navigationError);
        }
      } catch (error) {
        console.error('Error handling launched file queue', error);
      }
    };

    setConsumer(handleLaunch);
  }, [router, router.pathname]);

  return null;
};

export default FileLaunchConsumer;
