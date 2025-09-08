import platforms from "@/content/platforms.json";
import SectionDivider from "../ui/SectionDivider";

interface Platform {
  icon: string;
  title: string;
  description: string;
  href: string;
}

export default function KaliEverywhere() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(platforms as Platform[]).map((p) => (
          <div
            key={p.title}
            className="Surface flex flex-col items-center rounded p-4 text-center"
          >
            <div className="mb-2 text-4xl" aria-hidden>
              {p.icon}
            </div>
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-muted">{p.description}</p>
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm underline"
            >
              Docs
            </a>
          </div>
        ))}
      </div>
      <SectionDivider className="my-8" />
    </>
  );
}

