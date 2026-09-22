"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  useSettings,
  ACCENT_OPTIONS,
  type SettingsContextValue,
} from "../../../hooks/useSettings";
import { resetSettings } from "../../../utils/settingsStore";
import { writeRecentAppIds } from "../../../utils/recentStorage";
import { getAudioContext, playColorTone } from "../../../utils/audio";
import {
  BACKUP_LIMIT,
  PROFILE_LIMIT,
  PROFILES_KEY,
  SNAPSHOT_DEFAULTS,
  WORKSPACE_MODES,
  THEMES,
  WALLPAPERS,
  WALLPAPER_NAMES,
  accentForeground,
  parseBackup,
  exportBackup,
  parseProfiles,
  saveProfiles,
  preferenceChanges,
  displayValue,
  type SettingsSnapshot,
  type SettingsProfile,
} from "../../../lib/settings/model";
import {
  Card,
  Icon,
  Modal,
  Row,
  Segmented,
  Slider,
  Switch,
  type IconName,
} from "./Controls";
import styles from "./SettingsCenter.module.css";

type Section =
  | "home"
  | "appearance"
  | "display"
  | "input"
  | "sound"
  | "privacy"
  | "profiles"
  | "system";
const SECTIONS: {
  id: Section;
  name: string;
  description: string;
  group: string;
  icon: IconName;
}[] = [
  {
    id: "home",
    name: "Overview",
    description: "Your space. Your preferences.",
    group: "Workspace",
    icon: "home",
  },
  {
    id: "appearance",
    name: "Personalization",
    description:
      "A desktop that feels like yours. Preview every change as you make it.",
    group: "Workspace",
    icon: "appearance",
  },
  {
    id: "display",
    name: "Display & accessibility",
    description: "Find the right balance of space, clarity, and comfort.",
    group: "Workspace",
    icon: "display",
  },
  {
    id: "input",
    name: "Input & shortcuts",
    description: "Make every click and keystroke feel more deliberate.",
    group: "Workspace",
    icon: "input",
  },
  {
    id: "sound",
    name: "Sound & feedback",
    description: "Set the level of feedback that works for you.",
    group: "Preferences",
    icon: "sound",
  },
  {
    id: "privacy",
    name: "Privacy & network",
    description: "Understand what stays here and what connects outside.",
    group: "Preferences",
    icon: "privacy",
  },
  {
    id: "profiles",
    name: "Profiles & backup",
    description:
      "Save a setup, switch contexts, and take your preferences with you.",
    group: "Management",
    icon: "profiles",
  },
  {
    id: "system",
    name: "System",
    description: "Desktop behavior and information about this browser session.",
    group: "Management",
    icon: "system",
  },
];
export const SETTINGS_INDEX: {
  key: string;
  section: Section;
  label: string;
  keywords: string;
}[] = [
  {
    key: "theme",
    section: "appearance",
    label: "Desktop theme",
    keywords: "appearance dark midnight neon matrix color scheme",
  },
  {
    key: "accent",
    section: "appearance",
    label: "Accent color",
    keywords: "personalization blue red orange green purple pink custom colour",
  },
  {
    key: "wallpaper",
    section: "appearance",
    label: "Wallpaper gallery",
    keywords: "background photo forest dunes image",
  },
  {
    key: "useKaliWallpaper",
    section: "appearance",
    label: "Kali gradient wallpaper",
    keywords: "background wallpaper gradient",
  },
  {
    key: "wallpaperFit",
    section: "appearance",
    label: "Wallpaper fit",
    keywords: "background fill fit cover contain crop",
  },
  {
    key: "wallpaperDim",
    section: "appearance",
    label: "Wallpaper dimming",
    keywords: "brightness background darken",
  },
  {
    key: "fontScale",
    section: "display",
    label: "Text size",
    keywords: "font scale zoom accessibility display",
  },
  {
    key: "density",
    section: "display",
    label: "Interface density",
    keywords: "compact regular spacing display",
  },
  {
    key: "reducedMotion",
    section: "display",
    label: "Reduce motion",
    keywords: "animations movement effects accessibility",
  },
  {
    key: "reduceTransparency",
    section: "display",
    label: "Reduce transparency",
    keywords: "blur glass opacity readability performance",
  },
  {
    key: "highContrast",
    section: "display",
    label: "High contrast",
    keywords: "readability visibility accessibility text",
  },
  {
    key: "largeHitAreas",
    section: "input",
    label: "Larger click targets",
    keywords: "touch mouse pointer hit areas buttons accessibility",
  },
  {
    key: "strongFocus",
    section: "input",
    label: "Stronger keyboard focus",
    keywords: "input focus outline tab accessibility",
  },
  {
    key: "shortcuts",
    section: "input",
    label: "Keyboard shortcuts",
    keywords: "keymap keyboard input window switcher search",
  },
  {
    key: "volume",
    section: "sound",
    label: "App volume",
    keywords: "mute sound audio speaker level",
  },
  {
    key: "haptics",
    section: "sound",
    label: "Haptic feedback",
    keywords: "vibration feedback touch sound",
  },
  {
    key: "pongSpin",
    section: "sound",
    label: "Pong spin effects",
    keywords: "game play ball interaction effects",
  },
  {
    key: "network",
    section: "privacy",
    label: "Optional external requests",
    keywords: "allow network internet privacy connections permissions youtube",
  },
  {
    key: "suggestions",
    section: "privacy",
    label: "Launcher suggestions",
    keywords: "recent history clear privacy",
  },
  {
    key: "profiles",
    section: "profiles",
    label: "Saved profiles",
    keywords: "configuration named save setup focus presentation preset",
  },
  {
    key: "backup",
    section: "profiles",
    label: "Import or export preferences",
    keywords: "json backup restore file download upload migrate",
  },
  {
    key: "reset",
    section: "profiles",
    label: "Reset desktop preferences",
    keywords: "restore default factory settings reset",
  },
  {
    key: "clockFormat",
    section: "system",
    label: "Clock format",
    keywords: "time hours 12 24 date system",
  },
  {
    key: "showSeconds",
    section: "system",
    label: "Show seconds",
    keywords: "clock time system",
  },
  {
    key: "fullscreen",
    section: "system",
    label: "Browser fullscreen",
    keywords: "display screen maximize",
  },
  {
    key: "browser",
    section: "system",
    label: "About this desktop",
    keywords:
      "storage viewport resolution browser system information timezone offline",
  },
];
export function searchSettings(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length
    ? SETTINGS_INDEX.filter((item) =>
        words.every((word) =>
          `${item.label} ${item.keywords}`.toLowerCase().includes(word),
        ),
      )
    : [];
}
function snapshotOf(settings: SettingsContextValue): SettingsSnapshot {
  const values = { ...settings, ...settings.workspacePreferences };
  return Object.fromEntries(
    Object.keys(SNAPSHOT_DEFAULTS).map((key) => [
      key,
      values[key as keyof typeof values],
    ]),
  ) as unknown as SettingsSnapshot;
}
const THEME_NAMES = {
  default: "Kali",
  dark: "Midnight",
  neon: "Neon",
  matrix: "Matrix",
};
const ACCENT_NAMES = ["Kali blue", "Red", "Amber", "Green", "Violet", "Pink"];
const SHORTCUTS = [
  ["Find a setting", "Ctrl / ⌘ + F"],
  ["Switch windows", "Alt + Tab"],
  ["Open application launcher", "Ctrl + Esc"],
  ["Snap a window", "Super + Arrow"],
  ["Taskbar navigation", "← → Home End"],
  ["Dismiss a dialog", "Esc"],
];
type DialogState =
  | { kind: "apply"; title: string; patch: Partial<SettingsSnapshot> }
  | { kind: "reset" | "suggestions"; title: string }
  | { kind: "delete" | "rename"; title: string; profile: SettingsProfile };

