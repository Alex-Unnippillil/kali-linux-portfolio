import Link from 'next/link';
import { useMemo, useState } from 'react';
import Filter from '../../components/tools/Filter';

interface Tool {
  name: string;
  route: string;
  category: string;
}

const tools: Tool[] = [
  { name: 'Autopsy', route: '/apps/autopsy', category: 'Forensics' },
  { name: 'BeEF', route: '/apps/beef', category: 'Exploitation' },
  { name: 'Bluetooth Tools', route: '/apps/bluetooth', category: 'Wireless' },
  { name: 'dsniff', route: '/apps/dsniff', category: 'Network' },
  { name: 'Ettercap', route: '/apps/ettercap', category: 'Network' },
  { name: 'Ghidra', route: '/apps/ghidra', category: 'Reverse Engineering' },
  { name: 'Hashcat', route: '/apps/hashcat', category: 'Password Cracking' },
  { name: 'Hydra', route: '/apps/hydra', category: 'Password Cracking' },
  { name: 'John the Ripper', route: '/apps/john', category: 'Password Cracking' },
  { name: 'Kismet', route: '/apps/kismet', category: 'Wireless' },
  { name: 'Metasploit', route: '/apps/metasploit', category: 'Exploitation' },
  { name: 'Metasploit Post', route: '/apps/metasploit-post', category: 'Exploitation' },
  { name: 'Mimikatz', route: '/apps/mimikatz', category: 'Credential Access' },
  { name: 'Nessus', route: '/apps/nessus', category: 'Vulnerability Scanner' },
  { name: 'Nmap NSE', route: '/apps/nmap-nse', category: 'Reconnaissance' },
  { name: 'OpenVAS', route: '/apps/openvas', category: 'Vulnerability Scanner' },
  { name: 'Radare2', route: '/apps/radare2', category: 'Reverse Engineering' },
  { name: 'Reaver', route: '/apps/reaver', category: 'Wireless' },
  { name: 'Recon-ng', route: '/apps/reconng', category: 'Reconnaissance' },
  { name: 'Volatility', route: '/apps/volatility', category: 'Forensics' },
  { name: 'Wireshark', route: '/apps/wireshark', category: 'Network' },
];

const ToolsPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(tools.map((t) => t.category))).sort(),
    [],
  );

  const filtered = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (!category || t.category === category),
  );

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Security Tools</h1>
      <Filter
        categories={categories}
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
      />
      <ul className="space-y-2">
        {filtered.map((tool) => (
          <li key={tool.name} className="rounded border p-2">
            <Link href={tool.route} className="text-blue-400 underline">
              {tool.name}
            </Link>
            <span className="ml-2 text-sm text-gray-400">{tool.category}</span>
          </li>
        ))}
        {filtered.length === 0 && <li>No tools match your filters.</li>}
      </ul>
    </div>
  );
};

export default ToolsPage;
