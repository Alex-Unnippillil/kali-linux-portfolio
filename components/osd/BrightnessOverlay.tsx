'use client';

import React from 'react';
import Image from 'next/image';

interface BrightnessOverlayProps {
  /** Brightness level from 0-100 */
  value: number;
}

const BrightnessOverlay: React.FC<BrightnessOverlayProps> = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-gray-800/90 text-white rounded-lg px-4 py-3 flex flex-col items-center w-40">
        <Image
          src="/themes/Yaru/status/display-brightness-symbolic.svg"
          alt="brightness"
          width={32}
          height={32}
          className="mb-2"
          sizes="32px"
        />
        <div className="w-full h-1.5 bg-gray-600 rounded">
          <div
            className="h-full bg-white rounded"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrightnessOverlay;

