"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PipPortalProvider, { usePipPortal } from "../common/PipPortal";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { open, close } = usePipPortal();
  const [pipSupported, setPipSupported] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    setPipSupported(
      typeof document !== "undefined" &&
        !!document.pictureInPictureEnabled &&
        !!video &&
        typeof video.requestPictureInPicture === "function"
    );
    setDocPipSupported(
      typeof window !== "undefined" &&
        !!(window as any).documentPictureInPicture
    );

    const handleLeave = () => setIsPip(false);
    video?.addEventListener("leavepictureinpicture", handleLeave);
    const handleEnd = () => close();
    video?.addEventListener("ended", handleEnd);

    return () => {
      video?.removeEventListener("leavepictureinpicture", handleLeave);
      video?.removeEventListener("ended", handleEnd);
    };
  }, [close]);

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (!document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        setIsPip(true);
      } else {
        await document.exitPictureInPicture();
        setIsPip(false);
      }
    } catch {
      setIsPip(false);
    }
  };

  // Listen for messages from the Doc-PiP window
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!videoRef.current || e.data?.source !== "doc-pip") return;
      const video = videoRef.current;
      switch (e.data.type) {
        case "toggle":
          if (video.paused) video.play();
          else video.pause();
          break;
        case "seek":
          video.currentTime = Math.max(
            0,
            Math.min(video.duration || 0, video.currentTime + Number(e.data.delta || 0))
          );
          break;
        case "volume":
          video.volume = Math.max(0, Math.min(1, Number(e.data.value)));
          break;
        default:
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openDocPip = async () => {
    if (!docPipSupported) return;
    const initialVolume = videoRef.current?.volume ?? 1;
    const DocPipControls: React.FC<{ initialVolume: number }> = ({ initialVolume }) => {
      const [vol, setVol] = useState(initialVolume);
      const [copiedId, setCopiedId] = useState<string | null>(null);
      const [copyError, setCopyError] = useState<string | null>(null);
      const send = useCallback(
        (msg: any) => {
          window.opener?.postMessage({ source: "doc-pip", ...msg }, "*");
        },
        [],
      );

      const handleCopy = useCallback(async (text: string, id: string) => {
        if (typeof window === "undefined" || typeof document === "undefined") return;
        setCopyError(null);
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            await navigator.clipboard.writeText(text);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "true");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textarea);
            if (!successful) {
              throw new Error("Copy command was not successful");
            }
          }
          setCopiedId(id);
          window.setTimeout(() => {
            setCopiedId((current) => (current === id ? null : current));
          }, 2000);
        } catch (err) {
          console.error(err);
          setCopyError("Copy failed. Long-press the command to select it manually.");
        }
      }, []);

      const osSections = [
        {
          id: "mac",
          title: "macOS setup",
          description:
            "Install Yarn with Homebrew, then install dependencies and start the development server.",
          command: "brew install yarn\ncd kali-linux-portfolio\nyarn install\nyarn dev",
        },
        {
          id: "windows",
          title: "Windows setup",
          description:
            "Use Winget to install Yarn, then install dependencies from PowerShell and run the dev server.",
          command:
            "winget install --id Yarn.Yarn -e\ncd kali-linux-portfolio\nyarn install\nyarn dev",
        },
        {
          id: "linux",
          title: "Linux setup",
          description:
            "Install Yarn via your package manager, then install dependencies and start the dev server.",
          command:
            "sudo apt update && sudo apt install yarnpkg\ncd kali-linux-portfolio\nyarn install\nyarn dev",
        },
      ];

      return (
        <div
          style={{
            padding: 12,
            background: "#0b0b0b",
            color: "white",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 320,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <button
              style={{ padding: "6px 10px", background: "#2563eb", color: "white", border: "none", borderRadius: 6 }}
              onClick={() => send({ type: "toggle" })}
            >
              Play/Pause
            </button>
            <button
              style={{ padding: "6px 10px", background: "#1f2937", color: "white", border: "none", borderRadius: 6 }}
              onClick={() => send({ type: "seek", delta: -5 })}
            >
              -5s
            </button>
            <button
              style={{ padding: "6px 10px", background: "#1f2937", color: "white", border: "none", borderRadius: 6 }}
              onClick={() => send({ type: "seek", delta: 5 })}
            >
              +5s
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12 }}>Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVol(v);
                  send({ type: "volume", value: v });
                }}
              />
            </label>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 8 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Quick start cheatsheet</h2>
            <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.4 }}>
              Choose your operating system below to view the recommended setup commands. Use the copy button or long-press on
              mobile devices to copy the snippet.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {osSections.map((section) => {
                const label = copiedId === section.id ? "Copied!" : "Copy";
                return (
                  <details
                    key={section.id}
                    style={{
                      background: "#111827",
                      borderRadius: 8,
                      padding: "6px 8px",
                    }}
                  >
                    <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{section.title}</summary>
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>{section.description}</p>
                      <pre
                        style={{
                          margin: 0,
                          background: "rgba(15,23,42,0.8)",
                          borderRadius: 6,
                          padding: 8,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                          fontSize: 12,
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                        aria-label={`${section.title} setup commands`}
                      >
                        <code>{section.command}</code>
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy(section.command, section.id)}
                        style={{
                          alignSelf: "flex-start",
                          padding: "6px 10px",
                          background: copiedId === section.id ? "#16a34a" : "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 13,
                          transition: "background 0.2s ease",
                        }}
                        aria-live="polite"
                      >
                        {label}
                      </button>
                    </div>
                  </details>
                );
              })}
            </div>
            {copyError && (
              <p style={{ marginTop: 8, color: "#fbbf24", fontSize: 12 }} aria-live="assertive">
                {copyError}
              </p>
            )}
          </div>
        </div>
      );
    };

    await open(<DocPipControls initialVolume={initialVolume} />);
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <video ref={videoRef} src={src} poster={poster} controls className="w-full h-auto" />
      {pipSupported && (
        <button
          type="button"
          onClick={togglePiP}
          className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
        >
          {isPip ? "Exit PiP" : "PiP"}
        </button>
      )}
      {docPipSupported && (
        <button
          type="button"
          onClick={openDocPip}
          className="absolute bottom-2 right-16 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white"
        >
          Doc-PiP
        </button>
      )}
    </div>
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => (
  <PipPortalProvider>
    <VideoPlayerInner {...props} />
  </PipPortalProvider>
);

export default VideoPlayer;

