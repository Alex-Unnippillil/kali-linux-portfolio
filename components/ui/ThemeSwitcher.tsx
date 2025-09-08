"use client";

import { useTheme } from "../../hooks/useTheme";
import ToggleSwitch from "../ToggleSwitch";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const handleChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <ToggleSwitch
      checked={isDark}
      onChange={handleChange}
      ariaLabel="Toggle theme"
      className="fixed z-50 bottom-2 right-2 sm:bottom-4 sm:right-4"
    />
  );
}
