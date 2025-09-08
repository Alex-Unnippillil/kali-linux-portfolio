interface SectionDividerProps {
  className?: string;
}

export default function SectionDivider({ className = "" }: SectionDividerProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="h-6 w-full text-border"
        aria-hidden
      >
        <path d="M0 0 L50 10 L100 0 L100 10 L0 10 Z" fill="currentColor" />
      </svg>
    </div>
  );
}
