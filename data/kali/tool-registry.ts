import type { KaliCategoryId, KaliSubcategoryId } from './categories';

export type KaliSubcategoryIdFor<C extends KaliCategoryId> = Extract<
  KaliSubcategoryId,
  `${C}-${string}`
>;

type EntryForCategory<C extends KaliCategoryId> = {
  readonly appId: string;
  readonly categoryId: C;
  readonly subcategoryId?: KaliSubcategoryIdFor<C>;
  readonly notes?: string;
};

export type KaliToolRegistryEntry = {
  [C in KaliCategoryId]: EntryForCategory<C>;
}[KaliCategoryId];

export const KALI_TOOL_REGISTRY = [
  { appId: 'autopsy', categoryId: '11' },
  { appId: 'volatility', categoryId: '11' },
  { appId: 'evidence-vault', categoryId: '11' },
  { appId: 'wireshark', categoryId: '09', subcategoryId: '09-network-sniffing' },
  { appId: 'dsniff', categoryId: '09', subcategoryId: '09-network-sniffing' },
  { appId: 'ettercap', categoryId: '09', subcategoryId: '09-network-sniffing' },
  { appId: 'ble-sensor', categoryId: '01', subcategoryId: '01-bluetooth' },
  { appId: 'kismet', categoryId: '01', subcategoryId: '01-wifi' },
  { appId: 'subnet-calculator', categoryId: '09', subcategoryId: '09-system-network-configuration-discovery' },
  { appId: 'nmap-nse', categoryId: '09', subcategoryId: '09-network-service-discovery' },
  { appId: 'nessus', categoryId: '01', subcategoryId: '01-vulnerability-scanning' },
  { appId: 'openvas', categoryId: '01', subcategoryId: '01-vulnerability-scanning' },
  { appId: 'nikto', categoryId: '01', subcategoryId: '01-web-vulnerability-scanning' },
  { appId: 'recon-ng', categoryId: '01', subcategoryId: '01-web-scanning' },
  { appId: 'hydra', categoryId: '08', subcategoryId: '08-brute-force' },
  { appId: 'john', categoryId: '08', subcategoryId: '08-password-cracking' },
  { appId: 'hashcat', categoryId: '08', subcategoryId: '08-password-cracking' },
  { appId: 'reaver', categoryId: '08', subcategoryId: '08-wifi' },
  { appId: 'mimikatz', categoryId: '08', subcategoryId: '08-os-credential-dumping' },
  { appId: 'mimikatz/offline', categoryId: '08', subcategoryId: '08-os-credential-dumping' },
  { appId: 'metasploit', categoryId: '04' },
  { appId: 'msf-post', categoryId: '10', subcategoryId: '10-pass-the-hash' },
  { appId: 'ghidra', categoryId: '02' },
  { appId: 'radare2', categoryId: '02' },
  { appId: 'security-tools', categoryId: '11' },
  { appId: 'http', categoryId: '12', subcategoryId: '12-application-layer-protocol' },
  { appId: 'ssh', categoryId: '12', subcategoryId: '12-non-application-layer-protocol' },
  { appId: 'beef', categoryId: '12', subcategoryId: '12-application-layer-protocol' },
  { appId: 'serial-terminal', categoryId: '12', subcategoryId: '12-protocol-tunneling' },
] as const satisfies readonly KaliToolRegistryEntry[];

export const KALI_TOOL_INDEX = new Map(
  KALI_TOOL_REGISTRY.map((entry) => [entry.appId, entry] as const),
);
