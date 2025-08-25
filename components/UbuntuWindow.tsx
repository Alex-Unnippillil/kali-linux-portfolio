import React from 'react';

interface UbuntuWindowProps {
  title: string;
  children: React.ReactNode;
}

export default function UbuntuWindow({ title, children }: UbuntuWindowProps) {
  return (
    <div className="rounded-md border border-[var(--color-surface)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-[var(--color-surface)]">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex gap-1">
          <button
            aria-label="Minimize"
            className="h-3 w-3 rounded-full bg-[var(--accent)]"
          />
          <button
            aria-label="Close"
            className="h-3 w-3 rounded-full bg-[var(--ubuntu-orange)]"
          />
        </div>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}
