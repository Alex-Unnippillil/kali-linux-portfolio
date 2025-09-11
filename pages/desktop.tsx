import dynamic from "next/dynamic";

const UbuntuScreen = dynamic(() => import("../components/screen/ubuntu"), {
  ssr: false,
});

export default function DesktopPage() {
  return <UbuntuScreen />;
}
