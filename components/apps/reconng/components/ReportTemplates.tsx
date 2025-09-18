import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePersistentState from '../../../../hooks/usePersistentState';
import defaultTemplates from '../../../../templates/export/report-templates.json';

interface Finding {
  title: string;
  description: string;
  severity: string;
}

const mockFindings: Finding[] = [
  {
    title: 'Open Port 80',
    description: 'HTTP service detected on port 80',
    severity: 'Low',
  },
  {
    title: 'Deprecated TLS Version',
    description: 'Server supports TLS 1.0',
    severity: 'Medium',
  },
  {
    title: 'SQL Injection',
    description: 'User parameter vulnerable to injection',
    severity: 'High',
  },
];

interface TemplateDef {
  name: string;
  template: string;
}

const defaultTemplateRecord = defaultTemplates as Record<string, TemplateDef>;

const fillFindingSegment = (segment: string, finding: Finding, index: number) =>
  segment
    .replace(/{{index}}/g, String(index + 1))
    .replace(/{{title}}/g, finding.title)
    .replace(/{{severity}}/g, finding.severity)
    .replace(/{{description}}/g, finding.description);

const renderTemplate = (tpl: string, findings: Finding[]) =>
  tpl.replace(/{{#findings}}([\s\S]*?){{\/findings}}/, (_, segment) =>
    findings.map((f, i) => fillFindingSegment(segment, f, i)).join(''),
  );

const renderSnippet = (tpl: string, finding: Finding, index: number) => {
  const match = tpl.match(/{{#findings}}([\s\S]*?){{\/findings}}/);
  const segment = match ? match[1] : tpl;
  return fillFindingSegment(segment, finding, index);
};

export default function ReportTemplates() {
  const [templateData, setTemplateData, resetTemplates] = usePersistentState<
    Record<string, TemplateDef>
  >('reconng-template-library', () => defaultTemplateRecord);
  const templateKeys = useMemo(() => Object.keys(templateData), [templateData]);
  const [template, setTemplate] = usePersistentState(
    'reconng-report-template',
    templateKeys[0] || '',
  );
  const [activeFinding, setActiveFinding] = useState(0);
  const [findingDrafts, setFindingDrafts] = usePersistentState<string[]>(
    'reconng-finding-drafts',
    () => mockFindings.map((f) => f.description),
  );
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (findingDrafts.length !== mockFindings.length) {
      setFindingDrafts(mockFindings.map((f) => f.description));
    }
  }, [findingDrafts.length, setFindingDrafts]);

  const validTemplateKey = useMemo(() => {
    if (template && templateKeys.includes(template)) return template;
    return templateKeys[0] || '';
  }, [template, templateKeys]);

  const currentTemplate = templateData[validTemplateKey];

  const workingFindings = useMemo(
    () =>
      mockFindings.map((finding, idx) => ({
        ...finding,
        description: findingDrafts[idx] ?? finding.description,
      })),
    [findingDrafts],
  );

  const report = useMemo(() => {
    if (!currentTemplate) return '';
    return renderTemplate(currentTemplate.template, workingFindings);
  }, [currentTemplate, workingFindings]);

  const exportReport = () => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const downloadName = currentTemplate?.name
      ? currentTemplate.name.replace(/\s+/g, '-').toLowerCase()
      : 'report';
    a.download = `${downloadName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showDialog, setShowDialog] = useState(false);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Record<
          string,
          TemplateDef
        >;
        const entries = Object.entries(parsed).filter(
          ([, value]) => typeof value?.name === 'string' && typeof value?.template === 'string',
        );
        if (entries.length === 0) return;
        const nextRecord = Object.fromEntries(entries);
        setTemplateData(nextRecord);
        const first = entries[0]?.[0];
        if (first) setTemplate(first);
      } catch {
        // ignore parse errors
      }
    };
    reader.readAsText(file);
  };

  const shareJson = JSON.stringify(templateData, null, 2);
  const copyShare = () => {
    try {
      navigator.clipboard.writeText(shareJson);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    resetTemplates();
    const first = Object.keys(defaultTemplateRecord)[0] || '';
    setTemplate(first);
  };

  const addTemplate = () => {
    const id = `tpl-${Date.now().toString(36)}`;
    const draft: TemplateDef = {
      name: 'New Template',
      template: '{{title}} ({{severity}})\n{{description}}',
    };
    setTemplateData((prev) => ({ ...prev, [id]: draft }));
    setTemplate(id);
  };

  const removeTemplate = () => {
    if (!validTemplateKey) return;
    const nextKeys = templateKeys.filter((key) => key !== validTemplateKey);
    setTemplate(nextKeys[0] || '');
    setTemplateData((prev) => {
      const next = { ...prev };
      delete next[validTemplateKey];
      return next;
    });
  };

  const handleTemplateName = (value: string) => {
    if (!validTemplateKey) return;
    setTemplateData((prev) => ({
      ...prev,
      [validTemplateKey]: { ...prev[validTemplateKey], name: value },
    }));
  };

  const handleTemplateBody = (value: string) => {
    if (!validTemplateKey) return;
    setTemplateData((prev) => ({
      ...prev,
      [validTemplateKey]: { ...prev[validTemplateKey], template: value },
    }));
  };

  const handleFindingChange = (index: number, value: string) => {
    setFindingDrafts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const insertTemplate = useCallback(() => {
    if (!currentTemplate) return;
    const textarea = editorRef.current;
    if (!textarea) return;
    const finding = workingFindings[activeFinding];
    if (!finding) return;
    const raw = textarea.value;
    const selectionStart = textarea.selectionStart ?? raw.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const snippet = renderSnippet(currentTemplate.template, finding, activeFinding);
    const nextValue = `${raw.slice(0, selectionStart)}${snippet}${raw.slice(selectionEnd)}`;
    setFindingDrafts((prev) => {
      const next = [...prev];
      next[activeFinding] = nextValue;
      return next;
    });
    const raf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => setTimeout(cb, 0);
    raf(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + snippet.length;
      textarea.focus();
    });
  }, [activeFinding, currentTemplate, setFindingDrafts, workingFindings]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-gray-800 p-3 rounded flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="template" className="text-sm">
              Template
            </label>
            <select
              id="template"
              value={validTemplateKey}
              onChange={(e) => setTemplate(e.target.value)}
              className="bg-gray-900 px-2 py-1 flex-1"
            >
              {templateKeys.map((key) => (
                <option key={key} value={key}>
                  {templateData[key]?.name || key}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addTemplate}
              className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-sm"
            >
              New
            </button>
            <button
              type="button"
              onClick={removeTemplate}
              className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-sm"
              disabled={!validTemplateKey}
            >
              Delete
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="template-name" className="text-xs uppercase tracking-wide">
              Name
            </label>
            <input
              id="template-name"
              value={currentTemplate?.name || ''}
              onChange={(e) => handleTemplateName(e.target.value)}
              className="bg-gray-900 px-2 py-1 text-sm"
              placeholder="Template name"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label htmlFor="template-body" className="text-xs uppercase tracking-wide">
              Body
            </label>
            <textarea
              id="template-body"
              value={currentTemplate?.template || ''}
              onChange={(e) => handleTemplateBody(e.target.value)}
              className="bg-gray-900 p-2 text-sm h-48 md:h-full"
            />
            <p className="text-xs text-gray-400">
              Use placeholders like <code>{'{{title}}'}</code>,{' '}
              <code>{'{{severity}}'}</code>, <code>{'{{description}}'}</code>, and{' '}
              <code>{'{{index}}'}</code>. Wrap repeated sections with{' '}
              <code>{'{{#findings}}...{{/findings}}'}</code> to loop over all findings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportReport}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-sm"
              disabled={!currentTemplate}
            >
              Export Preview
            </button>
            <button
              type="button"
              onClick={() => setShowDialog(true)}
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm"
            >
              Import / Share
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm"
            >
              Reset Defaults
            </button>
          </div>
        </section>
        <section className="bg-gray-800 p-3 rounded flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {mockFindings.map((finding, idx) => {
              const active = idx === activeFinding;
              return (
                <button
                  key={finding.title}
                  type="button"
                  onClick={() => setActiveFinding(idx)}
                  className={`px-2 py-1 rounded text-sm ${
                    active ? 'bg-blue-600' : 'bg-gray-900'
                  }`}
                  aria-pressed={active}
                >
                  {idx + 1}. {finding.title}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label htmlFor="finding-editor" className="text-xs uppercase tracking-wide">
              Finding Notes
            </label>
            <textarea
              id="finding-editor"
              ref={editorRef}
              value={findingDrafts[activeFinding] ?? ''}
              onChange={(e) => handleFindingChange(activeFinding, e.target.value)}
              className="bg-gray-900 p-2 text-sm h-48 md:h-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={insertTemplate}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-sm"
              disabled={!currentTemplate}
            >
              Insert Template at Cursor
            </button>
            <button
              type="button"
              onClick={() =>
                handleFindingChange(
                  activeFinding,
                  mockFindings[activeFinding]?.description || '',
                )
              }
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-sm"
            >
              Restore Sample Text
            </button>
          </div>
        </section>
      </div>
      <section className="flex-1 bg-black p-3 rounded overflow-auto whitespace-pre-wrap text-sm">
        {report || 'No template selected.'}
      </section>
      {showDialog && (
        <dialog open className="p-4 bg-gray-800 text-white rounded max-w-md">
          <p className="mb-2">Import templates (JSON)</p>
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            aria-label="Import templates JSON"
          />
          <p className="mt-4 mb-2">Share templates</p>
          <textarea
            readOnly
            value={shareJson}
            className="w-full h-40 p-1 text-black"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={copyShare}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}

