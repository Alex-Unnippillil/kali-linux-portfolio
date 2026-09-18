"use client";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type * as Monaco from "monaco-editor";
import styles from "./workspace.module.css";

export type EditorActions = { focus: () => void; find: () => void };
type Props = {
  path: string;
  value: string;
  language: string;
  wrap: boolean;
  readOnly: boolean;
  onChange: (path: string, value: string) => void;
  onPosition: (line: number, column: number) => void;
};

const CodeEditor = forwardRef<EditorActions, Props>(
  function CodeEditor(props, ref) {
    const host = useRef<HTMLDivElement>(null);
    const fallback = useRef<HTMLTextAreaElement>(null);
    const instance = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const engine = useRef<typeof Monaco | null>(null);
    const models = useRef(new Map<string, Monaco.editor.ITextModel>());
    const views = useRef(
      new Map<string, Monaco.editor.ICodeEditorViewState | null>(),
    );
    const currentPath = useRef("");
    const internalUpdate = useRef(false);
    const latest = useRef(props);
    latest.current = props;
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const [ready, setReady] = useState(false);
    const [plainText, setPlainText] = useState(false);
    const [find, setFind] = useState<string | null>(null);
    const findInput = useRef<HTMLInputElement>(null);

    const updateModel = () => {
      const editor = instance.current;
      const monaco = engine.current;
      if (!editor || !monaco) return;
      const { path, value, language, wrap, readOnly } = latest.current;
      internalUpdate.current = true;
      if (currentPath.current !== path || !editor.getModel()) {
        if (currentPath.current)
          views.current.set(currentPath.current, editor.saveViewState());
        let model = models.current.get(path);
        if (!model) {
          model = monaco.editor.createModel(
            value,
            language,
            monaco.Uri.parse(`inmemory://portfolio-${id}/${path}`),
          );
          models.current.set(path, model);
        }
        editor.setModel(model);
        currentPath.current = path;
        const view = views.current.get(path);
        if (view) editor.restoreViewState(view);
      }
      const model = editor.getModel();
      if (model && model.getValue() !== value) model.setValue(value);
      editor.updateOptions({ wordWrap: wrap ? "on" : "off", readOnly });
      internalUpdate.current = false;
      const position = editor.getPosition();
      if (position)
        latest.current.onPosition(position.lineNumber, position.column);
    };
    const updateRef = useRef(updateModel);
    updateRef.current = updateModel;

    useImperativeHandle(
      ref,
      () => ({
        focus: () =>
          instance.current
            ? instance.current.focus()
            : fallback.current?.focus(),
        find: () => {
          if (instance.current)
            void instance.current.getAction("actions.find")?.run();
          else {
            setFind("");
            setTimeout(() => findInput.current?.focus(), 0);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      let change: Monaco.IDisposable | undefined;
      let position: Monaco.IDisposable | undefined;
      let resize: ResizeObserver | undefined;
      const ownedModels = models.current;
      const ownedViews = views.current;
      void import("./monaco")
        .then(({ monaco }) => {
          if (cancelled || !host.current) return;
          engine.current = monaco;
          const editor = monaco.editor.create(host.current, {
            model: null,
            theme: "portfolio-code",
            automaticLayout: true,
            fontSize: 13,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            lineHeight: 21,
            padding: { top: 14, bottom: 14 },
            lineNumbersMinChars: 4,
            glyphMargin: false,
            minimap: { enabled: host.current.clientWidth > 700 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            quickSuggestions: false,
            renderLineHighlight: "line",
            accessibilitySupport: "auto",
            ariaLabel: `Code editor for ${latest.current.path}`,
            tabSize: 2,
            insertSpaces: true,
            fixedOverflowWidgets: false,
          });
          instance.current = editor;
          updateRef.current();
          change = editor.onDidChangeModelContent(() => {
            if (!internalUpdate.current && !latest.current.readOnly)
              latest.current.onChange(currentPath.current, editor.getValue());
          });
          position = editor.onDidChangeCursorPosition((event) =>
            latest.current.onPosition(
              event.position.lineNumber,
              event.position.column,
            ),
          );
          resize = new ResizeObserver(() =>
            editor.updateOptions({
              minimap: { enabled: (host.current?.clientWidth || 0) > 700 },
            }),
          );
          resize.observe(host.current);
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setPlainText(true);
        });
      return () => {
        cancelled = true;
        resize?.disconnect();
        change?.dispose();
        position?.dispose();
        instance.current?.dispose();
        instance.current = null;
        engine.current = null;
        for (const model of ownedModels.values()) model.dispose();
        ownedModels.clear();
        currentPath.current = "";
        ownedViews.clear();
      };
    }, []);

    useEffect(() => {
      updateRef.current();
      instance.current?.updateOptions({
        ariaLabel: `Code editor for ${props.path}`,
      });
    }, [props.path, props.value, props.language, props.wrap, props.readOnly]);
    const findText = () => {
      const area = fallback.current;
      if (!area || !find) return;
      const start = area.value
        .toLowerCase()
        .indexOf(find.toLowerCase(), area.selectionEnd);
      const index =
        start === -1
          ? area.value.toLowerCase().indexOf(find.toLowerCase())
          : start;
      if (index !== -1) {
        area.focus();
        area.setSelectionRange(index, index + find.length);
      }
    };
    return (
      <div className={styles.codeSurface}>
        <div
          ref={host}
          className={styles.monaco}
          data-testid="repository-monaco"
          style={{ visibility: ready ? "visible" : "hidden" }}
        />
        {!ready && (
          <>
            {plainText && (
              <span className={styles.editorFallback}>
                Plain-text editor · your source is still available
              </span>
            )}
            <textarea
              ref={fallback}
              className={styles.plainEditor}
              value={props.value}
              readOnly={props.readOnly}
              aria-label={`Code editor for ${props.path}`}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap={props.wrap ? "soft" : "off"}
              onChange={(event) =>
                props.onChange(props.path, event.target.value)
              }
              onSelect={(event) => {
                const area = event.currentTarget;
                const before = area.value.slice(0, area.selectionStart);
                latest.current.onPosition(
                  before.split("\n").length,
                  before.length - before.lastIndexOf("\n"),
                );
              }}
            />
          </>
        )}
        {find !== null && !ready && (
          <form
            className={styles.plainFind}
            onSubmit={(event) => {
              event.preventDefault();
              findText();
            }}
          >
            <input
              ref={findInput}
              value={find}
              onChange={(event) => setFind(event.target.value)}
              aria-label="Find in file"
            />
            <button type="submit">Find next</button>
            <button
              type="button"
              onClick={() => {
                setFind(null);
                fallback.current?.focus();
              }}
            >
              Close
            </button>
          </form>
        )}
      </div>
    );
  },
);
export default CodeEditor;
