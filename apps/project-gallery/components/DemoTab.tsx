'use client';
import React, { useEffect, useState } from 'react';

interface DemoTabProps {
  src?: string;
}

const DemoTab: React.FC<DemoTabProps> = ({ src }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (src) {
      setUrl(src);
      return;
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramSrc = params.get('src');
      if (paramSrc) setUrl(paramSrc);
    }
  }, [src]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>No demo available.</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title="Project Demo"
      className="w-full h-full"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture"
    />
  );
};

export default DemoTab;
