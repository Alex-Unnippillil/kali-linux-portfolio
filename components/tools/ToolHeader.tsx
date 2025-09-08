import React from 'react';

interface ToolHeaderProps {
  id: string;
  name: string;
  description: string;
  upstream?: string;
}

const badgeClass =
  'inline-block rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100';

interface LinkPillProps {
  href: string;
  children: React.ReactNode;
}

const LinkPill = ({ href, children }: LinkPillProps) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={badgeClass}>
    {children}
  </a>
);

export default function ToolHeader({
  id,
  name,
  description,
  upstream,
}: ToolHeaderProps) {
  const repoUrl = upstream ?? `https://gitlab.com/kalilinux/packages/${id}`;
  const manUrl = `https://manpages.debian.org/unstable/${id}/${id}.1.en.html`;

  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-bold">{name}</h1>
      <p>{description}</p>
      <div className="flex flex-wrap gap-2">
        <LinkPill href={repoUrl}>Upstream Repo</LinkPill>
        <LinkPill href={manUrl}>Man Page</LinkPill>
      </div>
    </header>
  );
}

