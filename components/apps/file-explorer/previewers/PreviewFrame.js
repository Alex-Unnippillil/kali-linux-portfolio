'use client';

import React from 'react';

export default function PreviewFrame({ html, title }) {
  return (
    <iframe
      title={title}
      sandbox=""
      srcDoc={html}
      className="w-full h-full border-0 bg-black"
    />
  );
}
