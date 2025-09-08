import React from 'react';

export const MinimizeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="10" height="10" viewBox="0 0 10 10" {...props}>
    <rect x="1" y="5" width="8" height="1" fill="currentColor" />
  </svg>
);

export const MaximizeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="10" height="10" viewBox="0 0 10 10" {...props}>
    <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="10" height="10" viewBox="0 0 10 10" {...props}>
    <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
    <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export default { CloseIcon, MaximizeIcon, MinimizeIcon };
