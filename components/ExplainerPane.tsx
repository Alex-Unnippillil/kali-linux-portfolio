import OnboardingOverlay from "./ui/OnboardingOverlay";

interface Resource {
  label: string;
  url: string;
}

interface Props {
  lines: string[];
  resources: Resource[];
  storageKey?: string;
  title?: string;
  defaultOpen?: boolean;
}

export default function ExplainerPane({
  lines,
  resources,
  storageKey = "explainer:lab",
  title = "Key lab takeaways",
  defaultOpen = true,
}: Props) {
  return (
    <OnboardingOverlay
      storageKey={storageKey}
      title={title}
      description="Keep this quick reference handy while you explore the lab workspace."
      defaultOpen={defaultOpen}
      align="end"
      dismissLabel="Let's build"
      footer="This note only auto-opens on your first visit."
      trigger={(controls) => (
        <button
          type="button"
          aria-label="Show lab explainer"
          onClick={controls.toggle}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-ub-orange px-3 py-2 text-xs font-semibold text-black shadow focus:outline-none focus:ring"
        >
          Lab guide
        </button>
      )}
    >
      <section className="space-y-4 text-sm text-gray-200">
        <div>
          <h3 className="text-base font-semibold text-white">Key Points</h3>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {lines.map((line, i) => (
              <li key={`${line}-${i}`}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Learn More</h3>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ub-orange hover:underline"
                >
                  {resource.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </OnboardingOverlay>
  );
}

