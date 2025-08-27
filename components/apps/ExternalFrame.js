import React from 'react';

export default function ExternalFrame({ src, title }) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-full bg-ub-cool-grey"
      sandbox="allow-same-origin allow-scripts"
    />
  );
}
