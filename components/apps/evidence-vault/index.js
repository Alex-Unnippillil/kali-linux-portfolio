import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDb } from '../../../utils/safeIDB';

const DB_NAME = 'evidence-vault';
const STORE_NAME = 'state';
const DB_VERSION = 1;

const openDb = () =>
  getDb(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });

const EvidenceVaultApp = () => {
  const [findings, setFindings] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const [findingTitle, setFindingTitle] = useState('');
  const [findingDescription, setFindingDescription] = useState('');

  const [evidenceType, setEvidenceType] = useState('image');
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [language, setLanguage] = useState('');
  const [imageData, setImageData] = useState(null);
  const [linkedFindingIds, setLinkedFindingIds] = useState([]);

  const fileInputRef = useRef(null);
  const dbConnectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      try {
        const dbPromise = openDb();
        if (!dbPromise) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const db = await dbPromise;
        dbConnectionRef.current = db;
        const stored = await db.get(STORE_NAME, 'state');
        if (!cancelled && stored) {
          setFindings(stored.findings || []);
          setEvidence(stored.evidence || []);
          if (stored.findings?.length) {
            setSelectedFindingId(stored.selectedFindingId || null);
          }
        }
      } catch {
        // ignore persistence issues
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const dbPromise = openDb();
        if (!dbPromise) return;
        const db = await dbPromise;
        dbConnectionRef.current = db;
        await db.put(
          STORE_NAME,
          {
            findings,
            evidence,
            selectedFindingId,
          },
          'state'
        );
      } catch {
        // ignore persistence issues
      }
    })();
  }, [findings, evidence, selectedFindingId, loaded]);

  useEffect(() => {
    return () => {
      if (dbConnectionRef.current) {
        dbConnectionRef.current.close();
        dbConnectionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedFindingId) return;
    setLinkedFindingIds((prev) => {
      if (prev.length === 0) {
        return [selectedFindingId];
      }
      return prev;
    });
  }, [selectedFindingId]);

  const evidenceCounts = useMemo(() => {
    return findings.reduce((acc, finding) => {
      const count = evidence.filter((item) =>
        item.linkedFindingIds?.includes(finding.id)
      ).length;
      acc[finding.id] = count;
      return acc;
    }, {});
  }, [findings, evidence]);

  const linkedFindingMap = useMemo(() => {
    const map = new Map();
    findings.forEach((finding) => {
      map.set(finding.id, finding);
    });
    return map;
  }, [findings]);

  const filteredEvidence = useMemo(() => {
    if (!selectedFindingId) return evidence;
    return evidence.filter((item) =>
      item.linkedFindingIds?.includes(selectedFindingId)
    );
  }, [evidence, selectedFindingId]);

  const isImage = evidenceType === 'image';
  const canSubmitEvidence = useMemo(() => {
    if (isImage) {
      return Boolean(imageData?.dataUrl && altText.trim().length > 0);
    }
    return codeSnippet.trim().length > 0;
  }, [isImage, imageData, altText, codeSnippet]);

  const resetEvidenceForm = () => {
    setCaption('');
    setAltText('');
    setCodeSnippet('');
    setLanguage('');
    setImageData(null);
    setLinkedFindingIds(selectedFindingId ? [selectedFindingId] : []);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddFinding = (event) => {
    event.preventDefault();
    const title = findingTitle.trim();
    const description = findingDescription.trim();
    if (!title) return;

    const id = `finding-${Date.now()}`;
    const newFinding = {
      id,
      title,
      description,
      createdAt: new Date().toISOString(),
    };

    setFindings((prev) => [...prev, newFinding]);
    setFindingTitle('');
    setFindingDescription('');
    setSelectedFindingId(id);
    setLinkedFindingIds([id]);
  };

  const handleDeleteFinding = (id) => {
    setFindings((prev) => prev.filter((finding) => finding.id !== id));
    setEvidence((prev) =>
      prev.map((item) => ({
        ...item,
        linkedFindingIds: item.linkedFindingIds.filter((fid) => fid !== id),
      }))
    );
    setLinkedFindingIds((prev) => prev.filter((fid) => fid !== id));
    setSelectedFindingId((current) => (current === id ? null : current));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageData(null);
      setAltText('');
      return;
    }
    setAltText('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageData({
          dataUrl: reader.result,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleLinkedFinding = (id) => {
    setLinkedFindingIds((prev) =>
      prev.includes(id)
        ? prev.filter((fid) => fid !== id)
        : [...prev, id]
    );
  };

  const handleAddEvidence = (event) => {
    event.preventDefault();
    if (!canSubmitEvidence) return;

    const cleanedLinks = linkedFindingIds.filter((id) =>
      findings.some((finding) => finding.id === id)
    );

    const baseEntry = {
      id: `evidence-${Date.now()}`,
      type: evidenceType,
      caption: caption.trim(),
      linkedFindingIds: cleanedLinks,
      createdAt: new Date().toISOString(),
    };

    if (isImage && imageData) {
      setEvidence((prev) => [
        {
          ...baseEntry,
          altText: altText.trim(),
          dataUrl: imageData.dataUrl,
          fileName: imageData.name,
          mimeType: imageData.mimeType,
          size: imageData.size,
        },
        ...prev,
      ]);
    } else {
      setEvidence((prev) => [
        {
          ...baseEntry,
          code: codeSnippet,
          language: language.trim(),
        },
        ...prev,
      ]);
    }

    resetEvidenceForm();
  };

  const handleDeleteEvidence = (id) => {
    setEvidence((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExport = () => {
    const payload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      findings,
      evidence,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evidence-vault-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full flex-col bg-gray-900 p-4 text-white">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-700 pb-3">
        <h1 className="text-lg font-semibold">Evidence Vault</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Export evidence bundle
        </button>
      </header>
      <div className="flex h-full flex-col gap-4 md:flex-row">
        <aside className="w-full rounded border border-gray-700 bg-gray-950 p-4 md:w-1/3">
          <h2 className="text-base font-semibold">Findings</h2>
          <form className="mt-3 space-y-3" onSubmit={handleAddFinding}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="finding-title">
                Finding title
              </label>
              <input
                id="finding-title"
                type="text"
                value={findingTitle}
                onChange={(event) => setFindingTitle(event.target.value)}
                aria-label="Finding title"
                className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="e.g. SQL injection on login"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="finding-description">
                Finding summary
              </label>
              <textarea
                id="finding-description"
                value={findingDescription}
                onChange={(event) => setFindingDescription(event.target.value)}
                rows={3}
                aria-label="Finding summary"
                className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Key details for the report"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-gray-700"
              disabled={!findingTitle.trim()}
            >
              Add finding
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setSelectedFindingId(null)}
              className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm ${
                selectedFindingId === null
                  ? 'border-blue-500 bg-blue-950'
                  : 'border-gray-700 hover:border-blue-400'
              }`}
            >
              <span>All evidence</span>
              <span className="text-xs text-gray-300">{evidence.length}</span>
            </button>

            {findings.length === 0 ? (
              <p className="text-sm text-gray-400">
                Add findings to organise supporting evidence.
              </p>
            ) : (
              <ul className="space-y-2">
                {findings.map((finding) => {
                  const count = evidenceCounts[finding.id] || 0;
                  const isSelected = selectedFindingId === finding.id;
                  return (
                    <li key={finding.id} className="rounded border border-gray-800 bg-gray-900">
                      <button
                        type="button"
                        onClick={() => setSelectedFindingId(finding.id)}
                        className={`flex w-full items-start justify-between gap-2 rounded-t px-3 py-2 text-left text-sm ${
                          isSelected
                            ? 'bg-blue-950 text-blue-100'
                            : 'hover:bg-gray-800'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div>
                          <p className="font-medium">{finding.title}</p>
                          {finding.description && (
                            <p className="mt-1 text-xs text-gray-300">
                              {finding.description}
                            </p>
                          )}
                        </div>
                        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-200">
                          {count}
                        </span>
                      </button>
                      <div className="flex items-center justify-between border-t border-gray-800 px-3 py-2 text-xs text-gray-300">
                        <span>{count === 1 ? '1 linked item' : `${count} linked items`}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFinding(finding.id)}
                          className="text-red-400 hover:underline"
                          aria-label={`Delete finding ${finding.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex h-full flex-1 flex-col gap-4">
          <section className="rounded border border-gray-700 bg-gray-950 p-4">
            <h2 className="text-base font-semibold">Add evidence</h2>
            <form className="mt-3 space-y-4" onSubmit={handleAddEvidence}>
              <fieldset>
                <legend className="text-xs font-medium uppercase tracking-wide text-gray-300">
                  Evidence type
                </legend>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <input
                        id="evidence-type-image"
                        type="radio"
                        name="evidence-type"
                        value="image"
                        checked={evidenceType === 'image'}
                        onChange={() => setEvidenceType('image')}
                        aria-label="Image evidence"
                      />
                      <label htmlFor="evidence-type-image">Image</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="evidence-type-code"
                        type="radio"
                        name="evidence-type"
                        value="code"
                        checked={evidenceType === 'code'}
                        onChange={() => setEvidenceType('code')}
                        aria-label="Code snippet evidence"
                      />
                      <label htmlFor="evidence-type-code">Code snippet</label>
                    </div>
                </div>
              </fieldset>

              {isImage ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="evidence-image">
                      Upload image
                    </label>
                    <input
                      id="evidence-image"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      aria-label="Upload evidence image"
                      className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                    {imageData?.dataUrl && (
                      <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-2">
                        <p className="text-xs text-gray-300">Preview</p>
                        <img
                          src={imageData.dataUrl}
                          alt={altText || 'Selected evidence preview'}
                          className="mt-2 max-h-40 w-full rounded object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="evidence-alt">
                        Alt text <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="evidence-alt"
                        type="text"
                        value={altText}
                        onChange={(event) => setAltText(event.target.value)}
                        required
                        aria-label="Image alt text"
                        className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Describe the image for screen readers"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="evidence-caption">
                        Caption
                      </label>
                      <input
                        id="evidence-caption"
                        type="text"
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        aria-label="Image caption"
                        className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Shown under the preview"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="snippet-language">
                        Language / tool
                      </label>
                      <input
                        id="snippet-language"
                        type="text"
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        aria-label="Snippet language or tool"
                        className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Optional context (e.g. bash, python)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="snippet-caption">
                        Caption
                      </label>
                      <input
                        id="snippet-caption"
                        type="text"
                        value={caption}
                        onChange={(event) => setCaption(event.target.value)}
                        aria-label="Snippet caption"
                        className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm focus:border-blue-400 focus:outline-none"
                        placeholder="Short explanation"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide" htmlFor="code-snippet">
                      Snippet <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="code-snippet"
                      value={codeSnippet}
                      onChange={(event) => setCodeSnippet(event.target.value)}
                      rows={6}
                      required
                      aria-label="Code snippet"
                      className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 font-mono text-sm focus:border-blue-400 focus:outline-none"
                      placeholder="Paste relevant output or code"
                    />
                  </div>
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-gray-300">
                  Link to findings
                </legend>
                {findings.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Add a finding to enable linking.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 text-sm">
                      {findings.map((finding) => (
                        <div key={finding.id} className="flex items-center gap-2">
                          <input
                            id={`link-finding-${finding.id}`}
                            type="checkbox"
                            checked={linkedFindingIds.includes(finding.id)}
                            onChange={() => handleToggleLinkedFinding(finding.id)}
                            aria-label={`Link evidence to ${finding.title}`}
                          />
                          <label htmlFor={`link-finding-${finding.id}`}>{finding.title}</label>
                        </div>
                      ))}
                  </div>
                )}
              </fieldset>

              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-gray-700"
                disabled={!canSubmitEvidence}
              >
                Add evidence
              </button>
            </form>
          </section>

          <section className="flex-1 overflow-hidden rounded border border-gray-700 bg-gray-950">
            <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <h2 className="text-base font-semibold">Evidence library</h2>
              {selectedFindingId && (
                <p className="text-xs text-gray-300">
                  Filtering by: {linkedFindingMap.get(selectedFindingId)?.title || 'Unknown finding'}
                </p>
              )}
            </header>
            <div className="h-full overflow-y-auto p-4">
              {filteredEvidence.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {selectedFindingId
                    ? 'No evidence linked to this finding yet.'
                    : 'No evidence captured yet.'}
                </p>
              ) : (
                <ul className="space-y-4">
                  {filteredEvidence.map((item) => (
                    <li key={item.id} className="rounded border border-gray-800 bg-gray-900 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-wide text-gray-300">
                            {item.type === 'image' ? 'Image evidence' : 'Code snippet'}
                          </p>
                          {item.caption && (
                            <h3 className="mt-1 text-lg font-semibold">{item.caption}</h3>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvidence(item.id)}
                          className="text-xs text-red-400 hover:underline"
                          aria-label="Delete evidence"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-3">
                        {item.type === 'image' ? (
                          <figure>
                            <img
                              src={item.dataUrl}
                              alt={item.altText}
                              className="max-h-64 w-full rounded object-contain"
                            />
                            {item.caption && (
                              <figcaption className="mt-2 text-sm text-gray-300">
                                {item.caption}
                              </figcaption>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              Alt text: {item.altText}
                            </p>
                          </figure>
                        ) : (
                          <div>
                            {item.language && (
                              <p className="text-xs uppercase tracking-wide text-gray-400">
                                {item.language}
                              </p>
                            )}
                            <pre className="mt-2 max-h-64 overflow-auto rounded border border-gray-800 bg-black p-3 text-sm text-gray-100">
                              <code>{item.code}</code>
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-gray-400">
                        {item.linkedFindingIds.length > 0 ? (
                          <p>
                            Linked findings:{' '}
                            {item.linkedFindingIds
                              .map((id) => linkedFindingMap.get(id)?.title)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        ) : (
                          <p>Not linked to any findings yet.</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default EvidenceVaultApp;

