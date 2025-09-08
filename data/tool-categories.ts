export interface ToolCategory {
  id: string;
  name: string;
  intro: string;
  tools: string[];
}

const categories: ToolCategory[] = [
  {
    id: 'information-gathering',
    name: 'Information Gathering',
    intro: 'Tools to discover and enumerate targets during reconnaissance.',
    tools: ['nmap', 'dnsrecon', 'theharvester'],
  },
  {
    id: 'password-attacks',
    name: 'Password Attacks',
    intro: 'Popular utilities for auditing and cracking passwords.',
    tools: ['hashcat', 'john', 'hydra'],
  },
];

export default categories;
