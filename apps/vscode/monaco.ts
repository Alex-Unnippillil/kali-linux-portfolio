// This chunk and its worker are bundled by Next.js. No CDN, iframe, or remote code execution.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/editor.all";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
import "monaco-editor/esm/vs/basic-languages/html/html.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";

(
  globalThis as typeof globalThis & { MonacoEnvironment?: monaco.Environment }
).MonacoEnvironment = {
  getWorker: () =>
    new Worker(
      new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
      { type: "module", name: "repository-editor" },
    ),
};
// JSON tokenization without a remote language service or JSON worker.
monaco.languages.register({ id: "json" });
monaco.languages.setMonarchTokensProvider("json", {
  tokenizer: {
    root: [
      [/"([^"\\]|\\.)*"(?=\s*:)/, "string.key.json"],
      [/"([^"\\]|\\.)*"/, "string.value.json"],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
      [/\b(?:true|false|null)\b/, "keyword"],
      [/[{}\[\]]/, "@brackets"],
      [/[,:]/, "delimiter"],
      [/[ \t\r\n]+/, "white"],
    ],
  },
});
monaco.editor.defineTheme("portfolio-code", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#1f1f1f",
    "editorLineNumber.foreground": "#858585",
    "editorLineNumber.activeForeground": "#dedede",
    "editor.lineHighlightBackground": "#262626",
    "editor.selectionBackground": "#264f78",
    "editorGutter.background": "#1f1f1f",
  },
});
export { monaco };
