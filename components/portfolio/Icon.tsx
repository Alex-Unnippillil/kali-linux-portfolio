import type { SVGProps } from 'react';

const paths = {
  terminal: 'm4 6 5 6-5 6m8 0h8',
  projects: 'M3 7h7l2 2h9v11H3V7Zm0 0V4h7l2 3',
  about: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  code: 'm8 5-6 7 6 7m8-14 6 7-6 7m-3-17-2 20',
  shield: 'm12 2 9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6l9-4Zm-4 10 3 3 5-6',
  mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
  search: 'M16 16l6 6M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
} as const;
export type IconName = keyof typeof paths;
export default function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
