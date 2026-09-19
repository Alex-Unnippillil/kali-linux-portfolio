import dynamic from "next/dynamic";

const VSCode = dynamic(() => import("../../apps/vscode"), { ssr: false });
export default function VSCodePage() {
  return (
    <div className="h-dvh min-h-0">
      <VSCode />
    </div>
  );
}
