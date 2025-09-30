"use client";
import React, { useId, useRef } from "react";

type PointerState = {
  hadPointerInteraction: boolean;
  startX: number;
  startY: number;
  isScrollLike: boolean;
};

const DRAG_THRESHOLD = 12;

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  containerClassName?: string;
  ariaLabel?: string;
  label?: string;
  labelClassName?: string;
  caption?: string;
  captionClassName?: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  className = "",
  containerClassName = "",
  ariaLabel,
  label,
  labelClassName = "text-ubt-grey",
  caption,
  captionClassName = "text-xs text-ubt-grey opacity-80",
}: ToggleSwitchProps) {
  const labelId = useId();
  const captionId = useId();
  const pointerState = useRef<PointerState>({
    hadPointerInteraction: false,
    startX: 0,
    startY: 0,
    isScrollLike: false,
  });

  const resetPointerState = () => {
    pointerState.current.hadPointerInteraction = false;
    pointerState.current.isScrollLike = false;
    pointerState.current.startX = 0;
    pointerState.current.startY = 0;
  };

  const evaluateScrollIntent = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerState.current.hadPointerInteraction) return;

    const state = pointerState.current;
    const nativeEvent = event.nativeEvent as PointerEvent | undefined;
    const clientX =
      event.clientX ?? nativeEvent?.clientX ?? nativeEvent?.pageX ?? 0;
    const clientY =
      event.clientY ?? nativeEvent?.clientY ?? nativeEvent?.pageY ?? 0;

    const dx = clientX - state.startX;
    const dy = clientY - state.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const isVerticalScroll = absDy > absDx && absDy >= DRAG_THRESHOLD;

    if (isVerticalScroll) {
      state.isScrollLike = true;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const nativeEvent = event.nativeEvent as PointerEvent | undefined;
    pointerState.current.startX =
      event.clientX ?? nativeEvent?.clientX ?? nativeEvent?.pageX ?? 0;
    pointerState.current.startY =
      event.clientY ?? nativeEvent?.clientY ?? nativeEvent?.pageY ?? 0;
    pointerState.current.hadPointerInteraction = true;
    pointerState.current.isScrollLike = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    evaluateScrollIntent(event);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    evaluateScrollIntent(event);
  };

  const handlePointerCancel = () => {
    resetPointerState();
  };

  const handleWheel = (event: React.WheelEvent<HTMLButtonElement>) => {
    if (!pointerState.current.hadPointerInteraction) return;

    if (Math.abs(event.deltaY) >= DRAG_THRESHOLD) {
      pointerState.current.isScrollLike = true;
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const state = pointerState.current;

    if (state.hadPointerInteraction && state.isScrollLike) {
      event.preventDefault();
      resetPointerState();
      return;
    }

    onChange(!checked);
    resetPointerState();
  };

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={caption ? captionId : undefined}
      aria-label={label ? undefined : ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
      onClick={handleClick}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none ${
        checked ? "bg-ub-orange" : "bg-ubt-cool-grey"
      } ${className}`.trim()}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-ub-cool-grey transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  if (!label && !caption) {
    if (!containerClassName) {
      return button;
    }

    return <div className={`flex items-center gap-3 ${containerClassName}`.trim()}>{button}</div>;
  }

  return (
    <div className={`flex items-center gap-3 ${containerClassName}`.trim()}>
      <div className="flex flex-col">
        {label && (
          <span id={labelId} className={labelClassName}>
            {label}
          </span>
        )}
        {caption && (
          <span id={captionId} className={captionClassName}>
            {caption}
          </span>
        )}
      </div>
      {button}
    </div>
  );
}
