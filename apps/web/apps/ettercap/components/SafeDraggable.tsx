'use client';

import React from 'react';
import Draggable from 'react-draggable';

type DraggableComponentProps = React.ComponentProps<typeof Draggable>;
type SafeDraggableProps = React.PropsWithChildren<DraggableComponentProps>;

export default function SafeDraggable({ children, ...props }: SafeDraggableProps) {
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  return <Draggable {...props}>{children}</Draggable>;
}
