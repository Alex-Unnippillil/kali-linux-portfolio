interface Resource {
  label: string;
  url: string;
}

interface Props {
  lines: string[];
  resources: Resource[];
}

export default function ExplainerPane({ lines, resources }: Props) {
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

