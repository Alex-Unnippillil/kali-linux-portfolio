import type { ReactNode } from 'react';

type ProjectsLayoutProps = {
  children: ReactNode;
  modal: ReactNode;
};

export default function ProjectsLayout({ children, modal }: ProjectsLayoutProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        {children}
      </div>
      {modal}
    </div>
  );
}
