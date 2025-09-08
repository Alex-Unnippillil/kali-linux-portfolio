"use client";

import { useEffect, useState } from "react";

// Simple panel widget that displays mock sensor information. The values are
// updated every few seconds to mimic changing hardware readings.
export default function Sensors() {
  const [cpuTemp, setCpuTemp] = useState(40);
  const [fanRpm, setFanRpm] = useState(1200);
  const [hddTemp, setHddTemp] = useState(35);

  useEffect(() => {
    const update = () => {
      // Generate mock values within a reasonable range
      setCpuTemp(30 + Math.round(Math.random() * 60)); // 30-90°C
      setFanRpm(1000 + Math.round(Math.random() * 3000)); // 1000-4000 RPM
      setHddTemp(25 + Math.round(Math.random() * 35)); // 25-60°C
    };

    update(); // initialize values on mount
    const id = setInterval(update, 3000);
    return () => clearInterval(id);
  }, []);

  const tempClass = (t: number) => {
    if (t >= 70) return "text-danger";
    if (t >= 50) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-ubt-grey">CPU Temp</span>
        <span className={tempClass(cpuTemp)}>{cpuTemp}&deg;C</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ubt-grey">Fan RPM</span>
        <span className="text-white">{fanRpm} RPM</span>
      </div>
      <div className="flex justify-between">
        <span className="text-ubt-grey">HDD Temp</span>
        <span className={tempClass(hddTemp)}>{hddTemp}&deg;C</span>
      </div>
    </div>
  );
}

