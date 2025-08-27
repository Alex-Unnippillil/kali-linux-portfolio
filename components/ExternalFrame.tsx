import React, { useEffect } from 'react';

const ALLOWLIST = ['vscode.dev', 'stackblitz.com'];

export interface ExternalFrameProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  src: string;
  prefetch?: boolean;
}

export default function ExternalFrame({ src, prefetch = true, ...props }: ExternalFrameProps) {
  let allowed = false;
  let origin = '';
  try {
    const url = new URL(src);
    origin = url.origin;
    const host = url.hostname;
    allowed = ALLOWLIST.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    allowed = false;
  }

  useEffect(() => {
    if (!allowed || !prefetch) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [allowed, origin, prefetch]);

  if (!allowed) return null;

  return <iframe src={src} {...props} />;
}
