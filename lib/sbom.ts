export interface OsvVuln {
  id: string;
  severity?: string;
}

export interface SbomComponent {
  id: string;
  name: string;
  version?: string;
  licenses: string[];
  dependencies: string[];
  supplier?: string;
  vulns: OsvVuln[];
}

export interface ParsedSbom {
  components: SbomComponent[];
  graph: Record<string, string[]>;
}

export async function readFileChunks(file: File): Promise<string> {
  if (typeof (file as any).stream === 'function') {
    const reader = (file as any).stream().getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  }
  if (typeof (file as any).text === 'function') {
    return await (file as any).text();
  }
  if (typeof (file as any).arrayBuffer === 'function') {
    const buf = await (file as any).arrayBuffer();
    return new TextDecoder().decode(buf);
  }
  return '';
}

export function parseSbomObject(data: any): ParsedSbom {
  if (data?.bomFormat === 'CycloneDX') {
    return parseCycloneDx(data);
  }
  if (data?.spdxVersion) {
    return parseSpdx(data);
  }
  throw new Error('Unsupported SBOM format');
}

function parseCycloneDx(data: any): ParsedSbom {
  if (!Array.isArray(data.components)) {
    throw new Error('Invalid SBOM schema: missing components at $.components');
  }
  const components: SbomComponent[] = data.components.map((c: any) => ({
    id: c.bomRef || c['@id'] || c.name,
    name: c.name,
    version: c.version,
    licenses: (c.licenses || []).map(
      (l: any) => l.license?.id || l.license?.name || l.expression || ''
    ),
    dependencies: [],
    supplier: c.supplier?.name || c.manufacturer?.name,
    vulns: [],
  }));
  const graph: Record<string, string[]> = {};
  if (Array.isArray(data.dependencies)) {
    data.dependencies.forEach((d: any) => {
      if (d.ref) graph[d.ref] = d.dependsOn || [];
    });
  }
  components.forEach((c) => (c.dependencies = graph[c.id] || []));
  return { components, graph };
}

function parseSpdx(data: any): ParsedSbom {
  const verMatch = /(\d+)\.(\d+)/.exec(data.spdxVersion || '');
  if (!verMatch) {
    throw new Error('Invalid SPDX version');
  }
  const major = parseInt(verMatch[1], 10);
  const minor = parseInt(verMatch[2], 10);
  if (major < 2 || (major === 2 && minor < 3)) {
    throw new Error('Unsupported SPDX version: require >=2.3');
  }
  if (!Array.isArray(data.packages)) {
    throw new Error('Invalid SBOM schema: missing packages at $.packages');
  }
  const components: SbomComponent[] = data.packages.map((p: any) => ({
    id:
      p.SPDXID ||
      p.spdxid ||
      p.packageSPDXIdentifier ||
      p.name,
    name: p.name,
    version: p.versionInfo,
    licenses: [p.licenseDeclared, p.licenseConcluded].filter(Boolean),
    dependencies: [],
    supplier: p.supplier || p.originator,
    vulns: [],
  }));
  const graph: Record<string, string[]> = {};
  (data.relationships || []).forEach((r: any) => {
    if (r.relationshipType === 'DEPENDS_ON') {
      const from = r.spdxElementId || r.spdxElementID || r.element;
      const to = r.relatedSpdxElement || r.relatedElement;
      if (from && to) {
        if (!graph[from]) graph[from] = [];
        graph[from].push(to);
      }
    }
  });
  components.forEach((c) => (c.dependencies = graph[c.id] || []));
  return { components, graph };
}

export async function fetchOsv(
  component: SbomComponent,
  signal?: AbortSignal,
): Promise<void> {
  if (!component.version) {
    component.vulns = [];
    return;
  }
  try {
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: component.version,
        package: { name: component.name },
      }),
      signal,
    });
    if (!res.ok) return;
    const json = await res.json();
    component.vulns = (json.vulns || []).map((v: any) => ({
      id: v.id,
      severity:
        v.severity?.[0]?.score || v.database_specific?.severity || undefined,
    }));
  } catch {
    component.vulns = [];
  }
}

export function severityRank(sev?: string): number {
  const order = ['none', 'low', 'medium', 'high', 'critical'];
  const idx = order.findIndex(
    (s) => s.toLowerCase() === (sev || '').toLowerCase()
  );
  return idx === -1 ? 0 : idx;
}
