import dynamic from 'next/dynamic';
import React from 'react';

const ScreenshotApp = dynamic(() => import('../../../apps/screenshot'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Loading Screenshot...
    </div>
  ),
});

export default ScreenshotApp;

export const displayScreenshot = () => <ScreenshotApp />;
