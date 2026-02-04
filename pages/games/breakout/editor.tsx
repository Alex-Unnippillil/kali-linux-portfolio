import dynamic from "next/dynamic";

const BreakoutEditor = dynamic(() => import("../../../components/apps/breakoutEditor"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BreakoutEditorPage() {
  return <BreakoutEditor />;
}
