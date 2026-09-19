"use client";
import dynamic from "next/dynamic";

const RepositoryEditor = dynamic(() => import("../../apps/vscode"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center bg-[#1f1f1f] text-sm text-gray-300"
      role="status"
    >
      Opening repository workspace…
    </div>
  ),
});

// The editor owns its shortcuts, scoped to its focused window. No global listeners or external embeds.
export default function VsCodeWrapper() {
  return <RepositoryEditor />;
}
export const displayVsCode = () => <VsCodeWrapper />;
