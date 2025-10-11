"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toPng, toSvg } from "html-to-image";
import AlignmentControls from "./components/AlignmentControls";
import FontGrid from "./components/FontGrid";
import usePersistentState from "../../hooks/usePersistentState";

type FontSource = "builtin" | "uploaded" | "server";

interface FontInfo {
  name: string;
  preview: string;
  mono: boolean;
  source: FontSource;
}

const BUILTIN_FONT_LOADERS: Record<string, () => Promise<any>> = {
  Standard: () => import("figlet/importable-fonts/Standard.js"),
  Slant: () => import("figlet/importable-fonts/Slant.js"),
  Big: () => import("figlet/importable-fonts/Big.js"),
  Small: () => import("figlet/importable-fonts/Small.js"),
  Doom: () => import("figlet/importable-fonts/Doom.js"),
  Banner: () => import("figlet/importable-fonts/Banner.js"),
  Block: () => import("figlet/importable-fonts/Block.js"),
  Shadow: () => import("figlet/importable-fonts/Shadow.js"),
};

const SAMPLE_PREVIEW_TEXT = "Kali Linux";

const FigletApp: React.FC = () => {
  const [text, setText] = useState("");
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [font, setFont] = usePersistentState<string>("figlet-last-font", "");
  const [monoOnly, setMonoOnly] = useState(false);
  const [output, setOutput] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [inverted, setInverted] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1);
  const [width, setWidth] = useState(80);
  const [layout, setLayout] = useState("default");
  const [kerning, setKerning] = useState(0);
  const [gradient, setGradient] = useState(0);
  const [align, setAlign] = useState("left");
  const [padding, setPadding] = useState(0);
  const [announce, setAnnounce] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const frameRef = useRef<number | null>(null);
  const announceTimer = useRef<NodeJS.Timeout | null>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const uploadedFonts = useRef<Record<string, string>>({});
  const fontSources = useRef<Record<string, FontSource>>({});
  const [serverFontNames, setServerFontNames] = useState<string[]>([]);
  const [previewRawOutput, setPreviewRawOutput] = useState("");
  const [previewOutput, setPreviewOutput] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("text");
    if (t) setText(t);
    const f = params.get("font");
    if (f) setFont(f);
    const s = Number(params.get("size"));
    if (!Number.isNaN(s)) setFontSize(s);
    const l = Number(params.get("line"));
    if (!Number.isNaN(l)) setLineHeight(l);
    const w = Number(params.get("width"));
    if (!Number.isNaN(w)) setWidth(w);
    const la = params.get("layout");
    if (la) setLayout(la);
    const a = params.get("align");
    if (a) setAlign(a);
    const g = Number(params.get("gradient"));
    if (!Number.isNaN(g)) setGradient(g);
    const k = Number(params.get("kerning"));
    if (!Number.isNaN(k)) setKerning(k);
    const pd = Number(params.get("pad"));
    if (!Number.isNaN(pd)) setPadding(pd);
  }, [
    setText,
    setFont,
    setFontSize,
    setLineHeight,
    setWidth,
    setLayout,
    setAlign,
    setGradient,
    setKerning,
    setPadding,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof Worker === "function") {
      workerRef.current = new Worker(new URL("./worker.ts", import.meta.url));
      workerRef.current.onmessage = (e: MessageEvent<any>) => {
        if (e.data?.type === "font") {
          setFonts((prev) => {
            const source = fontSources.current[e.data.font] ?? "builtin";
            const nextFont: FontInfo = {
              name: e.data.font,
              preview: e.data.preview,
              mono: e.data.mono,
              source,
            };
            const existingIndex = prev.findIndex((f) => f.name === nextFont.name);
            if (existingIndex >= 0) {
              const copy = [...prev];
              copy[existingIndex] = nextFont;
              return copy;
            }
            return [...prev, nextFont];
          });
        } else if (e.data?.type === "render") {
          if (e.data.requestId === "preview") {
            setPreviewRawOutput(e.data.output);
          } else {
            setRawOutput(e.data.output);
            setAnnounce("Preview updated");
            if (announceTimer.current) clearTimeout(announceTimer.current);
            announceTimer.current = setTimeout(() => setAnnounce(""), 2000);
          }
        }
      };

      (async () => {
        try {
          // Dynamically load a set of popular fonts. Each font is imported only
          // when needed, keeping the initial bundle small.
          await Promise.all(
            Object.entries(BUILTIN_FONT_LOADERS).map(async ([name, loader]) => {
              const mod = await loader();
              fontSources.current[name] = "builtin";
              workerRef.current?.postMessage({
                type: "load",
                name,
                data: mod.default,
              });
            }),
          );
        } catch {
          /* ignore */
        }

        try {
          if ((navigator as any)?.storage?.getDirectory) {
            const dir = await (navigator as any).storage.getDirectory();
            const handle = await dir.getFileHandle("figlet-last-font.json");
            const file = await handle.getFile();
            const saved = JSON.parse(await file.text()) as {
              font?: string;
              data?: string;
            };
            if (saved.data && saved.font) {
              uploadedFonts.current[saved.font] = saved.data;
              fontSources.current[saved.font] = "uploaded";
              workerRef.current?.postMessage({
                type: "load",
                name: saved.font,
                data: saved.data,
              });
            }
            if (saved.font) setFont(saved.font);
          }
        } catch {
          /* ignore */
        }

        try {
          const res = await fetch("/api/figlet/fonts");
          if (res.ok) {
            const { fonts: list } = await res.json();
            const names: string[] = [];
            list.forEach(({ name, data }: { name: string; data: string }) => {
              names.push(name);
              uploadedFonts.current[name] = data;
              fontSources.current[name] = "server";
              workerRef.current?.postMessage({ type: "load", name, data });
            });
            if (names.length) setServerFontNames(names);
          }
        } catch {
          /* ignore */
        }
      })();

      return () => {
        workerRef.current?.terminate();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        if (announceTimer.current) clearTimeout(announceTimer.current);
      };
    }
    return undefined;
    }, [setFont]);

  const sendRender = useCallback(
    (payload: { text: string; requestId: string }) => {
      if (!workerRef.current || !font) return;
      workerRef.current.postMessage({
        type: "render",
        text: payload.text,
        font,
        width,
        layout,
        requestId: payload.requestId,
      });
    },
    [font, width, layout],
  );

  const updateFiglet = useCallback(() => {
    if (!font) return;
    sendRender({ text, requestId: "main" });
  }, [font, sendRender, text]);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateFiglet);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [updateFiglet]);

  const transformOutput = useCallback(
    (input: string) => {
      if (!input) return "";
      const lines = input
        .split("\n")
        .map((l: string) => l.replace(/\s+$/, ""));
      const max = lines.reduce((m, l) => Math.max(m, l.length), 0);
      return lines
        .map((line) => {
          let result = line;
          if (align === "right") {
            result = " ".repeat(max - line.length) + line;
          } else if (align === "center") {
            const space = Math.floor((max - line.length) / 2);
            result = " ".repeat(space) + line;
          } else if (align === "justify") {
            const words = line.trim().split(/ +/);
            if (words.length > 1) {
              const totalSpaces =
                max - words.reduce((sum, w) => sum + w.length, 0);
              const gaps = words.length - 1;
              const even = Math.floor(totalSpaces / gaps);
              const extra = totalSpaces % gaps;
              result = words
                .map(
                  (w, i) =>
                    w + (i < gaps ? " ".repeat(even + (i < extra ? 1 : 0)) : ""),
                )
                .join("");
            }
          }
          return " ".repeat(padding) + result;
        })
        .join("\n");
    },
    [align, padding],
  );

  useEffect(() => {
    setOutput(transformOutput(rawOutput));
  }, [rawOutput, transformOutput]);

  useEffect(() => {
    setPreviewOutput(transformOutput(previewRawOutput));
  }, [previewRawOutput, transformOutput]);

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setAnnounce("Copied to clipboard");
      if (announceTimer.current) clearTimeout(announceTimer.current);
      announceTimer.current = setTimeout(() => setAnnounce(""), 2000);
    }
  };

  const exportPNG = () => {
    if (!preRef.current) return;
    toPng(preRef.current)
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "figlet.png";
        link.href = dataUrl;
        link.click();
        setAnnounce("Downloaded PNG");
        if (announceTimer.current) clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnounce(""), 2000);
      })
      .catch(() => {
        /* ignore */
      });
  };

  const exportSVG = () => {
    if (!preRef.current) return;
    toSvg(preRef.current)
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "figlet.svg";
        link.href = dataUrl;
        link.click();
        setAnnounce("Downloaded SVG");
        if (announceTimer.current) clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnounce(""), 2000);
      })
      .catch(() => {
        /* ignore */
      });
  };

  const exportText = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "figlet.txt";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setAnnounce("Downloaded text");
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(""), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.flf$/i, "");
    const data = await file.text();
    uploadedFonts.current[name] = data;
    fontSources.current[name] = "uploaded";
    workerRef.current?.postMessage({ type: "load", name, data });
    setFont(name);
    e.target.value = "";
  };

  const displayedFonts = fonts.filter((f) => !monoOnly || f.mono);

  useEffect(() => {
    if (fonts.length && !font) setFont(fonts[0].name);
  }, [fonts, font, setFont]);

  useEffect(() => {
    if (font && fonts.find((f) => f.name === font)) updateFiglet();
  }, [fonts, font, updateFiglet]);

  useEffect(() => {
    if (!font) return;
    sendRender({ text: SAMPLE_PREVIEW_TEXT, requestId: "preview" });
  }, [font, layout, sendRender, width]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (text) params.set("text", text);
    if (font) params.set("font", font);
    if (fontSize !== 16) params.set("size", String(fontSize));
    if (lineHeight !== 1) params.set("line", String(lineHeight));
    if (width !== 80) params.set("width", String(width));
    if (layout !== "default") params.set("layout", layout);
    if (align !== "left") params.set("align", align);
    if (padding !== 0) params.set("pad", String(padding));
    if (gradient !== 0) params.set("gradient", String(gradient));
    if (kerning !== 0) params.set("kerning", String(kerning));
    const query = params.toString();
    history.replaceState(
      null,
      "",
      `${location.pathname}${query ? `?${query}` : ""}`,
    );
  }, [
    text,
    font,
    fontSize,
    lineHeight,
    width,
    layout,
    align,
    gradient,
    kerning,
    padding,
  ]);

  useEffect(() => {
    if (!font || !(navigator as any).storage?.getDirectory) return;
    (async () => {
      try {
        const dir = await (navigator as any).storage.getDirectory();
        const handle = await dir.getFileHandle("figlet-last-font.json", {
          create: true,
        });
        const writable = await handle.createWritable();
        const data = uploadedFonts.current[font]
          ? { font, data: uploadedFonts.current[font] }
          : { font };
        await writable.write(JSON.stringify(data));
        await writable.close();
      } catch {
        /* ignore */
      }
    })();
  }, [font]);

  const currentFont = fonts.find((f) => f.name === font);
  const metadataLabel = currentFont
    ? `${currentFont.mono ? "Monospace" : "Proportional"} • ${
        currentFont.source === "builtin" ? "Built-in" : "Imported"
      }`
    : "";

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-4 bg-ub-gedit-dark/70">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <section className="flex flex-col gap-3 rounded-lg border border-black/40 bg-black/30 p-3">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-50">
                Font selection
              </h2>
              <p className="text-xs text-gray-300">
                Choose a FIGlet font and craft your banner copy.
              </p>
            </header>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-300">
              Banner text
              <input
                type="text"
                className="rounded bg-gray-800 px-2 py-1 text-white normal-case"
                placeholder="Type here"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Text to convert"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={monoOnly}
                  onChange={() => setMonoOnly((m) => !m)}
                  aria-label="Show monospace fonts only"
                />
                Monospace only
              </label>
              <div className="flex items-center gap-2">
                <FontGrid fonts={displayedFonts} value={font} onChange={setFont} />
                {metadataLabel && (
                  <span className="text-xs text-gray-300">{metadataLabel}</span>
                )}
              </div>
            </div>
          </section>
          <section className="flex flex-col gap-3 rounded-lg border border-black/40 bg-black/30 p-3">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-50">
                Size &amp; Layout
              </h2>
              <p className="text-xs text-gray-300">
                Tune spacing, width, alignment, and gradients.
              </p>
            </header>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Size
                <input
                  type="range"
                  min="8"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  aria-label="Font size"
                />
              </label>
              <label className="flex items-center gap-2">
                Line
                <input
                  type="range"
                  min="0.8"
                  max="2"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  aria-label="Line height"
                />
              </label>
              <label className="flex items-center gap-2">
                Width
                <input
                  type="number"
                  min="20"
                  max="200"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-16 rounded bg-gray-800 px-1 text-white"
                  aria-label="Width"
                />
              </label>
              <label className="flex items-center gap-2">
                Layout
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className="rounded bg-gray-800 px-1 text-white"
                  aria-label="Layout"
                >
                  <option value="default">Default</option>
                  <option value="full">Full</option>
                  <option value="fitted">Fitted</option>
                  <option value="smush">Smush</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Gradient
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradient}
                  onChange={(e) => setGradient(Number(e.target.value))}
                  aria-label="Gradient hue"
                />
              </label>
              <label className="flex items-center gap-2">
                Kerning
                <input
                  type="range"
                  min="-2"
                  max="10"
                  step="0.1"
                  value={kerning}
                  onChange={(e) => setKerning(Number(e.target.value))}
                  aria-label="Kerning"
                />
              </label>
              <AlignmentControls
                align={align}
                setAlign={setAlign}
                padding={padding}
                setPadding={setPadding}
              />
              <button
                onClick={() => setInverted((i) => !i)}
                className="rounded bg-gray-700 px-2 text-white hover:bg-gray-600"
                aria-label="Invert colors"
              >
                Invert
              </button>
            </div>
          </section>
          <section className="flex flex-col gap-3 rounded-lg border border-black/40 bg-black/30 p-3">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-50">
                Uploads
              </h2>
              <p className="text-xs text-gray-300">
                Bring your own FIGlet fonts or reuse saved sets.
              </p>
            </header>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-300">
              Upload .flf font
              <input
                type="file"
                accept=".flf"
                onChange={handleUpload}
                className="text-sm text-white"
                aria-label="Upload font"
              />
            </label>
            {serverFontNames.length > 0 && (
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-gray-300">
                Saved fonts
                <select
                  value=""
                  onChange={(e) => setFont(e.target.value)}
                  className="rounded bg-gray-800 px-1 text-white"
                  aria-label="Select uploaded font"
                >
                  <option value="" disabled>
                    Uploaded Fonts
                  </option>
                  {serverFontNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={copyOutput}
                className="rounded bg-blue-700 px-2 text-white hover:bg-blue-600"
                aria-label="Banner to clipboard"
              >
                Banner to Clipboard
              </button>
              <button
                onClick={exportPNG}
                className="rounded bg-green-700 p-1 hover:bg-green-600"
                aria-label="Export PNG"
              >
                <img
                  src="/themes/Yaru/actions/document-save-as-png-symbolic.svg"
                  alt=""
                  className="h-6 w-6"
                />
              </button>
              <button
                onClick={exportSVG}
                className="rounded bg-yellow-700 p-1 hover:bg-yellow-600"
                aria-label="Export SVG"
              >
                <img
                  src="/themes/Yaru/actions/document-save-as-svg-symbolic.svg"
                  alt=""
                  className="h-6 w-6"
                />
              </button>
              <button
                onClick={exportText}
                className="rounded bg-purple-700 px-2 text-white hover:bg-purple-600"
                aria-label="Export text file"
              >
                TXT
              </button>
            </div>
          </section>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <div className="flex h-full flex-col gap-4 md:flex-row">
          <div className="flex-1 overflow-auto rounded-lg border border-black/40">
            <pre
              ref={preRef}
              data-testid="figlet-output"
              className={`min-w-full whitespace-pre font-mono p-4 transition-colors motion-reduce:transition-none ${
                inverted ? "bg-white" : "bg-black"
              }`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight,
                letterSpacing: `${kerning}px`,
                backgroundImage: `linear-gradient(to right, hsl(${gradient},100%,50%), hsl(${(gradient + 120) % 360},100%,50%))`,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {output}
            </pre>
          </div>
          <aside className="flex w-full flex-shrink-0 flex-col gap-2 rounded-lg border border-black/40 bg-black/30 p-3 text-sm md:w-64 lg:w-80">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ubt-50">
                Live preview
              </h3>
              <p className="text-xs text-gray-300">
                Sample output using current styling options.
              </p>
            </div>
            <div className={`overflow-auto rounded ${inverted ? "bg-white" : "bg-black"}`}>
              <pre
                data-testid="figlet-preview"
                className="whitespace-pre p-3"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  letterSpacing: `${kerning}px`,
                  backgroundImage: `linear-gradient(to right, hsl(${gradient},100%,50%), hsl(${(gradient + 120) % 360},100%,50%))`,
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
                aria-label="Live preview sample"
              >
                {previewOutput || "Loading preview..."}
              </pre>
            </div>
          </aside>
        </div>
      </div>
      <div className="p-2 text-xs text-right">
        About this feature{" "}
        <a
          href="http://www.figlet.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          FIGlet
        </a>
      </div>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
};

export default FigletApp;
