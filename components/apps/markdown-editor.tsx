"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import useOPFS from "../../hooks/useOPFS";

const IMAGE_DIR = "files/markdown-editor";

type LinkStatus = "pending" | "valid" | "invalid";

const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

const normalizePath = (input: string) =>
  input.replace(/^[./]+/, "").replace(/\\+/g, "/");

const collectLinks = (tokens: marked.TokensList): string[] => {
  const urls: string[] = [];
  const visit = (token: marked.Tokens.Generic) => {
    if ((token as marked.Tokens.Link | marked.Tokens.Image).href) {
      const { href } = token as marked.Tokens.Link | marked.Tokens.Image;
      if (href) urls.push(href);
    }
    if (Array.isArray((token as any).tokens)) {
      for (const child of (token as any).tokens as marked.Tokens.Generic[]) {
        visit(child);
      }
    }
    if (Array.isArray((token as any).items)) {
      for (const child of (token as any).items as marked.Tokens.Generic[]) {
        visit(child);
      }
    }
  };
  for (const token of tokens) visit(token);
  return urls;
};

const extractExternalLinks = (text: string): string[] => {
  try {
    const tokens = marked.lexer(text);
    const urls = collectLinks(tokens);
    return urls.filter(isExternalUrl);
  } catch {
    return [];
  }
};

const getExtension = (file: File) => {
  if (file.type && file.type.includes("/")) {
    const [, ext] = file.type.split("/");
    if (ext) return ext.replace(/[^a-z0-9]/gi, "") || "png";
  }
  const nameExt = file.name.split(".").pop();
  return nameExt ? nameExt.replace(/[^a-z0-9]/gi, "") || "png" : "png";
};

