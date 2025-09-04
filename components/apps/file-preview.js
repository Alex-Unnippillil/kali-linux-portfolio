import React, { useEffect, useState } from 'react';

export default function FilePreview({ file, onClose }) {
  const [src, setSrc] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    let url = null;
    (async () => {
      try {
        const f = await file.handle.getFile();
        if (f.type.startsWith('image/')) {
          url = URL.createObjectURL(f);
          setSrc(url);
        } else {
          const t = await f.text();
          setText(t);
        }
      } catch {
        setText('Unable to preview file');
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" role="dialog" aria-modal="true">
      <div className="bg-white text-black p-4 max-w-full max-h-full overflow-auto">
        {src ? (
          <img src={src} alt={file.name} className="max-w-full max-h-[80vh]" />
        ) : (
          <pre className="whitespace-pre-wrap max-w-full max-h-[80vh] overflow-auto">{text}</pre>
        )}
        <button onClick={onClose} className="mt-2 px-2 py-1 bg-black text-white rounded">
          Close
        </button>
      </div>
    </div>
  );
}
