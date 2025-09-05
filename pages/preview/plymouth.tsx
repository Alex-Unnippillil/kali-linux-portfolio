import React from 'react';

const PlymouthPreview: React.FC = () => {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-black">
      <div className="h-24 w-24 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
      <p className="mt-8 w-11/12 max-w-lg text-center text-sm text-gray-300">
        This mock splash screen mimics a Plymouth animation. To change Plymouth
        themes on a real system, run{' '}
        <code className="rounded bg-gray-800 px-1 py-0.5 text-xs text-gray-100">
          sudo update-alternatives --config default.plymouth
        </code>{' '} 
        and then rebuild your initramfs with{' '}
        <code className="rounded bg-gray-800 px-1 py-0.5 text-xs text-gray-100">
          sudo update-initramfs -u
        </code>
        .
      </p>
    </div>
  );
};

export default PlymouthPreview;
