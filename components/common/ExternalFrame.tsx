import React, { forwardRef } from 'react';
import ErrorBoundary from './ErrorBoundary';

type Props = React.IframeHTMLAttributes<HTMLIFrameElement>;

const ExternalFrame = forwardRef<HTMLIFrameElement, Props>((props, ref) => (
  <ErrorBoundary>
    <iframe ref={ref} {...props} />
  </ErrorBoundary>
));

ExternalFrame.displayName = 'ExternalFrame';

export default ExternalFrame;
