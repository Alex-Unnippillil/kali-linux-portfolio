"use client";

import { useEffect, useRef } from "react";

interface Props {
  code: string;
  onConsole: (msg: string) => void;
}

export default function WebPreview({ code, onConsole }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const { type, message } = event.data || {};
      if (typeof type === "string") {
        onConsole(`${type}: ${message}`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onConsole]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc =
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>\n` +
      `const send=(type,message)=>parent.postMessage({type,message},'*');\n` +
      `[ 'log','warn','info','error'].forEach((key)=>{\n` +
      ` const original=console[key];\n` +
      ` console[key]=(...args)=>{\n` +
      `   send(key,args.map(a=>String(a)).join(' '));\n` +
      `   original.apply(console,args);\n` +
      ` };\n` +
      `});\n` +
      `window.addEventListener('error',e=>send('error',e.message));\n` +
      `</script>` +
      code +
      `</body></html>`;
    iframeRef.current.srcdoc = doc;
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      className="flex-1 border-l"
    />
  );
}
