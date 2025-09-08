import Image from "next/image";
import partners from "@/content/partners.json";

interface Partner {
  name: string;
  logo: string;
  url?: string;
}

export default function PartnershipStrip() {
  const partnerList = partners as Partner[];
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4">
      {partnerList.map((p) => (
        <a key={p.name} href={p.url} aria-label={p.name} className="transition">
          <Image
            src={p.logo}
            alt={p.name}
            width={120}
            height={60}
            className="h-12 w-auto filter grayscale hover:grayscale-0"
          />
        </a>
      ))}
    </div>
  );
}
