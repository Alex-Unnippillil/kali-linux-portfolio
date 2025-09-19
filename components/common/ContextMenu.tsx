import React, {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export type CloseReason = 'escape' | 'pointer' | 'select' | 'programmatic';

interface AnchorPoint {
  x: number;
  y: number;
}

interface ContextMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  anchorPoint: AnchorPoint | null;
  onClose: (reason?: CloseReason) => void;
  label?: string;
  labelledBy?: string;
}

interface ContextMenuItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  onSelect?: () => void | Promise<void>;
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
  checked?: boolean;
}

interface MenuContextValue {
  close: (reason?: CloseReason) => void;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

export const ContextMenuContent = React.forwardRef<HTMLDivElement, ContextMenuContentProps>(
  (
    {
      open,
      anchorPoint,
      onClose,
      className = '',
      children,
      label,
      labelledBy,
      id,
      ...rest
    },
    forwardedRef
  ) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => menuRef.current as HTMLDivElement);

    const [position, setPosition] = useState<AnchorPoint>({ x: -9999, y: -9999 });
    const wasOpen = useRef(false);
    const lastCloseReason = useRef<CloseReason>('programmatic');

    const close = useCallback(
      (reason?: CloseReason) => {
        lastCloseReason.current = reason ?? 'programmatic';
        onClose?.(reason);
      },
      [onClose]
    );

    useFocusTrap(menuRef as React.RefObject<HTMLElement>, open);
    useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, open, 'vertical');

    useEffect(() => {
      if (open && !wasOpen.current) {
        window.dispatchEvent(new CustomEvent('context-menu-open'));
      } else if (!open && wasOpen.current) {
        window.dispatchEvent(
          new CustomEvent('context-menu-close', {
            detail: { reason: lastCloseReason.current },
          })
        );
        lastCloseReason.current = 'programmatic';
      }
      wasOpen.current = open;
    }, [open]);

    useLayoutEffect(() => {
      if (!open || !anchorPoint) return;
      const menu = menuRef.current;
      if (!menu) return;

      const OFFSET = 4;
      const { innerHeight, innerWidth } = window;

      // Ensure the menu is measured with up-to-date dimensions.
      menu.style.visibility = 'hidden';
      menu.style.left = `${anchorPoint.x}px`;
      menu.style.top = `${anchorPoint.y}px`;
      const rect = menu.getBoundingClientRect();

      let left = anchorPoint.x + OFFSET;
      let top = anchorPoint.y + OFFSET;

      if (left + rect.width > innerWidth) {
        left = anchorPoint.x - rect.width - OFFSET;
      }
      if (top + rect.height > innerHeight) {
        top = anchorPoint.y - rect.height - OFFSET;
      }

      left = Math.min(left, innerWidth - rect.width - OFFSET);
      top = Math.min(top, innerHeight - rect.height - OFFSET);
      left = Math.max(OFFSET, left);
      top = Math.max(OFFSET, top);

      setPosition({ x: left, y: top });
      menu.style.visibility = '';
    }, [open, anchorPoint?.x, anchorPoint?.y]);

    useEffect(() => {
      if (!open) return;

      const handlePointer = (event: MouseEvent) => {
        if (!menuRef.current?.contains(event.target as Node)) {
          close('pointer');
        }
      };

      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          window.dispatchEvent(
            new CustomEvent('context-menu-request-close', {
              detail: { reason: 'escape' },
            })
          );
          close('escape');
        }
      };

      document.addEventListener('mousedown', handlePointer);
      document.addEventListener('contextmenu', handlePointer);
      document.addEventListener('keydown', handleKey);

      return () => {
        document.removeEventListener('mousedown', handlePointer);
        document.removeEventListener('contextmenu', handlePointer);
        document.removeEventListener('keydown', handleKey);
      };
    }, [open, close]);

    useEffect(() => {
      if (!open) return;
      const firstFocusable = menuRef.current?.querySelector<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
      );
      firstFocusable?.focus();
    }, [open]);

    const providerValue = useMemo<MenuContextValue>(() => ({ close }), [close]);

    return (
      <MenuContext.Provider value={providerValue}>
        <div
          {...rest}
          id={id}
          ref={menuRef}
          role="menu"
          aria-hidden={!open}
          aria-label={label}
          aria-labelledby={labelledBy}
          className={`${open ? 'block ' : 'hidden '}cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm ${className}`.trim()}
          style={{ left: position.x, top: position.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </MenuContext.Provider>
    );
  }
);

ContextMenuContent.displayName = 'ContextMenuContent';

export const ContextMenuItem = React.forwardRef<HTMLButtonElement, ContextMenuItemProps>(
  (
    { onSelect, className = '', role = 'menuitem', checked, disabled, children, ...rest },
    ref
  ) => {
    const ctx = useContext(MenuContext);

    const handleSelect = useCallback(() => {
      if (disabled) return;
      const result = onSelect?.();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).finally(() => ctx?.close('select'));
      } else {
        ctx?.close('select');
      }
    }, [onSelect, ctx, disabled]);

    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        role={role}
        tabIndex={-1}
        aria-disabled={disabled ? 'true' : undefined}
        aria-checked={
          role === 'menuitemcheckbox' || role === 'menuitemradio' ? checked : undefined
        }
        disabled={disabled}
        className={`w-full text-left cursor-default py-1.5 px-4 mb-1 last:mb-0 hover:bg-gray-700 focus-visible:bg-gray-700 focus:outline-none ${disabled ? 'text-gray-400 hover:bg-transparent cursor-not-allowed' : ''} ${className}`.trim()}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          handleSelect();
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault();
            handleSelect();
          }
        }}
      >
        {children}
      </button>
    );
  }
);

ContextMenuItem.displayName = 'ContextMenuItem';

interface ContextMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ContextMenuSeparator: React.FC<ContextMenuSeparatorProps> = ({ className = '', ...rest }) => (
  <div
    {...rest}
    role="separator"
    className={`flex justify-center w-full ${className}`.trim()}
  >
    <div className="border-t border-gray-900 py-1 w-2/5" />
  </div>
);

interface ContextMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ContextMenuLabel: React.FC<ContextMenuLabelProps> = ({ className = '', children, ...rest }) => (
  <div
    {...rest}
    role="presentation"
    className={`px-4 pb-1 text-xs uppercase tracking-wide text-gray-400 ${className}`.trim()}
  >
    {children}
  </div>
);

const ContextMenu = {
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Label: ContextMenuLabel,
};

export default ContextMenu;

