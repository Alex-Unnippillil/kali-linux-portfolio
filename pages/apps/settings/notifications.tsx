import dynamic from "next/dynamic";

const NotificationsSettings = dynamic(
  () => import("../../../apps/settings/notifications"),
  { ssr: false }
);

export default function NotificationsSettingsPage() {
  return <NotificationsSettings />;
}
