"use client";

import React, { useState, forwardRef, type ReactNode } from "react";
import UbuntuCore from "../ubuntu";
import usePersistentState from "../../hooks/usePersistentState";
import { THEME_KEY, setTheme } from "../../utils/theme";

// Simple Safe Mode screen presented when boot fails
function SafeModeScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-2xl font-bold">Safe Mode</h1>
      <p className="max-w-md text-center">
        An error occurred before the desktop could load. Custom themes and panel
        profiles have been disabled.
      </p>
      <button onClick={onRetry} className="bg-ub-orange px-4 py-2 rounded">
        Return to Desktop
      </button>
    </div>
  );
}

class UbuntuErrorBoundary extends React.Component<
  { children: ReactNode; onError: (e: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (e: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default forwardRef<any, any>(function UbuntuScreen(props, ref) {
  const [safeMode, setSafeMode] = useState(false);
  const [, , , clearTheme] = usePersistentState<string>(THEME_KEY, "default");
  const [, , , clearProfiles] = usePersistentState<Record<string, unknown>>(
    "panel:profiles",
    {},
  );

  const handleError = (err: Error) => {
    // Remove custom theme and panel profile
    clearTheme();
    clearProfiles();
    try {
      window.localStorage.removeItem("panelLayout");
      window.localStorage.removeItem("pluginStates");
      setTheme("default");
    } catch {
      /* ignore storage errors */
    }
    setSafeMode(true);
    console.error("Boot error", err);
  };

  const retry = () => {
    setSafeMode(false);
    // Reload to attempt normal boot again
    try {
      window.location.reload();
    } catch {
      /* ignore reload issues */
    }
  };

  if (safeMode) return <SafeModeScreen onRetry={retry} />;

  return (
    <UbuntuErrorBoundary onError={handleError}>
      <UbuntuCore ref={ref} {...props} />
    </UbuntuErrorBoundary>
  );
});
