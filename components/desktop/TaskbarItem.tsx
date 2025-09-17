"use client";

import Image from "next/image";
import React from "react";

import { canSpawnNewInstance, type DesktopAppMetadata } from "./DockItem";

function normalizeIconSource(icon: string): string {
  if (/^\.\.\//.test(icon)) {
    return icon.replace(/^\.\.\//, "/");
  }
  if (icon.startsWith("./")) {
    return icon.replace("./", "/");
  }
  return icon;
}

function isImageLike(icon: string): boolean {
  return (
    icon.startsWith("/") ||
    icon.startsWith("./") ||
    icon.startsWith("../") ||
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("data:") ||
    /\.[a-zA-Z0-9]+$/.test(icon)
  );
}

function renderIcon(icon: DesktopAppMetadata["icon"]): React.ReactNode {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;

  if (typeof icon === "string") {
    if (!isImageLike(icon)) {
      return (
        <span aria-hidden className="text-base">
          {icon}
        </span>
      );
    }

    const src = normalizeIconSource(icon);
    return (
      <Image
        src={src}
        alt=""
        width={28}
        height={28}
        draggable={false}
        className="h-7 w-7 object-contain"
      />
    );
  }

  return null;
}

export interface TaskbarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  app: DesktopAppMetadata;
  isFocused?: boolean;
  isMinimized?: boolean;
  isRunning?: boolean;
  supportsMultipleInstances?: boolean;
  onActivate: (appId: string) => void;
  onRequestNewInstance?: (appId: string) => void;
}

const TaskbarItem: React.FC<TaskbarItemProps> = ({
  app,
  isFocused = false,
  isMinimized = false,
  isRunning = false,
  supportsMultipleInstances,
  onActivate,
  onRequestNewInstance,
  className = "",
  onClick,
  onAuxClick,
  type,
  ...buttonProps
}) => {
  const allowsMultipleInstances = React.useMemo(
    () => canSpawnNewInstance(app, supportsMultipleInstances),
    [app, supportsMultipleInstances],
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onActivate(app.id);
      onClick?.(event);
    },
    [app.id, onActivate, onClick],
  );

  const handleAuxClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.button === 1) {
        event.preventDefault();
        event.stopPropagation();
        if (allowsMultipleInstances && onRequestNewInstance) {
          onRequestNewInstance(app.id);
        } else {
          onActivate(app.id);
        }
      }

      onAuxClick?.(event);
    },
    [allowsMultipleInstances, app.id, onActivate, onAuxClick, onRequestNewInstance],
  );

  const showIndicator = isRunning && !isFocused && !isMinimized;
  const combinedClassName = [
    "relative flex items-center gap-2 rounded-md px-3 py-1 text-sm text-white transition-colors",
    isFocused && !isMinimized ? "bg-white/20" : "bg-transparent",
    "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type ?? "button"}
      aria-label={app.title}
      aria-pressed={isFocused && !isMinimized}
      {...buttonProps}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      className={combinedClassName}
    >
      {renderIcon(app.icon)}
      <span className="whitespace-nowrap">{app.title}</span>
      {showIndicator && (
        <span
          aria-hidden
          className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-white/70"
        />
      )}
    </button>
  );
};

export default TaskbarItem;
