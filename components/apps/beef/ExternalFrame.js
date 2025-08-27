import React from 'react';

export default function ExternalFrame({ src, title }) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-full mt-4 border-0"
      loading="lazy"
    />
  );
}
