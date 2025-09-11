import React, { useEffect, useState } from "react";

export default function GetKali() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const res = await fetch("/release.json");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.version === "string") {
          setVersion(data.version);
        }
      } catch {
        // ignore errors
      }
    };
    loadVersion();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        Get Kali
        {version && (
          <span className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded">
            {version}
          </span>
        )}
      </h1>
    </div>
  );
}
