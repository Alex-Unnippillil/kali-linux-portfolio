import { ReactNode } from 'react';

type AdmonitionType = 'info' | 'note' | 'warning';

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
      className="h-5 w-5 text-blue-500"
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
    </svg>
  ),
  note: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5 text-emerald-500"
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
      className="h-5 w-5 text-amber-500"
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
  info: 'border-blue-500 bg-blue-500/10',
  note: 'border-emerald-500 bg-emerald-500/10',
  warning: 'border-amber-500 bg-amber-500/10',
};

export default function Admonition({ type = 'info', children }: Props) {
  return (
    <aside className={`my-4 flex items-start gap-4 rounded-md border-l-4 p-4 ${STYLES[type]}`}>
      <span className="mt-1 flex-shrink-0">{ICONS[type]}</span>
      <div className="[&>*:last-child]:mb-0">{children}</div>
    </aside>
  );
}

