'use client';

import { useEffect } from 'react';

const FileHandlerListener = () => {
  useEffect(() => {
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        for (const fileHandle of launchParams.files || []) {
          try {
            const file = await fileHandle.getFile();
            console.log('Received file:', file.name);
          } catch (err) {
            console.error('Failed to read file', err);
          }
        }
      });
    }
  }, []);

  return null;
};

export default FileHandlerListener;
