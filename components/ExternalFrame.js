import React from 'react';
import apps from '../apps';

const ExternalFrame = React.forwardRef(({ appId, src, title, className = 'h-full w-full', ...props }, ref) => {
  const app = appId ? apps[appId] : null;
  const frameSrc = src || (app ? app.url : undefined);
  const frameTitle = title || (app ? app.title : undefined);

  return <iframe ref={ref} src={frameSrc} title={frameTitle} className={className} frameBorder="0" {...props} />;
});

ExternalFrame.displayName = 'ExternalFrame';

export default ExternalFrame;
