"use client";

import { useCallback } from "react";
import type { PropsWithChildren } from "react";

type FullscreenButtonProps = PropsWithChildren<{
  targetId: string;
  className?: string;
}>;

const FullscreenButton = ({
  targetId,
  className,
  children,
}: FullscreenButtonProps) => {
  const handleToggle = useCallback(async () => {
    if (typeof document === "undefined") {
      return;
    }

    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      return;
    }

    if (document.fullscreenElement === targetElement) {
      await document.exitFullscreen();
      return;
    }

    if (document.fullscreenElement && document.fullscreenElement !== targetElement) {
      await document.exitFullscreen();
    }

    await targetElement.requestFullscreen();
  }, [targetId]);

  return (
    <button type="button" onClick={handleToggle} className={className}>
      {children ?? "Toggle fullscreen"}
    </button>
  );
};

export default FullscreenButton;
