import React from 'react';

type Tool = {
  package: string;
  command: string;
};

const tools: Tool[] = [
  { package: 'beef', command: 'beef-xss' },
  { package: 'hydra', command: 'hydra' },
  { package: 'john', command: 'john' },
  { package: 'nikto', command: 'nikto' },
  { package: 'nmap', command: 'nmap' },
  { package: 'sqlmap', command: 'sqlmap' },
  { package: 'wireshark', command: 'wireshark' },
];

export default function ToolsIndex() {
  const grouped = tools.reduce<Record<string, Tool[]>>((acc, tool) => {
    const letter = tool.package.charAt(0).toUpperCase();
    (acc[letter] ||= []).push(tool);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <div className="p-4">
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {letters.map((letter) => (
          <a key={letter} href={`#${letter}`} className="underline">
            {letter}
          </a>
        ))}
      </nav>
      {letters.map((letter) => (
        <section key={letter} id={letter} className="mb-6">
          <h2 className="font-bold text-xl mb-2">{letter}</h2>
          <ul className="list-disc pl-4">
            {grouped[letter].map((tool) => (
              <li key={tool.package} className="mb-1">
                <span className="font-mono">{tool.package}</span>{' '}
                <code>$ {tool.command}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

