import dynamic from "@/utils/dynamic";

const BreakoutEditor = dynamic(() => import("../../../games/breakout/editor"));

export default function BreakoutEditorPage() {
  return <BreakoutEditor />;
}

