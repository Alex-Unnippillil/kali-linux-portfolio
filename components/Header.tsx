import React from "react";
import Menu, { MenuItem } from "./ui/Menu";

const communityItems: MenuItem[] = [
  { label: "Forums", href: "/forums" },
  { label: "Discord", href: "/discord" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Mirror", href: "/mirror" },
  { label: "Get Involved", href: "/get-involved" },
];

export default function Header() {
  return (
    <header className="bg-ub-grey text-white">
      <nav className="flex gap-4 p-2">
        <Menu label="Community" items={communityItems} />
      </nav>
    </header>
  );
}
