import type { ReactNode } from "react";

export type SettingsSection = {
  id: string;
  label: string;
  subsections?: readonly { id: string; label: string }[];
};

interface BreadcrumbsProps {
  sections: readonly SettingsSection[];
  activeSectionId?: string | null;
  activeSubsectionId?: string | null;
  rootLabel?: ReactNode;
}

const formatLabel = (value: string): string => {
  if (!value) return "";
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function Breadcrumbs({
  sections,
  activeSectionId,
  activeSubsectionId,
  rootLabel = "Settings",
}: BreadcrumbsProps) {
  const section = activeSectionId
    ? sections.find((entry) => entry.id === activeSectionId)
    : undefined;

  const breadcrumbs: { id: string; label: ReactNode }[] = [
    { id: "root", label: rootLabel },
  ];

  if (activeSectionId) {
    const sectionLabel = section?.label ?? formatLabel(activeSectionId);
    breadcrumbs.push({ id: `section:${activeSectionId}`, label: sectionLabel });

    if (activeSubsectionId) {
      const subsectionLabel =
        section?.subsections?.find((sub) => sub.id === activeSubsectionId)?.label ??
        formatLabel(activeSubsectionId);
      breadcrumbs.push({
        id: `subsection:${activeSubsectionId}`,
        label: subsectionLabel,
      });
    }
  }

  const lastIndex = breadcrumbs.length - 1;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ubt-grey sm:text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isCurrent = index === lastIndex;
          return (
            <li key={crumb.id} className="flex items-center">
              <span
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "font-semibold text-white"
                    : "text-ubt-grey hover:text-white"
                }
              >
                {crumb.label}
              </span>
              {index < lastIndex && <span className="mx-1 text-ubt-grey/60">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
