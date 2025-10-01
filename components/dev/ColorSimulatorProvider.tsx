"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import ColorSimulator, { ColorSimulatorMode } from "./ColorSimulator";

type SimulatorContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  mode: ColorSimulatorMode;
  setMode: (mode: ColorSimulatorMode) => void;
};

const ColorSimulatorContext = createContext<SimulatorContextValue | undefined>(
  undefined,
);

const STORAGE_PREFIX = "devtools:color-sim";
const DEFAULT_MODE: ColorSimulatorMode = "deutan";

export function ColorSimulatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    `${STORAGE_PREFIX}:enabled`,
    false,
    (value): value is boolean => typeof value === "boolean",
  );
  const [mode, setMode] = usePersistentState<ColorSimulatorMode>(
    `${STORAGE_PREFIX}:mode`,
    DEFAULT_MODE,
    (value): value is ColorSimulatorMode =>
      value === "deutan" || value === "protan" || value === "tritan",
  );

  const [frameEnabled, setFrameEnabled] = useState(enabled);
  const [frameMode, setFrameMode] = useState<ColorSimulatorMode>(mode);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setFrameEnabled(enabled);
    });
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setFrameMode(mode);
    });
    return () => cancelAnimationFrame(id);
  }, [mode]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      mode,
      setMode,
    }),
    [enabled, setEnabled, mode, setMode],
  );

  return (
    <ColorSimulatorContext.Provider value={value}>
      <ColorSimulator active={frameEnabled} mode={frameMode}>
        {children}
      </ColorSimulator>
    </ColorSimulatorContext.Provider>
  );
}

export function useColorSimulator() {
  const context = useContext(ColorSimulatorContext);
  if (!context) {
    throw new Error(
      "useColorSimulator must be used within a ColorSimulatorProvider",
    );
  }
  return context;
}
