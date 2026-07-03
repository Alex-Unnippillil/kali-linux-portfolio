import { useState } from "react";

export interface ProofLink {
  label: string;
  url: string;
}

export interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "expert";
  proof?: ProofLink[];
}

export interface SkillGroup {
  name: string;
  description?: string;
  skills: Skill[];
}

interface SkillsMapProps {
  groups: SkillGroup[];
  layout?: "matrix";
}

const levelColors: Record<Skill["level"], string> = {
  beginner: "var(--color-ubt-blue)",
  intermediate: "var(--color-ubt-gedit-orange)",
  expert: "var(--color-ubt-green)",
};

export default function SkillsMap({
  groups,
  layout = "matrix",
}: SkillsMapProps) {
  const [openSkill, setOpenSkill] = useState<string | null>(null);

  if (layout !== "matrix") {
    console.warn("Only matrix layout is currently implemented.");
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.name}
            className="border rounded p-4"
            title={group.description || group.name}
          >
            <h3 className="font-bold mb-2">{group.name}</h3>
            <ul className="space-y-1">
              {group.skills.map((skill) => {
                const color = levelColors[skill.level];
                const isOpen = openSkill === skill.name;
                return (
                  <li key={skill.name}>
                    <button
                      onClick={() => setOpenSkill(isOpen ? null : skill.name)}
                      className="flex items-center gap-2 focus:outline-none underline-offset-2 hover:underline"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-label={`${skill.level} proficiency`}
                      />
                      <span className="text-left">{skill.name}</span>
                    </button>
                    {isOpen && skill.proof && (
                      <ul className="ml-5 mt-1 list-disc">
                        {skill.proof.map((p) => (
                          <li key={p.url}>
                            <a
                              href={p.url}
                              className="underline text-blue-400"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {p.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4" aria-label="Skill proficiency legend">
        {Object.entries(levelColors).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