function DesktopPreview({
  settings,
  compact = false,
}: {
  settings: SettingsContextValue;
  compact?: boolean;
}) {
  const { workspacePreferences: workspace, desktopTheme } = settings;
  return (
    <div
      className={`${styles.preview} ${compact ? styles.previewCompact : ""}`}
      aria-label="Desktop appearance preview"
      role="img"
    >
      {settings.useKaliWallpaper ? (
        <div className={styles.gradientWallpaper} />
      ) : (
        <img
          src={`/wallpapers/${settings.wallpaper}.webp`}
          alt=""
          style={{ objectFit: workspace.wallpaperFit }}
        />
      )}
      <div
        className={styles.previewOverlay}
        style={{ background: desktopTheme.overlay }}
      />
      <div
        className={styles.previewOverlay}
        style={{ background: "#000", opacity: workspace.wallpaperDim / 100 }}
      />
      <div className={styles.previewBar}>
        <span>Applications</span>
        <span>Kali workspace</span>
        <span>09:41</span>
      </div>
      <div className={styles.previewWindow}>
        <div>
          <i />
          <i />
          <i />
          <span>Workspace</span>
        </div>
        <section>
          <b />
          <article>
            <span />
            <span />
            <span />
          </article>
        </section>
      </div>
      <div className={styles.previewDock}>
        {["home", "profiles", "appearance"].map((name) => (
          <Icon key={name} name={name as IconName} />
        ))}
      </div>
    </div>
  );
}

