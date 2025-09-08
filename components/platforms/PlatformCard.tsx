import Image from 'next/image';

interface PlatformCardProps {
  title: string;
  bullets: string[];
  thumbnail: string;
}

export default function PlatformCard({ title, bullets, thumbnail }: PlatformCardProps) {
  return (
    <div className="flex gap-4 rounded border border-elevation-100 shadow-elevation-100 p-4">
      <Image src={thumbnail} alt="" width={64} height={64} className="rounded" />
      <div className="space-y-2">
        <h3 className="font-bold">{title}</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
