import dynamic from "next/dynamic";

const ClipboardSettings = dynamic(
  () => import("../../../apps/settings/components/ClipboardSettings"),
  { ssr: false },
);

export default function ClipboardSettingsPage() {
  return <ClipboardSettings />;
}
