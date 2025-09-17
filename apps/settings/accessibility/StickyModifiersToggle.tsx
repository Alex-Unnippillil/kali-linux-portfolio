"use client";

import { useEffect, useState } from "react";
import ToggleSwitch from "@/components/ToggleSwitch";
import { useSettings } from "@/hooks/useSettings";
import {
  subscribeStickyModifierChanges,
  type ModifierKey,
} from "@/src/system/keyboard";

const formatLatched = (latched: ModifierKey[]) => {
  if (latched.length === 0) {
    return "No modifiers latched.";
  }
  return `Latched: ${latched.join(" + ")}`;
};

export default function StickyModifiersToggle() {
  const { stickyModifiers, setStickyModifiers } = useSettings();
  const [latched, setLatched] = useState<ModifierKey[]>([]);

  useEffect(() => {
    if (!stickyModifiers) {
      setLatched([]);
      return undefined;
    }

    const unsubscribe = subscribeStickyModifierChanges((state) => {
      setLatched(state.latched);
    });

    return () => {
      unsubscribe();
    };
  }, [stickyModifiers]);

  return (
    <div className="px-4 my-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="block text-ubt-grey font-medium">
            Sticky modifier keys
          </span>
          <p className="text-xs text-ubt-grey/80">
            Tap Shift, Ctrl, Alt, or Meta to latch the modifier for the next
            key press.
          </p>
        </div>
        <ToggleSwitch
          checked={stickyModifiers}
          onChange={setStickyModifiers}
          ariaLabel="Sticky modifier keys"
        />
      </div>
      {stickyModifiers && (
        <p className="mt-2 text-xs text-ubt-grey" role="status">
          {formatLatched(latched)}
        </p>
      )}
    </div>
  );
}

