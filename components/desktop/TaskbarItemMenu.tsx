import React, { useMemo, useRef, useState } from 'react';
import ContextMenu, { MenuItem } from '../common/ContextMenu';

interface TaskbarItemMenuProps {
  children: React.ReactElement;
  pinned?: boolean;
  onClose?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onMoveToDesktop?: () => void;
  onNewWindow?: () => void;
}

const noop = () => {};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
  } else {
    try {
      (ref as React.MutableRefObject<T>).current = value;
    } catch {
      // ignore refs we cannot assign to
    }
  }
}

const TaskbarItemMenu: React.FC<TaskbarItemMenuProps> = ({
  children,
  pinned = false,
  onClose = noop,
  onPin = noop,
  onUnpin = noop,
  onMoveToDesktop = noop,
  onNewWindow = noop,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const items = useMemo<MenuItem[]>(() => [
    { label: 'Close', onSelect: onClose },
    { label: pinned ? 'Unpin' : 'Pin', onSelect: pinned ? onUnpin : onPin },
    { label: 'Move to Desktop', onSelect: onMoveToDesktop },
    { label: 'New Window', onSelect: onNewWindow },
  ], [onClose, pinned, onPin, onUnpin, onMoveToDesktop, onNewWindow]);

  const child = React.Children.only(children) as React.ReactElement;

  const cloned = React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      assignRef(child.ref, node);
    },
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  });

  return (
    <>
      {cloned}
      <ContextMenu
        targetRef={triggerRef as React.RefObject<HTMLElement>}
        items={items}
        onOpenChange={setOpen}
      />
    </>
  );
};

export default TaskbarItemMenu;
