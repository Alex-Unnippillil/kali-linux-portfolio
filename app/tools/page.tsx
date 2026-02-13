'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface Tool {
  name: string;
  route: string;
  category: string;
}

const tools: Tool[] = [
  { name: 'Autopsy', route: '/apps/autopsy', category: 'Forensics' },
  { name: 'BeEF', route: '/apps/beef', category: 'Exploitation Tools' },
  { name: 'Bluetooth Tools', route: '/apps/bluetooth', category: 'Wireless Attacks' },
  { name: 'dsniff', route: '/apps/dsniff', category: 'Sniffing & Spoofing' },
  { name: 'Ettercap', route: '/apps/ettercap', category: 'Sniffing & Spoofing' },
  { name: 'Ghidra', route: '/apps/ghidra', category: 'Reverse Engineering' },
  { name: 'Hashcat', route: '/apps/hashcat', category: 'Password Attacks' },
  { name: 'Hydra', route: '/apps/hydra', category: 'Password Attacks' },
  { name: 'John the Ripper', route: '/apps/john', category: 'Password Attacks' },
  { name: 'Kismet', route: '/apps/kismet', category: 'Wireless Attacks' },
  { name: 'Metasploit', route: '/apps/metasploit', category: 'Exploitation Tools' },
  { name: 'Metasploit Post', route: '/apps/metasploit-post', category: 'Post Exploitation' },
  { name: 'Mimikatz', route: '/apps/mimikatz', category: 'Post Exploitation' },
  { name: 'Nessus', route: '/apps/nessus', category: 'Vulnerability Analysis' },
  { name: 'Nmap NSE', route: '/apps/nmap-nse', category: 'Information Gathering' },
  { name: 'OpenVAS', route: '/apps/openvas', category: 'Vulnerability Analysis' },
  { name: 'Radare2', route: '/apps/radare2', category: 'Reverse Engineering' },
  { name: 'Reaver', route: '/apps/reaver', category: 'Wireless Attacks' },
  { name: 'Recon-ng', route: '/apps/reconng', category: 'Information Gathering' },
  { name: 'Volatility', route: '/apps/volatility', category: 'Forensics' },
  { name: 'Wireshark', route: '/apps/wireshark', category: 'Sniffing & Spoofing' },
];

const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export default function ToolsPage() {
  const [selected, setSelected] = useState<string[]>([]);

  const categories = useMemo(() => Array.from(new Set(tools.map(t => t.category))).sort(), []);

  const grouped = useMemo(() => {
    const groups: Record<string, Tool[]> = {};
    letters.forEach(l => groups[l] = []);
    tools.forEach(tool => {
      const letter = tool.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(tool);
    });
    letters.forEach(l => groups[l].sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, []);

  const toggle = (cat: string) => {
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const show = (cat: string) => selected.length === 0 || selected.includes(cat);

  return (
    <div className="p-4 space-y-4">
      <nav className="flex flex-wrap gap-2 text-sm">
        {letters.map(letter => (
          <a key={letter} href={`#${letter}`}>{letter}</a>
        ))}
      </nav>
      <div className="flex flex-wrap gap-4 text-sm">
          {categories.map(cat => (
            <label key={cat} className="flex items-center gap-1">
              <input
                type="checkbox"
                aria-label={cat}
                checked={selected.includes(cat)}
                onChange={() => toggle(cat)}
              />
              {cat}
            </label>
          ))}
        </div>
      <div>
        {letters.map(letter => (
          <section key={letter} id={letter} className="mb-6">
            <h2 className="font-bold mb-2">{letter}</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {grouped[letter].map(tool => {
                const visible = show(tool.category);
                return (
                  <li
                    key={tool.name}
                    className={visible ? '' : 'invisible'}
                    aria-hidden={!visible}
                  >
                    <Link href={tool.route} className="underline">
                      {tool.name}
                    </Link>
                    <span className="block text-xs text-gray-500">{tool.category}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

