"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';
import useFileSystemNavigator from '../../hooks/useFileSystemNavigator';
import { ensureHandlePermission } from '../../services/fileExplorer/permissions';
import Breadcrumbs from '../ui/Breadcrumbs';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const DEMO_FILESYSTEM = {
  name: 'Home',
  kind: 'directory',
  children: [
    {
      name: 'Projects',
      kind: 'directory',
      children: [
        {
          name: 'README.md',
          kind: 'file',
          content:
            '# Projects Overview\n\nExplore a curated set of security, automation, and UI engineering projects.\n',
        },
        {
          name: 'network-inventory.txt',
          kind: 'file',
          content:
            'Inventory Summary:\n- Zero Trust Lab\n- Kali Desktop Portfolio\n- Threat Modeling Toolkit\n',
        },
        {
          name: 'portfolio-roadmap.json',
          kind: 'file',
          content: JSON.stringify(
            {
              focus: ['UX polish', 'Offline demos', 'Security tooling simulations'],
              status: 'in-progress',
            },
            null,
            2,
          ),
        },
      ],
    },
    {
      name: 'Certifications',
      kind: 'directory',
      children: [
        {
          name: 'OSCP.txt',
          kind: 'file',
          content: 'OSCP\nStatus: Training completed\nFocus: Exploit development & enumeration',
        },
        {
          name: 'SecurityPlus.txt',
          kind: 'file',
          content: 'CompTIA Security+\nStatus: Achieved\nFocus: Core security fundamentals',
        },
      ],
    },
    {
      name: 'Media',
      kind: 'directory',
      children: [
        {
          name: 'kali-wallpaper.webp',
          kind: 'file',
          url: '/wallpapers/wall-1.webp',
        },
      ],
    },
    {
      name: 'Resume.pdf',
      kind: 'file',
      url: '/assets/Alex-Unnippillil-Resume.pdf',
    },
  ],
};

const FILE_ICONS = {
  folder: '/themes/Yaru/system/folder.png',
  text: '/themes/Yaru/apps/gedit.png',
  image: '/themes/Yaru/apps/color-picker.svg',
  pdf: '/themes/Yaru/apps/firefox.svg',
  generic: '/themes/filetypes/js.png',
};

const getFileCategory = (fileName) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
  if (lower.match(/\.(md|markdown|txt|json|js|ts|tsx|jsx|css|html|yml|yaml)$/)) return 'text';
  return 'generic';
};

const getEntryIcon = (entry) => {
  if (entry.kind === 'directory') return FILE_ICONS.folder;
  const category = getFileCategory(entry.name);
  return FILE_ICONS[category] || FILE_ICONS.generic;
};

const triggerDownload = (url, filename, revoke = false) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'download';
  anchor.click();
  if (revoke) {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
};

export async function openFileDialog(options = {}) {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker(options);
    return handle;
  }

  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.multiple) input.multiple = true;
    if (options?.types) {
      const accept = options.types
        .map((t) => t.accept && Object.values(t.accept).flat())
        .flat()
        .join(',');
      if (accept) input.accept = accept;
    }
    input.onchange = () => {
      const file = input.files[0];
      resolve(
        file && {
          name: file.name,
          getFile: async () => file,
        }
      );
    };
    input.click();
  });
}

