import React from 'react';

const ExternalFrame = ({ src, title, allowlist = [], className = '' }) => {
  try {
    const origin = new URL(src).origin;
    if (!allowlist.includes(origin)) {
      return null;
    }
  } catch (e) {
    return null;
  }
  return (
    <iframe src={src} title={title} className={className} frameBorder="0" />
  );
};

export default ExternalFrame;
