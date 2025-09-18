import dynamic from "next/dynamic";

const DownloadSettings = dynamic(
  () => import("../../../apps/settings/downloads"),
  {
    ssr: false,
    loading: () => <p className="p-4 text-white">Loading download settings...</p>,
  },
);

export default function DownloadSettingsPage() {
  return <DownloadSettings />;
}

