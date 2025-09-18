'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import templatesRaw from '../../templates/export/report-templates.json';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  useWorkspaces,
  type WorkspaceMetadata,
  type WorkspaceEvidenceHint,
  type WorkspaceFinding,
  type WorkspaceSeverity,
} from '../../hooks/useWorkspaces';

type TemplateDefinition = { name: string; template: string };

const templates = templatesRaw as Record<string, TemplateDefinition>;
const templateKeyList = Object.keys(templates);

const severityOptions: WorkspaceSeverity[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
  'Informational',
];

const DRAFT_STORAGE_KEY = 'report-builder-draft';

type Finding = WorkspaceFinding;

interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  fileName?: string;
  fileSize?: number;
}

interface EvidenceDraft extends Omit<EvidenceItem, 'id'> {}

interface FormState {
  workspaceId: string;
  executiveSummary: string;
  remediation: string;
  technicalFindings: Finding[];
  evidence: EvidenceItem[];
}

interface PersistedDraft extends FormState {
  selectedTemplate: string;
}

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const renderTemplate = (
  template: string,
  form: FormState,
  workspace?: WorkspaceMetadata,
) => {
  let output = template;

  if (workspace) {
    const focus = workspace.focus.join(', ');
    const scope = workspace.scope.join(', ');
    output = output
      .replace(/{{client}}/g, workspace.client)
      .replace(/{{workspace}}/g, workspace.name)
      .replace(/{{industry}}/g, workspace.industry)
      .replace(/{{engagementLead}}/g, workspace.engagementLead)
      .replace(/{{status}}/g, workspace.status)
      .replace(/{{summary}}/g, workspace.summary)
      .replace(/{{workspaceSummary}}/g, workspace.summary)
      .replace(/{{reportingDeadline}}/g, workspace.reportingDeadline)
      .replace(/{{environment}}/g, workspace.environment)
      .replace(/{{focus}}/g, focus)
      .replace(/{{scope}}/g, scope)
      .replace(/{{primaryContact}}/g, workspace.primaryContact);
  }

  output = output
    .replace(
      /{{executiveSummary}}/g,
      form.executiveSummary.trim() || 'Executive summary pending.',
    )
    .replace(
      /{{remediation}}/g,
      form.remediation.trim() || 'Remediation plan pending.',
    );

  output = output.replace(/{{#findings}}([\s\S]*?){{\/findings}}/g, (_, segment) => {
    if (!form.technicalFindings.length) {
      return 'No findings documented yet.';
    }

    return form.technicalFindings
      .map((finding, index) =>
        segment
          .replace(/{{index}}/g, String(index + 1))
          .replace(/{{title}}/g, finding.title || `Finding ${index + 1}`)
          .replace(/{{severity}}/g, finding.severity)
          .replace(
            /{{description}}/g,
            finding.description || 'Description pending.',
          ),
      )
      .join('');
  });

  return output;
};

const emptyForm: FormState = {
  workspaceId: '',
  executiveSummary: '',
  remediation: '',
  technicalFindings: [],
  evidence: [],
};

const ReportBuilder = () => {
  const { workspaces, getWorkspaceById } = useWorkspaces();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [selectedTemplate, setSelectedTemplate] = useState(
    templateKeyList[0] || '',
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const skipNextAutoFill = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>({
    title: '',
    description: '',
    fileName: '',
    fileSize: undefined,
  });

  useEffect(() => {
    if (!workspaces.length || draftLoaded) return;

    const firstWorkspace = workspaces[0];
    const fallbackWorkspaceId = firstWorkspace?.id || '';

    if (safeLocalStorage) {
      const raw = safeLocalStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PersistedDraft;
          const workspaceId = parsed.workspaceId || fallbackWorkspaceId;

          setSelectedWorkspaceId(workspaceId);
          setFormState({
            workspaceId,
            executiveSummary: parsed.executiveSummary || '',
            remediation: parsed.remediation || '',
            technicalFindings: Array.isArray(parsed.technicalFindings)
              ? parsed.technicalFindings.map((finding) => ({
                  ...finding,
                  id: finding.id || createId(),
                  severity: severityOptions.includes(
                    finding.severity as WorkspaceSeverity,
                  )
                    ? (finding.severity as WorkspaceSeverity)
                    : 'Medium',
                }))
              : [],
            evidence: Array.isArray(parsed.evidence)
              ? parsed.evidence.map((item) => ({
                  ...item,
                  id: item.id || createId(),
                }))
              : [],
          });

          if (
            parsed.selectedTemplate &&
            templateKeyList.includes(parsed.selectedTemplate)
          ) {
            setSelectedTemplate(parsed.selectedTemplate);
          }

          skipNextAutoFill.current = true;
          setDraftLoaded(true);
          return;
        } catch (error) {
          console.error('Failed to parse report builder draft', error);
        }
      }
    }

    if (firstWorkspace) {
      setSelectedWorkspaceId(firstWorkspace.id);
    }
    setDraftLoaded(true);
  }, [workspaces, draftLoaded]);

  useEffect(() => {
    if (!draftLoaded || !selectedWorkspaceId) return;
    const workspace = getWorkspaceById(selectedWorkspaceId);
    if (!workspace) return;
    if (skipNextAutoFill.current) {
      skipNextAutoFill.current = false;
      return;
    }

    setFormState({
      workspaceId: workspace.id,
      executiveSummary: workspace.defaultExecutiveSummary,
      remediation: workspace.defaultRemediation,
      technicalFindings: workspace.findings.map((finding) => ({
        ...finding,
        id: finding.id || createId(),
      })),
      evidence: [],
    });
    setEvidenceDraft({ title: '', description: '', fileName: '', fileSize: undefined });
  }, [selectedWorkspaceId, getWorkspaceById, draftLoaded]);

  const workspace = useMemo(
    () => getWorkspaceById(selectedWorkspaceId),
    [getWorkspaceById, selectedWorkspaceId],
  );

  const preview = useMemo(
    () =>
      selectedTemplate && templates[selectedTemplate]
        ? renderTemplate(templates[selectedTemplate].template, formState, workspace)
        : 'Select a template to preview the report.',
    [formState, selectedTemplate, workspace],
  );

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleWorkspaceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    setSelectedWorkspaceId(id);
    setFormState((prev) => ({ ...prev, workspaceId: id }));
  };

  const handleSummaryChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, executiveSummary: value }));
  };

  const handleRemediationChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, remediation: value }));
  };

  const addFinding = () => {
    setFormState((prev) => ({
      ...prev,
      technicalFindings: [
        ...prev.technicalFindings,
        {
          id: createId(),
          title: '',
          severity: 'Medium',
          description: '',
        },
      ],
    }));
  };

  const updateFinding = (
    id: string,
    field: keyof Omit<Finding, 'id'>,
    value: string,
  ) => {
    setFormState((prev) => ({
      ...prev,
      technicalFindings: prev.technicalFindings.map((finding) =>
        finding.id === id
          ? {
              ...finding,
              [field]:
                field === 'severity'
                  ? (value as WorkspaceSeverity)
                  : value,
            }
          : finding,
      ),
    }));
  };

  const removeFinding = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      technicalFindings: prev.technicalFindings.filter(
        (finding) => finding.id !== id,
      ),
    }));
  };

  const handleEvidenceDraftChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setEvidenceDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleEvidenceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setEvidenceDraft((prev) => ({
      ...prev,
      fileName: file?.name || '',
      fileSize: file?.size,
    }));
  };

  const handleEvidenceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasContent =
      evidenceDraft.title.trim() ||
      evidenceDraft.description.trim() ||
      evidenceDraft.fileName;

    if (!hasContent) return;

    const newItem: EvidenceItem = {
      id: createId(),
      title: evidenceDraft.title.trim() || 'Untitled evidence',
      description: evidenceDraft.description.trim(),
      fileName: evidenceDraft.fileName || undefined,
      fileSize: evidenceDraft.fileSize,
    };

    setFormState((prev) => ({
      ...prev,
      evidence: [...prev.evidence, newItem],
    }));

    setEvidenceDraft({
      title: '',
      description: '',
      fileName: '',
      fileSize: undefined,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeEvidenceItem = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((item) => item.id !== id),
    }));
  };

  const saveDraft = () => {
    if (!safeLocalStorage) {
      showStatus('Drafts require browser storage to be available.');
      return;
    }

    const payload: PersistedDraft = {
      ...formState,
      selectedTemplate,
    };

    safeLocalStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    showStatus('Draft saved locally.');
  };

  const clearDraft = () => {
    if (safeLocalStorage) {
      safeLocalStorage.removeItem(DRAFT_STORAGE_KEY);
    }

    if (workspace) {
      setFormState({
        workspaceId: workspace.id,
        executiveSummary: workspace.defaultExecutiveSummary,
        remediation: workspace.defaultRemediation,
        technicalFindings: workspace.findings.map((finding) => ({
          ...finding,
          id: finding.id || createId(),
        })),
        evidence: [],
      });
    } else {
      setFormState(emptyForm);
    }

    setEvidenceDraft({ title: '', description: '', fileName: '', fileSize: undefined });
    showStatus('Draft cleared.');
  };

  const applyWorkspaceDefaults = () => {
    if (!workspace) return;
    setFormState({
      workspaceId: workspace.id,
      executiveSummary: workspace.defaultExecutiveSummary,
      remediation: workspace.defaultRemediation,
      technicalFindings: workspace.findings.map((finding) => ({
        ...finding,
        id: finding.id || createId(),
      })),
      evidence: [],
    });
    setEvidenceDraft({ title: '', description: '', fileName: '', fileSize: undefined });
    showStatus('Workspace defaults applied.');
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-ub-cool-grey p-4 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
          <label className="flex flex-col text-sm" htmlFor="workspace-select">
            <span className="mb-1 text-xs uppercase tracking-wide text-gray-300">
              Workspace
            </span>
            <select
              id="workspace-select"
              value={selectedWorkspaceId}
              onChange={handleWorkspaceChange}
              className="rounded border border-gray-700 bg-ub-grey px-3 py-2 text-white focus:border-ub-orange focus:outline-none"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm" htmlFor="template-select">
            <span className="mb-1 text-xs uppercase tracking-wide text-gray-300">
              Template
            </span>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              className="rounded border border-gray-700 bg-ub-grey px-3 py-2 text-white focus:border-ub-orange focus:outline-none"
            >
              {templateKeyList.map((key) => (
                <option key={key} value={key}>
                  {templates[key].name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveDraft}
            className="rounded bg-ub-orange px-3 py-2 text-black transition hover:bg-amber-400"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={clearDraft}
            className="rounded border border-gray-600 px-3 py-2 transition hover:border-gray-400"
          >
            Clear draft
          </button>
          <button
            type="button"
            onClick={applyWorkspaceDefaults}
            className="rounded border border-ub-orange px-3 py-2 text-ub-orange transition hover:bg-ub-orange/10"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded border border-ub-orange bg-ub-orange/10 px-3 py-2 text-sm text-ub-orange">
          {statusMessage}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="space-y-3 rounded border border-gray-700 bg-ub-grey p-4">
          <h2 className="text-lg font-semibold">Workspace metadata</h2>
          {workspace ? (
            <div className="space-y-3 text-sm text-gray-200">
              <p>
                <span className="font-semibold text-white">Client:</span> {workspace.client}
              </p>
              <p>
                <span className="font-semibold text-white">Industry:</span> {workspace.industry}
              </p>
              <p>
                <span className="font-semibold text-white">Status:</span> {workspace.status}
              </p>
              <p>
                <span className="font-semibold text-white">Engagement lead:</span> {workspace.engagementLead}
              </p>
              <p>
                <span className="font-semibold text-white">Primary contact:</span> {workspace.primaryContact}
              </p>
              <p>
                <span className="font-semibold text-white">Environment:</span> {workspace.environment}
              </p>
              <p>
                <span className="font-semibold text-white">Reporting deadline:</span> {workspace.reportingDeadline}
              </p>
              <div>
                <p className="font-semibold text-white">Focus areas</p>
                <ul className="ml-4 list-disc text-gray-200">
                  {workspace.focus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white">Scope</p>
                <ul className="ml-4 list-disc text-gray-200">
                  {workspace.scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white">Summary</p>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-gray-200">
                  {workspace.summary}
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">Evidence hints</p>
                <ul className="ml-4 list-disc space-y-1 text-gray-200">
                  {workspace.evidenceHints.map((hint: WorkspaceEvidenceHint) => (
                    <li key={`${workspace.id}-${hint.title}`}>
                      <p className="font-semibold text-white">{hint.title}</p>
                      <p className="text-gray-300">{hint.summary}</p>
                      {hint.reference && (
                        <p className="text-xs text-gray-400">Suggested reference: {hint.reference}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                {workspace.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-600 px-2 py-0.5 text-xs uppercase tracking-wide text-gray-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-300">
              Choose a workspace to view context and recommended attachments.
            </p>
          )}
        </aside>

        <div className="space-y-4 lg:col-span-2">
          <section className="space-y-2 rounded border border-gray-700 bg-ub-grey p-4">
            <label className="flex flex-col text-sm" htmlFor="executive-summary">
              <span className="mb-1 text-xs uppercase tracking-wide text-gray-300">
                Executive summary
              </span>
              <textarea
                id="executive-summary"
                value={formState.executiveSummary}
                onChange={handleSummaryChange}
                rows={5}
                className="rounded border border-gray-700 bg-black/60 px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
              />
            </label>
          </section>

          <section className="space-y-3 rounded border border-gray-700 bg-ub-grey p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Technical findings</h2>
              <button
                type="button"
                onClick={addFinding}
                className="rounded border border-ub-orange px-3 py-1 text-sm text-ub-orange transition hover:bg-ub-orange/10"
              >
                Add finding
              </button>
            </div>
            {formState.technicalFindings.length === 0 ? (
              <p className="text-sm text-gray-300">
                No findings recorded yet. Add findings to feed the selected template and preview.
              </p>
            ) : (
              <div className="space-y-3">
                {formState.technicalFindings.map((finding, index) => (
                  <div
                    key={finding.id}
                    className="space-y-3 rounded border border-gray-700 bg-black/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">Finding {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeFinding(finding.id)}
                        className="text-sm text-red-400 transition hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-gray-300">
                        Title
                      </span>
                      <input
                        type="text"
                        value={finding.title}
                        onChange={(event) =>
                          updateFinding(finding.id, 'title', event.target.value)
                        }
                        className="w-full rounded border border-gray-700 bg-ub-grey px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-gray-300">
                          Severity
                        </span>
                        <select
                          value={finding.severity}
                          onChange={(event) =>
                            updateFinding(
                              finding.id,
                              'severity',
                              event.target.value,
                            )
                          }
                          className="w-full rounded border border-gray-700 bg-ub-grey px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
                        >
                          {severityOptions.map((severity) => (
                            <option key={severity} value={severity}>
                              {severity}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-gray-300">
                        Description
                      </span>
                      <textarea
                        value={finding.description}
                        onChange={(event) =>
                          updateFinding(
                            finding.id,
                            'description',
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="w-full rounded border border-gray-700 bg-ub-grey px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2 rounded border border-gray-700 bg-ub-grey p-4">
            <label className="flex flex-col text-sm" htmlFor="remediation-plan">
              <span className="mb-1 text-xs uppercase tracking-wide text-gray-300">
                Remediation plan
              </span>
              <textarea
                id="remediation-plan"
                value={formState.remediation}
                onChange={handleRemediationChange}
                rows={5}
                className="rounded border border-gray-700 bg-black/60 px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
              />
            </label>
          </section>

          <section className="space-y-3 rounded border border-gray-700 bg-ub-grey p-4">
            <h2 className="text-lg font-semibold">Evidence attachments</h2>
            <form
              className="grid gap-3 rounded border border-gray-700 bg-black/40 p-3 md:grid-cols-2"
              onSubmit={handleEvidenceSubmit}
            >
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs uppercase tracking-wide text-gray-300">
                  Title
                </span>
                <input
                  type="text"
                  name="title"
                  value={evidenceDraft.title}
                  onChange={handleEvidenceDraftChange}
                  className="w-full rounded border border-gray-700 bg-ub-grey px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs uppercase tracking-wide text-gray-300">
                  Notes
                </span>
                <textarea
                  name="description"
                  value={evidenceDraft.description}
                  onChange={handleEvidenceDraftChange}
                  rows={3}
                  className="w-full rounded border border-gray-700 bg-ub-grey px-3 py-2 text-sm text-gray-100 focus:border-ub-orange focus:outline-none"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs uppercase tracking-wide text-gray-300">
                  Attach file
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleEvidenceFileChange}
                  className="w-full text-sm text-gray-100 file:mr-4 file:rounded file:border-0 file:bg-ub-orange file:px-3 file:py-2 file:text-black"
                />
                {evidenceDraft.fileName && (
                  <p className="mt-1 text-xs text-gray-400">
                    {evidenceDraft.fileName}
                    {evidenceDraft.fileSize
                      ? ` • ${formatFileSize(evidenceDraft.fileSize)}`
                      : ''}
                  </p>
                )}
              </label>
              <div className="flex items-end md:justify-end">
                <button
                  type="submit"
                  className="rounded bg-ub-orange px-3 py-2 text-black transition hover:bg-amber-400"
                >
                  Add evidence
                </button>
              </div>
            </form>
            {formState.evidence.length === 0 ? (
              <p className="text-sm text-gray-300">
                No evidence attached. Add screenshots, logs, or artefact notes to track supporting material.
              </p>
            ) : (
              <ul className="space-y-2">
                {formState.evidence.map((item) => (
                  <li
                    key={item.id}
                    className="rounded border border-gray-700 bg-black/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-white">{item.title}</p>
                        {item.description && (
                          <p className="whitespace-pre-wrap text-sm text-gray-200">
                            {item.description}
                          </p>
                        )}
                        {item.fileName && (
                          <p className="text-xs text-gray-400">
                            File: {item.fileName}
                            {item.fileSize
                              ? ` (${formatFileSize(item.fileSize)})`
                              : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvidenceItem(item.id)}
                        className="text-sm text-red-400 transition hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="space-y-2 rounded border border-gray-700 bg-ub-grey p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Template preview</h2>
          {workspace && (
            <span className="text-xs uppercase tracking-wide text-gray-300">
              Previewing as {workspace.client}
            </span>
          )}
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-black/70 p-4 text-sm text-green-200">
          {preview}
        </pre>
      </section>
    </div>
  );
};

export default ReportBuilder;
