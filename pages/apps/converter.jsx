import dynamic from "next/dynamic";

const Converter = dynamic(() => import("../../apps/converter"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function ConverterPage() {
  return <Converter />;
}
