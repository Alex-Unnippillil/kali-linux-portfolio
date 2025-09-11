import dynamic from "next/dynamic";

const BreakoutEditor = dynamic(() => import("../../../games/breakout/editor"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BreakoutEditorPage() {
  return <BreakoutEditor />;
}

