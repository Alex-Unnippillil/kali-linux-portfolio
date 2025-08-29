'use client';

interface Props {
  code: number;
  className?: string;
}

export default function WeatherIcon({ code, className = 'w-16 h-16' }: Props) {
  const base = className;
  // Simple mapping based on weather code groups with colored accents
  if (code === 0) {
    // clear sky
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${base} text-yellow-400`}
        fill="currentColor"
      >
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

  if (code >= 51 && code <= 67) {
    // rain
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${base} text-blue-400`}
        fill="currentColor"
      >
        <path d="M7 17a5 5 0 1 1 10 0H7Z" />
        <path d="M7 17a5 5 0 0 1 10 0H7Z" />
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
          <line x1="9" y1="19" x2="9" y2="23" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="15" y1="19" x2="15" y2="23" />
        </g>
      </svg>
    );
  }

  if (code >= 71 && code <= 86) {
    // snow
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${base} text-cyan-200`}
        fill="currentColor"
      >
        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" />
        <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (code >= 95) {
    // storm
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${base} text-purple-400`}
        fill="currentColor"
      >
        <path d="M7 14a5 5 0 1 1 10 0H7Z" />
        <polygon points="13 14 9 21 13 21 11 24 15 17 11 17 13 14" />
      </svg>
    );
  }

  // default: cloudy
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${base} text-gray-300`}
      fill="currentColor"
    >
      <path d="M5 16a7 7 0 0 1 14 0H5Z" />
    </svg>
  );
}

