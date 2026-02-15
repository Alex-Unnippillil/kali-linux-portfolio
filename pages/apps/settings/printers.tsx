import dynamic from "next/dynamic";

const PrintersSettings = dynamic(
  () => import("../../../apps/settings/printers"),
  { ssr: false }
);

export default function PrintersPage() {
  return <PrintersSettings />;
}

