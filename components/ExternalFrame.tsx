import React from 'react';

type Props = {
  id: keyof typeof urlMap;
  title: string;
  className?: string;
};

const urlMap = {
  vscode: 'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md',
};

export default function ExternalFrame({ id, title, className }: Props) {
  const src = urlMap[id];
  if (!src) return null;
  return (
    <iframe
      src={src}
      title={title}
      className={className}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
