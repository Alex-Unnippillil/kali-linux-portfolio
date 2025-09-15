import { ImageResponse } from 'next/og';
import { createElement, type CSSProperties } from 'react';

const ICON_DIMENSION = 256;
const LOGO_CHARACTER = 'K';
const LOGO_FONT_SCALE = 0.6;
const ICON_SIZES = [32, 48, 64, 128, 180, 192, 256, 512] as const;

export const size = {
  width: ICON_DIMENSION,
  height: ICON_DIMENSION,
};

export const contentType = 'image/png';

const containerStyle: CSSProperties = {
  alignItems: 'center',
  backgroundColor: '#000000',
  borderRadius: '15%',
  color: '#ffffff',
  display: 'flex',
  fontFamily: '"Ubuntu", "Segoe UI", sans-serif',
  fontSize: ICON_DIMENSION * LOGO_FONT_SCALE,
  fontWeight: 700,
  height: '100%',
  justifyContent: 'center',
  letterSpacing: '-0.04em',
  lineHeight: 1,
  width: '100%',
};

export default function Icon() {
  return new ImageResponse(
    createElement('div', { style: containerStyle }, LOGO_CHARACTER),
    {
      ...size,
    },
  );
}

export function generateImageMetadata() {
  return ICON_SIZES.map((iconSize) => ({
    contentType,
    size: { width: iconSize, height: iconSize },
  }));
}
