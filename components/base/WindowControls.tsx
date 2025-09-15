"use client";

import NextImage from "next/image";
import { ReactNode, useMemo } from "react";
import useDocPiP from "../../hooks/useDocPiP";

interface WindowControlsProps {
  id: string;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximised: boolean;
  allowMaximize?: boolean;
  pip?: () => ReactNode;
}

const iconClass = "h-4 w-4 inline";
const controlClass =
  "mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6 transition-colors";

export default function WindowControls({
  id,
  minimize,
  maximize,
  close,
  isMaximised,
  allowMaximize = true,
  pip,
}: WindowControlsProps) {
  const pipRenderer = useMemo(() => pip ?? (() => null), [pip]);
  const { togglePin, isPinned } = useDocPiP(pipRenderer);
  const pipSupported =
    typeof window !== "undefined" &&
    "documentPictureInPicture" in window &&
    typeof pip === "function";

  const handleTogglePin = () => {
    if (pipSupported) {
      void togglePin();
    }
  };

  return (
    <div className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center h-11 min-w-[8.25rem]">
      {pipSupported && (
        <button
          type="button"
          className={controlClass}
          aria-label={isPinned ? "Unpin window" : "Pin window"}
          aria-pressed={isPinned}
          onClick={handleTogglePin}
        >
          <NextImage
            src="/themes/Yaru/window/window-pin-symbolic.svg"
            alt="Pin window"
            className={iconClass}
            width={16}
            height={16}
            sizes="16px"
          />
        </button>
      )}
      <button
        type="button"
        className={controlClass}
        aria-label="Minimize window"
        onClick={minimize}
      >
        <NextImage
          src="/themes/Yaru/window/window-minimize-symbolic.svg"
          alt="Minimize window"
          className={iconClass}
          width={16}
          height={16}
          sizes="16px"
        />
      </button>
      {allowMaximize && (
        <button
          type="button"
          className={controlClass}
          aria-label={isMaximised ? "Restore window" : "Maximize window"}
          aria-pressed={isMaximised}
          onClick={maximize}
        >
          <NextImage
            src={
              isMaximised
                ? "/themes/Yaru/window/window-restore-symbolic.svg"
                : "/themes/Yaru/window/window-maximize-symbolic.svg"
            }
            alt={isMaximised ? "Restore window" : "Maximize window"}
            className={iconClass}
            width={16}
            height={16}
            sizes="16px"
          />
        </button>
      )}
      <button
        type="button"
        id={`close-${id}`}
        className={`mx-1 cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center items-center h-6 w-6 transition-colors`}
        aria-label="Close window"
        onClick={close}
      >
        <NextImage
          src="/themes/Yaru/window/window-close-symbolic.svg"
          alt="Close window"
          className={iconClass}
          width={16}
          height={16}
          sizes="16px"
        />
      </button>
    </div>
  );
}
