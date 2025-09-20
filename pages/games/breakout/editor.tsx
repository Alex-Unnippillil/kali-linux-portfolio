import dynamic from "next/dynamic";
import { getAppSkeleton } from "../../components/app-skeletons";

const BreakoutEditor = dynamic(() => import("../../../games/breakout/editor"), {
  ssr: false,
  loading: () => getAppSkeleton('breakout', 'Breakout Editor'),
});

export default function BreakoutEditorPage() {
  return <BreakoutEditor />;
}

