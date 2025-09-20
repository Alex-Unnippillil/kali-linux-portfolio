'use client';

import { useCallback } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type FileSource =
  | File
  | FileSystemFileHandle
  | {
      name?: string;
      file?: File;
      handle?: FileSystemFileHandle;
      getFile?: () => Promise<File>;
    };

interface ShareButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  selectedFile: FileSource | null;
  children?: ReactNode;
}

const ShareButton = ({
  selectedFile,
  children = 'Share',
  className,
  disabled,
  ...rest
}: ShareButtonProps) => {
  const shareAvailable =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = useCallback(async () => {
    if (!shareAvailable || !selectedFile) return;

    const candidate = selectedFile as {
      file?: File;
      handle?: FileSystemFileHandle;
      getFile?: () => Promise<File>;
    };

    let file: File | null = null;

    if (selectedFile instanceof File) {
      file = selectedFile;
    } else if (candidate.file instanceof File) {
      file = candidate.file;
    } else if (candidate.handle && typeof candidate.handle.getFile === 'function') {
      try {
        const resolved = await candidate.handle.getFile();
        file = resolved instanceof File ? resolved : null;
      } catch (error) {
        console.error('Unable to access file handle for sharing.', error);
        return;
      }
    } else if (typeof candidate.getFile === 'function') {
      try {
        const resolved = await candidate.getFile();
        file = resolved instanceof File ? resolved : null;
      } catch (error) {
        console.error('Unable to read file for sharing.', error);
        return;
      }
    }

    if (!file) return;

    const shareData: ShareData = {
      files: [file],
      title: file.name,
    };

    if (typeof navigator.canShare === 'function') {
      let supported = false;
      try {
        supported = navigator.canShare(shareData);
      } catch (error) {
        console.warn('System share check failed for selected file.', error);
      }

      if (!supported) {
        console.warn('Sharing this file is not supported on this device.');
        return;
      }
    }

    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to share file.', error);
    }
  }, [selectedFile, shareAvailable]);

  const { type: buttonType = 'button', ...buttonProps } = rest;

  const isDisabled = disabled || !shareAvailable || !selectedFile;

  return (
    <button
      type={buttonType}
      className={className}
      onClick={handleShare}
      disabled={isDisabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
};

export default ShareButton;
