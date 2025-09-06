"use client";

import { useEffect, useRef, useState } from "react";
import ToggleSwitch from "../../../components/ToggleSwitch";
import usePersistentState from "../../../hooks/usePersistentState";

export default function MouseSettings() {
  const [tapToClick, setTapToClick] = usePersistentState<boolean>(
    "mouse-tap-to-click",
    true,
    (v): v is boolean => typeof v === "boolean"
  );
  const [naturalScroll, setNaturalScroll] = usePersistentState<boolean>(
    "mouse-natural-scroll",
    false,
    (v): v is boolean => typeof v === "boolean"
  );
  const [disableWhileTyping, setDisableWhileTyping] = usePersistentState<boolean>(
    "mouse-disable-while-typing",
    true,
    (v): v is boolean => typeof v === "boolean"
  );

  const [clicked, setClicked] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  const handleTap = () => {
    if (disableWhileTyping && isTyping) return;
    if (tapToClick) {
      setClicked((c) => !c);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (disableWhileTyping && isTyping) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const delta = naturalScroll ? -e.deltaY : e.deltaY;
    el.scrollTop += delta;
  };

  const handleKeyDown = () => {
    if (!disableWhileTyping) return;
    setIsTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), 1000);
  };

  return (
    <div className="p-4 text-white text-sm space-y-6 select-none">
      <h1 className="text-lg font-bold">Mouse & Touchpad</h1>
      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <span>Tap to click</span>
          <ToggleSwitch
            checked={tapToClick}
            onChange={setTapToClick}
            ariaLabel="tap-to-click"
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Natural scroll</span>
          <ToggleSwitch
            checked={naturalScroll}
            onChange={setNaturalScroll}
            ariaLabel="natural-scroll"
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Disable while typing</span>
          <ToggleSwitch
            checked={disableWhileTyping}
            onChange={setDisableWhileTyping}
            ariaLabel="disable-while-typing"
          />
        </label>
      </div>
      <div>
        <p className="mb-2">Demo</p>
        <input
          type="text"
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
          className="w-full mb-3 p-1 rounded bg-ub-cool-grey text-white"
        />
        <div
          ref={scrollRef}
          onClick={handleTap}
          onWheel={handleWheel}
          className="h-40 overflow-y-scroll border border-ubt-cool-grey bg-ub-cool-grey p-2"
        >
          {[...Array(20)].map((_, i) => (
            <p key={i}>Scroll to see direction. Item {i + 1}</p>
          ))}
        </div>
        {tapToClick && (
          <div className="mt-2 text-center">
            {clicked ? "Tapped!" : "Tap the area above"}
          </div>
        )}
      </div>
    </div>
  );
}

