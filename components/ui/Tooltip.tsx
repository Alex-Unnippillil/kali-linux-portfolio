import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, id, className = '' }) => (
  <div id={id} role="tooltip" className={`tooltip ${className}`}>{children}</div>
);

export default Tooltip;