export default function SettingsCenter() {
  const settings = useSettings();
  const current = snapshotOf(settings);
  const [active, setActive] = useState<Section>("home");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<SettingsSnapshot | null>(null);
  const [profiles, setProfiles] = useState<SettingsProfile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [rename, setRename] = useState("");
  const [busy, setBusy] = useState(false);
  const [capabilities, setCapabilities] = useState({
    fullscreen: false,
    haptics: false,
    audio: false,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const [browser, setBrowser] = useState({
    viewport: "Checking…",
    timezone: "Checking…",
    online: true,
  });
  const [storageEstimate, setStorageEstimate] = useState("Not measured");
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  const importSequence = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ids = useId();
  const results = useMemo(() => searchSettings(query), [query]);
  const section = SECTIONS.find((item) => item.id === active)!;
  const searching = !!query.trim();
  const report = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 5000);
  };
  const update = (
    patch: Partial<SettingsSnapshot>,
    message = "Preference updated",
  ) => {
    setUndo(current);
    settings.applySnapshot(patch);
    report(message);
  };
  const navigate = (id: Section, setting: string | null = null) => {
    setActive(id);
    setQuery("");
    setTarget(setting);
    if (content.current) content.current.scrollTop = 0;
  };
  const openDialog = (next: DialogState) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setError("");
    setRename(next.kind === "rename" ? next.profile.name : "");
    setDialog(next);
  };
  const dismiss = () => {
    if (!busy) {
      setDialog(null);
      setError("");
    }
  };
  const commitProfiles = (next: SettingsProfile[]) => {
    try {
      const stored = parseProfiles(window.localStorage.getItem(PROFILES_KEY));
      if (JSON.stringify(stored) !== JSON.stringify(profiles)) {
        setProfiles(stored);
        setError(
          "Profiles changed in another tab. Review the updated list and try again.",
        );
        return false;
      }
      saveProfiles(window.localStorage, next);
      setProfiles(next);
      return true;
    } catch {
      setError(
        "Profiles could not be saved. Browser storage may be blocked or full. Export a backup instead.",
      );
      return false;
    }
  };
  useEffect(() => {
    mounted.current = true;
    try {
      setProfiles(parseProfiles(window.localStorage.getItem(PROFILES_KEY)));
    } catch {
      setError(
        "Saved profiles could not be read. Your current preferences and other app data have not been changed.",
      );
    }
    setCapabilities({
      fullscreen: !!document.fullscreenEnabled,
      haptics: typeof navigator.vibrate === "function",
      audio: !!(
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: unknown })
          .webkitAudioContext
      ),
    });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setBrowser({
          viewport: `${window.innerWidth} × ${window.innerHeight} CSS pixels`,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Browser default",
          online: navigator.onLine,
        }),
      );
    };
    const syncFullscreen = () => setFullscreen(!!document.fullscreenElement);
    const syncProfiles = (event: StorageEvent) => {
      if (event.key === PROFILES_KEY) {
        try {
          setProfiles(parseProfiles(event.newValue));
        } catch {
          setError(
            "Another tab saved an invalid profile. Reload before saving profiles.",
          );
        }
      }
    };
    measure();
    syncFullscreen();
    window.addEventListener("resize", measure);
    window.addEventListener("online", measure);
    window.addEventListener("offline", measure);
    window.addEventListener("storage", syncProfiles);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      mounted.current = false;
      cancelAnimationFrame(frame);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      window.removeEventListener("resize", measure);
      window.removeEventListener("online", measure);
      window.removeEventListener("offline", measure);
      window.removeEventListener("storage", syncProfiles);
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);
  useEffect(() => {
    if (!target || searching) return;
    const row = root.current?.querySelector<HTMLElement>(
      `[data-setting="${target}"]`,
    );
    row?.scrollIntoView({ block: "center", behavior: "auto" });
    row
      ?.querySelector<HTMLElement>("button, input, select")
      ?.focus({ preventScroll: true });
  }, [target, active, searching]);
  const doExport = () => {
    try {
      const blob = new Blob([exportBackup(current)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "kali-desktop-settings.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      report(
        "Preferences exported. App data and network permissions are not included.",
      );
    } catch {
      setError(
        "The backup could not be created. Try again in a supported browser.",
      );
    }
  };
  const doImport = async (file?: File) => {
    if (!file) return;
    const sequence = ++importSequence.current;
    setError("");
    try {
      if (file.size > BACKUP_LIMIT)
        throw new Error("Choose a settings file smaller than 64 KB.");
      const patch = parseBackup(await file.text());
      if (mounted.current && sequence === importSequence.current)
        openDialog({
          kind: "apply",
          title: "Review imported preferences",
          patch,
        });
    } catch (reason) {
      if (mounted.current && sequence === importSequence.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "The file could not be read.",
        );
    } finally {
      if (fileInput.current && sequence === importSequence.current)
        fileInput.current.value = "";
    }
  };
  const runDialog = async () => {
    if (!dialog || busy) return;
    setBusy(true);
    setError("");
    try {
      if (dialog.kind === "apply")
        update(
          dialog.patch,
          "Configuration applied. Network permissions are unchanged.",
        );
      if (dialog.kind === "reset") {
        await resetSettings();
        settings.applySnapshot(SNAPSHOT_DEFAULTS);
        settings.setAllowNetwork(false);
        setUndo(null);
        report("Desktop preferences reset. Profiles and app data were kept.");
      }
      if (dialog.kind === "suggestions") {
        writeRecentAppIds([]);
        report("Launcher suggestions cleared.");
      }
      if (
        dialog.kind === "delete" &&
        !commitProfiles(
          profiles.filter((profile) => profile.id !== dialog.profile.id),
        )
      )
        return;
      if (dialog.kind === "rename") {
        const name = rename.trim();
        if (!name || name.length > 40)
          throw new Error("Use a profile name between 1 and 40 characters.");
        if (
          !commitProfiles(
            profiles.map((profile) =>
              profile.id === dialog.profile.id ? { ...profile, name } : profile,
            ),
          )
        )
          return;
      }
      setDialog(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The change could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const changes =
    dialog?.kind === "apply" ? preferenceChanges(current, dialog.patch) : [];
  const selectedName = settings.useKaliWallpaper
    ? "Kali gradient"
    : WALLPAPER_NAMES[WALLPAPERS.indexOf(settings.wallpaper)] || "Kali blue";
  const modeCards = (
    <div className={styles.modeGrid}>
      {WORKSPACE_MODES.map((mode) => (
        <button
          type="button"
          className={styles.mode}
          key={mode.id}
          onClick={() =>
            openDialog({
              kind: "apply",
              title: `Switch to ${mode.name}`,
              patch: mode.settings,
            })
          }
        >
          <span className={styles.modeSymbol}>
            <Icon
              name={
                mode.id === "focus"
                  ? "privacy"
                  : mode.id === "present"
                    ? "display"
                    : "home"
              }
            />
          </span>
          <strong>{mode.name}</strong>
          <span>{mode.description}</span>
          <small>
            Review changes <Icon name="arrow" />
          </small>
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={root}
      data-testid="settings-center"
      data-density={settings.density}
      className={`${styles.root} windowMainScreen`}
      style={
        {
          "--sc-accent": settings.accent,
          "--sc-on-accent": accentForeground(settings.accent),
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "f"
        ) {
          event.preventDefault();
          event.stopPropagation();
          search.current?.focus();
        }
      }}
    >
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>
              <Icon name="appearance" />
            </span>
            <div>
              <strong>Settings</strong>
              <small>Kali workspace</small>
            </div>
          </div>
          <div className={styles.searchBox}>
            <Icon name="search" />
            <label htmlFor={`${ids}-search`} className={styles.srOnly}>
              Search settings
            </label>
            <input
              ref={search}
              id={`${ids}-search`}
              aria-label="Search settings"
              type="search"
              placeholder="Find a setting"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  event.stopPropagation();
                  setQuery("");
                }
              }}
            />
          </div>
          <nav className={styles.navigation} aria-label="Settings categories">
            {["Workspace", "Preferences", "Management"].map((group) => (
              <div key={group}>
                <p>{group}</p>
                {SECTIONS.filter((item) => item.group === group).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    aria-current={
                      !searching && active === item.id ? "page" : undefined
                    }
                  >
                    <Icon name={item.icon} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <label className={styles.mobileNav}>
            <span className={styles.srOnly}>Settings category</span>
            <select
              value={active}
              onChange={(event) => navigate(event.target.value as Section)}
            >
              {SECTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.sidebarFoot}>
            <Icon name="privacy" />
            <div>
              <strong>Your browser. Your space.</strong>
              <small>Preferences stay on this device.</small>
            </div>
          </div>
        </aside>
        <div className={styles.main}>
          <header className={styles.topbar}>
            <span>
              Settings <b>/</b> {searching ? "Search" : section.name}
            </span>
            <div>
              {undo && (
                <button
                  type="button"
                  onClick={() => {
                    settings.applySnapshot(undo);
                    setUndo(null);
                    report("Last preference change undone.");
                  }}
                >
                  <Icon name="reset" />
                  Undo
                </button>
              )}
              <span className={styles.localBadge}>
                <i /> {settings.storageError ? "Session only" : "This browser"}
              </span>
            </div>
          </header>
          <div ref={content} className={styles.scroll}>
            <div className={styles.content}>
              {error && !dialog && (
                <div role="alert" className={styles.error}>
                  {error}
                  <button
                    type="button"
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    ×
                  </button>
                </div>
              )}
              {settings.storageError && (
                <div role="status" className={styles.warning}>
                  Browser storage is unavailable or contains an invalid
                  preference. Changes still work in this session. Export a
                  backup before leaving.
                </div>
              )}
              <div className={styles.pageHeading}>
                <p>{searching ? "FIND YOUR PREFERENCE" : "CONTROL CENTER"}</p>
                <h1>{searching ? "Search settings" : section.name}</h1>
                <div>
                  {searching
                    ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${query.trim()}”`
                    : section.description}
                </div>
              </div>
              <fieldset
                disabled={!settings.preferencesReady || busy}
                className={styles.contentFieldset}
                aria-label="Desktop preferences"
              >
                <legend className={styles.srOnly}>Desktop preferences</legend>
                {searching ? (
                  <div className={styles.searchResults}>
                    {!results.length ? (
                      <Card>
                        <div className={styles.empty}>
                          <Icon name="search" />
                          <h3>No settings found</h3>
                          <p>Try “wallpaper”, “text size”, or “backup”.</p>
                          <button
                            type="button"
                            className={styles.secondary}
                            onClick={() => setQuery("")}
                          >
                            Clear search
                          </button>
                        </div>
                      </Card>
                    ) : (
                      <Card>
                        {results.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className={styles.searchResult}
                            onClick={() => navigate(item.section, item.key)}
                          >
                            <Icon
                              name={
                                SECTIONS.find(
                                  (entry) => entry.id === item.section,
                                )!.icon
                              }
                            />
                            <span>
                              <strong>{item.label}</strong>
                              <small>
                                {
                                  SECTIONS.find(
                                    (entry) => entry.id === item.section,
                                  )!.name
                                }
                              </small>
                            </span>
                            <Icon name="arrow" />
                          </button>
                        ))}
                      </Card>
                    )}
                  </div>
                ) : (
                  <>
                    {active === "home" && (
                      <>
                        <div className={styles.hero}>
                          <div>
                            <span className={styles.eyebrow}>
                              SETTLE INTO YOUR WORKSPACE
                            </span>
                            <h2>Make it yours.</h2>
                            <p>
                              A familiar desktop, tuned to the way you work.
                            </p>
                            <button
                              type="button"
                              className={styles.primary}
                              onClick={() => navigate("appearance")}
                            >
                              Personalize your desktop <Icon name="arrow" />
                            </button>
                            <small>
                              {THEME_NAMES[current.theme]} theme <b>·</b>{" "}
                              {selectedName}
                            </small>
                          </div>
                          <DesktopPreview settings={settings} compact />
                        </div>
                        <div className={styles.sectionHeading}>
                          <h2>A setup for every moment</h2>
                          <span>Review before applying</span>
                        </div>
                        {modeCards}
                        <div className={styles.twoColumns}>
                          <Card title="Everyday controls">
                            <Switch
                              name="reducedMotion"
                              title="Reduce motion"
                              description="Keep transitions calm and predictable."
                              value={settings.reducedMotion}
                              onChange={(value) =>
                                update({ reducedMotion: value })
                              }
                            />
                            <Row
                              name="volume"
                              title="App volume"
                              description="Built-in sounds, not device volume."
                            >
                              <Slider
                                label="App volume"
                                value={settings.volume}
                                min={0}
                                max={100}
                                unit="%"
                                onChange={(value) => update({ volume: value })}
                              />
                            </Row>
                          </Card>
                          <Card title="Keep a setup you like">
                            <div className={styles.inset}>
                              <span className={styles.featureIcon}>
                                <Icon name="profiles" />
                              </span>
                              <p>
                                Save named profiles or create a portable backup.
                                Notes, game progress, and permissions stay
                                separate.
                              </p>
                              <button
                                type="button"
                                className={styles.textButton}
                                onClick={() => navigate("profiles")}
                              >
                                Manage profiles & backup <Icon name="arrow" />
                              </button>
                            </div>
                          </Card>
                        </div>
                      </>
                    )}
                    {active === "appearance" && (
                      <>
                        <Card className={styles.appearancePreview}>
                          <DesktopPreview settings={settings} />
                          <div>
                            <span className={styles.eyebrow}>
                              LIVE APPEARANCE
                            </span>
                            <h2>{THEME_NAMES[current.theme]} workspace</h2>
                            <p>{selectedName} wallpaper</p>
                            <small>
                              Changes apply immediately to your desktop.
                            </small>
                          </div>
                        </Card>
                        <Card
                          title="Choose your theme"
                          description="A coordinated starting point. Your accent and wallpaper remain customizable."
                        >
                          <div
                            className={styles.themeGrid}
                            data-setting="theme"
                          >
                            <fieldset>
                              <legend className={styles.srOnly}>
                                Desktop theme
                              </legend>
                              {THEMES.map((option) => (
                                <label
                                  key={option}
                                  className={styles.themeCard}
                                  data-active={settings.theme === option}
                                >
                                  <input
                                    type="radio"
                                    aria-label={THEME_NAMES[option]}
                                    name={`${ids}-theme`}
                                    checked={settings.theme === option}
                                    onChange={() => {
                                      setUndo(current);
                                      settings.setTheme(option);
                                      report(
                                        `${THEME_NAMES[option]} theme applied.`,
                                      );
                                    }}
                                  />
                                  <span
                                    className={`${styles.themeMini} ${styles[option]}`}
                                  >
                                    <i />
                                    <b />
                                    <em />
                                  </span>
                                  <span>
                                    {THEME_NAMES[option]}{" "}
                                    {settings.theme === option && (
                                      <Icon name="check" />
                                    )}
                                  </span>
                                </label>
                              ))}
                            </fieldset>
                          </div>
                          <div
                            className={styles.accentRow}
                            data-setting="accent"
                          >
                            <div>
                              <h4>Accent color</h4>
                              <p>Highlights, selection, and window controls.</p>
                            </div>
                            <fieldset className={styles.swatches}>
                              <legend className={styles.srOnly}>
                                Accent color
                              </legend>
                              {ACCENT_OPTIONS.map((color, i) => (
                                <label
                                  key={color}
                                  style={{ "--swatch": color } as CSSProperties}
                                  data-active={
                                    settings.accent.toLowerCase() ===
                                    color.toLowerCase()
                                  }
                                >
                                  <input
                                    type="radio"
                                    name={`${ids}-accent`}
                                    aria-label={ACCENT_NAMES[i]}
                                    checked={
                                      settings.accent.toLowerCase() ===
                                      color.toLowerCase()
                                    }
                                    onChange={() => update({ accent: color })}
                                  />
                                  <span>
                                    {settings.accent.toLowerCase() ===
                                      color.toLowerCase() && (
                                      <Icon name="check" />
                                    )}
                                  </span>
                                </label>
                              ))}
                              <label className={styles.customAccent}>
                                <input
                                  type="color"
                                  value={settings.accent}
                                  onChange={(event) =>
                                    update({ accent: event.target.value })
                                  }
                                  aria-label="Custom accent color"
                                />
                                <span>+</span>
                              </label>
                            </fieldset>
                            <code>{settings.accent.toUpperCase()}</code>
                          </div>
                        </Card>
                        <Card
                          title="Wallpaper"
                          description="A curated collection, stored with this desktop."
                        >
                          <div
                            className={styles.wallpaperGrid}
                            data-setting="wallpaper"
                          >
                            {WALLPAPERS.map((name, i) => (
                              <button
                                key={name}
                                type="button"
                                aria-label={WALLPAPER_NAMES[i]}
                                aria-pressed={
                                  !settings.useKaliWallpaper &&
                                  settings.wallpaper === name
                                }
                                onClick={() =>
                                  update({
                                    wallpaper: name,
                                    useKaliWallpaper: false,
                                  })
                                }
                              >
                                <img
                                  src={`/wallpapers/${name}.webp`}
                                  alt=""
                                  loading="lazy"
                                />
                                <span>
                                  {WALLPAPER_NAMES[i]}
                                  {!settings.useKaliWallpaper &&
                                    settings.wallpaper === name && (
                                      <Icon name="check" />
                                    )}
                                </span>
                              </button>
                            ))}
                          </div>
                          <Switch
                            name="useKaliWallpaper"
                            title="Kali gradient wallpaper"
                            description="Use the generated blue gradient instead of a photo."
                            value={settings.useKaliWallpaper}
                            onChange={(value) =>
                              update({ useKaliWallpaper: value })
                            }
                          />
                          <Row
                            name="wallpaperFit"
                            title="Wallpaper fit"
                            description="Fill crops the image; Fit keeps the entire image visible."
                          >
                            <Segmented
                              label="Wallpaper fit"
                              value={current.wallpaperFit}
                              options={[
                                { value: "cover", label: "Fill" },
                                { value: "contain", label: "Fit" },
                              ]}
                              onChange={(value) =>
                                update({ wallpaperFit: value })
                              }
                            />
                          </Row>
                          <Row
                            name="wallpaperDim"
                            title="Wallpaper dimming"
                            description="Darkens only the desktop background, not your display hardware."
                          >
                            <Slider
                              label="Wallpaper dimming"
                              value={current.wallpaperDim}
                              min={0}
                              max={70}
                              step={5}
                              unit="%"
                              onChange={(value) =>
                                update({ wallpaperDim: value })
                              }
                            />
                          </Row>
                        </Card>
                      </>
                    )}
                    {active === "display" && (
                      <>
                        <Card title="Size & space">
                          <Row
                            name="fontScale"
                            title="Text size"
                            description="Scale desktop text from 75% to 150%. Your browser zoom is unchanged."
                          >
                            <Slider
                              label="Text size"
                              value={Math.round(current.fontScale * 100)}
                              min={75}
                              max={150}
                              step={5}
                              unit="%"
                              onChange={(value) =>
                                update({ fontScale: value / 100 })
                              }
                            />
                          </Row>
                          <div className={styles.typePreview}>
                            <span>Aa</span>
                            <div>
                              <strong>Clarity in every detail.</strong>
                              <p>Preview text at your current desktop size.</p>
                            </div>
                          </div>
                          <Row
                            name="density"
                            title="Interface density"
                            description="Adjust spacing in Settings and desktop controls using the shared spacing scale."
                          >
                            <Segmented
                              label="Interface density"
                              value={current.density}
                              options={[
                                { value: "regular", label: "Regular" },
                                { value: "compact", label: "Compact" },
                              ]}
                              onChange={(value) => update({ density: value })}
                            />
                          </Row>
                        </Card>
                        <Card title="Visual comfort">
                          <Switch
                            name="reducedMotion"
                            title="Reduce motion"
                            description="Reduce desktop animations. A system-level reduced-motion preference is always respected."
                            value={current.reducedMotion}
                            onChange={(value) =>
                              update({ reducedMotion: value })
                            }
                          />
                          <Switch
                            name="reduceTransparency"
                            title="Reduce transparency"
                            description="Use opaque desktop panels instead of translucent, blurred surfaces."
                            value={current.reduceTransparency}
                            onChange={(value) =>
                              update({ reduceTransparency: value })
                            }
                          />
                          <Switch
                            name="highContrast"
                            title="High contrast"
                            description="Increase separation between text, backgrounds, and controls."
                            value={current.highContrast}
                            onChange={(value) =>
                              update({ highContrast: value })
                            }
                          />
                        </Card>
                        <div className={styles.note}>
                          <Icon name="system" />
                          <p>
                            These preferences affect this web desktop.
                            Resolution, monitor brightness, and operating-system
                            accessibility are managed by your device.
                          </p>
                        </div>
                      </>
                    )}
                    {active === "input" && (
                      <>
                        <Card title="Pointer & keyboard focus">
                          <Switch
                            name="largeHitAreas"
                            title="Larger click targets"
                            description="Increase shared desktop targets for more comfortable touch and pointer input."
                            value={current.largeHitAreas}
                            onChange={(value) =>
                              update({ largeHitAreas: value })
                            }
                          />
                          <Switch
                            name="strongFocus"
                            title="Stronger keyboard focus"
                            description="Add a more prominent outline to the control reached with your keyboard."
                            value={current.strongFocus}
                            onChange={(value) => update({ strongFocus: value })}
                          />
                          <div className={styles.inputPreview}>
                            <label htmlFor={`${ids}-practice`}>
                              Try your keyboard
                            </label>
                            <input
                              id={`${ids}-practice`}
                              aria-label="Try your keyboard"
                              placeholder="Click here, type, then press Tab"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              className={styles.secondary}
                              onClick={() =>
                                report(
                                  "Keyboard focus is working. This field is not saved.",
                                )
                              }
                            >
                              Test focus
                            </button>
                          </div>
                        </Card>
                        <Card
                          title="Keyboard shortcuts"
                          description="Built-in desktop commands. Some keys may be reserved by your browser or operating system."
                        >
                          <div
                            className={styles.shortcuts}
                            data-setting="shortcuts"
                          >
                            {SHORTCUTS.map(([label, keys]) => (
                              <div key={label}>
                                <span>{label}</span>
                                <kbd>{keys}</kbd>
                              </div>
                            ))}
                          </div>
                        </Card>
                        <div className={styles.note}>
                          <Icon name="input" />
                          <p>
                            Keyboard layout, pointer speed, and hardware key
                            remapping belong to your device settings. Nothing
                            typed into the test field is stored or sent.
                          </p>
                        </div>
                      </>
                    )}
                    {active === "sound" && (
                      <>
                        <Card title="Desktop audio">
                          <Row
                            name="volume"
                            title="App volume"
                            description="Controls supported built-in game and desktop sounds. Embedded videos have their own volume."
                          >
                            <Slider
                              label="App volume"
                              value={current.volume}
                              min={0}
                              max={100}
                              unit="%"
                              onChange={(value) => update({ volume: value })}
                            />
                          </Row>
                          <div className={styles.audioActions}>
                            <button
                              type="button"
                              className={styles.secondary}
                              onClick={() =>
                                update({ volume: current.volume ? 0 : 50 })
                              }
                            >
                              {current.volume ? "Mute apps" : "Unmute apps"}
                            </button>
                            <button
                              type="button"
                              className={styles.secondary}
                              disabled={
                                !capabilities.audio || current.volume === 0
                              }
                              onClick={() => {
                                try {
                                  const ctx = getAudioContext();
                                  playColorTone(0, ctx.currentTime, 0.2);
                                  report(
                                    "Preview tone played at your app volume.",
                                  );
                                } catch {
                                  setError(
                                    "Audio preview is unavailable in this browser.",
                                  );
                                }
                              }}
                            >
                              Play test sound
                            </button>
                            <span>
                              {current.volume === 0
                                ? "Apps are muted"
                                : !capabilities.audio
                                  ? "Audio preview unavailable"
                                  : "Plays only when requested"}
                            </span>
                          </div>
                        </Card>
                        <Card title="Feedback">
                          <Switch
                            name="haptics"
                            title="Haptic feedback"
                            description={
                              capabilities.haptics
                                ? "Allow supported apps to provide vibration feedback on this device."
                                : "Your browser does not expose vibration. The preference is retained for supported devices."
                            }
                            value={current.haptics}
                            onChange={(value) => update({ haptics: value })}
                          />
                          <Switch
                            name="pongSpin"
                            title="Pong spin effects"
                            description="Enable spin interactions in the built-in Pong game."
                            value={current.pongSpin}
                            onChange={(value) => update({ pongSpin: value })}
                          />
                        </Card>
                      </>
                    )}
                    {active === "privacy" && (
                      <>
                        <div className={styles.privacyHero}>
                          <span className={styles.featureIcon}>
                            <Icon name="privacy" />
                          </span>
                          <div>
                            <h2>Local by design.</h2>
                            <p>
                              Desktop preferences and saved profiles stay in
                              this browser. They do not sync to an account.
                            </p>
                          </div>
                        </div>
                        <Card title="Connections">
                          <Switch
                            name="network"
                            title="Optional external requests"
                            description="Allow optional requests from apps to external sites. YouTube and approved GitHub reads work without enabling this."
                            value={settings.allowNetwork}
                            onChange={(value) => {
                              settings.setAllowNetwork(value);
                              report(
                                value
                                  ? "Optional external requests enabled."
                                  : "Optional external requests disabled. YouTube remains available.",
                              );
                            }}
                          />
                          <div className={styles.connection}>
                            <Icon name="check" />
                            <div>
                              <strong>YouTube opens connected</strong>
                              <p>
                                Playlists are requested when you open YouTube.
                                No extra network-enable step.
                              </p>
                            </div>
                            <span>Automatic</span>
                          </div>
                        </Card>
                        <Card title="Browser-local data">
                          <Row
                            name="suggestions"
                            title="Launcher suggestions"
                            description="Clear recent-app suggestions without removing applications or their saved data."
                          >
                            <button
                              type="button"
                              className={styles.secondary}
                              onClick={() =>
                                openDialog({
                                  kind: "suggestions",
                                  title: "Clear launcher suggestions?",
                                })
                              }
                            >
                              Clear suggestions…
                            </button>
                          </Row>
                          <Row
                            name="backup"
                            title="Preferences backup"
                            description="Move only your desktop preferences. Permissions, notes, and game progress are excluded."
                          >
                            <button
                              type="button"
                              className={styles.textButton}
                              onClick={() => navigate("profiles")}
                            >
                              Manage backups <Icon name="arrow" />
                            </button>
                          </Row>
                        </Card>
                        <div className={styles.note}>
                          <Icon name="system" />
                          <p>
                            This control governs the desktop’s optional fetch
                            requests, not all browser traffic. Opening embedded
                            content contacts its provider. Site analytics and
                            device permissions are not changed here.
                          </p>
                        </div>
                      </>
                    )}
                    {active === "profiles" && (
                      <>
                        <div className={styles.sectionHeading}>
                          <h2>Workspace modes</h2>
                          <span>Permissions stay unchanged</span>
                        </div>
                        {modeCards}
                        <Card
                          title="Your saved profiles"
                          description={`${profiles.length} of ${PROFILE_LIMIT} profiles · Stored only in this browser`}
                        >
                          <div
                            className={styles.profileForm}
                            data-setting="profiles"
                          >
                            <label htmlFor={`${ids}-profile`}>
                              Profile name
                            </label>
                            <div>
                              <input
                                id={`${ids}-profile`}
                                aria-label="Profile name"
                                value={profileName}
                                maxLength={40}
                                placeholder="e.g. Evening workspace"
                                onChange={(event) =>
                                  setProfileName(event.target.value)
                                }
                              />
                              <button
                                type="button"
                                className={styles.primary}
                                disabled={
                                  !profileName.trim() ||
                                  profiles.length >= PROFILE_LIMIT
                                }
                                onClick={() => {
                                  const id =
                                    typeof crypto.randomUUID === "function"
                                      ? crypto.randomUUID()
                                      : `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                                  if (
                                    commitProfiles([
                                      ...profiles,
                                      {
                                        id,
                                        name: profileName.trim(),
                                        settings: current,
                                      },
                                    ])
                                  ) {
                                    setProfileName("");
                                    report("Current setup saved as a profile.");
                                  }
                                }}
                              >
                                Save profile
                              </button>
                            </div>
                          </div>
                          {!profiles.length && (
                            <p className={styles.profileEmpty}>
                              No saved profiles yet. Start with your current
                              setup.
                            </p>
                          )}
                          {profiles.map((profile) => (
                            <div key={profile.id} className={styles.profileRow}>
                              <Icon name="profiles" />
                              <div>
                                <strong>{profile.name}</strong>
                                <small>
                                  {THEME_NAMES[profile.settings.theme]} ·{" "}
                                  {Math.round(profile.settings.fontScale * 100)}
                                  % text · {profile.settings.volume}% volume
                                </small>
                              </div>
                              <div className={styles.profileActions}>
                                <button
                                  type="button"
                                  className={styles.secondary}
                                  aria-label={`Apply ${profile.name}`}
                                  onClick={() =>
                                    openDialog({
                                      kind: "apply",
                                      title: `Apply ${profile.name}`,
                                      patch: profile.settings,
                                    })
                                  }
                                >
                                  Apply…
                                </button>
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  aria-label={`Rename ${profile.name}`}
                                  onClick={() =>
                                    openDialog({
                                      kind: "rename",
                                      title: "Rename profile",
                                      profile,
                                    })
                                  }
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  aria-label={`Delete ${profile.name}`}
                                  onClick={() =>
                                    openDialog({
                                      kind: "delete",
                                      title: "Delete saved profile?",
                                      profile,
                                    })
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </Card>
                        <Card
                          title="Backup & restore"
                          description="Versioned JSON backups. Every imported value is checked before you review the changes."
                        >
                          <div
                            className={styles.backupGrid}
                            data-setting="backup"
                          >
                            <button type="button" onClick={doExport}>
                              <Icon name="download" />
                              <strong>Export preferences</strong>
                              <span>Download your current configuration</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInput.current?.click()}
                            >
                              <Icon name="upload" />
                              <strong>Import preferences…</strong>
                              <span>Review a JSON file up to 64 KB</span>
                            </button>
                          </div>
                          <input
                            ref={fileInput}
                            className={styles.srOnly}
                            tabIndex={-1}
                            type="file"
                            accept=".json,application/json"
                            aria-label="Import settings file"
                            onChange={(event) => {
                              void doImport(event.target.files?.[0]);
                            }}
                          />
                          <p className={styles.backupNote}>
                            Network permissions, saved profiles, and other app
                            data are never changed by an import.
                          </p>
                        </Card>
                        <Card>
                          <Row
                            name="reset"
                            title="Reset desktop preferences"
                            description="Restore default personalization, accessibility, audio, and optional-network preferences. Profiles and app data are kept."
                          >
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() =>
                                openDialog({
                                  kind: "reset",
                                  title: "Reset desktop preferences?",
                                })
                              }
                            >
                              Reset preferences…
                            </button>
                          </Row>
                        </Card>
                      </>
                    )}
                    {active === "system" && (
                      <>
                        <Card title="Time & desktop">
                          <Row
                            name="clockFormat"
                            title="Clock format"
                            description="Use the browser’s locale, or choose a 12- or 24-hour clock."
                          >
                            <Segmented
                              label="Clock format"
                              value={current.clockFormat}
                              options={[
                                { value: "system", label: "Automatic" },
                                { value: "12", label: "12-hour" },
                                { value: "24", label: "24-hour" },
                              ]}
                              onChange={(value) =>
                                update({ clockFormat: value })
                              }
                            />
                          </Row>
                          <Switch
                            name="showSeconds"
                            title="Show seconds"
                            description="Show seconds in the desktop clock. Updates once a second while enabled."
                            value={current.showSeconds}
                            onChange={(value) => update({ showSeconds: value })}
                          />
                          <Row
                            name="fullscreen"
                            title="Browser fullscreen"
                            description={
                              capabilities.fullscreen
                                ? "Use the browser’s fullscreen mode. Escape returns to your normal view."
                                : "Fullscreen is not available in this browser or embedding context."
                            }
                          >
                            <button
                              type="button"
                              className={styles.secondary}
                              disabled={!capabilities.fullscreen}
                              onClick={async () => {
                                try {
                                  if (document.fullscreenElement)
                                    await document.exitFullscreen();
                                  else
                                    await document.documentElement.requestFullscreen();
                                } catch {
                                  setError(
                                    "Fullscreen was not permitted by your browser.",
                                  );
                                }
                              }}
                            >
                              {fullscreen
                                ? "Exit fullscreen"
                                : "Enter fullscreen"}
                            </button>
                          </Row>
                        </Card>
                        <Card
                          title="About this desktop"
                          description="A web-based engineering portfolio, not access to your device’s operating system."
                        >
                          <dl
                            className={styles.systemInfo}
                            data-setting="browser"
                          >
                            <div>
                              <dt>Environment</dt>
                              <dd>Kali-inspired web desktop</dd>
                            </div>
                            <div>
                              <dt>Browser viewport</dt>
                              <dd>{browser.viewport}</dd>
                            </div>
                            <div>
                              <dt>Time zone</dt>
                              <dd>{browser.timezone}</dd>
                            </div>
                            <div>
                              <dt>Browser connection hint</dt>
                              <dd>
                                {browser.online ? "Online" : "Offline"}{" "}
                                <small>Not an API health check</small>
                              </dd>
                            </div>
                            <div>
                              <dt>Local preferences</dt>
                              <dd>
                                {settings.storageError
                                  ? "Session-only fallback"
                                  : "Stored in this browser"}
                              </dd>
                            </div>
                            <div>
                              <dt>Estimated site storage</dt>
                              <dd>
                                {storageEstimate}
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  onClick={async () => {
                                    try {
                                      const estimate =
                                        await navigator.storage?.estimate?.();
                                      if (mounted.current)
                                        setStorageEstimate(
                                          typeof estimate?.usage === "number"
                                            ? `${(estimate.usage / 1024 / 1024).toFixed(1)} MB used by this site`
                                            : "Not available in this browser",
                                        );
                                    } catch {
                                      if (mounted.current)
                                        setStorageEstimate(
                                          "Not available in this browser",
                                        );
                                    }
                                  }}
                                >
                                  Refresh estimate
                                </button>
                              </dd>
                            </div>
                          </dl>
                          <p className={styles.backupNote}>
                            Storage is an approximate, browser-provided site
                            estimate, not your device’s disk space. Private
                            browsing may discard it when the session ends.
                          </p>
                        </Card>
                      </>
                    )}
                  </>
                )}
              </fieldset>
              <footer className={styles.footer}>
                <Icon name="privacy" />
                <span>
                  Changes apply instantly. Preferences are stored locally when
                  browser storage is available.
                </span>
              </footer>
            </div>
          </div>
          <div className={styles.status} role="status" aria-live="polite">
            {notice ||
              (!settings.preferencesReady ? "Loading saved preferences…" : "")}
          </div>
        </div>
      </div>
      {dialog && (
        <Modal
          title={dialog.title}
          onDismiss={dismiss}
          returnFocus={returnFocus.current}
        >
          <div className={styles.dialogBody}>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {dialog.kind === "apply" && (
              <>
                <p>
                  {changes.length
                    ? `${changes.length} ${changes.length === 1 ? "preference will" : "preferences will"} change. Nothing changes until you apply.`
                    : "Your current setup already matches these preferences."}
                </p>
                <div className={styles.changeList}>
                  {changes.map((change) => (
                    <div key={change.key}>
                      <strong>{change.label}</strong>
                      <span>
                        {displayValue(change.before)}{" "}
                        <span aria-label="changes to">→</span>{" "}
                        {displayValue(change.after)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className={styles.dialogNote}>
                  Network permissions and other app data are not included.
                </p>
              </>
            )}
            {dialog.kind === "reset" && (
              <p>
                Restore desktop personalization, accessibility, sound, and
                optional-network preferences to defaults. Your saved profiles,
                notes, game progress, and YouTube watch-later list will be kept.
              </p>
            )}
            {dialog.kind === "suggestions" && (
              <p>
                Remove recent-app suggestions from the launcher. Installed apps
                and their saved data will be kept.
              </p>
            )}
            {dialog.kind === "delete" && (
              <p>
                Remove “{dialog.profile.name}” from saved profiles? Your current
                desktop preferences will not change.
              </p>
            )}
            {dialog.kind === "rename" && (
              <label className={styles.rename}>
                Profile name
                <input
                  aria-label="Profile name"
                  maxLength={40}
                  value={rename}
                  onChange={(event) => setRename(event.target.value)}
                />
              </label>
            )}
          </div>
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={dismiss}
              disabled={busy}
              data-initial-focus
            >
              Cancel
            </button>
            <button
              type="button"
              className={
                dialog.kind === "reset" || dialog.kind === "delete"
                  ? styles.dangerButton
                  : styles.primary
              }
              disabled={
                busy ||
                (dialog.kind === "apply" && changes.length === 0) ||
                (dialog.kind === "rename" && !rename.trim())
              }
              onClick={() => {
                void runDialog();
              }}
            >
              {busy
                ? "Applying…"
                : dialog.kind === "apply"
                  ? "Apply changes"
                  : dialog.kind === "reset"
                    ? "Reset preferences"
                    : dialog.kind === "delete"
                      ? "Delete profile"
                      : dialog.kind === "rename"
                        ? "Save name"
                        : "Clear suggestions"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
