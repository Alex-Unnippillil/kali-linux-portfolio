'use client';

import React from 'react';
import JsonPreviewer from './JsonPreviewer';
import TextPreviewer from './TextPreviewer';
import ImagePreviewer from './ImagePreviewer';
import LargeFilePreviewer from './LargeFilePreviewer';
import UnsupportedPreviewer from './UnsupportedPreviewer';
import { MAX_PREVIEW_SIZE } from './constants';

function Placeholder({ children }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-center text-gray-300 p-4">
      {children}
    </div>
  );
}

export default function FilePreviewPane({ currentFile, content, imageSrc, loading }) {
  if (loading) {
    return <Placeholder>Loading preview...</Placeholder>;
  }

  if (!currentFile) {
    return <Placeholder>Select a file to preview.</Placeholder>;
  }

  if (currentFile.tooLarge) {
    return <LargeFilePreviewer size={currentFile.size} limit={MAX_PREVIEW_SIZE} />;
  }

  switch (currentFile.previewType) {
    case 'json':
      return <JsonPreviewer content={content ?? ''} />;
    case 'text':
      return <TextPreviewer content={content ?? ''} />;
    case 'image':
      if (!imageSrc) {
        return <Placeholder>Preparing image preview...</Placeholder>;
      }
      return <ImagePreviewer src={imageSrc} alt={currentFile.name} />;
    default:
      return <UnsupportedPreviewer />;
  }
}
