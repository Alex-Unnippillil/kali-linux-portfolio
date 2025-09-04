export type GlossaryEntry = {
  title: string;
  description: string;
  link: string;
};

const glossary: Record<string, GlossaryEntry> = {
  pstree: {
    title: 'Process Tree',
    description: 'Hierarchy of running processes.',
    link: 'https://volatility3.readthedocs.io/en/latest/plugins/windows/pstree.html',
  },
  pslist: {
    title: 'Process List',
    description: 'Active processes captured from memory.',
    link: 'https://volatility3.readthedocs.io/en/latest/plugins/windows/pslist.html',
  },
  dlllist: {
    title: 'Module List',
    description: 'DLLs and modules loaded by the selected process.',
    link: 'https://volatility3.readthedocs.io/en/latest/plugins/windows/dlllist.html',
  },
  netscan: {
    title: 'Network Connections',
    description: 'Sockets and network endpoints identified in memory.',
    link: 'https://volatility3.readthedocs.io/en/latest/plugins/windows/netscan.html',
  },
  malfind: {
    title: 'Malfind',
    description: 'Heuristics to locate injected or malicious code.',
    link: 'https://volatility3.readthedocs.io/en/latest/plugins/windows/malfind.html',
  },
  yara: {
    title: 'Yara Scan',
    description: 'Pattern-based rules that highlight suspicious memory content.',
    link: 'https://volatility3.readthedocs.io/en/latest/plugins/windows/yarascan.html',
  },
};

export default glossary;
