import dynamic from "next/dynamic";

const RecentsView = dynamic(() => import("../../../apps/system/Recents"), {
  ssr: false,
});

export default function RecentsPage() {
  return <RecentsView />;
}

