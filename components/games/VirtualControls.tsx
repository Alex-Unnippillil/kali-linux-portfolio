"use client";

import React from 'react';
import useGameInput from '../../hooks/useGameInput';

interface VirtualControlsProps {
  children?: React.ReactNode;
  game?: string;
}

/**
 * Renders a container for virtual on-screen controls. By default it does not
 * render any controls but exposes a slot for custom controls. It registers the
 * game input hook so keyboard users can still interact without touch/gamepad.
 */
export default function VirtualControls({ children, game }: VirtualControlsProps) {
  useGameInput({ game });
  return <div className="virtual-controls">{children}</div>;
}
