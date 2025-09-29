"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import OnboardingOverlay, {
  useOnboardingProgress,
} from "./ui/OnboardingOverlay";

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

interface TipConfig {
  title: string;
  tips: string[];
  resources?: { label: string; url: string }[];
}

const TIP_MAP: Record<string, TipConfig> = {
  wireshark: {
    title: "Packet sleuth tips",
    tips: [
      "Drop the bundled PCAPs from the Samples menu to explore finished captures.",
      "The Filter Helper suggests display filters as you type — use it to learn syntax.",
      "Load a TLS key log to watch encrypted handshakes decode in real time.",
    ],
    resources: [
      {
        label: "Wireshark display filter reference",
        url: "https://www.wireshark.org/docs/dfref/",
      },
      {
        label: "Practical capture workflow",
        url: "https://wiki.wireshark.org/CaptureSetup",
      },
    ],
  },
  ghidra: {
    title: "Reverse engineering primer",
    tips: [
      "Try the sample binaries first — they are small and annotated for the lab.",
      "Switch engines if WebAssembly is blocked; the Capstone fallback still disassembles.",
      "Use the notes tabs to track findings; they persist between sessions.",
    ],
    resources: [
      {
        label: "Ghidra script hub",
        url: "https://ghidra.re/courses/",
      },
      {
        label: "Capstone quickstart",
        url: "http://www.capstone-engine.org/lang_python.html",
      },
    ],
  },
  "nmap-nse": {
    title: "Script lab pointers",
    tips: [
      "Start from the presets to see typical NSE script scaffolding.",
      "Simulated output highlights which arguments change behaviour.",
      "Use the notes panel to capture post-scan actions for blue team drills.",
    ],
    resources: [
      {
        label: "Nmap NSE reference",
        url: "https://nmap.org/book/nse.html",
      },
    ],
  },
  metasploit: {
    title: "Operator shortcuts",
    tips: [
      "Saved sessions are stored locally so you can resume your lab workflow.",
      "Toggle payload previews to understand what each module is simulating.",
      "Use the MITRE notes to map simulated findings to ATT&CK tactics.",
    ],
    resources: [
      {
        label: "Metasploit module docs",
        url: "https://docs.metasploit.com/",
      },
    ],
  },
  radare2: {
    title: "Radare2 workflow",
    tips: [
      "Load the sample analysis bundles to compare r2 and Ghidra perspectives.",
      "Use the graph view toggle to understand function relationships before decompiling.",
      "Export notes to share investigations between the simulated tools.",
    ],
    resources: [
      {
        label: "Radare2 book",
        url: "https://radare.gitbooks.io/radare2book/content/",
      },
    ],
  },
  volatility: {
    title: "Memory triage flow",
    tips: [
      "Start with the Profile Wizard to choose the correct image preset.",
      "Bookmark commands to build a repeatable hunt checklist.",
      "Use timeline mode to spot persistence or injection activity quickly.",
    ],
    resources: [
      {
        label: "Volatility Foundation",
        url: "https://www.volatilityfoundation.org/",
      },
    ],
  },
};

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const path = docPath || `/docs/apps/${appId}.md`;
  const [html, setHtml] = useState<string>("<p>Loading…</p>");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<() => void>(() => {});
  const { dismissed } = useOnboardingProgress(`help:${appId}`);

  useEffect(() => {
    if (!dismissed) {
      setIsOpen(true);
    }
  }, [dismissed]);

  const loadDoc = useCallback(async () => {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("not found");
      const md = await res.text();
      if (!md) throw new Error("empty");
      const rendered = DOMPurify.sanitize(marked.parse(md) as string);
      setHtml(rendered);
    } catch {
      setHtml("<p>No help available.</p>");
    }
  }, [path]);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadDoc().finally(() => setHasLoaded(true));
    }
  }, [isOpen, hasLoaded, loadDoc]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        toggleRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const tips = useMemo(() => TIP_MAP[appId], [appId]);

  const aside = tips ? (
    <div>
      <h3 className="text-sm font-semibold text-white">{tips.title}</h3>
      <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-gray-200">
        {tips.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      {tips.resources && (
        <div className="mt-3 space-y-1">
          {tips.resources.map((resource) => (
            <a
              key={resource.url}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs font-medium text-ub-orange hover:underline"
            >
              {resource.label}
            </a>
          ))}
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <OnboardingOverlay
      storageKey={`help:${appId}`}
      title="Help & onboarding"
      description="Lab docs, shortcuts, and the latest pro tips for this tool."
      defaultOpen
      align="end"
      dismissLabel="Close help"
      trigger={(controls) => {
        toggleRef.current = controls.toggle;
        return (
          <button
            type="button"
            aria-label="Help"
            aria-expanded={controls.isOpen}
            onClick={controls.toggle}
            className="fixed top-2 right-2 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-white shadow focus:outline-none focus:ring"
          >
            ?
          </button>
        );
      }}
      aside={aside}
      footer="Press ? to toggle this guide at any time."
      onOpenChange={setIsOpen}
    >
      <div
        className="prose prose-invert max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </OnboardingOverlay>
  );
}

