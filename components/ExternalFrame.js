import React from 'react';
import { EXTERNAL_FRAME_ALLOWLIST } from '../external-allowlist';

/**
 * ExternalFrame is a wrapper around an iframe that ensures the provided URL
 * is explicitly allowlisted in `apps.config.js`. This prevents accidentally
 * embedding arbitrary third‑party content which may break the CSP or tests.
 */
const ExternalFrame = React.forwardRef(function ExternalFrame(
  { app, src, title, className, onLoad, ...rest },
  ref
) {
  const allowlist = EXTERNAL_FRAME_ALLOWLIST[app] || [];
  const isAllowed = allowlist.some((allowed) => src.startsWith(allowed));

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-ub-cool-grey text-white">
        URL blocked
      </div>
    );
  }

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className={className}
      onLoad={onLoad}
      frameBorder="0"
      {...rest}
    />
  );
});

export default ExternalFrame;
