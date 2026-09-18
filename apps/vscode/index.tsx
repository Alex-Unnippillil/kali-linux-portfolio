"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import useRepositoryWorkspace from "../../hooks/useRepositoryWorkspace";
import {
  fileSourceUrl,
  matchSourceFiles,
  REPOSITORY_URL,
  sourceParents,
  visibleSourceTree,
  type SourceFile,
  type TreeEntry,
} from "../../utils/repository-workspace";
import CodeEditor, { type EditorActions } from "./CodeEditor";
import Icon from "./Icons";
import styles from "./workspace.module.css";

type Panel = "explorer" | "search" | "changes";
const shortName = (path: string) => path.split("/").pop() || path;
const languageLabel = (language: string | undefined) =>
  (
    ({
      typescript: "TypeScript",
      javascript: "JavaScript",
      json: "JSON",
      css: "CSS",
      markdown: "Markdown",
      yaml: "YAML",
      html: "HTML",
      python: "Python",
      shell: "Shell",
      sql: "SQL",
      scss: "SCSS",
    }) as Record<string, string>
  )[language || ""] || "Plain Text";

export default function RepositoryEditor({
  initialPath = "README.md",
}: {
  initialPath?: string;
}) {
  const workspace = useRepositoryWorkspace(initialPath);
  const {
    manifest,
    activePath,
    tabs,
    documents,
    issue,
    busy,
    openFile,
    closeFile,
    edit,
    retry,
  } = workspace;
  const root = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorActions>(null);
  const [sidebar, setSidebar] = useState<"auto" | "open" | "closed">("auto");
  const [panel, setPanel] = useState<Panel>("explorer");
  const [expanded, setExpanded] = useState(new Set<string>());
  const [treeFocus, setTreeFocus] = useState("README.md");
  const treeButtons = useRef(new Map<string, HTMLButtonElement>());
  const [query, setQuery] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickIndex, setQuickIndex] = useState(0);
  const quickInput = useRef<HTMLInputElement>(null);
  const wasQuickOpen = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const quickTrigger = useRef<HTMLButtonElement>(null);
  const [wrap, setWrap] = useState(false);
  const [position, setPosition] = useState({ line: 1, column: 1 });
  const [announcement, setAnnouncement] = useState("");
  const quickId = useId();
  const files = useMemo(() => manifest?.files || [], [manifest]);
  const tree = useMemo(
    () => visibleSourceTree(files, expanded),
    [files, expanded],
  );
  const searchResults = useMemo(
    () => matchSourceFiles(files, query),
    [files, query],
  );
  const quickResults = useMemo(
    () => matchSourceFiles(files, quickQuery).slice(0, 30),
    [files, quickQuery],
  );
  const dirty = Object.keys(documents).filter(
    (path) => documents[path].value !== documents[path].original,
  );
  const activeFile = files.find((file) => file.path === activePath);
  const activeDoc = documents[activePath];

  useEffect(() => {
    if (quickOpen) {
      quickInput.current?.focus();
      setQuickIndex(0);
    } else if (wasQuickOpen.current) {
      // Restore only after React has removed inert from the background controls.
      quickTrigger.current?.focus();
    }
    wasQuickOpen.current = quickOpen;
  }, [quickOpen]);
  useEffect(() => {
    setQuickIndex(0);
  }, [quickQuery]);
  useEffect(() => {
    if (quickOpen)
      document
        .getElementById(`${quickId}-${quickIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [quickOpen, quickIndex, quickId]);
  useEffect(() => {
    if (activePath) {
      setExpanded(
        (previous) => new Set([...previous, ...sourceParents(activePath)]),
      );
      setTreeFocus(activePath);
    }
  }, [activePath]);
  const chooseFile = (file: SourceFile | string) => {
    openFile(file);
    setQuickOpen(false);
    if ((root.current?.clientWidth || 0) < 760) setSidebar("closed");
    requestAnimationFrame(() => editor.current?.focus());
  };
  const showPanel = (next: Panel) => {
    setPanel(next);
    const visible =
      sidebar === "open" ||
      (sidebar === "auto" && (root.current?.clientWidth || 0) >= 760);
    setSidebar(panel === next && visible ? "closed" : "open");
    if (next === "search")
      requestAnimationFrame(() => searchInput.current?.focus());
  };
  const toggleSidebar = () =>
    setSidebar((current) =>
      current === "open" ||
      (current === "auto" && (root.current?.clientWidth || 0) >= 760)
        ? "closed"
        : "open",
    );
  const copy = async () => {
    if (!activeDoc) return;
    try {
      await navigator.clipboard.writeText(activeDoc.value);
      setAnnouncement(`${shortName(activePath)} copied.`);
    } catch {
      setAnnouncement(
        "Clipboard unavailable. Select code to copy it, or download this file.",
      );
    }
  };
  const download = () => {
    if (!activeDoc) return;
    const url = URL.createObjectURL(
      new Blob([activeDoc.value], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = shortName(activePath);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnouncement(
      `${shortName(activePath)} downloaded. GitHub was not changed.`,
    );
  };
  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (quickOpen) {
      if (["p", "b", "s"].includes(key) || (event.shiftKey && key === "f")) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (key === "p") {
      event.preventDefault();
      event.stopPropagation();
      setQuickOpen(true);
    } else if (key === "b") {
      event.preventDefault();
      event.stopPropagation();
      toggleSidebar();
    } else if (key === "s") {
      event.preventDefault();
      event.stopPropagation();
      download();
    } else if (event.shiftKey && key === "f") {
      event.preventDefault();
      event.stopPropagation();
      setPanel("search");
      setSidebar("open");
      requestAnimationFrame(() => searchInput.current?.focus());
    }
  };
  const focusTree = (path: string) => {
    setTreeFocus(path);
    requestAnimationFrame(() => treeButtons.current.get(path)?.focus());
  };
  const toggleFolder = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  const treeKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    entry: TreeEntry,
    index: number,
  ) => {
    let target: string | undefined;
    if (event.key === "ArrowDown")
      target = tree[Math.min(index + 1, tree.length - 1)]?.path;
    else if (event.key === "ArrowUp")
      target = tree[Math.max(index - 1, 0)]?.path;
    else if (event.key === "Home") target = tree[0]?.path;
    else if (event.key === "End") target = tree[tree.length - 1]?.path;
    else if (event.key === "ArrowRight" && entry.directory) {
      if (!expanded.has(entry.path)) toggleFolder(entry.path);
      else target = tree[index + 1]?.path;
    } else if (event.key === "ArrowLeft") {
      if (entry.directory && expanded.has(entry.path)) toggleFolder(entry.path);
      else target = entry.path.split("/").slice(0, -1).join("/");
    } else return;
    event.preventDefault();
    event.stopPropagation();
    if (target) focusTree(target);
  };

  return (
    <div
      className={styles.app}
      ref={root}
      data-sidebar={sidebar}
      data-testid="repository-editor"
      onKeyDownCapture={handleKeys}
    >
      <header className={styles.titlebar} inert={quickOpen || undefined}>
        <span className={styles.appMark}>
          <Icon name="code" />
        </span>
        <button
          type="button"
          className={styles.titleAction}
          onClick={toggleSidebar}
          aria-label="Toggle file explorer"
          title="Toggle sidebar (Ctrl/Cmd+B)"
        >
          <Icon name="sidebar" />
        </button>
        <button
          type="button"
          ref={quickTrigger}
          className={styles.command}
          onClick={() => setQuickOpen(true)}
          aria-label="Quick Open files"
        >
          <Icon name="search" />
          <span>kali-linux-portfolio</span>
          <kbd>Ctrl P</kbd>
        </button>
        <a
          className={styles.titleAction}
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open repository on GitHub"
          title="Open repository on GitHub"
        >
          <Icon name="external" />
        </a>
      </header>
      <div className={styles.workbench} inert={quickOpen || undefined}>
        <nav className={styles.activity} aria-label="Editor views">
          <button
            type="button"
            aria-label="Explorer"
            aria-pressed={panel === "explorer" && sidebar !== "closed"}
            onClick={() => showPanel("explorer")}
            title="Explorer"
          >
            <Icon name="files" />
          </button>
          <button
            type="button"
            aria-label="Search repository files"
            aria-pressed={panel === "search" && sidebar !== "closed"}
            onClick={() => showPanel("search")}
            title="Search files (Ctrl/Cmd+Shift+F)"
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            aria-label={`Local changes, ${dirty.length} files`}
            aria-pressed={panel === "changes" && sidebar !== "closed"}
            onClick={() => showPanel("changes")}
            title="Local changes"
          >
            <Icon name="branch" />
            {dirty.length > 0 && (
              <span className={styles.changeBadge}>{dirty.length}</span>
            )}
          </button>
          <span className={styles.activitySpacer} />
          <span className={styles.ownerAvatar} title="Alex Unnippillil">
            AU
          </span>
        </nav>
        <aside className={styles.sidebar} aria-label="Repository sidebar">
          <div className={styles.sidebarHeading}>
            <strong>
              {panel === "explorer"
                ? "EXPLORER"
                : panel === "search"
                  ? "SEARCH FILES"
                  : "LOCAL CHANGES"}
            </strong>
            <button
              type="button"
              onClick={() => setSidebar("closed")}
              className={styles.mobileClose}
              aria-label="Close file explorer"
            >
              <Icon name="close" />
            </button>
          </div>
          {panel === "explorer" && (
            <>
              <div className={styles.folderHeading}>
                <Icon name="chevron" className={styles.rotated} />
                <strong>KALI-LINUX-PORTFOLIO</strong>
              </div>
              <div
                className={styles.tree}
                role="tree"
                aria-label="Repository files"
              >
                {tree.map((entry, index) => (
                  <button
                    type="button"
                    role="treeitem"
                    key={entry.path}
                    ref={(node) => {
                      if (node) treeButtons.current.set(entry.path, node);
                      else treeButtons.current.delete(entry.path);
                    }}
                    aria-level={entry.depth + 1}
                    aria-expanded={
                      entry.directory ? expanded.has(entry.path) : undefined
                    }
                    aria-selected={
                      !entry.directory ? entry.path === activePath : undefined
                    }
                    tabIndex={
                      treeFocus === entry.path ||
                      (!tree.some((item) => item.path === treeFocus) &&
                        index === 0)
                        ? 0
                        : -1
                    }
                    className={styles.treeItem}
                    style={{ paddingLeft: 8 + entry.depth * 14 }}
                    title={entry.path}
                    onFocus={() => setTreeFocus(entry.path)}
                    onKeyDown={(event) => treeKey(event, entry, index)}
                    onClick={() =>
                      entry.directory
                        ? toggleFolder(entry.path)
                        : chooseFile(entry.path)
                    }
                  >
                    {entry.directory ? (
                      <Icon
                        name="chevron"
                        className={
                          expanded.has(entry.path) ? styles.rotated : ""
                        }
                      />
                    ) : (
                      <span className={styles.treeIndent} />
                    )}
                    <Icon
                      name={entry.directory ? "folder" : "file"}
                      className={
                        entry.directory ? styles.folderIcon : styles.fileIcon
                      }
                    />
                    <span>{entry.name}</span>
                    {dirty.includes(entry.path) && (
                      <span
                        className={styles.dirtyDot}
                        aria-label="Modified locally"
                      />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {panel === "search" && (
            <>
              <input
                ref={searchInput}
                type="search"
                className={styles.searchInput}
                value={query}
                maxLength={200}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find files by name or path"
                aria-label="Search repository files by name"
              />
              <p className={styles.panelNote}>
                {searchResults.length} files
                {searchResults.length > 100 ? " · first 100 shown" : ""}
              </p>
              <div className={styles.results}>
                {searchResults.slice(0, 100).map((file) => (
                  <button
                    type="button"
                    key={file.path}
                    onClick={() => chooseFile(file)}
                  >
                    <Icon name="file" />
                    <span>
                      <strong>{shortName(file.path)}</strong>
                      <small>{file.path}</small>
                    </span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className={styles.panelNote}>No matching files.</p>
                )}
              </div>
            </>
          )}
          {panel === "changes" && (
            <>
              <p className={styles.panelNote}>
                Edits stay in this window. They never change GitHub. Download a
                file to keep your work.
              </p>
              <div className={styles.results}>
                {dirty.map((path) => (
                  <button
                    type="button"
                    key={path}
                    onClick={() => chooseFile(path)}
                  >
                    <Icon name="file" />
                    <span>
                      <strong>{shortName(path)}</strong>
                      <small>{path}</small>
                    </span>
                    <span>M</span>
                  </button>
                ))}
                {dirty.length === 0 && (
                  <p className={styles.panelNote}>
                    No local changes yet. Open a file and start editing.
                  </p>
                )}
              </div>
            </>
          )}
          <div className={styles.sourceNote}>
            {manifest ? (
              <>
                <span className={styles.sourceDot} />
                {files.length.toLocaleString()} bundled source files
              </>
            ) : (
              "Loading repository…"
            )}
          </div>
        </aside>
        <main
          className={styles.editArea}
          aria-label="Repository code workspace"
        >
          <nav className={styles.tabs} aria-label="Open files">
            {tabs.map((path) => (
              <div
                className={styles.tab}
                key={path}
                data-active={path === activePath}
              >
                <button
                  type="button"
                  onClick={() => openFile(path)}
                  aria-label={`Open ${path} tab`}
                  aria-current={path === activePath ? "page" : undefined}
                >
                  <Icon name="file" />
                  <span>{shortName(path)}</span>
                  {dirty.includes(path) && (
                    <span
                      className={styles.dirtyDot}
                      aria-label="Modified locally"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => closeFile(path)}
                  aria-label={`Close ${path}`}
                  title={`Close ${shortName(path)}`}
                >
                  <Icon name="close" />
                </button>
              </div>
            ))}
          </nav>
          {activePath && (
            <div className={styles.breadcrumbs}>
              <span title={activePath}>
                {activePath.split("/").join("  /  ")}
              </span>
              <div className={styles.editorTools}>
                <button
                  type="button"
                  onClick={() => editor.current?.find()}
                  disabled={!activeDoc}
                  aria-label="Find in current file"
                  title="Find in file"
                >
                  <Icon name="search" />
                </button>
                <button
                  type="button"
                  onClick={() => setWrap((value) => !value)}
                  aria-pressed={wrap}
                  aria-label="Toggle word wrap"
                  title="Word wrap"
                >
                  <Icon name="wrap" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copy();
                  }}
                  disabled={!activeDoc}
                  aria-label="Copy current file"
                  title="Copy code"
                >
                  <Icon name="copy" />
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!activeDoc}
                  aria-label="Download current file"
                  title="Download local copy (Ctrl/Cmd+S)"
                >
                  <Icon name="download" />
                </button>
                {manifest && (
                  <a
                    href={fileSourceUrl(activePath, manifest.revision)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View original file on GitHub"
                    title="View exact source revision"
                  >
                    <Icon name="external" />
                  </a>
                )}
              </div>
            </div>
          )}
          {issue && (
            <div className={styles.issue} role="alert">
              <span>{issue}</span>
              <button type="button" onClick={retry}>
                Retry
              </button>
            </div>
          )}
          {activePath ? (
            <div className={styles.editorFrame} aria-busy={busy}>
              <CodeEditor
                ref={editor}
                path={activePath}
                value={activeDoc?.value || ""}
                language={activeFile?.language || "plaintext"}
                wrap={wrap}
                readOnly={!activeDoc || busy}
                onChange={edit}
                onPosition={(line, column) =>
                  setPosition((previous) =>
                    previous.line === line && previous.column === column
                      ? previous
                      : { line, column },
                  )
                }
              />
              {busy && (
                <div className={styles.loading} role="status">
                  <span className={styles.spinner} />
                  Opening {shortName(activePath)}…
                </div>
              )}
            </div>
          ) : (
            <div className={styles.welcome}>
              <Icon name="code" width="78" height="78" />
              <h1>Explore the code behind this desktop.</h1>
              <p>
                Open any bundled source file. Browse, search, edit locally, or
                download your copy.
              </p>
              <button type="button" onClick={() => setQuickOpen(true)}>
                Open a file <kbd>Ctrl P</kbd>
              </button>
            </div>
          )}
        </main>
      </div>
      <footer className={styles.statusbar} inert={quickOpen || undefined}>
        <span className={styles.remoteMark}>
          <Icon name="code" />
        </span>
        <span className={styles.revision}>
          <Icon name="branch" />
          main <span>{manifest?.revision.slice(0, 7) || "…"}</span>
        </span>
        <span className={styles.sessionLabel}>
          {dirty.length
            ? `${dirty.length} locally modified`
            : "Repository snapshot"}
        </span>
        <span className={styles.statusSpacer} />
        <span className={styles.cursor}>
          Ln {position.line}, Col {position.column}
        </span>
        <span className={styles.encoding}>UTF-8</span>
        <span>{languageLabel(activeFile?.language)}</span>
      </footer>
      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
      {quickOpen && (
        <div
          className={styles.quickBackdrop}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setQuickOpen(false);
              quickTrigger.current?.focus();
            }
          }}
        >
          <section
            className={styles.quickOpen}
            role="dialog"
            aria-modal="true"
            aria-label="Quick Open"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                // Options use the combobox's arrow-key navigation, so the search
                // field is the dialog's only tab stop in either direction.
                event.preventDefault();
                event.stopPropagation();
                quickInput.current?.focus();
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setQuickOpen(false);
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setQuickIndex((current) =>
                  Math.max(
                    0,
                    Math.min(
                      quickResults.length - 1,
                      current + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
              } else if (event.key === "Enter" && quickResults[quickIndex]) {
                event.preventDefault();
                chooseFile(quickResults[quickIndex]);
              }
            }}
          >
            <input
              ref={quickInput}
              role="combobox"
              aria-label="Quick Open file name"
              aria-controls={quickId}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-activedescendant={
                quickResults[quickIndex]
                  ? `${quickId}-${quickIndex}`
                  : undefined
              }
              placeholder="Search files by name…"
              value={quickQuery}
              onChange={(event) => setQuickQuery(event.target.value)}
              maxLength={200}
            />
            <ul
              id={quickId}
              role="listbox"
              aria-label="Matching repository files"
            >
              {quickResults.map((file, index) => (
                <li
                  key={file.path}
                  id={`${quickId}-${index}`}
                  role="option"
                  aria-selected={index === quickIndex}
                  onPointerMove={() => setQuickIndex(index)}
                  onClick={() => chooseFile(file)}
                >
                  <Icon name="file" />
                  <strong>{shortName(file.path)}</strong>
                  <span>{file.path}</span>
                </li>
              ))}
            </ul>
            {quickResults.length === 0 && <p>No matching files.</p>}
            <div className={styles.quickHint}>
              ↑↓ navigate · Enter open · Esc close
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