interface MarkdownEditorProps {
  fetchImpl?: typeof fetch;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ fetchImpl }) => {
  const [content, setContent] = useState("");
  const [linkStatuses, setLinkStatuses] = useState<Record<string, LinkStatus>>({});
  const [imageStatus, setImageStatus] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const imageUrlsRef = useRef<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const { supported, getDir, writeFile } = useOPFS();

  const fetcher = fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const previewHtml = useMemo(() => {
    const rendered = marked.parse(content) as string;
    return DOMPurify.sanitize(rendered);
  }, [content]);

  const ensureImageDir = useCallback(async () => {
    if (!supported) return null;
    if (dirRef.current) return dirRef.current;
    try {
      const dir = await getDir(IMAGE_DIR);
      if (dir) dirRef.current = dir;
      return dir;
    } catch {
      return null;
    }
  }, [supported, getDir]);

  const registerImageUrl = useCallback((path: string, file: File) => {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      return;
    }
    const normalized = normalizePath(path);
    const objectUrl = URL.createObjectURL(file);
    setImageUrls((prev) => {
      const next = { ...prev, [normalized]: objectUrl };
      imageUrlsRef.current = next;
      const existing = prev[normalized];
      if (existing && existing !== objectUrl && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(existing);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
      for (const url of Object.values(imageUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const insertAtCursor = useCallback((text: string) => {
    if (!text) return;
    setContent((prev) => {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? prev.length;
      const end = textarea?.selectionEnd ?? prev.length;
      const before = prev.slice(0, start);
      const after = prev.slice(end);
      const needsLeadingNewline = before.length > 0 && !before.endsWith("\n");
      const needsTrailingNewline = after.length > 0 && !after.startsWith("\n");
      const insertion = `${needsLeadingNewline ? "\n" : ""}${text}${needsTrailingNewline ? "\n" : ""}`;
      const next = `${before}${insertion}${after}`;
      const cursor = before.length + insertion.length;
      selectionRef.current = { start: cursor, end: cursor };
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectionRef.current || !textareaRef.current) return;
    const { start, end } = selectionRef.current;
    selectionRef.current = null;
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(start, end);
    });
  }, [content]);

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!supported) return;
      const clipboard = event.clipboardData;
      if (!clipboard || !clipboard.items || clipboard.items.length === 0) return;
      const images: DataTransferItem[] = [];
      for (let i = 0; i < clipboard.items.length; i += 1) {
        const item = clipboard.items[i];
        if (item && item.kind === "file" && item.type.startsWith("image/")) {
          images.push(item);
        }
      }
      if (!images.length) return;
      event.preventDefault();
      setImageStatus("Saving pasted image...");
      try {
        const dir = await ensureImageDir();
        if (!dir) {
          setImageStatus("Unable to access Files storage.");
          return;
        }
        const snippets: string[] = [];
        for (const item of images) {
          const file = item.getAsFile();
          if (!file) continue;
          const ext = getExtension(file);
          const name = `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const ok = await writeFile(name, file, dir);
          if (!ok) {
            setImageStatus("Failed to save pasted image.");
            continue;
          }
          const relativePath = `${IMAGE_DIR}/${name}`;
          registerImageUrl(relativePath, file);
          snippets.push(`![Pasted image](${relativePath})`);
        }
        if (snippets.length) {
          insertAtCursor(snippets.join("\n"));
          setImageStatus(
            snippets.length === 1
              ? "Saved pasted image to Files."
              : `Saved ${snippets.length} images to Files.`,
          );
        }
      } catch {
        setImageStatus("Failed to save pasted image.");
      }
    },
    [supported, ensureImageDir, writeFile, registerImageUrl, insertAtCursor],
  );

  useEffect(() => {
    const links = Array.from(new Set(extractExternalLinks(content)));
    if (!links.length) {
      setLinkStatuses({});
      return;
    }
    setLinkStatuses((prev) => {
      const next: Record<string, LinkStatus> = {};
      for (const url of links) {
        const previous = prev[url];
        if (!fetcher) {
          next[url] = previous === "invalid" ? "invalid" : "valid";
        } else if (previous === "valid" || previous === "invalid") {
          next[url] = previous;
        } else {
          next[url] = "pending";
        }
      }
      return next;
    });
  }, [content, fetcher]);

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    for (const [url, status] of Object.entries(linkStatuses)) {
      if (status !== "pending") continue;
      fetcher(url, { method: "HEAD", cache: "no-store" })
        .then((res) => {
          if (cancelled) return;
          setLinkStatuses((prev) => {
            if (!(url in prev) || prev[url] !== "pending") return prev;
            return { ...prev, [url]: res.ok ? "valid" : "invalid" };
          });
        })
        .catch(() => {
          if (cancelled) return;
          setLinkStatuses((prev) => {
            if (!(url in prev)) return prev;
            if (prev[url] === "invalid") return prev;
            return { ...prev, [url]: "invalid" };
          });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [linkStatuses, fetcher]);

  const warningUrls = useMemo(
    () =>
      Object.entries(linkStatuses)
        .filter(([, status]) => status === "invalid")
        .map(([url]) => url),
    [linkStatuses],
  );

  const pendingLinks = useMemo(
    () => Object.values(linkStatuses).some((status) => status === "pending"),
    [linkStatuses],
  );

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const images = Array.from(container.querySelectorAll("img"));
    for (const img of images) {
      const src = img.getAttribute("src") || "";
      if (!src || /^https?:/i.test(src) || src.startsWith("data:")) continue;
      const normalized = normalizePath(src);
      const localUrl = imageUrls[normalized];
      if (localUrl && img.src !== localUrl) {
        img.src = localUrl;
      }
    }
  }, [previewHtml, imageUrls]);

  return (
    <div className="flex h-full bg-ub-cool-grey text-white">
      <div className="flex w-1/2 flex-col gap-2 p-4">
        <label htmlFor="markdown-editor-input" className="text-sm font-semibold">
          Markdown input
        </label>
        <textarea
          id="markdown-editor-input"
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          className="h-full min-h-[12rem] flex-1 resize-none rounded bg-black bg-opacity-40 p-3 font-mono text-sm outline-none"
          spellCheck={false}
        />
        <div aria-live="polite" className="text-xs text-ubt-gedit-blue">
          {imageStatus}
        </div>
        {pendingLinks && (
          <div aria-live="polite" className="text-xs text-yellow-300">
            Validating links...
          </div>
        )}
        {warningUrls.length > 0 && (
          <div className="space-y-1 text-xs text-red-300" aria-live="assertive">
            {warningUrls.map((url) => (
              <p key={url} role="alert">
                Link unreachable: {url}
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="w-1/2 overflow-auto bg-black bg-opacity-30 p-4" ref={previewRef}>
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    </div>
  );
};

export const displayMarkdownEditor = () => <MarkdownEditor />;

export default MarkdownEditor;
