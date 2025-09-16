import { getPageMetadata } from '@/lib/metadata';
import dynamic from "next/dynamic";
export const metadata = getPageMetadata('/games/breakout/editor');

const BreakoutEditor = dynamic(() => import("../../../games/breakout/editor"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function BreakoutEditorPage() {
  return <BreakoutEditor />;
}

