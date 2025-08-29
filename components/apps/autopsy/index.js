import React, { useState, useEffect, useRef, useCallback } from 'react';
import KeywordSearchPanel from './KeywordSearchPanel';
import demoArtifacts from './data/sample-artifacts.json';

const escapeFilename = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // eslint-disable-next-line no-useless-escape
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');


function Timeline({ events, onSelect }) {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const positionsRef = useRef([]);
  const [sorted, setSorted] = useState([]);
  const MIN_ZOOM = 1 / (24 * 60); // 1 pixel per day
  const MAX_ZOOM = 60; // 60 pixels per minute
  const [zoom, setZoom] = useState(1 / 60); // start at 1 pixel per hour
  const [zoomAnnouncement, setZoomAnnouncement] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./timelineWorker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => setSorted(e.data);
      return () => workerRef.current?.terminate();
    }
    return undefined;
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
      positionsRef.current = [];
      sorted.forEach((ev) => {
        const t = new Date(ev.timestamp).getTime();
        const x = ((t - min) / 60000) * zoom;
        ctx.fillRect(x, height / 2 - 10, 2, 20);
        positionsRef.current.push({ x, event: ev });
      });
    };
    if (prefersReduced) {
      render();
    } else {
      requestAnimationFrame(render);
    }
  }, [sorted, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const hit = positionsRef.current.find((p) => Math.abs(p.x - x) < 5);
      if (hit && onSelect) onSelect(hit.event);
    };
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [onSelect]);

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

function Autopsy({ initialArtifacts = null }) {
  const [caseName, setCaseName] = useState('');
  const [currentCase, setCurrentCase] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [artifacts, setArtifacts] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [hashDB, setHashDB] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [keyword, setKeyword] = useState('');
  const parseWorkerRef = useRef(null);

  useEffect(() => {
    fetch('/plugin-marketplace.json')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
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
    return () => parseWorkerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!currentCase) return;
    if (initialArtifacts) {
      setArtifacts(initialArtifacts);
    } else {
      setArtifacts(demoArtifacts);
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
              setArtifacts(data.artifacts || demoArtifacts);
            } catch {
              setArtifacts(demoArtifacts);
            }
          }
        })
        .catch(() => setArtifacts(demoArtifacts));
    }
    fetch('/demo-data/autopsy/filetree.json')
      .then((res) => res.json())
      .then((data) => setFileTree(data && data.name ? data : null))
      .catch(() => setFileTree(null));
    fetch('/demo-data/autopsy/hashes.json')
      .then((res) => res.json())
      .then((data) => setHashDB(data || {}))
      .catch(() => setHashDB({}));
  }, [currentCase, initialArtifacts]);

  const types = ['All', ...Array.from(new Set(artifacts.map((a) => a.type)))];
  const users = ['All', ...Array.from(new Set(artifacts.map((a) => a.user).filter(Boolean)))];
  const filteredArtifacts = artifacts.filter(
    (a) =>
      (typeFilter === 'All' || a.type === typeFilter) &&
      (userFilter === 'All' || a.user === userFilter) &&
      (!startTime || new Date(a.timestamp) >= new Date(startTime)) &&
      (!endTime || new Date(a.timestamp) <= new Date(endTime))
  );
  const searchLower = keyword.toLowerCase();
  const visibleArtifacts = filteredArtifacts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchLower) ||
      a.description.toLowerCase().includes(searchLower) ||
      (a.user && a.user.toLowerCase().includes(searchLower))
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

  const bufferToHex = (buffer) =>
    Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join(' ');

  const decodeBase64 = (b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const selectFile = async (file) => {
    try {
      const bytes = decodeBase64(file.content || '');
      const hex = bufferToHex(bytes);
      const strings = new TextDecoder()
        .decode(bytes)
        .replace(/[^\x20-\x7E]+/g, ' ');
      let hash = '';
      if (crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', bytes);
        hash = bufferToHex(new Uint8Array(buf)).replace(/ /g, '');
      }
      const known = hashDB[hash];
      setSelectedFile({ name: file.name, hex, strings, hash, known });
    } catch (e) {
      setSelectedFile({ name: file.name, hex: '', strings: '', hash: '', known: null });
    }
  };

  const renderTree = (node) => {
    if (!node) return null;
    if (node.children) {
      return (
        <div key={node.name} className="pl-2">
          <div className="font-bold">{node.name}</div>
          <div className="pl-4">
            {node.children.map((c) => renderTree(c))}
          </div>
        </div>
      );
    }
    return (
      <div key={node.name} className="pl-2">
        <button
          type="button"
          onClick={() => selectFile(node)}
          className="text-blue-400 underline"
        >
          {node.name}
        </button>
      </div>
    );
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
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by user"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            >
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              aria-label="Start time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            />
            <input
              type="datetime-local"
              aria-label="End time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            />
          </div>
          <KeywordSearchPanel
            keyword={keyword}
            setKeyword={setKeyword}
            artifacts={visibleArtifacts}
            onSelect={setSelectedArtifact}
          />
          {visibleArtifacts.length > 0 && (
            <>
              <div className="text-sm font-bold">Timeline</div>
              <Timeline events={visibleArtifacts} onSelect={setSelectedArtifact} />
            </>
          )}
          {fileTree && (
            <div>
              <div className="text-sm font-bold">File Explorer</div>
              {renderTree(fileTree)}
            </div>
          )}
          {selectedFile && (
            <div className="bg-ub-grey p-2 rounded text-xs">
              <div className="font-bold mb-1">{selectedFile.name}</div>
              <div className="mb-1">SHA-256: {selectedFile.hash}</div>
              {selectedFile.known && (
                <div className="mb-1 text-green-400">
                  Known: {selectedFile.known}
                </div>
              )}
              <div className="font-mono whitespace-pre-wrap break-all">
                {selectedFile.hex}
              </div>
              <div className="font-mono whitespace-pre-wrap break-all mt-1">
                {selectedFile.strings}
              </div>
            </div>
          )}
          <button
            onClick={downloadReport}
            className="bg-ub-orange px-3 py-1 rounded text-sm text-black"
          >
            Download Report
          </button>
        </div>
      )}
      {selectedArtifact && (
        <div className="fixed right-0 top-0 w-64 h-full bg-ub-grey p-4 overflow-y-auto">
          <button
            onClick={() => setSelectedArtifact(null)}
            className="mb-2 text-right w-full"
          >
            Close
          </button>
          <div
            className="font-bold"
            dangerouslySetInnerHTML={{ __html: escapeFilename(selectedArtifact.name) }}
          />
          <div className="text-gray-400">{selectedArtifact.type}</div>
          <div className="text-xs">
            {new Date(selectedArtifact.timestamp).toLocaleString()}
          </div>
          <div className="text-xs">{selectedArtifact.description}</div>
          <div className="text-xs">Plugin: {selectedArtifact.plugin}</div>
          <div className="text-xs">User: {selectedArtifact.user || 'Unknown'}</div>
          <div className="text-xs">Size: {selectedArtifact.size}</div>
        </div>
      )}
    </div>
  );
}

export default Autopsy;

export const displayAutopsy = () => <Autopsy />;

