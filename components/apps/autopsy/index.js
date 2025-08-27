import React, { useState, useEffect, useRef, useCallback } from 'react';

const escapeFilename = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // eslint-disable-next-line no-useless-escape
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function Timeline({ events }) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const [sorted, setSorted] = useState([]);
  const MIN_ZOOM = 1 / (24 * 60); // 1 pixel per day
  const MAX_ZOOM = 60; // 60 pixels per minute
  const [zoom, setZoom] = useState(1 / 60); // start at 1 pixel per hour
  const [zoomAnnouncement, setZoomAnnouncement] = useState('');

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./timelineWorker.js', import.meta.url)
    );
    workerRef.current.onmessage = (e) => setSorted(e.data);
    return () => workerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (workerRef.current) workerRef.current.postMessage({ events });
  }, [events]);

  useEffect(() => {
    const minutesPerPixel = 1 / zoom;
    let scale;
    if (minutesPerPixel >= 1440) {
      const days = minutesPerPixel / 1440;
      scale = `${days.toFixed(0)} day${days > 1 ? 's' : ''} per pixel`;
    } else if (minutesPerPixel >= 60) {
      const hours = minutesPerPixel / 60;
      scale = `${hours.toFixed(0)} hour${hours > 1 ? 's' : ''} per pixel`;
    } else if (minutesPerPixel >= 1) {
      scale = `${minutesPerPixel.toFixed(0)} minute${
        minutesPerPixel > 1 ? 's' : ''
      } per pixel`;
    } else {
      const seconds = minutesPerPixel * 60;
      scale = `${seconds.toFixed(0)} second${
        seconds > 1 ? 's' : ''
      } per pixel`;
    }
    setZoomAnnouncement(`Timeline scale: ${scale}`);
  }, [zoom]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || sorted.length === 0) return;
    const ctx = canvas.getContext('2d');
    const times = sorted.map((e) => new Date(e.timestamp).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const rangeMin = (max - min) / 60000 || 1;
    const width = Math.max(rangeMin * zoom, 600);
    canvas.width = width;
    canvas.height = 80;
    const height = canvas.height;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const render = () => {
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw ticks based on zoom level
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      const minutesPerPixel = 1 / zoom;
      const approxTickMinutes = minutesPerPixel * 80;
      const tickOptions = [1, 5, 15, 30, 60, 120, 240, 720, 1440];
      const tickMinutes =
        tickOptions.find((t) => t >= approxTickMinutes) || 1440;
      const tickMs = tickMinutes * 60000;
      const firstTick = Math.ceil(min / tickMs) * tickMs;
      for (let t = firstTick; t <= max; t += tickMs) {
        const x = ((t - min) / 60000) * zoom;
        ctx.fillRect(x, height / 2 + 10, 1, 10);
        const date = new Date(t);
        let label;
        if (tickMinutes >= 1440) {
          label = date.toLocaleDateString();
        } else if (tickMinutes >= 60) {
          label = date.toLocaleTimeString([], { hour: '2-digit' });
        } else {
          label = date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        ctx.fillText(label, x + 2, height / 2 + 25);
      }

      ctx.fillStyle = '#ffa500';
      sorted.forEach((ev) => {
        const t = new Date(ev.timestamp).getTime();
        const x = ((t - min) / 60000) * zoom;
        ctx.fillRect(x, height / 2 - 10, 2, 20);
      });
    };
    if (prefersReduced) {
      render();
    } else {
      requestAnimationFrame(render);
    }
  }, [sorted, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="w-full overflow-x-auto">
      <div aria-live="polite" className="sr-only">
        {zoomAnnouncement}
      </div>
      <div className="flex space-x-2 mb-1">
        <button
          onClick={() => setZoom((z) => Math.min(z * 2, MAX_ZOOM))}
          className="bg-ub-orange text-black px-2 py-1 rounded"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z / 2, MIN_ZOOM))}
          className="bg-ub-orange text-black px-2 py-1 rounded"
          aria-label="Zoom out"
        >
          -
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="bg-ub-grey"
        role="img"
        aria-label="File event timeline"
      />
    </div>
  );
}

