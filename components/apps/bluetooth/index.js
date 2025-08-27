import React, { useEffect, useRef, useState } from 'react';

const BluetoothApp = () => {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const animationRef = useRef(null);
  const devicesRef = useRef([]);
  const [devices, setDevices] = useState([]); // used only to redraw in reduced motion
  const ariaRef = useRef(null);
  const sweepRef = useRef(0);
  const prefersReduceRef = useRef(false);
  const [supported, setSupported] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [gattInfo, setGattInfo] = useState([]);

  const drawStatic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy);
    devicesRef.current.forEach((d) => {
      const r = d.distance * radius;
      const x = cx + Math.cos(d.angle) * r;
      const y = cy + Math.sin(d.angle) * r;
      ctx.strokeStyle = '#39FF14';
      ctx.beginPath();
      ctx.arc(x, y, d.strength * 20 + 4, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy);

    sweepRef.current += 0.02;
    ctx.strokeStyle = '#39FF14';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(sweepRef.current) * radius,
      cy + Math.sin(sweepRef.current) * radius,
    );
    ctx.stroke();

    devicesRef.current.forEach((d) => {
      const r = d.distance * radius;
      const x = cx + Math.cos(d.angle) * r;
      const y = cy + Math.sin(d.angle) * r;
      ctx.fillStyle = '#39FF14';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(57,255,20,${1 - d.ring / (d.strength * radius + 1)})`;
      ctx.beginPath();
      ctx.arc(x, y, d.ring, 0, Math.PI * 2);
      ctx.stroke();

      d.ring += 2;
      if (d.ring > d.strength * radius) {
        d.ring = 0;
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handle = () => {
      prefersReduceRef.current = mq.matches;
      if (prefersReduceRef.current) {
        cancelAnimationFrame(animationRef.current);
        drawStatic();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    if (supported === false) return;
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const dev = { ...e.data, ring: 0 };
      devicesRef.current.push(dev);
      if (ariaRef.current) {
        ariaRef.current.textContent = `${dev.name} detected`;
      }
      if (prefersReduceRef.current) {
        setDevices([...devicesRef.current]);
      }
    };
    workerRef.current.postMessage({ command: 'start' });
    return () => {
      workerRef.current.postMessage({ command: 'stop' });
      workerRef.current.terminate();
    };
  }, [supported]);

  useEffect(() => {
    if (prefersReduceRef.current) {
      drawStatic();
    }
  }, [devices]);

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && !!navigator.bluetooth);
  }, []);

  const handleScan = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      setDeviceName(device.name || device.id);
      if (!device.gatt) {
        setGattInfo([]);
        return;
      }
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const info = [];
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        info.push({
          uuid: service.uuid,
          characteristics: characteristics.map((c) => c.uuid),
        });
      }
      setGattInfo(info);
    } catch (err) {
      console.error(err);
    }
  };

  if (supported === null) return null;

  if (supported === false) {
    return (
      <div className="h-full w-full bg-black text-white flex items-center justify-center">
        <div className="bg-gray-800 p-4 rounded text-center">
          <p className="mb-2">Web Bluetooth API not supported.</p>
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API"
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-400"
          >
            Learn more
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black text-white relative" aria-label="Bluetooth radar">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={ariaRef} aria-live="polite" className="sr-only" />
      <div className="absolute top-2 left-2 z-10">
        <button
          onClick={handleScan}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
        >
          Scan for BLE
        </button>
      </div>
      {deviceName && (
        <div className="absolute top-12 left-2 right-2 max-h-1/2 overflow-auto bg-gray-900 bg-opacity-75 p-2 rounded">
          <h2 className="font-bold mb-2 break-words">{deviceName}</h2>
          {gattInfo.map((s) => (
            <div key={s.uuid} className="mb-2">
              <h3 className="text-sm font-semibold break-all">Service: {s.uuid}</h3>
              <ul className="ml-4 list-disc">
                {s.characteristics.map((c) => (
                  <li key={c} className="text-xs break-all">Characteristic: {c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BluetoothApp;
export const displayBluetooth = () => <BluetoothApp />;
