"use client";

import { useEffect, useState } from "react";

interface FilePreview {
  name: string;
  content: string;
}

export default function FileHandlerListener() {
  const [files, setFiles] = useState<FilePreview[]>([]);

  useEffect(() => {
    if ("launchQueue" in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files && launchParams.files.length) {
          const previews = await Promise.all(
            launchParams.files.map(async (fileHandle: any) => {
              const file = await fileHandle.getFile();
              const content = await file.text();
              return {
                name: file.name,
                content: content.slice(0, 100),
              };
            })
          );
          setFiles(previews);
        }
      });
    }
  }, []);

  if (!files.length) return null;

  return (
    <div>
      {files.map((file) => (
        <div key={file.name} className="mb-4">
          <p className="font-bold">{file.name}</p>
          <pre className="whitespace-pre-wrap">{file.content}</pre>
        </div>
      ))}
    </div>
  );
}

