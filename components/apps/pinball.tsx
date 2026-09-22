import Pinball, { type PinballProps } from "../../apps/pinball";

export default function PinballApp(props: PinballProps) {
  return (
    <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.95))] p-2">
      <Pinball {...props} />
    </div>
  );
}
