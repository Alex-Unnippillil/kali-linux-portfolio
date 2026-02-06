import React, { ReactNode } from 'react';
import TooltipController, {
  TooltipTriggerProps,
} from './TooltipController';

type DelayedTooltipProps = {
  content: ReactNode;
  children: (triggerProps: TooltipTriggerProps) => React.ReactElement;
  openDelay?: number;
  closeDelay?: number;
  longPressDelay?: number;
  surfaceClassName?: string;
};

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({
  content,
  children,
  openDelay,
  closeDelay,
  longPressDelay,
  surfaceClassName,
}) => {
  return (
    <TooltipController
      content={content}
      openDelay={openDelay}
      closeDelay={closeDelay}
      longPressDelay={longPressDelay}
      surfaceClassName={surfaceClassName}
    >
      {children}
    </TooltipController>
  );
};

export type { TooltipTriggerProps };
export default DelayedTooltip;
