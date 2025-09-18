import type { SVGProps } from "react";

export interface GlyphProps extends Omit<SVGProps<SVGGElement>, "strokeWidth"> {
  strokeWidth?: number;
}

const DEFAULT_STROKE_WIDTH = 1.5;
const ROUND_CAP_PROPS = {
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * A reusable magnifying glass metaphor commonly used for search or discovery icons.
 */
export function MagnifierGlyph({ stroke = "currentColor", strokeWidth, ...rest }: GlyphProps) {
  const resolvedStrokeWidth = strokeWidth ?? DEFAULT_STROKE_WIDTH;
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth={resolvedStrokeWidth}
      {...ROUND_CAP_PROPS}
      {...rest}
    >
      <circle cx={10} cy={10} r={4} />
      <line x1={13.5} y1={13.5} x2={18} y2={18} />
    </g>
  );
}

/**
 * A shield badge that conveys protection or hardening metaphors.
 */
export function ShieldGlyph({ stroke = "currentColor", strokeWidth, ...rest }: GlyphProps) {
  const resolvedStrokeWidth = strokeWidth ?? DEFAULT_STROKE_WIDTH;
  return (
    <g fill="none" stroke={stroke} strokeWidth={resolvedStrokeWidth} {...ROUND_CAP_PROPS} {...rest}>
      <path d="M12 3.5 L17 5.5 V11.5 C17 14.5 14.5 17.5 12 18.5 C9.5 17.5 7 14.5 7 11.5 V5.5 Z" />
      <path d="M9.5 11.5 L11.5 13.5 L14.5 9.5" />
    </g>
  );
}

/**
 * Radar sweep pattern that implies scanning or detection.
 */
export function RadarGlyph({ stroke = "currentColor", strokeWidth, ...rest }: GlyphProps) {
  const resolvedStrokeWidth = strokeWidth ?? DEFAULT_STROKE_WIDTH;
  return (
    <g fill="none" stroke={stroke} strokeWidth={resolvedStrokeWidth} {...ROUND_CAP_PROPS} {...rest}>
      <circle cx={12} cy={12} r={7.5} />
      <path d="M12 12 L18 7.5" />
      <path d="M12 4.5 V12 H19.5" />
      <circle cx={16.5} cy={9} r={1.5} fill={stroke} stroke="none" />
    </g>
  );
}

/**
 * Terminal inspired glyph featuring a prompt chevron and cursor block.
 */
export function TerminalGlyph({ stroke = "currentColor", strokeWidth, ...rest }: GlyphProps) {
  const resolvedStrokeWidth = strokeWidth ?? DEFAULT_STROKE_WIDTH;
  return (
    <g fill="none" stroke={stroke} strokeWidth={resolvedStrokeWidth} {...ROUND_CAP_PROPS} {...rest}>
      <path d="M6.5 8.5 L10 12 L6.5 15.5" />
      <line x1={12.5} y1={15.5} x2={17.5} y2={15.5} />
      <rect x={5.5} y={5.5} width={13} height={13} rx={2} ry={2} />
    </g>
  );
}
