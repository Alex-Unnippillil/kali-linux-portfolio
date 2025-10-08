import React, { useCallback } from 'react';
import type { ComponentProps } from 'react';
import BaseWindow from '../base/window';

export type DesktopWindowProps = Omit<ComponentProps<typeof BaseWindow>, 'focus'>;

const DesktopWindow: React.FC<DesktopWindowProps> = ({ id, ...props }) => {
  const handleFocus = useCallback(
    (windowId: string) => {
      const targetId = windowId ?? id;
      if (!targetId) {
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('desktop-window-focus', {
            detail: { id: targetId },
          }),
        );
      }
    },
    [id],
  );

  return <BaseWindow {...props} id={id} focus={handleFocus} />;
};

DesktopWindow.displayName = 'DesktopWindow';

export default DesktopWindow;
