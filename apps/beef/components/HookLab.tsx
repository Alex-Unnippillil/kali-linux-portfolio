'use client';

import React from 'react';

const localDemo = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <title>Sandboxed Target</title>\n</head>\n<body>\n  <h1>Sandboxed Target Page</h1>\n  <p>This page is isolated and cannot make network requests.</p>\n  <script>document.body.append(' - loaded');<\/script>\n</body>\n</html>`;

const HookLab: React.FC = () => {
  const beefUrl = process.env.NEXT_PUBLIC_BEEF_URL;
  const iframeProps = beefUrl
    ? { src: beefUrl }
    : { srcDoc: localDemo };
  return (
    <iframe
      title="Hook Lab"
      className="w-full h-48 border"
      {...iframeProps}
    />
  );
};

export default HookLab;
