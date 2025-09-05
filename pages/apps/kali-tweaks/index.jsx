import { useState } from 'react';
import Tabs from '../../../components/Tabs';
import usePersistentState from '../../../hooks/usePersistentState';

const TAB_LIST = [
  { id: 'shell', label: 'Shell' },
  { id: 'mirrors', label: 'Mirrors' },
  { id: 'metapackages', label: 'Metapackages' },
  { id: 'hardening', label: 'Hardening' },
  { id: 'virtualization', label: 'Virtualization' },
  { id: 'kernel', label: 'Kernel' },
];

const OPTIONS = {
  shell: ['Bash', 'Zsh', 'Fish'],
  mirrors: ['Default', 'Cloudflare', 'Kali Rolling'],
  metapackages: ['kali-linux-default', 'kali-linux-large', 'kali-linux-everything'],
  hardening: ['Enable firewall', 'Install Lynis', 'Enable auditd'],
  virtualization: ['VirtualBox Guest', 'VMware Tools'],
  kernel: ['Install headers', 'Enable sources'],
};

export default function KaliTweaksPage() {
  const [active, setActive] = useState('shell');
  const [selections, setSelections] = usePersistentState('kaliTweaks', {
    shell: [],
    mirrors: [],
    metapackages: [],
    hardening: [],
    virtualization: [],
    kernel: [],
  });

  const toggleOption = (tab, option) => {
    setSelections((prev) => {
      const current = prev[tab] || [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [tab]: next };
    });
  };

  return (
    <div className="p-4">
      <Tabs tabs={TAB_LIST} active={active} onChange={setActive} className="mb-4 border-b border-gray-600" />
      <div className="space-y-2">
        {OPTIONS[active].map((opt) => (
          <label key={opt} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selections[active]?.includes(opt)}
              onChange={() => toggleOption(active, opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

