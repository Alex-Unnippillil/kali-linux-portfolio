import React, { forwardRef } from 'react';

export interface ExternalFrameProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  src: string;
  title: string;
  allow?: string;
}

const ALLOWED_ORIGINS = [
  'https://www.google.com',
  'https://duckduckgo.com',
  'https://www.bing.com',
  'https://open.spotify.com',
  'https://stackblitz.com',
  'https://todoist.com',
  'https://ghbtns.com',
  'https://ghidra.app',
];

function isAllowed(url: string): boolean {
  try {
    const parsed = new URL(
      url,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );
    const origin = parsed.origin;
    if (typeof window !== 'undefined' && origin === window.location.origin) return true;
    return ALLOWED_ORIGINS.includes(origin);
  } catch {
    return false;
  }
}

const ExternalFrame = forwardRef<HTMLIFrameElement, ExternalFrameProps>(
  ({ src, title, allow, ...rest }, ref) => {
    if (!isAllowed(src)) {
      // eslint-disable-next-line no-console
      console.warn(`Blocked iframe navigation to non-allowlisted URL: ${src}`);
      return null;
    }

    return <iframe ref={ref} src={src} title={title} allow={allow} {...rest} />;
  }
);

ExternalFrame.displayName = 'ExternalFrame';
export default ExternalFrame;
