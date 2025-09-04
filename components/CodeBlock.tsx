import React, { useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import Tabs from "./Tabs";

interface CodeFile {
  name: string;
  code: string;
  language?: string;
  highlight?: number[];
}

interface CodeBlockProps {
  code?: string;
  language?: string;
  highlight?: number[];
  files?: CodeFile[];
}

function renderHighlighted(
  code: string,
  language?: string,
  highlight: number[] = []
) {
  const result = language
    ? hljs.highlight(code, { language }).value
    : hljs.highlightAuto(code).value;

  const lines = result.split(/\r?\n/);
  return (
    <pre className="bg-gray-900 text-gray-100 text-sm rounded overflow-auto">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`px-4 py-0.5 whitespace-pre ${
            highlight.includes(i + 1) ? "bg-yellow-800/40" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
        />
      ))}
    </pre>
  );
}

export default function CodeBlock({
  code = "",
  language,
  highlight = [],
  files,
}: CodeBlockProps) {
  const [active, setActive] = useState(files ? files[0].name : "");

  if (files && files.length > 0) {
    const activeFile = files.find((f) => f.name === active) || files[0];
    const tabs = files.map((f) => ({ id: f.name, label: f.name }));
    return (
      <div>
        <Tabs tabs={tabs} active={activeFile.name} onChange={setActive} />
        {renderHighlighted(
          activeFile.code,
          activeFile.language || language,
          activeFile.highlight || highlight
        )}
      </div>
    );
  }

  return renderHighlighted(code, language, highlight);
}
