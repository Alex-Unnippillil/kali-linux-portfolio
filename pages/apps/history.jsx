import dynamic from "next/dynamic";

const HistoryApp = dynamic(() => import("../../apps/history"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function HistoryPage() {
  return <HistoryApp />;
}
