"use client";

import Image from "next/image";
import Clock from "../util-components/clock";
import Status from "../util-components/status";
import apps from "../../apps.config";

const PINNED = ["terminal", "chrome", "vscode", "file-explorer", "alex"];
const pinnedApps = apps.filter(a => PINNED.includes(a.id) && !a.disabled);

export default function XfceNavbar() {
  return (
    <header
      role="navigation"
      aria-label="Top panel"
      className="fixed top-0 left-0 right-0 h-10 px-2 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)] text-sm z-[60] flex items-center"
    >
      {/* left cluster: menu + launchers */}
      <div className="flex items-center gap-1">
        <button
          aria-label="Applications"
          className="px-2 h-8 rounded hover:bg-white/10 focus:outline-none focus:ring"
        >
          <Image
            src="/themes/Yaru/status/view-app-grid-symbolic.svg"
            alt="Applications"
            width={16}
            height={16}
            priority
          />
        </button>

        <div className="h-6 w-px mx-1 bg-[var(--color-border)]" />

        {pinnedApps.map(app => (
          <a
            key={app.id}
            href={`/apps/${app.id}`}
            title={app.title}
            className="p-1 rounded hover:bg-white/10 focus:outline-none focus:ring"
            aria-label={`Open ${app.title}`}
          >
            <Image src={app.icon} alt={app.title} width={20} height={20} />
          </a>
        ))}
      </div>

      {/* center: workspace switcher */}
      <nav aria-label="Workspaces" className="mx-auto">
        <ul className="flex gap-2">
          {[1, 2, 3, 4].map(n => (
            <li key={n}>
              <button
                className="min-w-6 px-1.5 h-7 rounded hover:bg-white/10 focus:outline-none focus:ring data-[active=true]:bg-white/15"
                data-active={n === 1}
                aria-label={`Workspace ${n}`}
              >
                {n}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* right cluster: clock + status */}
      <div className="ml-auto flex items-center gap-2">
        <Clock />
        <div className="h-6 w-px mx-1 bg-[var(--color-border)]" />
        <Status />
      </div>
    </header>
  );
}

