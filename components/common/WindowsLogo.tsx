'use client';

import React from 'react';

export type WindowsLogoProps = {
  className?: string;
  title?: string;
  ariaHidden?: boolean;
};

const DEFAULT_TITLE = 'Windows logo';

const WindowsLogo: React.FC<WindowsLogoProps> = ({
  className = '',
  title = DEFAULT_TITLE,
  ariaHidden = false,
}) => {
  const labelledProps = ariaHidden
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': title };

  return (
    <svg
      viewBox="0 0 24 24"
      focusable="false"
      className={className}
      {...labelledProps}
    >
      <path
        fill="currentColor"
        d="M2.5 4.5 12 3v8.5H2.5zm9.5-1.7L21.5 2v9.5H12zm-9.5 10H12V21L2.5 19.5zm9.5 0H21.5V22l-9.5-1.4z"
      />
    </svg>
  );
};

export default WindowsLogo;
