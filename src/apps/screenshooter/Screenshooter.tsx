"use client";
import React, { useState } from 'react';

const Screenshooter = () => {
  const [captureType, setCaptureType] = useState<'monitor' | 'window' | 'browser'>('monitor');
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const capture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: captureType },
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0);
      const b: Blob = await new Promise((resolve) =>
        canvas.toBlob((bb) => resolve(bb || new Blob()), 'image/png')
      );
      setBlob(b);
      setImgUrl(URL.createObjectURL(b));
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
  };

  const copy = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch {
      // ignore
    }
  };

  const openWith = () => {
    if (imgUrl) window.open(imgUrl);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white space-y-4 p-4">
      <div className="space-x-2">
        <label htmlFor="capture-type">Capture:</label>
        <select
          id="capture-type"
          value={captureType}
          onChange={(e) => setCaptureType(e.target.value as any)}
          className="text-black px-2 py-1 rounded"
        >
          <option value="monitor">Screen</option>
          <option value="window">Window</option>
          <option value="browser">Browser Tab</option>
        </select>
        <button
          onClick={capture}
          className="ml-2 px-4 py-1 bg-ub-dracula rounded hover:bg-ub-dracula-dark"
        >
          Capture
        </button>
      </div>
      {imgUrl && (
        <>
          <img src={imgUrl} alt="screenshot" className="max-w-full" />
          <div className="space-x-2">
            <button
              onClick={copy}
              className="px-3 py-1 bg-ub-dracula rounded hover:bg-ub-dracula-dark"
            >
              Copy
            </button>
            <button
              onClick={openWith}
              className="px-3 py-1 bg-ub-dracula rounded hover:bg-ub-dracula-dark"
            >
              Open With
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Screenshooter;

export const displayScreenshooter = () => <Screenshooter />;

