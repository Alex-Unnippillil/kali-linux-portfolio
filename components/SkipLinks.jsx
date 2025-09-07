export default function SkipLinks() {
  return (
    <>
      <a
        href="#desktop"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
      >
        Skip to desktop
      </a>
      <a
        href="#app-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
      >
        Skip to app grid
      </a>
      <a
        href="#dock"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
      >
        Skip to dock
      </a>
    </>
  );
}

