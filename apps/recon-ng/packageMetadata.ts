export interface PackageMarker {
  /** Human-readable explanation for the marker */
  reason: string;
}

export interface PackageMetadata {
  name: string;
  description: string;
  deps: string[];
  tags: string[];
  /** Packages that are pinned should trigger a prompt before removal. */
  pinned?: PackageMarker;
  /** Held packages are surfaced as warnings in the planner UI. */
  held?: PackageMarker;
}

const PACKAGE_MAP: Record<string, PackageMetadata> = {
  'DNS Enumeration': {
    name: 'DNS Enumeration',
    description:
      'Collect authoritative records to seed additional recon modules.',
    deps: [],
    tags: ['dns', 'recon'],
    held: {
      reason:
        'Held to preserve baseline DNS snapshots for historical comparisons.',
    },
  },
  'WHOIS Lookup': {
    name: 'WHOIS Lookup',
    description: 'Enrich domains with ownership records.',
    deps: ['DNS Enumeration'],
    tags: ['whois', 'network'],
  },
  'Reverse IP Lookup': {
    name: 'Reverse IP Lookup',
    description: 'Pivot from IPs to co-hosted domains.',
    deps: ['WHOIS Lookup'],
    tags: ['ip'],
    pinned: {
      reason:
        'Pinned for production workspaces that rely on stable pivot chains.',
    },
  },
  'Port Scan': {
    name: 'Port Scan',
    description: 'Enumerate TCP services to profile exposed hosts.',
    deps: ['Reverse IP Lookup'],
    tags: ['ports', 'network'],
  },
};

export const packageList: PackageMetadata[] = Object.values(PACKAGE_MAP);

export const packageNames = packageList.map((pkg) => pkg.name);

export const packageMap: Readonly<Record<string, PackageMetadata>> =
  PACKAGE_MAP;

export const getPackage = (name: string): PackageMetadata | undefined =>
  PACKAGE_MAP[name];

export default packageList;
