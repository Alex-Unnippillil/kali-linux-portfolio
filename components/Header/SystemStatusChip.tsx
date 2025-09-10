"use client";

import React, { useEffect, useState } from "react";
import ia from "../../data/ia.json";

const STATUS_API = "https://status.kali.org/api/status-page/heartbeat/default";

type State = "green" | "amber" | "red";

export default function SystemStatusChip() {
  const [state, setState] = useState<State>("green");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(STATUS_API);
        const data = await res.json();
        const heartbeatList = data?.heartbeatList || {};
        const statuses = Object.values<any[]>(heartbeatList).map(
          (arr) => arr?.[0]?.status ?? 1,
        );
        const worst = Math.max(...(statuses.length ? statuses : [1]));
        setState(worst === 0 ? "red" : worst === 1 ? "green" : "amber");
      } catch {
        setState("amber");
      }
    };

    fetchStatus();
  }, []);

  const statusLink =
    (ia as any).footer.groups
      .flatMap((g: any) => g.items)
      .find((item: any) => item.label === "System Status")?.href || "#";

  const color =
    state === "green"
      ? "bg-green-500"
      : state === "amber"
        ? "bg-amber-500"
        : "bg-red-500";
  const label =
    state === "green"
      ? "Operational"
      : state === "amber"
        ? "Degraded"
        : "Outage";

  return (
    <a
      href={statusLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2 py-1 text-xs"
    >
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </a>
  );
}
