import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import SmallArrow from "./small_arrow";
import { useSettings } from "../../hooks/useSettings";
import VolumeControl from "../ui/VolumeControl";

const STATUS_ICON_ORDER = ["network", "audio", "battery", "notifications"];
const NON_NOTIFICATION_ICONS = STATUS_ICON_ORDER.filter((key) => key !== "notifications");
const MENU_ID = "status-overflow-menu";

export default function Status() {
  const { allowNetwork, largeHitAreas } = useSettings();
  const [online, setOnline] = useState(true);
  const [overflowKeys, setOverflowKeys] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const notificationsButtonRef = useRef(null);

  useEffect(() => {
    const pingServer = async () => {
      if (!window?.location) return;
      try {
        const url = new URL('/favicon.ico', window.location.href).toString();
        await fetch(url, { method: 'HEAD', cache: 'no-store' });
        setOnline(true);
      } catch (e) {
        setOnline(false);
      }
    };

    const updateStatus = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) {
        pingServer();
      }
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const recalculateOverflow = useCallback(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const { clientWidth } = container;
    const containerStyles = window.getComputedStyle(container);
    const gapValue = containerStyles.columnGap || containerStyles.gap || "0px";
    const gap = Number.parseFloat(gapValue) || 0;
    const rootStyles = window.getComputedStyle(document.documentElement);
    const hitAreaValue = rootStyles.getPropertyValue("--hit-area") || "32";
    const hitArea = Number.parseFloat(hitAreaValue) || 32;

    const totalSlots = Math.max(1, Math.floor((clientWidth + gap) / (hitArea + gap)));
    const availableForStatus = Math.max(0, totalSlots - 1);

    const nextOverflow =
      availableForStatus >= NON_NOTIFICATION_ICONS.length
        ? []
        : NON_NOTIFICATION_ICONS.slice(availableForStatus);

    setOverflowKeys((current) => {
      const isSameLength = current.length === nextOverflow.length;
      if (isSameLength && current.every((value, index) => value === nextOverflow[index])) {
        return current;
      }
      return nextOverflow;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    let frame = 0;
    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(recalculateOverflow);
    };

    handleResize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(handleResize);
      observer.observe(container);
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [recalculateOverflow]);

  useEffect(() => {
    recalculateOverflow();
  }, [recalculateOverflow, online, allowNetwork, largeHitAreas]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        notificationsButtonRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    if (!menu) return;

    const focusable = menu.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );

    const node = focusable instanceof HTMLElement ? focusable : menu;
    if (node instanceof HTMLElement) {
      node.focus({ preventScroll: true });
    }
  }, [menuOpen]);

  useEffect(() => {
    if (overflowKeys.length === 0 && menuOpen) {
      setMenuOpen(false);
    }
  }, [overflowKeys, menuOpen]);

  const overflowSet = useMemo(() => new Set(overflowKeys), [overflowKeys]);
  const visibleKeys = useMemo(
    () =>
      STATUS_ICON_ORDER.filter(
        (key) => key === "notifications" || !overflowSet.has(key),
      ),
    [overflowSet],
  );

  const networkTitle = online
    ? allowNetwork
      ? "Online"
      : "Online (requests blocked)"
    : "Offline";

  const batteryTitle = "Battery: Good";

  const labels = {
    network: "Network",
    audio: "Audio",
    battery: "Battery",
  };

  const descriptions = {
    network: networkTitle,
    audio: "Volume controls",
    battery: "Battery level good",
  };

  const renderNetworkIcon = (variant) => (
    <div
      key="network"
      className={`relative inline-flex items-center justify-center rounded-md border border-transparent text-white/90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue hit-area ${variant === "menu" ? "bg-white/10" : "hover:bg-white/10"}`.trim()}
      role="status"
      aria-label={networkTitle}
      aria-live="polite"
      tabIndex={variant === "menu" ? -1 : 0}
      title={networkTitle}
    >
      <Image
        width={16}
        height={16}
        src={
          online
            ? "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
            : "/themes/Yaru/status/network-wireless-signal-none-symbolic.svg"
        }
        alt={online ? "Online network status" : "Offline network status"}
        className="h-4 w-4"
        sizes="16px"
      />
      {!allowNetwork && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
      )}
    </div>
  );

  const renderBatteryIcon = (variant) => (
    <div
      key="battery"
      className={`relative inline-flex items-center justify-center rounded-md border border-transparent text-white/90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue hit-area ${variant === "menu" ? "bg-white/10" : "hover:bg-white/10"}`.trim()}
      role="status"
      aria-label={batteryTitle}
      tabIndex={variant === "menu" ? -1 : 0}
      title={batteryTitle}
    >
      <Image
        width={16}
        height={16}
        src="/themes/Yaru/status/battery-good-symbolic.svg"
        alt="Battery status"
        className="h-4 w-4"
        sizes="16px"
      />
    </div>
  );

  const renderVolumeControl = (variant) => (
    <VolumeControl
      key="audio"
      className={`hit-area justify-center ${variant === "menu" ? "bg-white/10 rounded-md" : ""}`.trim()}
    />
  );

  const renderToolbarIcon = (key) => {
    switch (key) {
      case "network":
        return renderNetworkIcon("toolbar");
      case "audio":
        return renderVolumeControl("toolbar");
      case "battery":
        return renderBatteryIcon("toolbar");
      default:
        return null;
    }
  };

  const renderMenuIcon = (key) => {
    switch (key) {
      case "network":
        return renderNetworkIcon("menu");
      case "audio":
        return renderVolumeControl("menu");
      case "battery":
        return renderBatteryIcon("menu");
      default:
        return null;
    }
  };

  const hasOverflow = overflowKeys.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center gap-1 text-white">
      {visibleKeys.map((key) => {
        if (key === "notifications") {
          return (
            <button
              key="notifications"
              ref={notificationsButtonRef}
              type="button"
              className={`relative inline-flex items-center justify-center rounded-md border border-transparent text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue transition-colors hit-area ${hasOverflow ? "hover:bg-white/10" : "hover:bg-white/5"}`.trim()}
              aria-haspopup="menu"
              aria-controls={MENU_ID}
              aria-expanded={menuOpen}
              title={hasOverflow ? "Open status menu" : "Notifications"}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <SmallArrow angle="down" />
              {hasOverflow && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-ub-orange" />
              )}
            </button>
          );
        }

        return renderToolbarIcon(key);
      })}

      {menuOpen && hasOverflow && (
        <div
          ref={menuRef}
          id={MENU_ID}
          role="menu"
          aria-label="Hidden status icons"
          tabIndex={-1}
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-md border border-black/30 bg-ub-cool-grey/95 p-3 text-xs text-white shadow-lg"
        >
          <ul className="space-y-3">
            {overflowKeys.map((key) => (
              <li key={key} role="none" className="flex items-center justify-between gap-3">
                <div className="max-w-[70%] text-[11px] uppercase tracking-wide text-gray-200">
                  <span className="block font-semibold text-white">{labels[key]}</span>
                  <span className="text-[10px] normal-case text-gray-100/80">
                    {descriptions[key]}
                  </span>
                </div>
                <div data-focusable="true">{renderMenuIcon(key)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
