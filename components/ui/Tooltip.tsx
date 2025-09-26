import React, {
  ReactElement,
  ReactNode,
  cloneElement,
  useId,
  useState,
} from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

const placementClasses: Record<TooltipPlacement, string> = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-3 top-1/2 -translate-y-1/2',
  right: 'left-full ml-3 top-1/2 -translate-y-1/2',
};

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  className = '',
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const id = useId();

  const childProps = children.props as Record<string, any>;

  const handleMouseEnter = (event: React.MouseEvent) => {
    childProps.onMouseEnter?.(event);
    if (!open) {
      setOpen(true);
      onOpenChange?.(true);
    }
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    childProps.onMouseLeave?.(event);
    if (open) {
      setOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleFocus = (event: React.FocusEvent) => {
    childProps.onFocus?.(event);
    if (!open) {
      setOpen(true);
      onOpenChange?.(true);
    }
  };

  const handleBlur = (event: React.FocusEvent) => {
    childProps.onBlur?.(event);
    if (open) {
      setOpen(false);
      onOpenChange?.(false);
    }
  };

  const tooltipClass = `pointer-events-none absolute z-50 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white shadow transition-opacity duration-150 ${
    placementClasses[placement]
  } ${open ? 'opacity-100' : 'opacity-0'}`.trim();

  return (
    <span className={`relative inline-flex ${className}`.trim()}>
      {cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
        'aria-describedby': open ? id : undefined,
      })}
      <span role="tooltip" id={id} className={tooltipClass} aria-hidden={!open}>
        {content}
      </span>
    </span>
  );
};

export default Tooltip;
