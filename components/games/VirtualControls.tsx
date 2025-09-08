"use client";

import React, { ReactNode } from 'react';
import useGameInput from '../../hooks/useGameInput';

/**
 * Renders a container for virtual on-screen controls. By default it does not
 * render any controls but exposes a slot for custom controls. It registers the
 * game input hook so keyboard users can still interact without touch/gamepad.
 */
interface Props {
  children?: ReactNode;
  game?: string;
}

export default function VirtualControls({ children, game }: Props) {
  useGameInput({ game });
  return <div className="virtual-controls">{children}</div>;
}
