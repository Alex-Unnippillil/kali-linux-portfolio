export interface NmapScript {
  name: string;
  description: string;
  tags: string[];
  example: string;
  phase: 'prerule' | 'hostrule' | 'portrule';
}

export interface NmapScanHost {
  ip: string;
  ports: Array<{
    port: number;
    service: string;
    cvss: number;
    scripts?: Array<{
      name: string;
      output: string;
    }>;
  }>;
}

export interface NmapScanResult {
  hosts: NmapScanHost[];
}

export interface NmapStoryboardStep {
  title: string;
  command: string;
  description: string;
  takeaway: string;
}

export const scriptCatalog: NmapScript[] = [
  {
    name: 'http-title',
    description: 'Fetches page titles from HTTP services.',
    tags: ['discovery', 'http'],
    example: `PORT   STATE SERVICE VERSION\n80/tcp open  http\n| http-title: Example Domain\n|_Requested resource was /`,
    phase: 'portrule',
  },
  {
    name: 'ssl-cert',
    description: 'Retrieves TLS certificate information.',
    tags: ['ssl', 'discovery'],
    example: `PORT    STATE SERVICE\n443/tcp open  https\n| ssl-cert: Subject: commonName=example.com\n| Not valid before: 2020-06-01T00:00:00\n|_Not valid after: 2022-06-01T12:00:00`,
    phase: 'portrule',
  },
  {
    name: 'smb-os-discovery',
    description: 'Discovers remote OS information via SMB.',
    tags: ['smb', 'discovery'],
    example: `PORT    STATE SERVICE\n445/tcp open  microsoft-ds\n| smb-os-discovery:\n|   OS: Windows 10 Pro 19041\n|   Computer name: HOST\n|_  Workgroup: WORKGROUP`,
    phase: 'hostrule',
  },
  {
    name: 'ftp-anon',
    description: 'Checks for anonymous FTP access.',
    tags: ['ftp', 'auth'],
    example: `PORT   STATE SERVICE\n21/tcp open  ftp\n| ftp-anon: Anonymous FTP login allowed (FTP code 230)\n|_-rw-r--r--    1 ftp  ftp           73 Feb 02 00:15 welcome.msg`,
    phase: 'portrule',
  },
  {
    name: 'http-enum',
    description: 'Enumerates directories on web servers.',
    tags: ['http', 'vuln'],
    example: `PORT   STATE SERVICE\n80/tcp open  http\n| http-enum:\n|   /admin/: Potential admin interface\n|_  /images/: Potentially interesting directory w/ listing`,
    phase: 'portrule',
  },
  {
    name: 'dns-brute',
    description: 'Performs DNS subdomain brute force enumeration.',
    tags: ['dns', 'brute'],
    example: `Host scripts results:\n| dns-brute:\n|   mail.example.com - 192.0.2.10\n|   dev.example.com - 192.0.2.20\n|_  shop.example.com - 192.0.2.30`,
    phase: 'hostrule',
  },
];

export const scanResult: NmapScanResult = {
  hosts: [
    {
      ip: '192.0.2.10',
      ports: [
        {
          port: 80,
          service: 'http',
          cvss: 5.0,
          scripts: [
            { name: 'http-title', output: 'Example Domain' },
            {
              name: 'http-enum',
              output:
                '/admin/: Potential admin interface\n/images/: Potentially interesting directory w/ listing',
            },
          ],
        },
        {
          port: 443,
          service: 'https',
          cvss: 3.1,
          scripts: [
            {
              name: 'ssl-cert',
              output:
                'Subject: commonName=example.com\nNot valid before: 2020-06-01\nNot valid after: 2022-06-01',
            },
          ],
        },
      ],
    },
    {
      ip: '192.0.2.20',
      ports: [
        {
          port: 21,
          service: 'ftp',
          cvss: 7.5,
          scripts: [
            {
              name: 'ftp-anon',
              output: 'Anonymous FTP login allowed\nwelcome.msg',
            },
          ],
        },
      ],
    },
    {
      ip: '192.0.2.30',
      ports: [
        {
          port: 445,
          service: 'microsoft-ds',
          cvss: 4.0,
          scripts: [
            {
              name: 'smb-os-discovery',
              output: 'OS: Windows 10 Pro\nComputer name: HOST\nWorkgroup: WORKGROUP',
            },
          ],
        },
      ],
    },
  ],
};

export const nmapPhaseDescriptions: Record<
  NmapScript['phase'],
  { description: string; example: string }
> = {
  prerule: {
    description:
      'Runs before any hosts are scanned. Often used for broadcast discovery.',
    example: 'broadcast-dhcp-discover',
  },
  hostrule: {
    description: 'Runs once for each target host.',
    example: 'smb-os-discovery',
  },
  portrule: {
    description: 'Runs once for each target port.',
    example: 'http-title',
  },
};

export const nmapPortPresets = [
  { label: 'Default', flag: '' },
  { label: 'Common', flag: '-F' },
  { label: 'Full', flag: '-p-' },
];

export const nmapStoryboard: NmapStoryboardStep[] = [
  {
    title: 'Scope confirmation',
    command: 'nmap -sn 192.0.2.0/24',
    description:
      'Start with a ping sweep in a lab range to confirm which demo hosts should respond before touching service scans.',
    takeaway:
      'Keep scans inside approved IP space and record the intent before you continue.',
  },
  {
    title: 'Service discovery',
    command: 'nmap -sV -p80,443 example.com --script http-title,http-enum',
    description:
      'Focus on web ports and pair them with safe discovery scripts. The canned output shows a typical corporate portal with an exposed admin path.',
    takeaway:
      'Match scripts to the services you expect and explain why each script was selected.',
  },
  {
    title: 'Deeper validation',
    command: 'nmap -sV -p21,445 example.net --script ftp-anon,smb-os-discovery',
    description:
      'Pivot to internal services to illustrate how credential hygiene issues surface. Sample responses highlight anonymous FTP access and SMB metadata.',
    takeaway:
      'Document follow-up actions instead of exploiting the findings in the simulation.',
  },
];

export const loadNmapScripts = async (): Promise<NmapScript[]> => {
  return scriptCatalog;
};

export const loadNmapScanResult = async (): Promise<NmapScanResult> => {
  return scanResult;
};

export const loadNmapStoryboard = async (): Promise<NmapStoryboardStep[]> => {
  return nmapStoryboard;
};

export default {
  loadNmapScripts,
  loadNmapScanResult,
  loadNmapStoryboard,
  scriptCatalog,
  scanResult,
  nmapPhaseDescriptions,
  nmapPortPresets,
  nmapStoryboard,
};
