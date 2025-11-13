import dynamic from "next/dynamic";

const DataConverter = dynamic(() => import("../../apps/data-converter"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function DataConverterPage() {
  return <DataConverter />;
}
