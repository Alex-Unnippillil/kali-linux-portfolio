import dynamic from "next/dynamic";
import { baseMetadata } from "../lib/metadata";

export const metadata = baseMetadata;

const Ubuntu = dynamic(() => import("../components/screen/ubuntu"), {
  ssr: false,
});

export default function Home() {
  return <Ubuntu />;
}

