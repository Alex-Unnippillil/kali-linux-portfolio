import React, { useEffect, useRef, useState } from "react";
import Toast from "../ui/Toast";

interface OSDPayload {
  message: string;
  duration?: number;
}

export function showOSD(message: string, duration?: number) {
  window.dispatchEvent(
    new CustomEvent<OSDPayload>("osd", { detail: { message, duration } })
  );
}

export default function OSDManager() {
  const [payload, setPayload] = useState<(OSDPayload & { key: number }) | null>(
    null
  );
  const counter = useRef(0);

  useEffect(() => {
    const handler = (e: CustomEvent<OSDPayload>) => {
      counter.current += 1;
      setPayload({ ...e.detail, key: counter.current });
    };
    window.addEventListener("osd", handler as EventListener);
    return () => {
      window.removeEventListener("osd", handler as EventListener);
    };
  }, []);

  if (!payload) return null;
  return (
    <Toast
      key={payload.key}
      message={payload.message}
      duration={payload.duration}
      onClose={() => setPayload(null)}
    />
  );
}

