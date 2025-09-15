import type { TutorialStep } from '../../HelpOverlay';

type TutorialDefinition = {
  title: string;
  steps: TutorialStep[];
};

const tutorials: Record<string, TutorialDefinition> = {
  repeater: {
    title: 'HTTP Repeater tutorial',
    steps: [
      {
        title: 'Search the simulated data lake',
        body: 'Use the global search to filter Suricata, Zeek, Sigma, YARA, and MITRE fixtures without leaving the browser. Every result is loaded from local JSON so no outbound traffic is ever generated.',
        selector: '[data-tutorial="global-search"]',
      },
      {
        title: 'Assemble copy-only commands',
        body: 'The repeater form mirrors a curl builder. Populate target and options to generate a command you can copy for later lab work. The portfolio never executes requests on your behalf.',
        selector: '[data-tutorial="tab-repeater"]',
        tip: 'Paste the rendered command into your own isolated environment when you are ready to run a real scan.',
      },
      {
        title: 'Keep lab context close',
        body: 'Use the resources panel for links to official methodology guides. They reinforce that everything here is a learning aid, not a live exploit surface.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
  suricata: {
    title: 'Suricata log review',
    steps: [
      {
        title: 'Filter before you dig in',
        body: 'Start with the global search to narrow results to an IP, signature, or technique. Because the data is static, queries are instant and safe for demos.',
        selector: '[data-tutorial="global-search"]',
      },
      {
        title: 'Inspect canned alerts',
        body: 'Scroll through the Suricata pane to see alert JSON loaded from fixtures/suricata.json. These samples explain how detections are structured without touching live sensors.',
        selector: '[data-tutorial="tab-suricata"]',
      },
      {
        title: 'Reference best practices',
        body: 'The resource column links out to NIST SP 800-115 and the OWASP Testing Guide so you always validate actions against authorized procedures.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
  zeek: {
    title: 'Zeek telemetry walk-through',
    steps: [
      {
        title: 'Find interesting records fast',
        body: 'Use the search bar to slice the Zeek dataset by host, URI, or protocol. It operates entirely on your local copy of fixtures/zeek.json.',
        selector: '[data-tutorial="global-search"]',
      },
      {
        title: 'Review session metadata',
        body: 'Each entry in the Zeek pane is a static log so you can teach parsing and triage techniques without connecting to a network sensor.',
        selector: '[data-tutorial="tab-zeek"]',
      },
      {
        title: 'Stay grounded in lab-only use',
        body: 'Keep the methodology links nearby when explaining how these flows fit into a full investigation.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
  sigma: {
    title: 'Sigma explorer',
    steps: [
      {
        title: 'Search signatures instantly',
        body: 'Enter keywords or tactics in the search bar to filter the local Sigma ruleset. Nothing leaves your browser while you explore detections.',
        selector: '[data-tutorial="global-search"]',
      },
      {
        title: 'Read translated rules',
        body: 'The Sigma pane shows static YAML content so analysts can learn field mappings and severity levels without uploading to a SIEM.',
        selector: '[data-tutorial="tab-sigma"]',
        tip: 'Encourage students to copy snippets into their own rule repositories for further experimentation.',
      },
      {
        title: 'Reinforce ethical usage',
        body: 'Point back to the resource links to reiterate that these exercises are for sanctioned environments only.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
  yara: {
    title: 'YARA pattern lab',
    steps: [
      {
        title: 'Tune patterns safely',
        body: 'Adjust the rule editor to experiment with matches against a bundled sample file. Scans run entirely in-memory so no files are touched.',
        selector: '[data-tutorial="yara-editor"]',
      },
      {
        title: 'Review the sample corpus',
        body: 'The read-only sample text demonstrates how case-sensitive matches behave. Use it to explain rule testing before deploying to production.',
        selector: '[data-tutorial="yara-sample"]',
      },
      {
        title: 'Remember: demo only',
        body: 'Once again, the resources column keeps the simulation grounded in approved lab work.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
  mitre: {
    title: 'MITRE ATT&CK navigator',
    steps: [
      {
        title: 'Search tactics and techniques',
        body: 'Combine the search box with the MITRE list to highlight tactics and technique IDs. All data comes from fixtures/mitre.json bundled with the app.',
        selector: '[data-tutorial="global-search"]',
      },
      {
        title: 'Discuss coverage gaps',
        body: 'Use the static matrix to talk through detection and response plans without exposing production dashboards.',
        selector: '[data-tutorial="tab-mitre"]',
      },
      {
        title: 'Cross-check methodology',
        body: 'Wrap up by directing learners to the methodology links so they plan authorized tests before running anything real.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
  fixtures: {
    title: 'Fixture loader sandbox',
    steps: [
      {
        title: 'Drop artifacts into the loader',
        body: 'The loader accepts JSON, CSV, and text files and parses them client-side to demonstrate pipeline concepts without transmitting data elsewhere.',
        selector: '[data-tutorial="fixtures-loader"]',
      },
      {
        title: 'Inspect structured output',
        body: 'Results render next to the loader with a JSON viewer so you can walk through how enrichment might look in a real system.',
        selector: '[data-tutorial="fixtures-result"]',
      },
      {
        title: 'Lean on the methodology links',
        body: 'Use the reference column to reiterate that this sandbox is meant for rehearsing workflows before touching production.',
        selector: '[data-tutorial="explainer"]',
      },
    ],
  },
};

export type TutorialId = keyof typeof tutorials;

export default tutorials;
