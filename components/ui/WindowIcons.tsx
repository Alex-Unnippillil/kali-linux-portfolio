import * as React from 'react';

export type WindowIconProps = React.SVGProps<SVGSVGElement>;

const baseProps: Partial<WindowIconProps> = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  focusable: 'false',
  'aria-hidden': 'true',
};

export const WindowMinimizeIcon = React.forwardRef<SVGSVGElement, WindowIconProps>(
  ({ width, height, ...rest }, ref) => (
    <svg ref={ref} {...baseProps} width={width ?? 16} height={height ?? 16} {...rest}>
      <rect x={3} y={8.5} width={10} height={1.5} rx={0.75} fill="currentColor" />
    </svg>
  ),
);
WindowMinimizeIcon.displayName = 'WindowMinimizeIcon';

export const WindowMaximizeIcon = React.forwardRef<SVGSVGElement, WindowIconProps>(
  ({ width, height, ...rest }, ref) => (
    <svg ref={ref} {...baseProps} width={width ?? 16} height={height ?? 16} {...rest}>
      <rect x={3.5} y={3.5} width={9} height={9} rx={1} stroke="currentColor" strokeWidth={1.2} />
    </svg>
  ),
);
WindowMaximizeIcon.displayName = 'WindowMaximizeIcon';

export const WindowRestoreIcon = React.forwardRef<SVGSVGElement, WindowIconProps>(
  ({ width, height, ...rest }, ref) => (
    <svg ref={ref} {...baseProps} width={width ?? 16} height={height ?? 16} {...rest}>
      <path
        d="M6 5.75h6.25c0.414 0 0.75 0.336 0.75 0.75v6.25H12V7.25H6.75V5.75z"
        fill="currentColor"
        opacity={0.75}
      />
      <rect x={3} y={6.5} width={7.5} height={7.5} rx={1} stroke="currentColor" strokeWidth={1.1} />
    </svg>
  ),
);
WindowRestoreIcon.displayName = 'WindowRestoreIcon';

export const WindowCloseIcon = React.forwardRef<SVGSVGElement, WindowIconProps>(
  ({ width, height, ...rest }, ref) => (
    <svg ref={ref} {...baseProps} width={width ?? 16} height={height ?? 16} {...rest}>
      <path
        d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </svg>
  ),
);
WindowCloseIcon.displayName = 'WindowCloseIcon';

export const WindowPinIcon = React.forwardRef<SVGSVGElement, WindowIconProps>(
  ({ width, height, ...rest }, ref) => (
    <svg ref={ref} {...baseProps} width={width ?? 16} height={height ?? 16} {...rest}>
      <path
        d="M9.75 2.75l3.5 3.5-2.12 2.12.87.88-2.12 2.12L7.4 10.49l-2.4 2.39-.99-.99 2.4-2.39-1.88-2.88 2.12-2.12 2.88 1.88 2.12-2.12z"
        fill="currentColor"
        opacity={0.9}
      />
      <path d="M7.83 7.83l-1.06 1.06" stroke="var(--window-control-pin-accent, currentColor)" strokeWidth={1} />
    </svg>
  ),
);
WindowPinIcon.displayName = 'WindowPinIcon';

export default {
  WindowMinimizeIcon,
  WindowMaximizeIcon,
  WindowRestoreIcon,
  WindowCloseIcon,
  WindowPinIcon,
};
