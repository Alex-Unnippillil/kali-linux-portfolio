"use client";

import { forwardRef, useEffect, useState } from "react";
import type { HTMLAttributes } from "react";
import styles from "./Grid.module.css";

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Forces the grid into the breakpoint-based fallback regardless of browser
   * support. Useful for tests and debugging.
   */
  disableContainerQueries?: boolean;
}

let cachedSupport: boolean | null = null;

/**
 * Feature-detects CSS Container Query support. The result is cached for the
 * lifetime of the module to avoid recomputing DOM work on every render.
 */
export const supportsContainerQueries = (): boolean => {
  if (cachedSupport !== null) {
    return cachedSupport;
  }

  if (typeof window === "undefined") {
    return true;
  }

  const css = window.CSS;
  if (css && typeof css.supports === "function") {
    if (css.supports("container-type: inline-size") || css.supports("container: inline-size")) {
      cachedSupport = true;
      return true;
    }
  }

  if (typeof window.CSSContainerRule !== "undefined") {
    cachedSupport = true;
    return true;
  }

  cachedSupport = false;
  return false;
};

/**
 * Resets the cached detection value. Intended for tests only.
 */
export const resetContainerQuerySupportCache = () => {
  cachedSupport = null;
};

const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  { disableContainerQueries = false, className, children, ...rest },
  ref,
) {
  const [hasSupport, setHasSupport] = useState<boolean | null>(() =>
    disableContainerQueries ? false : null,
  );

  useEffect(() => {
    if (disableContainerQueries) {
      setHasSupport(false);
      return;
    }

    const next = supportsContainerQueries();
    setHasSupport((prev) => (prev === next ? prev : next));
  }, [disableContainerQueries]);

  const fallbackActive = disableContainerQueries || hasSupport === false;
  const status = disableContainerQueries
    ? "forced-fallback"
    : hasSupport === null
    ? "unknown"
    : hasSupport
    ? "supported"
    : "fallback";

  const mergedClassName = [
    styles.grid,
    fallbackActive ? styles.fallback : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={mergedClassName}
      data-container-queries={status}
      {...rest}
    >
      {children}
    </div>
  );
});

Grid.displayName = "AppGrid";

export default Grid;
