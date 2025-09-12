"use client";

import SideBar from "../screen/side_bar";
import Taskbar from "../screen/taskbar";
import usePersistentState from "../../hooks/usePersistentState";

export type DockOrientation = "bottom" | "left";

/**
 * Dock component that renders either the bottom taskbar or the left sidebar
 * based on the persisted orientation setting.
 */
const Dock = (props: any) => {
  const [orientation] = usePersistentState<DockOrientation>(
    "dock-orientation",
    "bottom",
    (v): v is DockOrientation => v === "bottom" || v === "left",
  );

  return orientation === "left" ? <SideBar {...props} /> : <Taskbar {...props} />;
};

export default Dock;
