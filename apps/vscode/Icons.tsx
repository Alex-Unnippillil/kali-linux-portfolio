import type { SVGProps } from "react";
export type IconName =
  | "files"
  | "search"
  | "branch"
  | "code"
  | "chevron"
  | "folder"
  | "file"
  | "close"
  | "external"
  | "wrap"
  | "download"
  | "copy"
  | "sidebar"
  | "check";
const paths: Record<IconName, React.ReactNode> = {
  files: (
    <>
      <rect x="7" y="6" width="13" height="15" rx="1" />
      <path d="M16 6V2H3v15h4" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="4" r="2" />
      <circle cx="6" cy="20" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M6 6v12m0-4c8 0 12-2 12-7" />
    </>
  ),
  code: (
    <>
      <path d="m8 5-7 7 7 7m8-14 7 7-7 7m-3-17-2 20" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  folder: <path d="M3 6V4h7l3 3h8v13H3V6Z" />,
  file: (
    <>
      <path d="M5 2h9l5 5v15H5V2Z" />
      <path d="M14 2v6h5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  external: (
    <>
      <path d="M14 3h7v7M21 3 10 14" />
      <path d="M10 3H3v18h18v-7" />
    </>
  ),
  wrap: (
    <>
      <path d="M3 5h18M3 10h14a4 4 0 0 1 0 8h-5m2-3-3 3 3 3M3 15h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="1" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  sidebar: (
    <>
      <rect x="2" y="3" width="20" height="18" rx="1" />
      <path d="M8 3v18" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
};
export default function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
