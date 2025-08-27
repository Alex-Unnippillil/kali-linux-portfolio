import React from 'react';
import ToolApp from '../tool-app';

export default function GhidraApp() {
  return <ToolApp id="ghidra" />;
}

export const displayGhidra = () => <GhidraApp />;
