"use client";

import { useState } from "react";
import Tabs from "../Tabs";
import usePersistentState from "../../hooks/usePersistentState";

const TABS = [
  { id: "display", label: "Display" },
  { id: "measurements", label: "Measurements" },
  { id: "appearance", label: "Appearance" },
  { id: "opacity", label: "Opacity" },
  { id: "items", label: "Items" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Preferences() {
  const [active, setActive] = useState<TabId>("display");

  const [size, setSize] = usePersistentState<number>("xfce.panel.size", 24);
  const [orientation, setOrientation] = usePersistentState<
    "top" | "bottom" | "left" | "right"
  >("xfce.panel.orientation", "top");
  const [length, setLength] = usePersistentState<number>(
    "xfce.panel.length",
    100,
  );
  const [opacity, setOpacity] = usePersistentState<number>(
    "xfce.panel.opacity",
    100,
  );
  const [autohide, setAutohide] = usePersistentState<boolean>(
    "xfce.panel.autohide",
    false,
  );

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} className="mb-4" />

      {/* Display */}
      <div role="tabpanel" hidden={active !== "display"} className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="panel-orientation">Orientation</label>
          <select
            id="panel-orientation"
            aria-label="Orientation"
            className="bg-ub-cool-grey"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as any)}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="panel-autohide">Autohide</label>
          <input
            id="panel-autohide"
            type="checkbox"
            aria-label="Autohide"
            checked={autohide}
            onChange={() => setAutohide(!autohide)}
          />
        </div>
      </div>

      {/* Measurements */}
      <div
        role="tabpanel"
        hidden={active !== "measurements"}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <label htmlFor="panel-size">Size</label>
          <input
            id="panel-size"
            type="number"
            aria-label="Panel size"
            className="w-20 bg-ub-cool-grey"
            min={16}
            max={128}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>
        <div className="flex items-center">
          <label htmlFor="panel-length">Length (%)</label>
          <input
            id="panel-length"
            type="range"
            aria-label="Panel length"
            min={10}
            max={100}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="ml-auto"
          />
          <span className="ml-2 w-10 text-right">{length}</span>
        </div>
      </div>

      {/* Appearance */}
      <div
        role="tabpanel"
        hidden={active !== "appearance"}
        className="space-y-4"
      >
        <p>No appearance settings available.</p>
      </div>

      {/* Opacity */}
      <div role="tabpanel" hidden={active !== "opacity"} className="space-y-4">
        <div className="flex items-center">
          <label htmlFor="panel-opacity">Opacity</label>
          <input
            id="panel-opacity"
            type="range"
            aria-label="Opacity"
            className="ml-auto"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
          <span className="ml-2 w-10 text-right">{opacity}%</span>
        </div>
      </div>

      {/* Items */}
      <div role="tabpanel" hidden={active !== "items"} className="space-y-4">
        <p>No item settings available.</p>
      </div>
    </div>
  );
}
