"use client";
import Link from "next/link";
import { useRouter } from "next/router";

function formatLabel(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const router = useRouter();
  const path = router.asPath.split("?")[0].split("#")[0];
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: Array<{ href?: string; label: string; isEllipsis?: boolean }> = [
    { href: "/", label: "Home" },
  ];

  if (segments.length === 1) {
    crumbs.push({ href: `/${segments[0]}`, label: formatLabel(segments[0]) });
  } else {
    const section = segments[0];
    crumbs.push({ href: `/${section}`, label: formatLabel(section) });

    if (segments.length > 2) {
      crumbs.push({ label: "…", isEllipsis: true });
    }

    const last = segments[segments.length - 1];
    crumbs.push({ href: `/${segments.join("/")}`, label: formatLabel(last) });
  }

  const schemaCrumbs = crumbs.filter((c) => !c.isEllipsis);

  return (
    <nav aria-label="Breadcrumb" className="p-2">
      <ol
        className="flex flex-wrap items-center gap-1 text-sm"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          if (c.isEllipsis) {
            return (
              <li key={`ellipsis-${i}`} aria-hidden="true" className="px-2">
                …
              </li>
            );
          }
          const schemaIndex = schemaCrumbs.indexOf(c);
          return (
            <li
              key={c.href ?? c.label}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center"
            >
              <Link
                href={c.href ?? "#"}
                itemProp="item"
                aria-current={isLast ? "page" : undefined}
                className="px-3 py-2 min-h-[44px] inline-flex items-center rounded hover:bg-gray-200 focus:outline-none focus-visible:ring"
              >
                <span itemProp="name">{c.label}</span>
              </Link>
              <meta itemProp="position" content={(schemaIndex + 1).toString()} />
              {!isLast && <span className="mx-1" aria-hidden="true">&gt;</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

