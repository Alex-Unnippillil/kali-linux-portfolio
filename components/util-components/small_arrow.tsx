import React from 'react';

interface SmallArrowProps extends React.HTMLAttributes<HTMLDivElement> {
  angle?: 'up' | 'down' | 'left' | 'right';
}

export default function SmallArrow({ angle = 'up', className = '', ...rest }: SmallArrowProps): JSX.Element {
  return <div className={`arrow-custom-${angle} ${className}`.trim()} {...rest} />;
}
