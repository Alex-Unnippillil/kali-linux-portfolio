import type { FC } from "react";

interface MediaIndicatorProps {
  action: string | null;
}

const MediaIndicator: FC<MediaIndicatorProps> = ({ action }) => {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`transition-opacity duration-200 ${action ? "opacity-100" : "opacity-0"}`}
      >
        {action && (
          <span className="inline-block rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg">
            {action}
          </span>
        )}
      </div>
    </div>
  );
};

export default MediaIndicator;
