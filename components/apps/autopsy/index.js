"use client";

import React, { useState, useEffect, useRef } from 'react';
import KeywordSearchPanel from './KeywordSearchPanel';
import demoArtifacts from './data/sample-artifacts.json';
import ReportExport from '../../../apps/autopsy/components/ReportExport';

const escapeFilename = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');


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
      let imageUrl = null;
      const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
      if (isImage && typeof URL !== 'undefined') {
        try {
          imageUrl = URL.createObjectURL(new Blob([bytes]));
        } catch {
          imageUrl = null;
        }
      }
      setSelectedFile({
        name: file.name,
        hex,
        strings,
        hash,
        known,
        imageUrl,
      });
      setPreviewTab('hex');
    } catch (e) {
      setSelectedFile({
        name: file.name,
        hex: '',
        strings: '',
        hash: '',
        known: null,
        imageUrl: null,
      });
      setPreviewTab('hex');
    }
  };

  useEffect(() => {
    return () => {
      if (selectedFile && selectedFile.imageUrl) {
        URL.revokeObjectURL(selectedFile.imageUrl);
      }
    };
  }, [selectedFile]);

  const renderTree = (node) => {
    if (!node) return null;
    const isFolder = !!node.children;
    return (
      <div key={node.name} className="pl-2">
        <div className="flex items-center h-8">
          <span className="mr-1">{isFolder ? '📁' : '📄'}</span>
          {isFolder ? (
            <span className="font-bold">{node.name}</span>
          ) : (
            <button
              type="button"
              onClick={() => selectFile(node)}
              className="text-blue-400 underline"
            >
              {node.name}
            </button>
          )}
        </div>
        {isFolder && (
          <div className="pl-4">
            {node.children.map((c) => renderTree(c))}
          </div>
        )}
      </div>
    );
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
          {fileTree && (
            <div className="flex space-x-4">
              <div className="w-1/3">
                <div className="text-sm font-bold mb-1">File Explorer</div>
                {renderTree(fileTree)}
              </div>
              {selectedFile && (
                <div className="flex-grow bg-ub-grey p-2 rounded text-xs">
                  <div className="font-bold mb-1">{selectedFile.name}</div>
                  <div className="mb-1">SHA-256: {selectedFile.hash}</div>
                  {selectedFile.known && (
                    <div className="mb-1 text-green-400">
                      Known: {selectedFile.known}
                    </div>
                  )}
                  <div className="flex space-x-2 mb-2">
                    <button
                      className={`${
                        previewTab === 'hex'
                          ? 'bg-ub-orange text-black'
                          : 'bg-ub-cool-grey'
                      } px-2 py-1 rounded`}
                      onClick={() => setPreviewTab('hex')}
                    >
                      Hex
                    </button>
                    <button
                      className={`${
                        previewTab === 'text'
                          ? 'bg-ub-orange text-black'
                          : 'bg-ub-cool-grey'
                      } px-2 py-1 rounded`}
                      onClick={() => setPreviewTab('text')}
                    >
                      Text
                    </button>
                    {selectedFile.imageUrl && (
                      <button
                        className={`${
                          previewTab === 'image'
                            ? 'bg-ub-orange text-black'
                            : 'bg-ub-cool-grey'
                        } px-2 py-1 rounded`}
                        onClick={() => setPreviewTab('image')}
                      >
                        Image
                      </button>
                    )}
                  </div>
                  {previewTab === 'hex' && (
                    <pre className="font-mono whitespace-pre-wrap break-all">
                      {selectedFile.hex}
                    </pre>
                  )}
                  {previewTab === 'text' && (
                    <pre className="font-mono whitespace-pre-wrap break-all">
                      {selectedFile.strings}
                    </pre>
                  )}
                  {previewTab === 'image' && selectedFile.imageUrl && (
                    <img
                      src={selectedFile.imageUrl}
                      alt={selectedFile.name}
                      className="max-w-full h-auto"
                    />
                  )}
                </div>
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

