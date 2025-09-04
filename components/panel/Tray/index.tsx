"use client";

import Network from "./Network";
import Volume from "./Volume";
import Battery from "./Battery";

const Tray = () => (
  <div className="flex items-center">
    <Network />
    <Volume />
    <Battery />
  </div>
);

export default Tray;

