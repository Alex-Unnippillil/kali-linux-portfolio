"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import KeywordSearchPanel from './KeywordSearchPanel';
import demoArtifacts from './data/sample-artifacts.json';
import FilePreview, {
  SUPPORTED_IMAGE_TYPES,
} from '../../../apps/autopsy/components/FilePreview';
import ReportExport from '../../../apps/autopsy/components/ReportExport';
import demoCase from '../../../apps/autopsy/data/case.json';

const escapeFilename = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');


const MAX_PREVIEW_CACHE = 12;
const MAX_TEXT_PREVIEW = 4000;

const FILE_TYPE_LABELS = {
  txt: 'Text document',
  log: 'Log file',
  md: 'Markdown document',
  json: 'JSON data',
  csv: 'CSV data',
  png: 'PNG image',
  jpg: 'JPEG image',
  jpeg: 'JPEG image',
  gif: 'GIF image',
  bmp: 'Bitmap image',
  webp: 'WebP image',
  pdf: 'PDF document',
};

const IMAGE_MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
};

const getExtension = (name = '') => {
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
};

const describeFileType = (extension) =>
  FILE_TYPE_LABELS[extension] ||
  (extension ? `${extension.toUpperCase()} file` : 'Unknown');

const getImageMimeType = (extension) =>
  IMAGE_MIME_TYPES[extension] || 'application/octet-stream';

const isTypingTarget = (target) => {
  if (!target || typeof target !== 'object') return false;
  const element = target;
  if (element.isContentEditable) return true;
  const tagName = typeof element.tagName === 'string' ? element.tagName : '';
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    tagName === 'BUTTON' ||
    tagName === 'A'
  );
};


