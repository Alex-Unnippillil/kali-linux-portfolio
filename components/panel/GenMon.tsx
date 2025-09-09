"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";
import { XMLParser } from "fast-xml-parser";

const BLUR_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

interface GenMonProps {
  code: string;
  interval?: number; // seconds
}

const xmlParser = new XMLParser({ ignoreAttributes: false });

function parsePango(markup: string): ReactNode {
  const sanitized = DOMPurify.sanitize(markup, {
    ALLOWED_TAGS: ["b", "i", "span"],
    ALLOWED_ATTR: ["foreground"],
  });
  const doc = new DOMParser().parseFromString(
    `<root>${sanitized}</root>`,
    "application/xml",
  );

  const traverse = (node: ChildNode, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    const el = node as Element;
    const children = Array.from(el.childNodes).map((c, i) => traverse(c, i));
    switch (el.tagName) {
      case "b":
        return <strong key={key}>{children}</strong>;
      case "i":
        return <em key={key}>{children}</em>;
      case "span": {
        const color = el.getAttribute("foreground");
        return (
          <span style={color ? { color } : undefined} key={key}>
            {children}
          </span>
        );
      }
      default:
        return <span key={key}>{children}</span>;
    }
  };

  const root = doc.documentElement;
  return <>{Array.from(root.childNodes).map((n, i) => traverse(n, i))}</>;
}

export default function GenMon({ code, interval = 60 }: GenMonProps) {
  const [text, setText] = useState<ReactNode>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [bar, setBar] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const parseOutput = (output: string) => {
      try {
        const parsed = xmlParser.parse(`<root>${output}</root>`);
        const root = parsed.root || {};
        const txtRaw = Array.isArray(root.txt) ? root.txt.join("") : root.txt;
        setText(txtRaw ? parsePango(txtRaw) : null);
        const ic = Array.isArray(root.icon) ? root.icon[0] : root.icon;
        setIcon(ic || null);
        const barVal = Array.isArray(root.bar) ? root.bar[0] : root.bar;
        setBar(barVal !== undefined ? Number(barVal) : null);
      } catch {
        setText(output);
        setIcon(null);
        setBar(null);
      }
    };

    const runSnippet = () => {
      const blob = new Blob([code], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        worker.terminate();
        URL.revokeObjectURL(url);
      };
      worker.onmessage = (e) => {
        if (!active) return;
        parseOutput(String(e.data));
        cleanup();
      };
      worker.onerror = () => {
        if (!active) return;
        parseOutput("<txt>Error</txt>");
        cleanup();
      };
      setTimeout(cleanup, 100);
    };

    runSnippet();
    const id = setInterval(runSnippet, interval * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [code, interval]);

  return (
    <div className="flex items-center gap-2">
      {icon && (
        <Image
          src={icon}
          alt="Status icon"
          className="w-4 h-4"
          width={16}
          height={16}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      )}
      {text && <span>{text}</span>}
      {bar !== null && (
        <div className="w-16 h-2 bg-gray-700 rounded overflow-hidden">
          <div
            className="bg-ub-orange h-full"
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      )}
    </div>
  );
}
