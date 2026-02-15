"use client";

export default function PrintersSettings() {
  const openCUPS = () => {
    window.open("http://localhost:631", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full h-full p-4 bg-ub-cool-grey text-ubt-grey">
      <p className="mb-4">
        Configure printers using your Linux distribution&apos;s tools or the CUPS
        web interface. This page provides information only and does not interact
        with the underlying operating system.
      </p>
      <button
        onClick={openCUPS}
        className="px-4 py-2 rounded bg-ub-grey text-white hover:bg-gray-600"
      >
        Open CUPS (localhost:631)
      </button>
    </div>
  );
}

