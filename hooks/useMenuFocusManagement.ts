import { RefObject, useEffect, useRef } from 'react';
import useFocusTrap from './useFocusTrap';
import useRovingTabIndex from './useRovingTabIndex';

type Orientation = 'horizontal' | 'vertical';

type UseMenuFocusManagementOptions = {
  containerRef: RefObject<HTMLElement | null>;
  active: boolean;
  orientation?: Orientation;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Element to restore focus to when the menu closes. Useful when
   * the invoker is not tracked via a React ref, such as context
   * menus opened from pointer events.
   */
  restoreFocusElement?: HTMLElement | null;
  /**
   * Optional trigger ref used to restore focus when the menu closes.
   */
  triggerRef?: RefObject<HTMLElement | null>;
};

const useMenuFocusManagement = ({
  containerRef,
  active,
  orientation = 'vertical',
  initialFocusRef,
  restoreFocusRef,
  restoreFocusElement,
  triggerRef,
}: UseMenuFocusManagementOptions) => {
  const fallbackRestoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (restoreFocusRef?.current) {
      fallbackRestoreRef.current = restoreFocusRef.current;
      return;
    }

    if (triggerRef?.current) {
      fallbackRestoreRef.current = triggerRef.current;
      return;
    }

    if (restoreFocusElement) {
      fallbackRestoreRef.current = restoreFocusElement;
      return;
    }

    const previouslyFocused = document.activeElement;
    if (previouslyFocused instanceof HTMLElement) {
      fallbackRestoreRef.current = previouslyFocused;
    }
  }, [active, restoreFocusElement, restoreFocusRef, triggerRef]);

  const trapRestoreRef = restoreFocusRef ?? fallbackRestoreRef;

  useFocusTrap(containerRef, active, {
    initialFocusRef,
    restoreFocusRef: trapRestoreRef,
  });

  useRovingTabIndex(containerRef, active, orientation);
};

export default useMenuFocusManagement;
export type { UseMenuFocusManagementOptions };