function Timeline({ events, onSelect }) {
  const canvasRef = useRef(null);
  const overviewRef = useRef(null);
  const containerRef = useRef(null);
  const workerRef = useRef(null);
  const positionsRef = useRef([]);
  const [sorted, setSorted] = useState([]);
  const MIN_ZOOM = 1 / (24 * 60); // 1 pixel per day
  const MAX_ZOOM = 60; // 60 pixels per minute
  const [zoom, setZoom] = useState(1 / 60); // start at 1 pixel per hour
  const [zoomAnnouncement, setZoomAnnouncement] = useState('');
  const [sliderIndex, setSliderIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);
  const dayMarkers = useMemo(() => {
    const days = [];
    const seen = new Set();
    sorted.forEach((ev, idx) => {
      const day = new Date(ev.timestamp).toISOString().split('T')[0];
      if (!seen.has(day)) {
        seen.add(day);
        days.push({ day, idx });
      }
    });
    return days;
  }, [sorted]);

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
    setSliderIndex(0);
  }, [sorted]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 2 : 0.5;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [MAX_ZOOM, MIN_ZOOM]);

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
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#1f1f1f');
      gradient.addColorStop(1, '#2a2a2a');
      ctx.fillStyle = gradient;
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

      const overview = overviewRef.current;
      const container = containerRef.current;
      if (overview) {
        const octx = overview.getContext('2d');
        const owidth = container ? container.clientWidth : 600;
        overview.width = owidth;
        overview.height = 20;
        const ogradient = octx.createLinearGradient(0, 0, owidth, 0);
        ogradient.addColorStop(0, '#1f1f1f');
        ogradient.addColorStop(1, '#2a2a2a');
        octx.fillStyle = ogradient;
        octx.fillRect(0, 0, owidth, 20);
        octx.fillStyle = '#ffa500';
        const total = max - min || 1;
        sorted.forEach((ev) => {
          const t = new Date(ev.timestamp).getTime();
          const x = ((t - min) / total) * owidth;
          octx.fillRect(x, 5, 1, 10);
        });
        if (container) {
          const startRatio = container.scrollLeft / width;
          const endRatio =
            (container.scrollLeft + container.clientWidth) / width;
          const rectX = startRatio * owidth;
          const rectWidth = Math.max((endRatio - startRatio) * owidth, 10);
          octx.strokeStyle = '#ffffff';
          octx.strokeRect(rectX, 0, rectWidth, 20);
        }
      }
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => draw();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [draw]);

  useEffect(() => {
    const overview = overviewRef.current;
    const container = containerRef.current;
    if (!overview || !container) return;
    const handleClick = (e) => {
      const rect = overview.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / overview.width;
      const target =
        ratio * canvasRef.current.width - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, target);
      draw();
    };
    overview.addEventListener('click', handleClick);
    return () => overview.removeEventListener('click', handleClick);
  }, [draw]);

  return (
    <div className="w-full">
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
      {sorted.length > 0 && (
        <div className="relative mb-2">
          <input
            type="range"
            min={0}
            max={sorted.length - 1}
            value={sliderIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setSliderIndex(idx);
              if (onSelect && sorted[idx]) onSelect(sorted[idx]);
            }}
            onMouseMove={(e) => {
              const rect = e.target.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const idx = Math.round(percent * (sorted.length - 1));
              setHoverIndex(idx);
            }}
            onMouseLeave={() => setHoverIndex(null)}
            list="timeline-day-markers"
            className="w-full"
            aria-label="Timeline scrub bar"
          />
          <datalist id="timeline-day-markers">
            {dayMarkers.map((m) => (
              <option
                key={m.day}
                value={m.idx}
                label={new Date(m.day).toLocaleDateString()}
              />
            ))}
          </datalist>
          {hoverIndex !== null && sorted[hoverIndex] && (
            <div
              className="absolute -top-10 bg-ub-grey text-xs p-1 rounded"
              style={{
                left: `${
                  sorted.length > 1
                    ? (hoverIndex / (sorted.length - 1)) * 100
                    : 0
                }%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div>
                {new Date(sorted[hoverIndex].timestamp).toLocaleString()}
              </div>
              <div>{sorted[hoverIndex].name}</div>
              {sorted[hoverIndex].description && (
                <div className="text-[10px]">
                  {sorted[hoverIndex].description}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto p-1.5 bg-gradient-to-r from-ub-grey to-ub-cool-grey rounded"
      >
        <canvas
          ref={canvasRef}
          className="bg-ub-grey"
          role="img"
          aria-label="File event timeline"
        />
      </div>
      <canvas
        ref={overviewRef}
        className="bg-ub-grey mt-2 w-full"
        height={20}
        aria-label="Timeline overview"
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
  const [pluginFilter, setPluginFilter] = useState('All');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [hashDB, setHashDB] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [previewTab, setPreviewTab] = useState('hex');
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [timelineEvents] = useState(
    demoCase.timeline.map((t) => ({ name: t.event, timestamp: t.timestamp }))
  );
  const parseWorkerRef = useRef(null);
  const previewCacheRef = useRef(new Map());

  const releasePreviewCache = useCallback(() => {
    const cache = previewCacheRef.current;
    if (!cache) return;
    if (typeof URL !== 'undefined') {
      cache.forEach((entry) => {
        if (entry?.imageUrl) {
          URL.revokeObjectURL(entry.imageUrl);
        }
      });
    }
    cache.clear();
  }, []);

  const cachePreviewData = (key, data) => {
    const cache = previewCacheRef.current;
    const existing = cache.get(key);
    if (
      existing &&
      existing.imageUrl &&
      existing.imageUrl !== data.imageUrl &&
      typeof URL !== 'undefined'
    ) {
      URL.revokeObjectURL(existing.imageUrl);
    }
    cache.set(key, data);
    while (cache.size > MAX_PREVIEW_CACHE) {
      const oldestKey = cache.keys().next().value;
      const oldest = cache.get(oldestKey);
      if (oldest?.imageUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(oldest.imageUrl);
      }
      cache.delete(oldestKey);
    }
  };

  const applyPreviewState = (cacheKey, data) => {
    setSelectedFile(data);
    setIsPreviewOpen(true);
    setPreviewTab((prev) => {
      if (!data.availableTabs.includes(prev) || selectedFile?.id !== cacheKey) {
        return 'hex';
      }
      return prev;
    });
  };

  useEffect(() => {
    fetch('/plugin-marketplace.json')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    return () => {
      releasePreviewCache();
    };
  }, [releasePreviewCache]);

  useEffect(() => {
    if (!fileTree) return;
    releasePreviewCache();
    setSelectedFile(null);
    setPreviewTab('hex');
    setIsPreviewOpen(true);
  }, [fileTree, releasePreviewCache]);

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
  const users = [
    'All',
    ...Array.from(new Set(artifacts.map((a) => a.user).filter(Boolean))),
  ];
  const pluginOptions = [
    'All',
    ...Array.from(new Set(artifacts.map((a) => a.plugin).filter(Boolean))),
  ];
  const filteredArtifacts = artifacts.filter(
    (a) =>
      (typeFilter === 'All' || a.type === typeFilter) &&
      (userFilter === 'All' || a.user === userFilter) &&
      (pluginFilter === 'All' || a.plugin === pluginFilter) &&
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
  const filteredTimeline = timelineEvents.filter(
    (t) =>
      (!startTime || new Date(t.timestamp) >= new Date(startTime)) &&
      (!endTime || new Date(t.timestamp) <= new Date(endTime))
  );
  const visibleTimeline = filteredTimeline.filter((t) =>
    t.name.toLowerCase().includes(searchLower)
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
      const hex = bufferToHex(bytes);
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
    Array.from(buffer, (b, i) => {
      const byte = b.toString(16).padStart(2, '0');
      const sep = i % 8 === 7 ? '  ' : ' ';
      return byte + sep;
    })
      .join('')
      .trim();

  const decodeBase64 = (b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const selectFile = async (file, filePath = file.name) => {
    const cacheKey = filePath || file.name;
    const cached = previewCacheRef.current.get(cacheKey);
    if (cached) {
      applyPreviewState(cacheKey, cached);
      return;
    }

    try {
      const bytes = decodeBase64(file.content || '');
      const hex = bufferToHex(bytes);
      const decoder =
        typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
      const decodedStrings = decoder
        ? decoder.decode(bytes).replace(/[^\x20-\x7E]+/g, ' ')
        : '';
      const strings =
        decodedStrings.length > MAX_TEXT_PREVIEW
          ? `${decodedStrings.slice(0, MAX_TEXT_PREVIEW)}…`
          : decodedStrings;
      const extension = getExtension(file.name);
      const type = describeFileType(extension);
      const size = bytes.length;

      let hash = '';
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
          const buf = await crypto.subtle.digest('SHA-256', bytes);
          hash = bufferToHex(new Uint8Array(buf)).replace(/ /g, '');
        } catch {
          hash = '';
        }
      }
      const known = hash ? hashDB[hash] : null;

      let imageUrl = null;
      const isImage = extension && SUPPORTED_IMAGE_TYPES.includes(extension);
      if (isImage && typeof URL !== 'undefined') {
        try {
          const arrayBuffer =
            bytes.byteOffset === 0 &&
            bytes.byteLength === bytes.buffer.byteLength
              ? bytes.buffer
              : bytes.buffer.slice(
                  bytes.byteOffset,
                  bytes.byteOffset + bytes.byteLength
                );
          const blob = new Blob([arrayBuffer], {
            type: getImageMimeType(extension),
          });
          imageUrl = URL.createObjectURL(blob);
        } catch {
          imageUrl = null;
        }
      }

      const availableTabs = ['hex', 'text'];
      if (imageUrl) availableTabs.push('image');

      const previewData = {
        id: cacheKey,
        name: file.name,
        hex,
        strings,
        hash,
        known,
        imageUrl,
        size,
        type,
        availableTabs,
      };

      cachePreviewData(cacheKey, previewData);
      applyPreviewState(cacheKey, previewData);
    } catch (e) {
      const fallback = {
        id: cacheKey,
        name: file.name,
        hex: '',
        strings: '',
        hash: '',
        known: null,
        imageUrl: null,
        size: 0,
        type: describeFileType(getExtension(file.name)),
        availableTabs: ['hex', 'text'],
      };
      cachePreviewData(cacheKey, fallback);
      applyPreviewState(cacheKey, fallback);
    }
  };

  const renderTree = (node, parentPath = '') => {
    if (!node) return null;
    const isFolder = !!node.children;
    const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isSelected = selectedFile?.id === nodePath;
    return (
      <div key={nodePath} className="pl-2">
        <div className="flex items-center h-8">
          <span className="mr-1">{isFolder ? '📁' : '📄'}</span>
          {isFolder ? (
            <span className="font-bold">{node.name}</span>
          ) : (
            <button
              type="button"
              onClick={() => selectFile(node, nodePath)}
              className={`underline ${
                isSelected ? 'text-ub-orange font-semibold' : 'text-blue-400'
              }`}
              aria-pressed={isSelected}
            >
              {node.name}
            </button>
          )}
        </div>
        {isFolder && (
          <div className="pl-4">
            {node.children.map((c) => renderTree(c, nodePath))}
          </div>
        )}
      </div>
    );
  };


  useEffect(() => {
    if (!selectedFile) return undefined;
    const handleKeydown = (event) => {
      if (
        event.code !== 'Space' &&
        event.key !== ' ' &&
        event.key !== 'Spacebar'
      ) {
        return;
      }
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setIsPreviewOpen((prev) => !prev);
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [selectedFile]);


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
      <a
        href="https://sleuthkit.org/autopsy/docs/user-docs/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-ubt-blue text-sm"
      >
        Autopsy documentation
      </a>
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
            <select
              aria-label="Filter by plugin"
              value={pluginFilter}
              onChange={(e) => setPluginFilter(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            >
              {pluginOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
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
          {visibleTimeline.length > 0 && (
            <>
              <div className="text-sm font-bold">Timeline</div>
              <Timeline events={visibleTimeline} onSelect={() => {}} />
            </>
          )}
          {fileTree && (
            <div className="flex space-x-4">
              <div className="w-1/3">
                <div className="text-sm font-bold mb-1">File Explorer</div>
                {renderTree(fileTree)}
              </div>
              {selectedFile && (
                <FilePreview
                  file={selectedFile}
                  activeTab={previewTab}
                  onTabChange={setPreviewTab}
                  isOpen={isPreviewOpen}
                  onToggle={() => setIsPreviewOpen((prev) => !prev)}
                />
              )}
            </div>
          )}
          <ReportExport caseName={currentCase || 'case'} artifacts={artifacts} />
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