export async function saveFileDialog(options = {}) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    return await window.showSaveFilePicker(options);
  }

  return {
    name: options?.suggestedName || 'download',
    async createWritable() {
      return {
        async write(data) {
          const blob = data instanceof Blob ? data : new Blob([data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = options?.suggestedName || 'download';
          a.click();
          URL.revokeObjectURL(url);
        },
        async close() {},
      };
    },
  };
}

export default function FileExplorer({
  context,
  initialPath,
  path: pathProp,
  openApp,
} = {}) {
  const [supported, setSupported] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [demoPath, setDemoPath] = useState(() => [DEMO_FILESYSTEM]);
  const [imageViewer, setImageViewer] = useState(null);
  const workerRef = useRef(null);
  const demoMode = context?.demoMode || context?.mode === 'demo';
  const isDemoMode = !supported || demoMode;

  const hasWorker = typeof Worker !== 'undefined';
  const {
    supported: opfsSupported,
    root,
    getDir,
    readFile: opfsRead,
    writeFile: opfsWrite,
    deleteFile: opfsDelete,
  } = useOPFS();
  const {
    currentDirectory: dirHandle,
    directories: dirs,
    files,
    breadcrumbs: path,
    recent,
    locationError,
    openHandle,
    enterDirectory,
    navigateTo,
    goBack: goBackNav,
    openPath,
    setLocationError,
  } = useFileSystemNavigator();
  const [unsavedDir, setUnsavedDir] = useState(null);

  const hasUnsavedChanges = useMemo(
    () => currentFile && content !== savedContent,
    [content, currentFile, savedContent],
  );

  const demoEntries = useMemo(() => {
    const current = demoPath[demoPath.length - 1];
    const children = current?.children ?? [];
    const directories = children.filter((entry) => entry.kind === 'directory');
    const files = children.filter((entry) => entry.kind === 'file');
    return { directories, files };
  }, [demoPath]);

  const demoBreadcrumbs = useMemo(
    () => demoPath.map((segment) => ({ name: segment.name })),
    [demoPath],
  );

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    let active = true;
    (async () => {
      const unsaved = await getDir('unsaved');
      if (active) setUnsavedDir(unsaved);
      if (!active) return;
      await openHandle(root, { setAsRoot: true });
    })();
    return () => {
      active = false;
    };
  }, [opfsSupported, root, getDir, openHandle]);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    if (!requested) return;
    openPath(requested);
  }, [context, initialPath, pathProp, opfsSupported, root, openPath]);

  const saveBuffer = async (name, data) => {
    if (unsavedDir) await opfsWrite(name, data, unsavedDir);
  };

  const loadBuffer = async (name) => {
    if (!unsavedDir) return null;
    return await opfsRead(name, unsavedDir);
  };

  const removeBuffer = async (name) => {
    if (unsavedDir) await opfsDelete(name, unsavedDir);
  };

  const openFolder = async () => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    try {
      const handle = await window.showDirectoryPicker();
      const allowed = await ensureHandlePermission(handle);
      if (!allowed) {
        setLocationError('Permission denied while opening folder. Please allow access in the browser prompt.');
        return;
      }
      await openHandle(handle, { recordRecent: true });
    } catch (error) {
      const message =
        error?.name === 'NotAllowedError'
          ? 'Folder access was blocked. Re-run and grant permission to continue.'
          : 'Unable to open folder. Please check your browser permissions.';
      setLocationError(message);
    }
  };

  const openRecent = async (entry) => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    try {
      const allowed = await ensureHandlePermission(entry.handle);
      if (!allowed) {
        setLocationError('Permission denied for this recent location. Please re-authorize access.');
        return;
      }
      await openHandle(entry.handle, { breadcrumbName: entry.name });
    } catch (error) {
      setLocationError(
        error?.name === 'NotAllowedError'
          ? 'Access to this location was blocked. Try reopening and granting permission.'
          : 'Unable to reopen recent location.',
      );
    }
  };

  const readFileContent = async (fileHandle, streamToUI = true) => {
    const file = await fileHandle.getFile();
    if (!file.stream) {
      return { text: await file.text(), file };
    }

    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let text = '';
    let chunkCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      chunkCount += 1;
      if (chunkCount % 8 === 0 && streamToUI) {
        setContent(text);
      }
    }
    text += decoder.decode();
    return { text, file };
  };

  const buildPreview = (fileName, file, text) => {
    const lower = fileName.toLowerCase();
    if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      return { type: 'image', url: URL.createObjectURL(file) };
    }
    if (lower.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        return { type: 'json', text: JSON.stringify(parsed, null, 2) };
      } catch {
        return { type: 'text', text };
      }
    }
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
      const html = DOMPurify.sanitize(marked.parse(text));
      return { type: 'markdown', html };
    }
    return { type: 'text', text };
  };

  const ensureSaved = async () => {
    if (!hasUnsavedChanges) return true;
    const shouldSave = window.confirm(
      'You have unsaved changes. Click OK to save before continuing, or Cancel to stay on this file.',
    );
    if (!shouldSave) return false;
    await saveFile();
    return true;
  };

  const openFile = async (file) => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    setCurrentFile(file);
    setPreviewData(null);
    setContent('');
    setSavedContent('');
    let text = '';
    if (opfsSupported) {
      const unsaved = await loadBuffer(file.name);
      if (unsaved !== null) text = unsaved;
    }
    try {
      setLoading(true);
      const { text: streamed, file: fetched } = await readFileContent(file.handle, !text);
      if (!text) {
        text = streamed;
      }
      setPreviewData(buildPreview(file.name, fetched, text));
      setContent(text);
      setSavedContent(streamed);
    } catch (error) {
      const message =
        error?.name === 'NotAllowedError'
          ? 'Permission denied while opening file. Please allow access and retry.'
          : 'Unable to open file. The handle may no longer be available.';
      setLocationError(message);
    } finally {
      setLoading(false);
    }
  };

  const openDir = (dir) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (proceed) enterDirectory(dir);
    })();
  };

  const navigateToBreadcrumb = (index) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (proceed) navigateTo(index);
    })();
  };

  const goBack = () => {
    void (async () => {
      const proceed = await ensureSaved();
      if (proceed) goBackNav();
    })();
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
      setSavedContent(content);
    } catch (error) {
      setLocationError(
        error?.name === 'NotAllowedError'
          ? 'Save permission denied. Please allow file writes in the browser prompt.'
          : 'Failed to save file.',
      );
    }
  };

  const onChange = (e) => {
    const text = e.target.value;
    setContent(text);
    if (opfsSupported && currentFile) saveBuffer(currentFile.name, text);
  };

  const runSearch = () => {
    if (!dirHandle || !hasWorker) return;
    setResults([]);
    if (workerRef.current) workerRef.current.terminate();
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const { file, line, text, done } = e.data;
        if (done) {
          workerRef.current?.terminate();
          workerRef.current = null;
        } else {
          setResults((r) => [...r, { file, line, text }]);
        }
      };
      workerRef.current.postMessage({ directoryHandle: dirHandle, query });
    }
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => () => {
    if (previewData?.type === 'image' && previewData.url) {
      URL.revokeObjectURL(previewData.url);
    }
  }, [previewData]);

  useEffect(() => () => {
    if (imageViewer?.revokeOnClose && imageViewer.url) {
      URL.revokeObjectURL(imageViewer.url);
    }
  }, [imageViewer]);

  const handleDemoNavigate = (index) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (!proceed) return;
      setDemoPath((prev) => prev.slice(0, index + 1));
      setSelectedEntry(null);
    })();
  };

  const handleDemoDirOpen = (dir) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (!proceed) return;
      setDemoPath((prev) => [...prev, dir]);
      setSelectedEntry(null);
    })();
  };

  const handleDemoBack = () => {
    void (async () => {
      const proceed = await ensureSaved();
      if (!proceed) return;
      setDemoPath((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      setSelectedEntry(null);
    })();
  };

  const openImageViewer = (name, url, revokeOnClose = false) => {
    setImageViewer({ name, url, revokeOnClose });
  };

  const openDemoTextFallback = (entry) => {
    setCurrentFile({ name: entry.name });
    setContent(entry.content || '');
    setSavedContent(entry.content || '');
    setPreviewData(buildPreview(entry.name, new Blob([entry.content || '']), entry.content || ''));
  };

  const openDemoFile = async (entry) => {
    const category = getFileCategory(entry.name);
    if (category === 'pdf' && entry.url) {
      triggerDownload(entry.url, entry.name);
      return;
    }
    if (category === 'image' && entry.url) {
      openImageViewer(entry.name, entry.url);
      return;
    }
    if (openApp) {
      openApp('gedit', {
        mode: 'file-viewer',
        fileName: entry.name,
        content: entry.content || '',
      });
      return;
    }
    openDemoTextFallback(entry);
  };

  const openFileEntry = async (entry) => {
    try {
      const category = getFileCategory(entry.name);
      if (category === 'text' && openApp) {
        const { text: fileText } = await readFileContent(entry.handle, false);
        openApp('gedit', {
          mode: 'file-viewer',
          fileName: entry.name,
          content: fileText,
        });
        return;
      }
      if (category === 'image') {
        const file = await entry.handle.getFile();
        openImageViewer(entry.name, URL.createObjectURL(file), true);
        return;
      }
      if (category === 'pdf') {
        const file = await entry.handle.getFile();
        const url = URL.createObjectURL(file);
        triggerDownload(url, entry.name, true);
        return;
      }
      await openFile(entry);
    } catch (error) {
      const message =
        error?.name === 'NotAllowedError'
          ? 'Permission denied while opening file. Please allow access and retry.'
          : 'Unable to open file.';
      setLocationError(message);
    }
  };

  const handleEntryOpen = (entry) => {
    void (async () => {
      const isDirectoryEntry = entry.kind === 'directory' || entry.handle?.kind === 'directory';
      if (isDirectoryEntry) {
        if (isDemoMode) {
          handleDemoDirOpen(entry);
        } else {
          await openDir(entry);
        }
        return;
      }
      const proceed = await ensureSaved();
      if (!proceed) return;
      if (isDemoMode) {
        await openDemoFile(entry);
      } else {
        await openFileEntry(entry);
      }
    })();
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm relative">
      <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        {!isDemoMode && (
          <button onClick={openFolder} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Open Folder
          </button>
        )}
        {(isDemoMode ? demoPath.length > 1 : path.length > 1) && (
          <button
            onClick={isDemoMode ? handleDemoBack : goBack}
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
          >
            Back
          </button>
        )}
        <Breadcrumbs
          path={isDemoMode ? demoBreadcrumbs : path}
          onNavigate={isDemoMode ? handleDemoNavigate : navigateToBreadcrumb}
        />
        {isDemoMode && (
          <span className="px-2 py-1 text-xs bg-black bg-opacity-40 rounded">Demo mode</span>
        )}
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        {currentFile && (
          <div className="flex items-center space-x-2 ml-auto">
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-200" aria-live="polite">
                Unsaved changes
              </span>
            )}
            <button
              onClick={saveFile}
              disabled={!hasUnsavedChanges}
              className={`px-2 py-1 rounded ${
                hasUnsavedChanges
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-black bg-opacity-40 cursor-not-allowed'
              }`}
            >
              {hasUnsavedChanges ? 'Save changes' : 'Saved'}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 overflow-auto border-r border-gray-600">
          {!isDemoMode && (
            <>
              <div className="p-2 font-bold">Recent</div>
              {recent.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full px-2 py-1 text-left hover:bg-black hover:bg-opacity-30"
                  onClick={() => openRecent(r)}
                >
                  {r.name}
                </button>
              ))}
            </>
          )}
          <div className="p-2 font-bold">Directories</div>
          {(isDemoMode ? demoEntries.directories : dirs).map((d, i) => (
            <button
              key={`${d.name}-${i}`}
              type="button"
              onClick={() => setSelectedEntry({ name: d.name, kind: 'directory' })}
              onDoubleClick={() => handleEntryOpen(d)}
              className={`w-full px-2 py-1 text-left flex items-center gap-2 hover:bg-black hover:bg-opacity-30 ${
                selectedEntry?.name === d.name && selectedEntry?.kind === 'directory'
                  ? 'bg-black bg-opacity-40'
                  : ''
              }`}
            >
              <img src={FILE_ICONS.folder} alt="" className="w-4 h-4" />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
          <div className="p-2 font-bold">Files</div>
          {(isDemoMode ? demoEntries.files : files).map((f, i) => (
            <button
              key={`${f.name}-${i}`}
              type="button"
              onClick={() => setSelectedEntry({ name: f.name, kind: 'file' })}
              onDoubleClick={() => handleEntryOpen(f)}
              className={`w-full px-2 py-1 text-left flex items-center gap-2 hover:bg-black hover:bg-opacity-30 ${
                selectedEntry?.name === f.name && selectedEntry?.kind === 'file'
                  ? 'bg-black bg-opacity-40'
                  : ''
              }`}
            >
              <img src={getEntryIcon(f)} alt="" className="w-4 h-4" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          {!isDemoMode && currentFile && (
            <div className="flex flex-col flex-1 overflow-auto">
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-600 bg-black bg-opacity-20">
                <div className="font-semibold">{currentFile.name}</div>
                {loading && <div className="text-xs text-gray-300">Loading...</div>}
              </div>
              {previewData && (
                <div className="p-2 border-b border-gray-700 overflow-auto max-h-64 bg-black bg-opacity-20">
                  {previewData.type === 'image' && (
                    <img src={previewData.url} alt={`${currentFile.name} preview`} className="max-h-60 mx-auto" />
                  )}
                  {previewData.type === 'json' && (
                    <pre className="whitespace-pre-wrap text-xs bg-black bg-opacity-30 p-2 rounded">{previewData.text}</pre>
                  )}
                  {previewData.type === 'markdown' && (
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewData.html }}
                    />
                  )}
                </div>
              )}
              <textarea
                className="flex-1 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
                aria-label="File content"
              />
            </div>
          )}
          {isDemoMode ? (
            <div className="p-4 text-sm text-gray-200">
              <p className="font-semibold text-white">Demo navigation tips</p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                <li>Single-click to select, double-click folders to navigate.</li>
                <li>Text files open in Gedit, images launch the Image Viewer, PDFs download.</li>
              </ul>
            </div>
          ) : (
            <div className="p-2 border-t border-gray-600">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find in files"
                className="px-1 py-0.5 text-black"
                aria-label="Find in files"
              />
              <button onClick={runSearch} className="ml-2 px-2 py-1 bg-black bg-opacity-50 rounded">
                Search
              </button>
              <div className="max-h-40 overflow-auto mt-2">
                {results.map((r, i) => (
                  <div key={i}>
                    <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {imageViewer && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-ub-cool-grey border border-gray-600 rounded shadow-lg max-w-2xl w-11/12">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-600">
              <span className="font-semibold">Image Viewer — {imageViewer.name}</span>
              <button
                type="button"
                onClick={() => {
                  setImageViewer(null);
                }}
                className="px-2 py-1 bg-black bg-opacity-50 rounded"
              >
                Close
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img src={imageViewer.url} alt={imageViewer.name} className="max-h-[60vh]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
