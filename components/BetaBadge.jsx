export default function BetaBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return null;
  return (
    <button
      type="button"
      aria-label="Beta preview"
      className="beta-badge fixed bottom-4 right-4 inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-[var(--beta-badge-bg)] text-xs font-semibold text-[var(--beta-badge-fg)] shadow-md transition-colors duration-150 hover:bg-[var(--beta-badge-bg-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beta-badge-outline)] sm:min-w-0 sm:gap-2 sm:rounded sm:px-3 sm:py-1"
    >
      <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center text-[var(--beta-badge-icon)] sm:h-3.5 sm:w-3.5">
        <svg
          className="h-full w-full"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3.75 9.94 8.9l-5.19.38 3.98 3.25-1.26 5.01L12 15.69l4.53 1.85-1.26-5.01 3.98-3.25-5.19-.38L12 3.75Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="hidden text-[var(--beta-badge-fg)] sm:inline">Beta</span>
    </button>
  );
}
