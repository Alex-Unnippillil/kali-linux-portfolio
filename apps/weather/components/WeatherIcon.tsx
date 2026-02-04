'use client';

interface Props {
  code: number;
  className?: string;
  tone?: 'clear' | 'partly' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';
}

const getToneFromCode = (
  code: number,
): NonNullable<Props['tone']> => {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95) return 'thunder';
  return 'overcast';
};

const toneColors: Record<NonNullable<Props['tone']>, string> = {
  clear: 'var(--kali-control)',
  partly: 'color-mix(in_srgb,var(--kali-control)_70%,var(--kali-text))',
  overcast: 'color-mix(in_srgb,var(--kali-text)_85%,transparent)',
  fog: 'color-mix(in_srgb,var(--kali-text)_70%,transparent)',
  drizzle: 'color-mix(in_srgb,var(--kali-control)_60%,var(--kali-text))',
  rain: 'color-mix(in_srgb,var(--kali-control)_75%,var(--kali-text))',
  snow: 'color-mix(in_srgb,var(--kali-text)_90%,white)',
  thunder: 'color-mix(in_srgb,var(--kali-control)_85%,var(--kali-text))',
};

export default function WeatherIcon({
  code,
  className = 'w-16 h-16',
  tone,
}: Props) {
  const resolvedTone = (tone ?? getToneFromCode(code)) as NonNullable<
    Props['tone']
  >;
  const baseProps = {
    viewBox: '0 0 24 24',
    className,
    fill: 'currentColor',
    'aria-hidden': true,
    focusable: 'false',
    style: { color: toneColors[resolvedTone] ?? 'var(--kali-text)' },
  } as const;

  if (resolvedTone === 'clear') {
    return (
      <svg {...baseProps}>
        <circle cx="12" cy="12" r="5" />
        <g stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
        </g>
      </svg>
    );
  }

  if (resolvedTone === 'drizzle' || resolvedTone === 'rain') {
    return (
      <svg {...baseProps}>
        <path d="M7 16a5 5 0 1 1 10 0H7Z" />
        <g
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        >
          <line x1="9" y1="18.5" x2="9" y2="22" />
          <line x1="12" y1="18.5" x2="12" y2="22" />
          <line x1="15" y1="18.5" x2="15" y2="22" />
        </g>
      </svg>
    );
  }

  if (resolvedTone === 'snow') {
    return (
      <svg {...baseProps}>
        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" />
        <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (resolvedTone === 'thunder') {
    return (
      <svg {...baseProps}>
        <path d="M7 14a5 5 0 1 1 10 0H7Z" />
        <polygon points="13 14 9 21 13 21 11 24 15 17 11 17 13 14" />
      </svg>
    );
  }

  if (resolvedTone === 'fog') {
    return (
      <svg {...baseProps}>
        <path d="M5 14a7 7 0 0 1 14 0H5Z" />
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          <line x1="4" y1="18" x2="20" y2="18" />
          <line x1="6" y1="21" x2="18" y2="21" />
        </g>
      </svg>
    );
  }

  if (resolvedTone === 'partly') {
    return (
      <svg {...baseProps}>
        <circle cx="8" cy="9" r="4" />
        <path d="M8 17a5 5 0 1 1 10 0H8Z" />
      </svg>
    );
  }

  return (
    <svg {...baseProps}>
      <path d="M5 16a7 7 0 0 1 14 0H5Z" />
    </svg>
  );
}
