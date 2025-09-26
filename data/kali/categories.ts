export interface KaliSubcategory {
  /** Unique identifier combining category and slug (e.g. `01-host-information`). */
  readonly id: `${KaliCategoryId}-${string}`;
  /** Human readable label displayed in menus. */
  readonly label: string;
}

export interface KaliCategory {
  readonly id: KaliCategoryId;
  /** Display label without the numeric prefix. */
  readonly label: string;
  /** Optional short label that includes the numeric prefix for quick menus. */
  readonly shortLabel: string;
  readonly subcategories: readonly KaliSubcategory[];
}

export const KALI_CATEGORIES = [
  {
    id: '01',
    label: 'Reconnaissance',
    shortLabel: '01 Reconnaissance',
    subcategories: [
      { id: '01-host-information', label: 'Host Information' },
      { id: '01-identity-information', label: 'Identity Information' },
      { id: '01-network-information', label: 'Network Information' },
      { id: '01-network-information-dns', label: 'Network Information: DNS' },
      { id: '01-web-scanning', label: 'Web Scanning' },
      { id: '01-vulnerability-scanning', label: 'Vulnerability Scanning' },
      { id: '01-web-vulnerability-scanning', label: 'Web Vulnerability Scanning' },
      { id: '01-bluetooth', label: 'Bluetooth' },
      { id: '01-wifi', label: 'WiFi' },
      { id: '01-radio-frequency', label: 'Radio Frequency' },
    ],
  },
  {
    id: '02',
    label: 'Resource Development',
    shortLabel: '02 Resource Development',
    subcategories: [],
  },
  {
    id: '03',
    label: 'Initial Access',
    shortLabel: '03 Initial Access',
    subcategories: [],
  },
  {
    id: '04',
    label: 'Execution',
    shortLabel: '04 Execution',
    subcategories: [],
  },
  {
    id: '05',
    label: 'Persistence',
    shortLabel: '05 Persistence',
    subcategories: [],
  },
  {
    id: '06',
    label: 'Privilege Escalation',
    shortLabel: '06 Privilege Escalation',
    subcategories: [],
  },
  {
    id: '07',
    label: 'Defense Evasion',
    shortLabel: '07 Defense Evasion',
    subcategories: [{ id: '07-pass-the-hash', label: 'Pass-the-Hash' }],
  },
  {
    id: '08',
    label: 'Credential Access',
    shortLabel: '08 Credential Access',
    subcategories: [
      { id: '08-os-credential-dumping', label: 'OS Credential Dumping' },
      { id: '08-hash-identification', label: 'Hash Identification' },
      { id: '08-password-profiling-wordlists', label: 'Password Profiling & Wordlists' },
      { id: '08-brute-force', label: 'Brute Force' },
      { id: '08-password-cracking', label: 'Password Cracking' },
      { id: '08-unsecured-credentials', label: 'Unsecured Credentials' },
      { id: '08-wifi', label: 'WiFi Credential Access' },
      { id: '08-keylogger', label: 'Keylogger' },
      { id: '08-voip', label: 'VoIP Credential Access' },
      { id: '08-nfc', label: 'NFC' },
      { id: '08-kerberoasting', label: 'Kerberoasting' },
    ],
  },
  {
    id: '09',
    label: 'Discovery',
    shortLabel: '09 Discovery',
    subcategories: [
      { id: '09-network-service-discovery', label: 'Network Service Discovery' },
      { id: '09-ssl-tls', label: 'SSL / TLS' },
      { id: '09-snmp', label: 'SNMP' },
      { id: '09-network-sniffing', label: 'Network Sniffing' },
      { id: '09-remote-system-discovery', label: 'Remote System Discovery' },
      { id: '09-account-discovery', label: 'Account Discovery' },
      { id: '09-network-share-discovery', label: 'Network Share Discovery' },
      { id: '09-process-discovery', label: 'Process Discovery' },
      { id: '09-system-network-configuration-discovery', label: 'System Network Configuration Discovery' },
      { id: '09-network-security-appliances', label: 'Network Security Appliances' },
      { id: '09-databases', label: 'Databases' },
      { id: '09-smtp', label: 'SMTP' },
      { id: '09-cisco-tools', label: 'Cisco Tools' },
      { id: '09-active-directory', label: 'Active Directory' },
      { id: '09-voip', label: 'VoIP' },
    ],
  },
  {
    id: '10',
    label: 'Lateral Movement',
    shortLabel: '10 Lateral Movement',
    subcategories: [{ id: '10-pass-the-hash', label: 'Pass-the-Hash' }],
  },
  {
    id: '11',
    label: 'Collection',
    shortLabel: '11 Collection',
    subcategories: [],
  },
  {
    id: '12',
    label: 'Command and Control',
    shortLabel: '12 Command & Control',
    subcategories: [
      { id: '12-application-layer-protocol', label: 'Application Layer Protocol' },
      { id: '12-non-application-layer-protocol', label: 'Non-Application Layer Protocol' },
      { id: '12-protocol-tunneling', label: 'Protocol Tunneling' },
    ],
  },
] as const satisfies readonly KaliCategory[];

export type KaliCategoryId =
  typeof KALI_CATEGORIES[number]['id'];

export type KaliSubcategory =
  (typeof KALI_CATEGORIES[number]['subcategories'])[number];

export type KaliSubcategoryId = KaliSubcategory['id'];

export const KALI_CATEGORY_INDEX = new Map(
  KALI_CATEGORIES.map((category) => [category.id, category] as const),
);

export const KALI_SUBCATEGORY_INDEX = new Map(
  KALI_CATEGORIES.flatMap((category) =>
    category.subcategories.map((sub) => [sub.id, { ...sub, categoryId: category.id as KaliCategoryId }] as const),
  ),
);
