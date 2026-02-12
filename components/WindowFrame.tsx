import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type {
  HTMLAttributes,
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  Ref,
} from 'react';

const isRolledValue = (value: string | null) => value === '' || value === 'true';

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
  } else {
    (ref as MutableRefObject<T | null>).current = value;
  }
};

const ensureBodyVisibility = (body: HTMLElement, rolled: boolean) => {
  body.hidden = rolled;
  if (rolled) {
    body.setAttribute('aria-hidden', 'true');
  } else {
    body.removeAttribute('aria-hidden');
  }
};

type WindowFrameProps = HTMLAttributes<HTMLDivElement>;

const WindowFrame = forwardRef<HTMLDivElement, WindowFrameProps>(
  ({ onDoubleClick, ...rest }, ref) => {
    const internalRef = useRef<HTMLDivElement | null>(null);

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    const applyRolledState = useCallback((rolled: boolean) => {
      const frame = internalRef.current;
      if (!frame) return;

      if (rolled) {
        frame.setAttribute('data-rolled', 'true');
      } else {
        frame.removeAttribute('data-rolled');
      }

      const body = frame.querySelector<HTMLElement>('[data-window-body]');
      if (body) {
        ensureBodyVisibility(body, rolled);
      }
    }, []);

    useEffect(() => {
      const frame = internalRef.current;
      if (!frame) return;
      const attr = frame.getAttribute('data-rolled');
      applyRolledState(isRolledValue(attr));
    }, [applyRolledState]);

    const handleDoubleClick = useCallback(
      (event: ReactMouseEvent<HTMLDivElement>) => {
        onDoubleClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        const frame = internalRef.current;
        if (!frame) return;

        const body = frame.querySelector<HTMLElement>('[data-window-body]');
        if (!body) return;

        const targetNode = event.target as Node | null;
        const targetElement = event.target instanceof Element ? event.target : null;

        if (targetElement?.closest('button, [role="button"]')) {
          return;
        }

        const header = frame.querySelector<HTMLElement>('[data-window-header]');
        if (header) {
          if (!targetNode || !header.contains(targetNode)) {
            return;
          }
        } else if (targetNode && body.contains(targetNode)) {
          return;
        }

        const attr = frame.getAttribute('data-rolled');
        const rolled = isRolledValue(attr);
        applyRolledState(!rolled);
      },
      [onDoubleClick, applyRolledState],
    );

    return <div {...rest} ref={setRef} onDoubleClick={handleDoubleClick} />;
  },
);

WindowFrame.displayName = 'WindowFrame';

export default WindowFrame;
