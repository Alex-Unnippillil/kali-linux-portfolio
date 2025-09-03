import { useSettings } from '../hooks/useSettings';
import { buildAnalogyPrompt } from '../utils/agentPrompts';

interface Resource {
  label: string;
  url: string;
}

interface Props {
  lines: string[];
  resources: Resource[];
}

export default function ExplainerPane({ lines, resources }: Props) {
  const { simpleExplanations } = useSettings();
  const displayLines = simpleExplanations
    ? lines.map((l) => buildAnalogyPrompt(l, true))
    : lines;
  return (
    <aside
      className="text-xs p-2 border-l border-ub-cool-grey overflow-auto h-full"
      aria-label="explainer pane"
    >
      <h3 className="font-bold mb-2">Key Points</h3>
      <ul className="list-disc list-inside mb-4">
        {displayLines.map((line, i) => (
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

