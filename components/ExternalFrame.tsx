import React, { forwardRef } from 'react';
import { iframeAllowlist } from '../apps.config';

interface ExternalFrameProps
  extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  title: string;
  src: string;
  allow?: string;
}

const ExternalFrame = forwardRef<HTMLIFrameElement, ExternalFrameProps>(
  ({ title, src, allow, sandbox, ...rest }, ref) => {
    const isExternal = /^https?:\/\//.test(src);
    const allowed =
      !isExternal || iframeAllowlist.some((prefix) => src.startsWith(prefix));

    if (!allowed) return null;

    return (
      <iframe
        ref={ref}
        title={title}
        src={src}
        allow={allow}
        sandbox={sandbox ?? 'allow-scripts allow-same-origin'}
        {...rest}
      />
    );
  }
);

ExternalFrame.displayName = 'ExternalFrame';

export default ExternalFrame;

