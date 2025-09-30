import { useId, useState } from 'react';

interface Resource {
  label: string;
  url: string;
}

interface Props {
  lines: string[];
  resources: Resource[];
  summary?: string;
}

export default function ExplainerPane({ lines, resources, summary }: Props) {
  const [keyPointsOpen, setKeyPointsOpen] = useState(true);
  const [learnMoreOpen, setLearnMoreOpen] = useState(true);

  const summaryHeadingId = useId();
  const keyPointsBaseId = useId();
  const learnMoreBaseId = useId();

  const keyPointsButtonId = `${keyPointsBaseId}-button`;
  const keyPointsPanelId = `${keyPointsBaseId}-panel`;
  const learnMoreButtonId = `${learnMoreBaseId}-button`;
  const learnMorePanelId = `${learnMoreBaseId}-panel`;

  const summaryText = summary ?? lines[0] ?? '';
  const keyPointItems = summary || !summaryText ? lines : lines.slice(1);

  return (
    <aside
      className="text-xs p-2 border-l border-ub-cool-grey overflow-auto h-full"
      aria-label="explainer pane"
    >
      {summaryText ? (
        <section aria-labelledby={summaryHeadingId} className="mb-4">
          <h2 id={summaryHeadingId} className="text-sm font-semibold mb-1">
            Summary
          </h2>
          <p>{summaryText}</p>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold">
          <button
            id={keyPointsButtonId}
            type="button"
            aria-expanded={keyPointsOpen}
            aria-controls={keyPointsPanelId}
            onClick={() => setKeyPointsOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <span>Key Points</span>
            <span aria-hidden="true">{keyPointsOpen ? '−' : '+'}</span>
          </button>
        </h2>
        <div
          id={keyPointsPanelId}
          role="region"
          aria-labelledby={keyPointsButtonId}
          hidden={!keyPointsOpen}
          className="mt-2 mb-4"
        >
          {keyPointItems.length > 0 ? (
            <ul className="list-disc list-inside">
              {keyPointItems.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>No key points available.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">
          <button
            id={learnMoreButtonId}
            type="button"
            aria-expanded={learnMoreOpen}
            aria-controls={learnMorePanelId}
            onClick={() => setLearnMoreOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <span>Learn More</span>
            <span aria-hidden="true">{learnMoreOpen ? '−' : '+'}</span>
          </button>
        </h2>
        <div
          id={learnMorePanelId}
          role="region"
          aria-labelledby={learnMoreButtonId}
          hidden={!learnMoreOpen}
          className="mt-2"
        >
          {resources.length > 0 ? (
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
          ) : (
            <p>No resources available.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

