import dynamic from "next/dynamic";

const MouseSettings = dynamic(
  () => import("../../../../apps/settings/mouse"),
  { ssr: false, loading: () => <p>Loading...</p> }
);

export default function MouseSettingsPage() {
  return <MouseSettings />;
}

