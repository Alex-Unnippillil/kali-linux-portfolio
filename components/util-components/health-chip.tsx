import React, { useEffect, useState } from "react";

type HealthResponse = {
  status: "ok" | "degraded" | "down";
  impactedFeatures?: string[];
};

const STATUS_STYLES: Record<HealthResponse["status"], string> = {
  ok: "bg-green-500 text-white",
  degraded: "bg-yellow-500 text-black",
  down: "bg-red-600 text-white",
};

const STATUS_LABELS: Record<HealthResponse["status"], string> = {
  ok: "OK",
  degraded: "Degraded",
  down: "Down",
};

export default function HealthChip() {
  const [status, setStatus] = useState<HealthResponse["status"]>("ok");
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data: HealthResponse = await res.json();
        if (!cancelled) {
          setStatus(data.status);
          setFeatures(data.impactedFeatures || []);
        }
      } catch {
        if (!cancelled) {
          setStatus("down");
          setFeatures([]);
        }
      }
    };

    fetchHealth();
    const id = setInterval(fetchHealth, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const title =
    features.length > 0 ? features.join(", ") : "All systems operational";

  return (
    <span
      className={`mx-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
      title={title}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
