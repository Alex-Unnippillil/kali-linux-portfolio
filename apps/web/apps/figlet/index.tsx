"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { toPng, toSvg } from "html-to-image";
import AlignmentControls from "./components/AlignmentControls";
import FontGrid from "./components/FontGrid";
import usePersistentState from "../../hooks/usePersistentState";

interface FontInfo {
  name: string;
  preview: string;
  mono: boolean;
}

const textActionButtonBase =
  "rounded border border-[color:var(--kali-border)] px-3 py-1 text-sm font-semibold uppercase tracking-wide transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus";

const iconActionButtonBase =
  "rounded border border-[color:var(--kali-border)] p-1 transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus";

const copyButtonClass =
  `${textActionButtonBase} bg-[color:var(--color-primary)] text-[color:var(--color-inverse)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_85%,var(--kali-panel))]`;

const txtExportButtonClass =
  `${textActionButtonBase} bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--kali-panel-highlight))] text-[color:var(--kali-text)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_68%,rgba(15,148,210,0.22))]`;

const invertButtonClass =
  `${textActionButtonBase} bg-[color:color-mix(in_srgb,var(--kali-panel)_78%,rgba(15,148,210,0.24))] text-[color:var(--kali-text)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,rgba(15,148,210,0.28))]`;

const pngButtonClass =
  `${iconActionButtonBase} bg-[color:color-mix(in_srgb,var(--color-primary)_88%,var(--kali-panel))] text-[color:var(--color-inverse)] hover:bg-[color:var(--color-primary)]`;

const svgButtonClass =
  `${iconActionButtonBase} bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,rgba(15,148,210,0.26))] text-[color:var(--kali-text)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_66%,rgba(15,148,210,0.32))]`;

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

  const previewStyle = useMemo(() => {
    const baseColor = inverted ? "#121212" : "#f7f7f7";
    const style: React.CSSProperties = {
      fontSize: `${fontSize}px`,
      lineHeight,
      letterSpacing: `${kerning}px`,
    };

    if (gradient !== 0) {
      style.backgroundImage = `linear-gradient(to right, hsl(${gradient},100%,60%), hsl(${(gradient + 120) % 360},100%,60%))`;
      style.backgroundSize = "100% 100%";
      style.WebkitBackgroundClip = "text";
      style.WebkitTextFillColor = "transparent";
      style.color = baseColor;
    } else {
      style.color = baseColor;
    }

    return style;
  }, [fontSize, gradient, inverted, kerning, lineHeight]);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--kali-panel)] font-mono text-[color:var(--kali-text)]">
      <div className="flex flex-col gap-3 border-b border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,rgba(15,148,210,0.08))] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded border border-[color:color-mix(in_srgb,var(--kali-border)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--kali-panel-highlight))] px-2 py-1 text-xs uppercase tracking-wide">
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
            className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-xs text-[color:var(--kali-text)] transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            aria-label="Upload font"
          />
          {serverFontNames.length > 0 && (
            <select
              value=""
              onChange={(e) => setFont(e.target.value)}
              className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-xs text-[color:var(--kali-text)] transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex flex-1 min-w-[16rem] items-center gap-2 text-sm">
            <span className="whitespace-nowrap text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_76%,transparent)]">
              Sample Text
            </span>
            <input
              type="text"
              className="flex-1 rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_45%,transparent)] transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              placeholder="Type here"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Text to convert"
            />
          </label>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide">
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
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide">
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
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide">
            Width
            <input
              type="number"
              min="20"
              max="200"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-20 rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              aria-label="Width"
            />
          </label>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide">
            Layout
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-[color:var(--kali-text)] transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              aria-label="Layout"
            >
              <option value="default">Default</option>
              <option value="full">Full</option>
              <option value="fitted">Fitted</option>
              <option value="smush">Smush</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide">
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
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyOutput}
            className={copyButtonClass}
            aria-label="Banner to clipboard"
          >
            Banner to Clipboard
          </button>
          <button
            onClick={exportPNG}
            className={pngButtonClass}
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
            className={svgButtonClass}
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
            className={txtExportButtonClass}
            aria-label="Export text file"
          >
            TXT
          </button>
          <button
            onClick={() => setInverted((i) => !i)}
            className={invertButtonClass}
            aria-label="Invert colors"
          >
            Invert
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[18rem] overflow-hidden">
        <div
          className={`h-full overflow-auto border-b border-[color:var(--kali-border)] ${
            inverted
              ? "bg-[color:var(--color-text)]"
              : "bg-[var(--kali-panel)]"
          }`}
        >
          <pre
            ref={preRef}
            className="min-h-full w-full whitespace-pre px-4 py-5 font-mono"
            style={previewStyle}
          >
            {output}
          </pre>
        </div>
      </div>
      <div className="p-2 text-right text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
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