function Autopsy() {
  const [caseName, setCaseName] = useState('');
  const [currentCase, setCurrentCase] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [artifacts, setArtifacts] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [filter, setFilter] = useState('');
  const parseWorkerRef = useRef(null);

  useEffect(() => {
    fetch('/plugin-marketplace.json')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        parseWorkerRef.current = new Worker(
          new URL('./jsonWorker.js', import.meta.url)
        );
        parseWorkerRef.current.onmessage = (e) =>
          setArtifacts(e.data || []);
      } catch {
        parseWorkerRef.current = null;
      }
    }
    return () => parseWorkerRef.current && parseWorkerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (!currentCase) return;
    fetch('/autopsy-demo.json')
      .then(async (res) => {
        const text = res.text
          ? await res.text()
          : JSON.stringify(await res.json());
        if (parseWorkerRef.current) {
          parseWorkerRef.current.postMessage(text);
        } else {
          try {
            const data = JSON.parse(text);
            setArtifacts(data.artifacts || []);
          } catch {
            setArtifacts([]);
          }
        }
      })
      .catch(() => setArtifacts([]));
  }, [currentCase]);

  const filteredArtifacts = artifacts.filter((a) =>
    a.type.toLowerCase().includes(filter.toLowerCase())
  );

  const createCase = () => {
    const name = caseName.trim();
    if (name) {
      setCurrentCase(name);
      setAnalysis('');
    }
  };

  const analyseFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      const bytes = new Uint8Array(buffer).slice(0, 20);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      const safeName = escapeFilename(file.name);
      setAnalysis(
        `File: ${safeName}\nSize: ${file.size} bytes\nFirst 20 bytes: ${hex}`
      );
      setArtifacts((prev) => [
        ...prev,
        {
          name: file.name,
          size: file.size,
          hex,
          plugin: selectedPlugin || 'None',
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadReport = () => {
    const lines = artifacts.map(
      (a) => `${a.timestamp} - ${a.name} (${a.size} bytes) [Plugin: ${a.plugin}]`
    );
    const report = `Case: ${currentCase}\n` + lines.join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentCase || 'case'}-report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (artifacts.length > 0) {
      const a = artifacts[artifacts.length - 1];
      setAnnouncement(
        `${escapeFilename(a.name)} analyzed at ${new Date(a.timestamp).toLocaleString()}`
      );
    }
  }, [artifacts]);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4">
      <div
        aria-live="polite"
        className="sr-only"
        dangerouslySetInnerHTML={{ __html: announcement }}
      />
      <div className="flex space-x-2">
        <input
          type="text"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          placeholder="Case name"
          className="flex-grow bg-ub-grey text-white px-2 py-1 rounded"
        />
        <button
          onClick={createCase}
          className="bg-ub-orange px-3 py-1 rounded"
        >
          Create Case
        </button>
      </div>
      {currentCase && (
        <div className="space-y-2">
          <div className="text-sm">Current case: {currentCase}</div>
          <div className="flex space-x-2 items-center">
            <select
              value={selectedPlugin}
              onChange={(e) => setSelectedPlugin(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            >
              <option value="">Select Plugin</option>
              {plugins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Upload file"
              type="file"
              onChange={analyseFile}
              className="text-sm"
            />
          </div>
        </div>
      )}
      {analysis && (
        <textarea
          readOnly
          value={analysis}
          className="bg-ub-grey text-xs text-white p-2 rounded resize-none"
        />
      )}
      {artifacts.length > 0 && (
        <div className="space-y-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by type"
            className="bg-ub-grey text-white px-2 py-1 rounded"
          />
          <div className="grid gap-2 md:grid-cols-2">
            {filteredArtifacts.map((a, idx) => (
              <div
                key={`${a.name}-${idx}`}
                className="p-2 bg-ub-grey rounded text-sm"
              >
                <div
                  className="font-bold"
                  dangerouslySetInnerHTML={{ __html: escapeFilename(a.name) }}
                />
                <div className="text-gray-400">{a.type}</div>
                <div className="text-xs">
                  {new Date(a.timestamp).toLocaleString()}
                </div>
                <div className="text-xs">{a.description}</div>
              </div>
            ))}
          </div>
          {filteredArtifacts.length > 0 && (
            <>
              <div className="text-sm font-bold">Timeline</div>
              <Timeline events={filteredArtifacts} />
            </>
          )}
          <button
            onClick={downloadReport}
            className="bg-ub-orange px-3 py-1 rounded text-sm text-black"
          >
            Download Report
          </button>
        </div>
      )}
    </div>
  );
}

export default Autopsy;

export const displayAutopsy = () => <Autopsy />;

