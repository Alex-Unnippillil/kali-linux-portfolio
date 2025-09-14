"use client";

import { useEffect, useState, type FC } from 'react';

/**
 * Listens for files opened via the PWA file handler and displays their contents.
 */
const FileHandlerListener: FC = () => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        const texts = await Promise.all(
          launchParams.files.map(async (fileHandle: any) => {
            const file = await fileHandle.getFile();
            return await file.text();
          })
        );
        setContent(texts.join('\n'));
      });
    }
  }, []);

  if (!content) return null;

  return <pre data-testid="file-content">{content}</pre>;
};

export default FileHandlerListener;

