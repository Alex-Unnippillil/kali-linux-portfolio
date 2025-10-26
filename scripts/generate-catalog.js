const fs = require('fs');
const path = require('path');
const appsConfig = fs.readFileSync('apps.config.js', 'utf8');
function extractList(name) {
  const startToken = `const ${name} = [`;
  const startIndex = appsConfig.indexOf(startToken);
  if (startIndex === -1) throw new Error(`Missing ${name}`);
  let depth = 0;
  let i = appsConfig.indexOf('[', startIndex);
  for (; i < appsConfig.length; i += 1) {
    if (appsConfig[i] === '[') {
      depth += 1;
      i += 1;
      break;
    }
  }
  let end = i;
  for (; end < appsConfig.length; end += 1) {
    const ch = appsConfig[end];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  const block = appsConfig.slice(i - 1, end);
  const regex = /id:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'/g;
  const items = [];
  let match;
  while ((match = regex.exec(block))) {
    items.push({ id: match[1], title: match[2] });
  }
  return items;
}
function extractApps() {
  const startToken = 'const apps = [';
  const startIndex = appsConfig.indexOf(startToken);
  if (startIndex === -1) throw new Error('Missing apps list');
  let depth = 0;
  let i = appsConfig.indexOf('[', startIndex);
  for (; i < appsConfig.length; i += 1) {
    if (appsConfig[i] === '[') {
      depth += 1;
      i += 1;
      break;
    }
  }
  let end = i;
  for (; end < appsConfig.length; end += 1) {
    const ch = appsConfig[end];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  const block = appsConfig.slice(i - 1, end);
  const regex = /id:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'/g;
  const items = [];
  let match;
  while ((match = regex.exec(block))) {
    items.push({ id: match[1], title: match[2] });
  }
  return items;
}
const utilityListRaw = extractList('utilityList');
const gameListRaw = extractList('gameList');
const appListRaw = extractApps();
const overrides = {
  about: 'components/apps/alex.js',
  files: 'components/apps/file-explorer/index.tsx',
  'weather-widget': 'components/apps/weather_widget/index.tsx',
  'recon-ng': 'components/apps/reconng/index.tsx',
  'clipboard-manager': 'components/apps/ClipboardManager.tsx'
};
const exts = ['.tsx', '.ts', '.jsx', '.js'];
function findPathForId(id) {
  if (overrides[id]) return overrides[id];
  const normalized = id;
  const componentBase = path.join('components', 'apps', normalized);
  for (const ext of exts) {
    const file = `${componentBase}${ext}`;
    if (fs.existsSync(file)) return file;
  }
  if (fs.existsSync(componentBase) && fs.lstatSync(componentBase).isDirectory()) {
    for (const ext of exts) {
      const file = path.join(componentBase, `index${ext}`);
      if (fs.existsSync(file)) return file;
    }
  }
  const appBase = path.join('apps', normalized);
  for (const ext of exts) {
    const file = `${appBase}${ext}`;
    if (fs.existsSync(file)) return file;
  }
  if (fs.existsSync(appBase) && fs.lstatSync(appBase).isDirectory()) {
    for (const ext of exts) {
      const file = path.join(appBase, `index${ext}`);
      if (fs.existsSync(file)) return file;
    }
  }
  return 'TODO';
}
function attachPaths(list) {
  return list.map((item) => ({ ...item, path: findPathForId(item.id) }));
}
const utilities = attachPaths(utilityListRaw);
const games = attachPaths(gameListRaw);
const allApps = attachPaths(appListRaw);
const utilityIds = new Set(utilities.map((item) => item.id));
const gameIds = new Set(games.map((item) => item.id));
const embedIds = new Set(['firefox','vscode','x','spotify','youtube']);
const securitySet = new Set([
  'nikto','metasploit','wireshark','ble-sensor','dsniff','beef','autopsy','radare2','ghidra','hashcat','msf-post','evidence-vault','mimikatz','mimikatz/offline','ettercap','reaver','hydra','john','nessus','nmap-nse','openvas','recon-ng','security-tools','kismet','volatility','plugin-manager'
]);
const others = allApps.filter((item)=>!utilityIds.has(item.id) && !gameIds.has(item.id));
const embedApps = others.filter((item)=>embedIds.has(item.id));
const securityApps = others.filter((item)=>securitySet.has(item.id));
const coreApps = others.filter((item)=>!embedIds.has(item.id) && !securitySet.has(item.id));
const folderData = fs.readFileSync('data/desktopFolders.js','utf8');
const folderRegex = /id:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'/g;
const folders=[];
let match;
while((match=folderRegex.exec(folderData))){
  folders.push({id:match[1], title:match[2]});
}
function routeFor(id){
  return `/apps/${id}`;
}
const general = {
  embed: {
    frame: 'EmbedFrame',
    tasks: [
      'Wrap existing UI in `<EmbedFrame>` for unified loading, error, and offline states.',
      'Document offline/demo fallback instructions so the window remains functional without network access.',
      'Audit `apps.config.js` metadata for window defaults, resizability, and dock icon alignment.'
    ],
    acceptance: [
      'EmbedFrame exposes a skeleton state, offline banner, and retry affordance verified with the Spotify and YouTube embeds.',
      'Window opens with tuned default width/height, honors min constraints, and exposes descriptive dock tooltip text.',
      'Design tokens power typography and colors (no hard-coded hex values) across nav, buttons, and copy blocks.'
    ],
    dependencies: ['EmbedFrame component shipping from desktop shell plan', 'Design token audit from `docs/TASKS_UI_POLISH.md`', 'Dock metadata normalization tracked in `apps.config.js`']
  },
  security: {
    frame: 'SimulatedToolFrame',
    tasks: [
      'Render the experience inside `<SimulatedToolFrame>` with lab-mode banner, command pane, and results area.',
      'Load canned fixtures for commands/results so static export and offline demos stay deterministic.',
      'Surface "For lab use only" copy, safety instructions, and quickstart steps in the intro panel.'
    ],
    acceptance: [
      'SimulatedToolFrame shows mode banner, collapsible instructions, and analytics-friendly action buttons.',
      'Fixture loaders cover success, failure, and timeout paths with unit tests gating schema regressions.',
      'Lab mode toggle defaults to off and gating prevents destructive flows during demos.'
    ],
    dependencies: ['SimulatedToolFrame rollout from security tooling plan', 'Fixture JSON stored under `data/` with schema tests', 'Lab mode flag plumbing in settings service']
  },
  core: {
    frame: 'DesktopWindow',
    tasks: [
      'Adopt shared design tokens for spacing, typography, and elevation so controls align with the desktop shell.',
      'Verify default window metadata in `apps.config.js` (size, resizable flags, dock icon) matches planned behavior.',
      'Document offline or demo data sources so static export serves the same UX as serverful mode.'
    ],
    acceptance: [
      'Window launches with curated defaults, includes responsive layout states, and respects reduced-motion preferences.',
      'UI strings cover onboarding/instruction copy within the first view and link to docs where relevant.',
      'All remote dependencies have fallbacks or user-provided key prompts captured in Settings documentation.'
    ],
    dependencies: ['Design token audit from `docs/TASKS_UI_POLISH.md`', 'Dock metadata normalization', 'Settings/reset wiring for shared preferences']
  },
  utilityList: {
    frame: 'DesktopWindow',
    tasks: [
      'Align styles with the design token audit so utilities match the rest of the desktop shell.',
      'Backfill missing help text or tooltips so new users understand the utility at first launch.',
      'Confirm icons and shortcuts in `apps.config.js` match the Utilities desktop folder grouping.'
    ],
    acceptance: [
      'Each utility exposes inline guidance, keyboard affordances, and copy/clear actions validated via smoke tests.',
      'Offline/demo data is bundled locally so static exports behave identically to SSR builds.',
      'Launcher metadata keeps shortcuts enabled and respects favorites/dock pinning toggles.'
    ],
    dependencies: ['Design token audit', 'Dock metadata normalization', 'Utilities folder metadata in `data/desktopFolders.js`']
  },
  games: {
    frame: 'GameShell',
    tasks: [
      'Host gameplay inside `<GameShell>` with controls, HUD, and settings drawer wired to shared game context.',
      'Implement pause/reset/audio toggles plus persistent high score storage via `usePersistentState`.',
      'Review sprite/audio assets to ensure they follow design tokens and respect reduced-motion settings.'
    ],
    acceptance: [
      'GameShell surfaces instructions, key bindings, and analytics hooks for start/end events.',
      'High scores persist between sessions (or offer fallback instructions when storage is unavailable).',
      'Window defaults prevent overflow and align to the games folder icon/dock metadata.'
    ],
    dependencies: ['GameShell feature parity (controls + settings) from games plan', 'Shared game settings context', 'Dock metadata audit for games folder']
  },
  folders: {
    frame: 'DesktopFolder',
    tasks: [
      'Confirm folder icons, titles, and item lists stay in sync with `apps.config.js` registrations.',
      'Provide onboarding copy for each folder describing what contributors should polish first.',
      'Verify folder window defaults avoid overlapping the dock/taskbar when opened.'
    ],
    acceptance: [
      'Folder windows list all registered apps with accurate icons and open the correct route on activation.',
      'Descriptions reference the catalog polish checklist so assignees can find scoped tasks quickly.',
      'Folder metadata updates whenever new apps land or categories shift.'
    ],
    dependencies: ['Desktop folder renderer', 'Catalog polish checklist upkeep', 'Dock metadata audit']
  }
};
const appSpecificTasks = {
  firefox: ['Replace the legacy Chrome simulation with a single iframe shell that persists the last URL and minimal chrome.'],
  calculator: ['Wire tokenizer and shunting-yard evaluator plus keyboard support per the Calc backlog.'],
  terminal: ['Expand the command registry and ensure paste/autocomplete flows respect accessibility guidance.'],
  vscode: ['Validate StackBlitz embed permissions and document offline fallback messaging.'],
  x: ['Keep the timeline embed SSR-disabled with a manual theme toggle and documented fallback.'],
  spotify: ['Ship playlist editor JSON and mini-player mode in addition to the existing embed layout.'],
  youtube: ['Maintain demo catalog, search debouncing, and history controls with offline-first tests.'],
  beef: ['Bundle browser exploit fixtures and quickstart scenarios that emphasise safe, read-only demos.'],
  todoist: ['Implement sections, due dates, drag-drop ordering, and quick-add persistence.'],
  'sticky_notes': ['Confirm persistence model and draggable handles comply with desktop layout constraints.'],
  'resource-monitor': ['Display memory/FPS metrics plus synthetic CPU graph using `requestAnimationFrame` buckets.'],
  'screen-recorder': ['Clarify permission prompts, recording limits, and storage strategy for offline export.'],
  files: ['Align virtual filesystem breadcrumbs, recents, and drag/drop with the shared navigator hook.'],
  'project-gallery': ['Load cards from `projects.json`, add filters, and surface repo/live CTA buttons.'],
  gedit: ['Keep the contact workflow aligned with EmailJS and document feature flag requirements.'],
  weather: ['Show fake data with city picker and unit toggle or accept API key via Settings.'],
  'weather-widget': ['Ensure widget respects Settings toggles and shares offline data with the Weather app.'],
  qr: ['Add camera selection and downloadable QR output.'],
  'ascii-art': ['Support text-to-ASCII and image-to-ASCII conversion with hidden canvas sampling.'],
  figlet: ['Provide font selector, copy-to-clipboard, and IndexedDB font cache.'],
  quote: ['Use offline JSON quotes with tags and a no-repeat option.'],
  'input-lab': ['Cover keyboard, mouse, and gamepad devices with calibration guidance.'],
  'subnet-calculator': ['Add validation UX, preset ranges, and inline documentation for CIDR math.'],
  contact: ['Implement client-side validation, privacy note, and dummy submit endpoint.'],
  ssh: ['Protect the preset library and validation already marked ready—keep regression coverage in place.'],
  http: ['Add request validation, canned responses, and error states for offline demos.'],
  'html-rewriter': ['Demonstrate transformations and ensure worker wiring stays mock-friendly.'],
  autopsy: ['Curate forensic dataset previews and timeline walkthrough scripts.'],
  radare2: ['Provide static analysis fixture library with interpretive copy.'],
  ghidra: ['Ship reverse-engineering fixtures with guided analysis notes.'],
  hashcat: ['Bundle hash samples and strategy explanations for offline mode.'],
  'msf-post': ['Document post-exploitation module walkthrough and sample transcripts.'],
  'evidence-vault': ['Clarify evidence data model, tagging, and offline storage.'],
  mimikatz: ['Load credential dump fixtures with interpretive cards and lab-mode gating.'],
  'mimikatz/offline': ['Keep offline dataset bundle in sync with lab flows and Jest coverage.'],
  ettercap: ['Add network capture fixtures and MITM walkthrough instructions.'],
  reaver: ['Provide Wi-Fi fixture library plus safety disclaimers.'],
  hydra: ['Include credential list fixtures and scoring guidance.'],
  john: ['Reference lab fixtures and interpretation cards from `data/john/lab-fixtures.json`.'],
  nessus: ['Surface scan report fixtures with severity filtering.'],
  'nmap-nse': ['Load script output fixtures and highlight safe automation flows.'],
  openvas: ['Bundle scan report fixtures and gating copy.'],
  'recon-ng': ['Ship recon dataset with module-by-module instructions.'],
  'security-tools': ['Ensure category browser lists every simulator with lab-mode gating.'],
  nikto: ['Load canned outputs and lab banner.'],
  metasploit: ['Align console simulation with modules JSON and timeline steps.'],
  wireshark: ['Finalize simulator backlog with packet capture fixtures.'],
  'ble-sensor': ['Bundle BLE datasets and confirm simulator UX.'],
  dsniff: ['Add command builder and sample outputs.'],
  kismet: ['Expose wireless fixtures and lab mode toggle documented in `docs/kismet-fixtures.md`.'],
  'plugin-manager': ['Document plugin scope and dependencies before surfacing controls.'],
  'candy-crush': ['Keep boosters and persistent stats aligned with the QA-ready baseline.'],
  hangman: ['Add word list, timer, and difficulty settings.'],
  'word-search': ['Add timer, difficulty selector, and found words list.']
};

function writeAppSection(app, categoryKey){
  const generalMeta = general[categoryKey];
  const extraTasks = appSpecificTasks[app.id] ? [].concat(appSpecificTasks[app.id]) : [];
  const tasks = [...generalMeta.tasks, ...extraTasks];
  const acceptance = generalMeta.acceptance;
  const dependencies = generalMeta.dependencies;
  const route = routeFor(app.id);
  const componentPath = app.path;
  const lines=[];
  lines.push(`### ${app.title} (\`${app.id}\`)`);
  lines.push('');
  lines.push(`- **Route:** \`${route}\``);
  lines.push(`- **Implementation:** \`${componentPath}\``);
  lines.push(`- **Frame contract:** \`${generalMeta.frame}\``);
  lines.push('- **Outstanding tasks:**');
  tasks.forEach((task)=>{ lines.push(`  - [ ] ${task}`); });
  lines.push('- **Acceptance criteria:**');
  acceptance.forEach((item)=>{ lines.push(`  - ${item}`); });
  lines.push('- **Dependencies:**');
  dependencies.forEach((item)=>{ lines.push(`  - ${item}`); });
  const envelope = {
    appId: app.id,
    title: app.title,
    route,
    component: componentPath,
    frame: generalMeta.frame,
    tasks,
    acceptanceCriteria: acceptance,
    dependencies
  };
  const jsonBlock = JSON.stringify(envelope, null, 2)
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n');
  lines.push('- **Task envelope:**');
  lines.push('  ```json');
  lines.push(jsonBlock);
  lines.push('  ```');
  lines.push('');
  return {markdown: lines.join('\n'), envelope};
}
const sections=[];
const envelopes=[];
sections.push('# Catalog Polish Checklist');
sections.push('');
sections.push('This catalog derives directly from `apps.config.js` and groups every windowed experience so contributors can align UI polish work with the shared desktop plan. It maps each route to its implementation, planned frame abstraction, outstanding UX tasks, acceptance criteria, and downstream dependencies.');
sections.push('');
sections.push('## Automation Envelope Format');
sections.push('Use the JSON envelope generated for each entry to seed GitHub issues or automation workflows. Each envelope records the app ID, route, component path, frame contract, outstanding tasks, acceptance criteria, and dependencies. Aggregate envelopes appear at the end of this document for batch processing.');
sections.push('');
sections.push('## Media & Embed Apps');
embedApps.sort((a,b)=>a.title.localeCompare(b.title)).forEach((app)=>{
  const {markdown,envelope} = writeAppSection(app,'embed');
  sections.push(markdown);
  envelopes.push(envelope);
});
sections.push('## Core Desktop & Productivity Apps');
coreApps.sort((a,b)=>a.title.localeCompare(b.title)).forEach((app)=>{
  const {markdown,envelope} = writeAppSection(app,'core');
  sections.push(markdown);
  envelopes.push(envelope);
});
sections.push('## Utility Drawer Entries');
utilities.sort((a,b)=>a.title.localeCompare(b.title)).forEach((app)=>{
  const {markdown,envelope} = writeAppSection(app,'utilityList');
  sections.push(markdown);
  envelopes.push(envelope);
});
sections.push('## Security Tool Simulators');
securityApps.sort((a,b)=>a.title.localeCompare(b.title)).forEach((app)=>{
  const {markdown,envelope} = writeAppSection(app,'security');
  sections.push(markdown);
  envelopes.push(envelope);
});
sections.push('## Game Arcade');
games.sort((a,b)=>a.title.localeCompare(b.title)).forEach((app)=>{
  const {markdown,envelope} = writeAppSection(app,'games');
  sections.push(markdown);
  envelopes.push(envelope);
});
sections.push('## Desktop Folder Launchers');
folders.forEach((folder)=>{
  const {markdown,envelope} = writeAppSection({id:folder.id,title:folder.title,path:'data/desktopFolders.js'},'folders');
  sections.push(markdown);
  envelopes.push(envelope);
});
sections.push('## Batch Task Envelopes');
sections.push('```json');
sections.push(JSON.stringify(envelopes, null, 2));
sections.push('```');
fs.writeFileSync('docs/catalog-polish.md', sections.join('\n'));
