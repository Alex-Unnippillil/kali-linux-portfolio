import dynamic from "@/utils/dynamic";

const Converter = dynamic(() => import("../../apps/converter"));

export default function ConverterPage() {
  return <Converter />;
}
