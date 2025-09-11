import React from "react";
import dynamic from "next/dynamic";

const Ubuntu = dynamic(() => import("../components/screen/ubuntu"), {
  ssr: false,
});

export default function Home() {
  return <Ubuntu />;
}
