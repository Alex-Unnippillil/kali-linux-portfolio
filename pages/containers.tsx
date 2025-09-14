"use client";

import { useState } from "react";
import Tabs from "../components/Tabs";

const tabs = [
  { id: "docker", label: "Docker" },
  { id: "lxd", label: "LXD" },
  { id: "podman", label: "Podman" },
] as const;

export default function ContainersPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("docker");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-white">
      <div className="w-full max-w-xl">
        <Tabs tabs={tabs} active={active} onChange={setActive} className="mb-4 justify-center" />
        {active === "docker" && (
          <pre className="bg-black/60 p-4 rounded" aria-label="Docker command">
{`docker run -it kalilinux/kali-rolling`}
          </pre>
        )}
        {active === "lxd" && (
          <pre className="bg-black/60 p-4 rounded" aria-label="LXD command">
{`lxc launch images:kali/current/amd64 my-kali`}
          </pre>
        )}
        {active === "podman" && (
          <pre className="bg-black/60 p-4 rounded" aria-label="Podman command">
{`podman run -it kalilinux/kali-rolling`}
          </pre>
        )}
      </div>
      <div className="w-full max-w-xl space-y-4">
        <section>
          <h2 className="text-lg font-semibold">Login Defaults</h2>
          <ul className="list-disc pl-6 text-sm text-white/90">
            <li>Most Kali images use <code>kali</code> as both username and password.</li>
            <li>Container images often start as <code>root</code> with no password; create a user or use <code>--user</code> as needed.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Kernel Limitations</h2>
          <ul className="list-disc pl-6 text-sm text-white/90">
            <li>Containers share the host kernel and cannot load custom kernel modules.</li>
            <li>Low-level networking or hardware features may require <code>--privileged</code> or specific capabilities.</li>
            <li>Kernel upgrades must be applied on the host, not inside the container.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

