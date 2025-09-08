import ThemeSwitcher from "@/components/ThemeSwitcher";
import { ReactNode } from "react";

export default function DocsLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 flex justify-end">
        <ThemeSwitcher />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="p-4 flex justify-center">
        <ThemeSwitcher />
      </footer>
    </div>
  );
}
