import Image from "next/image";

const tools = [
  { name: "Nmap", src: "/tools/nmap.svg" },
  { name: "Metasploit", src: "/tools/metasploit.svg" },
];

export default function ToolsStrip() {
  return (
    <div className="flex justify-center gap-8 py-8">
      {tools.map((tool) => (
        <Image
          key={tool.name}
          src={tool.src}
          alt={tool.name}
          width={48}
          height={48}
          className="transition-transform duration-200 hover:scale-105"
        />
      ))}
    </div>
  );
}
