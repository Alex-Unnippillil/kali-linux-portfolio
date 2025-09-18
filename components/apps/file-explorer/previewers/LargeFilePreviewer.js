'use client';

import React from 'react';
import { formatSize } from './utils';

export default function LargeFilePreviewer({ size, limit }) {
  const formattedSize = formatSize(size);
  const formattedLimit = formatSize(limit);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-300 p-4">
      <p className="text-lg font-semibold">Too large to preview</p>
      <p className="mt-2 text-sm text-gray-400">
        {formattedSize && formattedLimit
          ? `This file is ${formattedSize}, which exceeds the ${formattedLimit} preview limit.`
          : 'This file exceeds the preview size limit.'}
      </p>
    </div>
  );
}
