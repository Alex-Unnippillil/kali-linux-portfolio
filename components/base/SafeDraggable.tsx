'use client';

import { cloneElement, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import Draggable from 'react-draggable';
import type { DraggableProps } from 'react-draggable';

export type SafeDraggableProps = Partial<DraggableProps> & {
  children: ReactElement;
};

const getFallbackTransform = (position: SafeDraggableProps['position']) => {
  if (position) {
    return `translate(${position.x}px, ${position.y}px)`;
  }
  return null;
};

export default function SafeDraggable({
  children,
  nodeRef: externalNodeRef,
  ...rest
}: SafeDraggableProps) {
  const fallbackRef = useRef<HTMLElement | SVGElement | null>(null);
  const resolvedNodeRef = externalNodeRef ?? fallbackRef;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(true);
  }, []);

  const baseStyle = ((children.props as { style?: CSSProperties }).style ?? {}) as CSSProperties;

  if (!enabled) {
    const transform = getFallbackTransform(rest.position);
    const fallbackStyle: CSSProperties =
      transform == null
        ? baseStyle
        : {
            ...baseStyle,
            transform: baseStyle.transform
              ? `${baseStyle.transform} ${transform}`
              : transform,
          };

    return cloneElement(children, {
      ref: resolvedNodeRef,
      style: fallbackStyle,
    });
  }

  return (
    <Draggable {...rest} nodeRef={resolvedNodeRef}>
      {cloneElement(children, {
        ref: resolvedNodeRef,
        style: baseStyle,
      })}
    </Draggable>
  );
}
