import React from 'react';
import appRegistry from '../utils/apps';

interface Props extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  appId?: string;
  src: string;
}

const isAllowed = (src: string, appId?: string): boolean => {
  if (!appId) return true;
  const entry = appRegistry[appId];
  if (!entry || !entry.url) return true;
  try {
    const allowedOrigin = new URL(entry.url, window.location.origin).origin;
    const srcOrigin = new URL(src, window.location.origin).origin;
    return allowedOrigin === '*' || allowedOrigin === srcOrigin;
  } catch {
    return false;
  }
};

const ExternalFrame: React.FC<Props> = ({ appId, src, title, className, ...rest }) => {
  if (!isAllowed(src, appId)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ub-cool-grey text-white">
        Blocked external content
      </div>
    );
  }
  return (
    <iframe
      src={src}
      title={title}
      className={className}
      frameBorder="0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      {...rest}
    />
  );
};

export default ExternalFrame;
