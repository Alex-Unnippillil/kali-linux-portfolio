"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toPng, toSvg } from "html-to-image";
import AlignmentControls from "./components/AlignmentControls";
import FontGrid from "./components/FontGrid";
import usePersistentState from "../../hooks/usePersistentState";

interface FontInfo {
  name: string;
  preview: string;
  mono: boolean;
}

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
  const [serverFontNames, setServerFontNames] = useState<string[]>([]);

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
          setFonts((prev) => [
            ...prev,
            { name: e.data.font, preview: e.data.preview, mono: e.data.mono },
          ]);
        } else if (e.data?.type === "render") {
          setRawOutput(e.data.output);
          setAnnounce("Preview updated");
          if (announceTimer.current) clearTimeout(announceTimer.current);
          announceTimer.current = setTimeout(() => setAnnounce(""), 2000);
        }
      };

      (async () => {
        try {
          // Dynamically load a set of popular fonts. Each font is imported only
          // when needed, keeping the initial bundle small.
          const builtin: Record<string, () => Promise<any>> = {
            Standard: () => import("figlet/importable-fonts/Standard.js"),
            Slant: () => import("figlet/importable-fonts/Slant.js"),
            Big: () => import("figlet/importable-fonts/Big.js"),
            Small: () => import("figlet/importable-fonts/Small.js"),
            Doom: () => import("figlet/importable-fonts/Doom.js"),
            Banner: () => import("figlet/importable-fonts/Banner.js"),
            Block: () => import("figlet/importable-fonts/Block.js"),
            Shadow: () => import("figlet/importable-fonts/Shadow.js"),
          };
          await Promise.all(
            Object.entries(builtin).map(async ([name, loader]) => {
              const mod = await loader();
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

  const updateFiglet = useCallback(() => {
    if (workerRef.current && font) {
      workerRef.current.postMessage({
        type: "render",
        text,
        font,
        width,
        layout,
      });
    }
  }, [text, font, width, layout]);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateFiglet);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [updateFiglet]);

  useEffect(() => {
    if (!rawOutput) {
      setOutput("");
      return;
    }
    const lines = rawOutput
      .split("\n")
      .map((l: string) => l.replace(/\s+$/, ""));
    const max = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const transformed = lines
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
    setOutput(transformed);
  }, [rawOutput, align, padding]);

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

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex flex-wrap gap-2 bg-ub-gedit-dark items-center">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={monoOnly}
            onChange={() => setMonoOnly((m) => !m)}
            aria-label="Show monospace fonts only"
          />
          Monospace only
        </label>
        <FontGrid fonts={displayedFonts} value={font} onChange={setFont} />
        <input
          type="file"
          accept=".flf"
          onChange={handleUpload}
          className="text-sm"
          aria-label="Upload font"
        />
        {serverFontNames.length > 0 && (
          <select
            value=""
            onChange={(e) => setFont(e.target.value)}
            className="px-1 bg-gray-700 text-white"
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
        )}
        <input
          type="text"
          className="flex-1 px-2 bg-gray-700 text-white"
          placeholder="Type here"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Text to convert"
        />
        <label className="flex items-center gap-1 text-sm">
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
        <label className="flex items-center gap-1 text-sm">
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
        <label className="flex items-center gap-1 text-sm">
          Width
          <input
            type="number"
            min="20"
            max="200"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-16 px-1 bg-gray-700 text-white"
            aria-label="Width"
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          Layout
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="px-1 bg-gray-700 text-white"
            aria-label="Layout"
          >
            <option value="default">Default</option>
            <option value="full">Full</option>
            <option value="fitted">Fitted</option>
            <option value="smush">Smush</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
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
        <label className="flex items-center gap-1 text-sm">
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
          onClick={copyOutput}
          className="px-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
          aria-label="Banner to clipboard"
        >
          Banner to Clipboard
        </button>
        <button
          onClick={exportPNG}
          className="p-1 bg-green-700 hover:bg-green-600 rounded"
          aria-label="Export PNG"
        >
          <img
            src="/themes/Yaru/actions/document-save-as-png-symbolic.svg"
            alt=""
            className="w-6 h-6"
          />
        </button>
        <button
          onClick={exportSVG}
          className="p-1 bg-yellow-700 hover:bg-yellow-600 rounded"
          aria-label="Export SVG"
        >
          <img
            src="/themes/Yaru/actions/document-save-as-svg-symbolic.svg"
            alt=""
            className="w-6 h-6"
          />
        </button>
        <button
          onClick={exportText}
          className="px-2 bg-purple-700 hover:bg-purple-600 rounded text-white"
          aria-label="Export text file"
        >
          TXT
        </button>
        <button
          onClick={() => setInverted((i) => !i)}
          className="px-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          aria-label="Invert colors"
        >
          Invert
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre
          ref={preRef}
          className={`min-w-full p-2 whitespace-pre font-mono transition-colors motion-reduce:transition-none ${
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
