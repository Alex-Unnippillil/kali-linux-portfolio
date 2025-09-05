import dynamic from "next/dynamic";

const Tweaks = dynamic(() => import("../../apps/tweaks"), {
  ssr: false,
});

export const displayTweaks = () => <Tweaks />;

export default Tweaks;
