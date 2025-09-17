'use client';

import type { SVGProps } from 'react';

const iconProps = (props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': 'true',
  ...props,
});

export const BackIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

export const ForwardIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
  </svg>
);

export const RefreshIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a6 6 0 1 1-4.24 10.24l-1.42 1.42A8 8 0 1 0 17.65 6.35z" />
  </svg>
);

export const LockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M12 2a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm3 9H9V7a3 3 0 0 1 6 0v4z" />
  </svg>
);

export const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v16h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h11v16z" />
  </svg>
);

export const BookmarkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z" />
  </svg>
);

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
  </svg>
);

export const IncognitoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(props)}>
    <path d="M21 9h-3l-2-4H8L6 9H3a1 1 0 0 0-1 1v1h3.18a3 3 0 0 1 5.64 0h1.36a3 3 0 0 1 5.64 0H22v-1a1 1 0 0 0-1-1zm-9 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
  </svg>
);
