import dynamic from "next/dynamic";

const MouseSettings = dynamic(
  () => import("../../../../apps/settings/mouse"),
  { ssr: false }
);

export default function MouseSettingsPage() {
  return <MouseSettings />;
}

