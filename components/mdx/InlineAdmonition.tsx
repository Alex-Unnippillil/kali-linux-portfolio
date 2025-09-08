import { ReactNode } from "react";

type AdmonitionType = "info" | "note" | "warning";

interface Props {
  type?: AdmonitionType;
  children: ReactNode;
}

const ICONS: Record<AdmonitionType, JSX.Element> = {
  info: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="10" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16v-4m0-4h.01"
      />
    </svg>
  ),
  note: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20h9M12 4h9M4 9h16M4 15h16"
      />
    </svg>
  ),
  warning: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86l-7.8 13.5A1 1 0 003.39 19h17.22a1 1 0 00.86-1.64l-7.8-13.5a1 1 0 00-1.72 0z"
      />
    </svg>
  ),
};

const STYLES: Record<AdmonitionType, string> = {
  info: "border-blue-500 bg-blue-500/10 text-blue-700",
  note: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-500 bg-amber-500/10 text-amber-700",
};

export default function InlineAdmonition({ type = "info", children }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-sm ${STYLES[type]}`}
    >
      {ICONS[type]}
      <span>{children}</span>
    </span>
  );
}
