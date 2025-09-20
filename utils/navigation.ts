import type { ParsedUrlQuery } from "querystring";
import type { NextRouter } from "next/router";

export const SETTINGS_SECTIONS = [
  "appearance",
  "accessibility",
  "privacy",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const isSettingsSection = (value: unknown): value is SettingsSection =>
  typeof value === "string" && SETTINGS_SECTIONS.includes(value as SettingsSection);

export const getSettingsHref = (section: SettingsSection = "appearance") =>
  `/apps/settings?tab=${section}`;

export const navigateToSettings = (
  router: NextRouter,
  section: SettingsSection = "appearance",
) => {
  router.push(getSettingsHref(section));
};

export const getSettingsSectionFromQuery = (
  query: ParsedUrlQuery,
): SettingsSection | null => {
  const value = query.tab ?? query.section;
  const candidate = Array.isArray(value) ? value[0] : value;
  if (isSettingsSection(candidate)) {
    return candidate;
  }
  return null;
};
