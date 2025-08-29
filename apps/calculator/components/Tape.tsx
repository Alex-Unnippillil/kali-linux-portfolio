'use client';

interface TapeProps {
  entries: { expr: string; result: string }[];
}

export default function Tape({ entries }: TapeProps) {
  return (
    <div className="tape font-mono">
      {entries.map(({ expr, result }, i) => (
        <div key={i} className="p-1 odd:bg-black/20 even:bg-black/10">
          {expr} = {result}
        </div>
      ))}
    </div>
  );
}
