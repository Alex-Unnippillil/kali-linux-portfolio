"use client";

import Image from "next/image";
import React from "react";

export type InstanceModeKeyword =
  | "single"
  | "single-instance"
  | "singleinstance"
  | "singleton"
  | "solo"
  | "exclusive"
  | "multi"
  | "multi-instance"
  | "multiinstance"
  | "multiple"
  | "parallel"
  | "unbounded"
  | "unlimited"
  | "dynamic"
  | "transient"
  | "per-window"
  | "perwindow"
  | "perinstance"
  | "per-instance";

export interface DesktopAppMetadata {
  id: string;
  title: string;
  icon?: string | React.ReactNode;
  /** Optional direct flag indicating multi-instance support. */
  supportsMultipleInstances?: boolean;
  /** Optional mode descriptor used by future desktop scheduling APIs. */
  instanceMode?: string;
  /** Optional legacy shape describing instance policy. */
  instance?: {
    mode?: string;
    supportsMultipleInstances?: boolean;
  };
  /** Optional behavior configuration that may include instance policies. */
  behavior?: {
    instanceMode?: string;
    supportsMultipleInstances?: boolean;
    instance?: {
      mode?: string;
      supportsMultipleInstances?: boolean;
    };
  };
  [key: string]: unknown;
}

const MULTI_INSTANCE_KEYWORDS: ReadonlySet<InstanceModeKeyword> = new Set<
  InstanceModeKeyword
>([
  "multi",
  "multi-instance",
  "multiinstance",
  "multiple",
  "parallel",
  "unbounded",
  "unlimited",
  "dynamic",
  "transient",
  "per-window",
  "perwindow",
  "perinstance",
  "per-instance",
]);

const SINGLE_INSTANCE_KEYWORDS: ReadonlySet<InstanceModeKeyword> = new Set<
  InstanceModeKeyword
>(["single", "single-instance", "singleinstance", "singleton", "solo", "exclusive"]);

function normalizeInstanceDescriptor(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function readBooleanFlag(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readMode(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeInstanceDescriptor(value) : undefined;
}

function resolveSupportsFlag(
  app: DesktopAppMetadata,
  override?: boolean,
): boolean | undefined {
  if (typeof override === "boolean") return override;

  const candidates: Array<boolean | undefined> = [
    readBooleanFlag(app.supportsMultipleInstances),
    readBooleanFlag(app.instance?.supportsMultipleInstances),
    readBooleanFlag(app.behavior?.supportsMultipleInstances),
    readBooleanFlag(app.behavior?.instance?.supportsMultipleInstances),
  ];

  return candidates.find((flag) => typeof flag === "boolean");
}

function resolveInstanceMode(app: DesktopAppMetadata): string | undefined {
  const candidates: Array<string | undefined> = [
    readMode(app.instanceMode),
    readMode(app.instance?.mode),
    readMode(app.behavior?.instanceMode),
    readMode(app.behavior?.instance?.mode),
  ];

  return candidates.find((mode) => typeof mode === "string");
}

export function canSpawnNewInstance(
  app: DesktopAppMetadata,
  override?: boolean,
): boolean {
  const explicit = resolveSupportsFlag(app, override);
  if (typeof explicit === "boolean") return explicit;

  const mode = resolveInstanceMode(app);
  if (!mode) return false;
  if (SINGLE_INSTANCE_KEYWORDS.has(mode)) return false;
  return MULTI_INSTANCE_KEYWORDS.has(mode);
}

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
        <span aria-hidden className="text-xl">
          {icon}
        </span>
      );
    }

    const src = normalizeIconSource(icon);
    return (
      <Image
        src={src}
        alt=""
        width={36}
        height={36}
        draggable={false}
        className="h-9 w-9 object-contain"
      />
    );
  }

  return null;
}

export interface DockItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  app: DesktopAppMetadata;
  isActive?: boolean;
  isRunning?: boolean;
  supportsMultipleInstances?: boolean;
  onActivate: (appId: string) => void;
  onRequestNewInstance?: (appId: string) => void;
}

const DockItem: React.FC<DockItemProps> = ({
  app,
  isActive = false,
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

  const indicatorVisible = isRunning || isActive;
  const combinedClassName = [
    "relative flex h-12 w-12 items-center justify-center rounded-md text-white transition-colors",
    "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type ?? "button"}
      aria-label={app.title}
      aria-pressed={isActive}
      {...buttonProps}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      className={combinedClassName}
    >
      {renderIcon(app.icon)}
      {indicatorVisible && (
        <span
          aria-hidden
          className={`absolute bottom-1 h-1 w-2 rounded-full ${
            isActive ? "bg-white" : "bg-white/70"
          }`}
        />
      )}
    </button>
  );
};

export default DockItem;
