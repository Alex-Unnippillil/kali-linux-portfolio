import React, { useState } from "react";

interface CommandItem {
  cmd: string;
  desc: string;
}

const commands: CommandItem[] = [
  { cmd: "aaa", desc: "analyze all" },
  { cmd: "afl", desc: "list functions" },
  { cmd: "pdf @ addr", desc: "disassemble function at addr" },
  { cmd: "pd @ addr", desc: "disassemble code at addr" },
  { cmd: "px @ addr", desc: "hexdump at addr" },
  { cmd: "s addr", desc: "seek to address" },
  { cmd: "VV", desc: "visual mode graph" },
  { cmd: "dr", desc: "show registers" },
  { cmd: "db addr", desc: "set breakpoint" },
  { cmd: "dc", desc: "continue execution" },
];

const CommandCheatsheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [search, setSearch] = useState("");
  const filtered = commands.filter(
    (c) =>
      c.cmd.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase()),
  );

  const copy = (cmd: string) => {
    navigator.clipboard?.writeText(cmd);
  };

  return (
    <div className="absolute inset-0 bg-ub-cool-grey bg-opacity-95 p-4 overflow-auto">
      <div className="flex mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search commands"
          className="flex-1 px-2 py-1 bg-gray-800 text-white rounded"
        />
        <button
          onClick={onClose}
          className="ml-2 px-3 py-1 bg-gray-700 rounded"
        >
          Close
        </button>
      </div>
      <ul>
        {filtered.map((c) => (
          <li key={c.cmd} className="flex items-center mb-2">
            <code className="bg-gray-800 px-2 py-1 rounded mr-2">{c.cmd}</code>
            <span className="flex-1">{c.desc}</span>
            <button
              onClick={() => copy(c.cmd)}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Copy
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CommandCheatsheet;
