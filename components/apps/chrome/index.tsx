import React from 'react';
import ExternalFrame from './ExternalFrame';

interface ChromeProps {
  src: string;
}

export default function Chrome({ src }: ChromeProps) {
  return (
    <ExternalFrame
      title="Google Chrome"
      src={src}
      allow="accelerometer; camera; microphone; gyroscope; clipboard-write"
    />
  );
}

export const displayChrome = ({ src }: { src: string }) => () => <Chrome src={src} />;

