'use client';

import React from 'react';
import PointerDraggable, { PointerDraggableProps } from '../../components/common/PointerDraggable';

type SafeDraggableProps = React.PropsWithChildren<PointerDraggableProps>;

export default function SafeDraggable({ children, ...props }: SafeDraggableProps) {
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  const child = React.Children.only(children);
  return (
    <PointerDraggable {...props}>
      {child}
    </PointerDraggable>
  );
}
