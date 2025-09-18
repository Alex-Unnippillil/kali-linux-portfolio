import type { PropsWithChildren, SVGProps } from "react";

export interface IconCanvasProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /**
   * Size of the rendered icon. The internal grid always uses a 24x24 viewBox.
   */
  size?: number;
  /**
   * Optional background fill for the icon frame. Set to `null` to omit the frame entirely.
   */
  backgroundFill?: string | null;
  /**
   * Stroke color applied to the frame when `backgroundFill` is provided.
   */
  frameStroke?: string;
}

/**
 * Provides the canonical 24×24 grid with an optional rounded frame that
 * matches the icon linting rules (1.5px stroke, 4px corner radius, snapped to the grid).
 */
export function IconCanvas({
  children,
  size = 24,
  backgroundFill = null,
  frameStroke = "currentColor",
  ...rest
}: PropsWithChildren<IconCanvasProps>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      {backgroundFill ? (
        <rect
          x={1}
          y={1}
          width={22}
          height={22}
          rx={4}
          ry={4}
          fill={backgroundFill}
          stroke={frameStroke}
          strokeWidth={1.5}
        />
      ) : null}
      {children}
    </svg>
  );
}
