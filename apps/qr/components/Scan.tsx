import React, { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onResult: (text: string) => void;
}

const Scan: React.FC<Props> = ({ onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker>();
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const rafRef = useRef<number>();
  const decodingRef = useRef(false);
  const lastTextRef = useRef("");

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL("../../../workers/qrDecode.worker.ts", import.meta.url),
    );
    workerRef.current = worker;
    worker.onmessage = ({ data }: MessageEvent<{ text: string | null }>) => {
      decodingRef.current = false;
      const text = data.text;
      if (text && text !== lastTextRef.current) {
        lastTextRef.current = text;
        onResult(text);
      }
    };
    return () => {
      worker.terminate();
    };
  }, [onResult]);

  // enumerate cameras
  useEffect(() => {
    const enumerate = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const vids = list.filter((d) => d.kind === "videoinput");
        setDevices(vids);
        if (!deviceId && vids[0]) setDeviceId(vids[0].deviceId);
      } catch {
        /* ignore */
      }
    };
    enumerate();
    navigator.mediaDevices?.addEventListener("devicechange", enumerate);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", enumerate);
    };
  }, [deviceId]);
  // scanning loop
  const scan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const worker = workerRef.current;
    if (!video || !canvas || !worker) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    if (decodingRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    decodingRef.current = true;
    worker.postMessage({ buffer: imageData.data.buffer, width, height }, [
      imageData.data.buffer,
    ]);
    rafRef.current = requestAnimationFrame(scan);
  }, []);

  // start selected camera
  useEffect(() => {
    let active = true;
    let stream: MediaStream;
    const start = async () => {
      if (!deviceId) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });
        if (!active) return;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities?.();
        setTorchSupported(Boolean(caps && caps.torch));
        setTorchOn(false);
        rafRef.current = requestAnimationFrame(scan);
      } catch {
        /* ignore */
      }
    };
    start();
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
      trackRef.current = null;
    };
  }, [deviceId, scan]);

  const toggleTorch = () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    track
      .applyConstraints({ advanced: [{ torch: next }] })
      .then(() => setTorchOn(next))
      .catch(() => {});
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black">
      <video ref={videoRef} className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-2 left-2 flex gap-2 bg-black/50 p-1 rounded">
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="text-black text-sm rounded p-1"
        >
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>
        {torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle torch"
            className="px-2 text-sm rounded bg-white/20 text-white"
          >
            {torchOn ? "Torch Off" : "Torch On"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Scan;
