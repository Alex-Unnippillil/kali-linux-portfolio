import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import SmallArrow from "./small_arrow";
import { useSettings } from "../../hooks/useSettings";
import VolumeControl from "../ui/VolumeControl";

const joinClassNames = (...classes) => classes.filter(Boolean).join(" ");

const getElementWidth = (element) => {
  if (!element || typeof window === "undefined") return 0;
  const style = window.getComputedStyle(element);
  const marginLeft = Number.parseFloat(style.marginLeft) || 0;
  const marginRight = Number.parseFloat(style.marginRight) || 0;
  return element.offsetWidth + marginLeft + marginRight;
};

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);
  const containerRef = useRef(null);
  const overflowButtonRef = useRef(null);
  const overflowMenuRef = useRef(null);
  const itemRefs = useRef([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);

  useEffect(() => {
    const pingServer = async () => {
      if (!window?.location) return;
      try {
        const url = new URL("/favicon.ico", window.location.href).toString();
        await fetch(url, { method: "HEAD", cache: "no-store" });
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

  const networkIconSrc = online
    ? "/themes/Kali/panel/network-wireless-signal-good-symbolic.svg"
    : "/themes/Kali/panel/network-wireless-signal-none-symbolic.svg";

  const networkStatusTitle = online
    ? allowNetwork
      ? "Online"
      : "Online (requests blocked)"
    : "Offline";

  const statusItems = useMemo(() => {
    const items = [];

    items.push({
      key: "network",
      inline: (
        <span
          className="relative flex h-6 w-6 items-center justify-center"
          title={networkStatusTitle}
        >
          <Image
            width={16}
            height={16}
            src={networkIconSrc}
            alt={online ? "Device online" : "Device offline"}
            className="status-symbol h-4 w-4"
            sizes="16px"
          />
          {online && !allowNetwork && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </span>
      ),
      menu: (
        <div className="flex items-center gap-3">
          <Image
            width={18}
            height={18}
            src={networkIconSrc}
            alt={online ? "Device online" : "Device offline"}
            className="status-symbol h-5 w-5"
            sizes="18px"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-100">
              Network
            </span>
            <span className="text-[11px] text-ubt-grey text-opacity-80">
              {networkStatusTitle}
            </span>
          </div>
        </div>
      ),
    });

    items.push({
      key: "audio",
      inline: <VolumeControl className="pointer-events-auto" />,
      menu: (
        <div className="flex items-center gap-3">
          <Image
            width={18}
            height={18}
            src="/themes/Kali/panel/audio-volume-medium-symbolic.svg"
            alt="Audio volume"
            className="status-symbol h-5 w-5"
            sizes="18px"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-100">
              Audio
            </span>
            <span className="text-[11px] text-ubt-grey text-opacity-80">
              Use quick settings to adjust volume
            </span>
          </div>
        </div>
      ),
    });

    items.push({
      key: "battery",
      inline: (
        <span
          className="flex h-6 w-6 items-center justify-center"
          title="Battery status"
        >
          <Image
            width={16}
            height={16}
            src="/themes/Kali/panel/battery-good-symbolic.svg"
            alt="Battery level: good"
            className="status-symbol h-4 w-4"
            sizes="16px"
          />
        </span>
      ),
      menu: (
        <div className="flex items-center gap-3">
          <Image
            width={18}
            height={18}
            src="/themes/Kali/panel/battery-good-symbolic.svg"
            alt="Battery level: good"
            className="status-symbol h-5 w-5"
            sizes="18px"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-100">
              Battery
            </span>
            <span className="text-[11px] text-ubt-grey text-opacity-80">Good</span>
          </div>
        </div>
      ),
    });

    items.push({
      key: "notifications",
      inline: (
        <span
          className="flex h-6 w-6 items-center justify-center"
          title="Notifications"
        >
          <Image
            width={16}
            height={16}
            src="/themes/Kali/panel/emblem-system-symbolic.svg"
            alt="Notifications"
            className="status-symbol h-4 w-4"
            sizes="16px"
          />
        </span>
      ),
      menu: (
        <div className="flex items-center gap-3">
          <Image
            width={18}
            height={18}
            src="/themes/Kali/panel/emblem-system-symbolic.svg"
            alt="Notifications"
            className="status-symbol h-5 w-5"
            sizes="18px"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-100">
              Notifications
            </span>
            <span className="text-[11px] text-ubt-grey text-opacity-80">
              No new alerts
            </span>
          </div>
        </div>
      ),
    });

    return items;
  }, [allowNetwork, networkIconSrc, networkStatusTitle, online]);

  const itemCount = statusItems.length;

  useEffect(() => {
    setVisibleCount((current) => (current > itemCount ? itemCount : Math.max(current, 0)));
  }, [itemCount]);

  itemRefs.current = statusItems.map((_, index) => itemRefs.current[index] ?? null);

  const computeVisibleItems = useCallback(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;
    const availableWidth = container.clientWidth;
    const overflowWidth = getElementWidth(overflowButtonRef.current);

    let nextVisible = itemCount;

    for (let count = itemCount; count >= 0; count -= 1) {
      let totalWidth = 0;
      for (let index = 0; index < count; index += 1) {
        totalWidth += getElementWidth(itemRefs.current[index]);
      }
      if (count < itemCount) {
        totalWidth += overflowWidth;
      }

      if (totalWidth <= availableWidth || count === 0) {
        nextVisible = count;
        break;
      }
    }

    setVisibleCount((current) => (current !== nextVisible ? nextVisible : current));
  }, [itemCount]);

  useEffect(() => {
    computeVisibleItems();
  }, [computeVisibleItems, allowNetwork, networkStatusTitle, online]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      computeVisibleItems();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [computeVisibleItems]);

  useEffect(() => {
    if (!overflowOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        overflowMenuRef.current?.contains(target) ||
        overflowButtonRef.current?.contains(target)
      ) {
        return;
      }
      setOverflowOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOverflowOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [overflowOpen]);

  useEffect(() => {
    if (visibleCount === itemCount && overflowOpen) {
      setOverflowOpen(false);
    }
  }, [itemCount, overflowOpen, visibleCount]);

  const hiddenItems = statusItems.slice(visibleCount);

  const handleOverflowToggle = (event) => {
    event.stopPropagation();
    event.preventDefault();
    setOverflowOpen((prev) => !prev);
  };

  const handleOverflowKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOverflowToggle(event);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center">
      {statusItems.map((item, index) => {
        const isVisible = index < visibleCount;
        return (
          <div
            key={item.key}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className={joinClassNames(
              "mx-1.5 flex items-center justify-center",
              isVisible ? "relative opacity-100" : "opacity-0",
            )}
            style={
              isVisible
                ? undefined
                : {
                    position: "absolute",
                    visibility: "hidden",
                    pointerEvents: "none",
                  }
            }
            aria-hidden={!isVisible}
          >
            {item.inline}
          </div>
        );
      })}
      <button
        type="button"
        ref={overflowButtonRef}
        className={joinClassNames(
          "mx-1 flex h-6 w-6 items-center justify-center rounded transition",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue",
          visibleCount < itemCount ? "relative opacity-100" : "opacity-0",
        )}
        style={
          visibleCount < itemCount
            ? undefined
            : {
                position: "absolute",
                visibility: "hidden",
                pointerEvents: "none",
              }
        }
        aria-label="Show hidden status icons"
        aria-haspopup="menu"
        aria-expanded={overflowOpen}
        onClick={handleOverflowToggle}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={handleOverflowKeyDown}
        title="More status icons"
      >
        <SmallArrow angle={overflowOpen ? "up" : "down"} />
      </button>
      {overflowOpen && hiddenItems.length > 0 && (
        <div
          ref={overflowMenuRef}
          role="menu"
          aria-label="Hidden status icons"
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-md border border-black/40 bg-ub-cool-grey/95 px-3 py-2 text-xs text-white shadow-lg backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <ul className="space-y-3">
            {hiddenItems.map((item) => (
              <li key={item.key} role="none">
                <div role="menuitem" className="flex flex-col gap-1">
                  {item.menu}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
