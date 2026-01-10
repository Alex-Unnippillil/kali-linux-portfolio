interface Resource {
  label: string;
  url: string;
}

interface Props {
  lines?: string[];
  resources?: Resource[];
  isLoading?: boolean;
}

const skeletonBaseStyles =
  'bg-ub-grey/40 rounded motion-safe:animate-pulse motion-reduce:animate-none';

function SkeletonLine({ width }: { width: string }) {
  return <div className={`${skeletonBaseStyles} h-3 ${width}`} aria-hidden="true" />;
}

function SkeletonHeader({ width }: { width: string }) {
  return <div className={`${skeletonBaseStyles} h-4 ${width}`} aria-hidden="true" />;
}

export default function ExplainerPane({
  lines = [],
  resources = [],
  isLoading = false,
}: Props) {
  if (isLoading) {
    return (
      <aside
        className="text-xs p-2 border-l border-ub-cool-grey overflow-auto h-full"
        aria-label="explainer pane loading"
        aria-busy="true"
      >
        <div className="space-y-4" role="status" aria-live="polite">
          <section className="space-y-2">
            <SkeletonHeader width="w-24" />
            <ul className="list-none space-y-2">
              <li>
                <SkeletonLine width="w-5/6" />
              </li>
              <li>
                <SkeletonLine width="w-4/5" />
              </li>
              <li>
                <SkeletonLine width="w-3/4" />
              </li>
            </ul>
          </section>
          <section className="space-y-2">
            <SkeletonHeader width="w-20" />
            <ul className="list-none space-y-2">
              <li>
                <SkeletonLine width="w-2/3" />
              </li>
              <li>
                <SkeletonLine width="w-1/2" />
              </li>
            </ul>
          </section>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="h-full overflow-auto border-t border-ub-cool-grey p-2 text-xs lg:border-t-0 lg:border-l"
      aria-label="explainer pane"
    >
      <h3 className="font-bold mb-2">Key Points</h3>
      <ul className="list-disc list-inside mb-4">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      <h3 className="font-bold mb-2">Learn More</h3>
      <ul className="list-disc list-inside">
        {resources.map((r, i) => (
          <li key={i}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {r.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

