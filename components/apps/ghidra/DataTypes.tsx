'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export type DataTypeKind = 'struct' | 'union';

export interface DataTypeField {
  id: string;
  name: string;
  type: string;
  size: number;
  offset?: number;
  comment?: string;
}

export interface DataTypeDefinition {
  id: string;
  name: string;
  kind: DataTypeKind;
  comment?: string;
  fields: DataTypeField[];
}

export interface MemoryApplication {
  id: string;
  typeId: string;
  address: string;
  length: number;
  comment?: string;
}

export interface TypeSnapshot {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  definitions: DataTypeDefinition[];
  applications: MemoryApplication[];
}

interface DataTypesState {
  snapshots: TypeSnapshot[];
  activeId: string | null;
}

interface DataTypesProps {
  onActiveSnapshotChange?: (snapshot: TypeSnapshot | null) => void;
}

interface TemplateLibrary {
  id: string;
  name: string;
  description: string;
  definitions: DataTypeDefinition[];
}

const PRIMITIVE_TYPES = [
  'uint8',
  'uint16',
  'uint32',
  'uint64',
  'int8',
  'int16',
  'int32',
  'int64',
  'char',
  'wchar_t',
  'float',
  'double',
  'pointer',
  'size_t',
  'bool',
];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const makeTemplate = (
  templateId: string,
  name: string,
  description: string,
  definitions: Omit<DataTypeDefinition, 'id'>[],
): TemplateLibrary => ({
  id: templateId,
  name,
  description,
  definitions: definitions.map((def) => ({
    ...def,
    id: createId(),
    fields: def.fields.map((field) => ({ ...field, id: createId() })),
  })),
});

const TEMPLATE_LIBRARIES: TemplateLibrary[] = [
  makeTemplate('pe-headers', 'PE Header Essentials', 'Key PE header structures for Windows binaries.', [
    {
      name: 'IMAGE_DOS_HEADER',
      kind: 'struct',
      comment: 'Classic DOS header at the start of every PE file.',
      fields: [
        { id: '', name: 'e_magic', type: 'uint16', size: 2, comment: 'Magic number 0x5A4D' },
        { id: '', name: 'e_cblp', type: 'uint16', size: 2 },
        { id: '', name: 'e_cp', type: 'uint16', size: 2 },
        { id: '', name: 'e_crlc', type: 'uint16', size: 2 },
        { id: '', name: 'e_cparhdr', type: 'uint16', size: 2 },
        { id: '', name: 'e_lfanew', type: 'uint32', size: 4, comment: 'Offset to NT headers' },
      ],
    },
    {
      name: 'IMAGE_FILE_HEADER',
      kind: 'struct',
      fields: [
        { id: '', name: 'Machine', type: 'uint16', size: 2 },
        { id: '', name: 'NumberOfSections', type: 'uint16', size: 2 },
        { id: '', name: 'TimeDateStamp', type: 'uint32', size: 4 },
        { id: '', name: 'PointerToSymbolTable', type: 'uint32', size: 4 },
        { id: '', name: 'NumberOfSymbols', type: 'uint32', size: 4 },
        { id: '', name: 'SizeOfOptionalHeader', type: 'uint16', size: 2 },
        { id: '', name: 'Characteristics', type: 'uint16', size: 2 },
      ],
    },
    {
      name: 'IMAGE_DATA_DIRECTORY',
      kind: 'struct',
      fields: [
        { id: '', name: 'VirtualAddress', type: 'uint32', size: 4 },
        { id: '', name: 'Size', type: 'uint32', size: 4 },
      ],
    },
  ]),
  makeTemplate('elf-headers', 'ELF Header Basics', 'Common ELF header structs to kick-start analysis.', [
    {
      name: 'Elf32_Ehdr',
      kind: 'struct',
      fields: [
        { id: '', name: 'e_ident', type: 'uint8[16]', size: 16, comment: 'Magic and metadata' },
        { id: '', name: 'e_type', type: 'uint16', size: 2 },
        { id: '', name: 'e_machine', type: 'uint16', size: 2 },
        { id: '', name: 'e_version', type: 'uint32', size: 4 },
        { id: '', name: 'e_entry', type: 'uint32', size: 4 },
        { id: '', name: 'e_phoff', type: 'uint32', size: 4 },
        { id: '', name: 'e_shoff', type: 'uint32', size: 4 },
        { id: '', name: 'e_flags', type: 'uint32', size: 4 },
        { id: '', name: 'e_ehsize', type: 'uint16', size: 2 },
        { id: '', name: 'e_phentsize', type: 'uint16', size: 2 },
        { id: '', name: 'e_phnum', type: 'uint16', size: 2 },
        { id: '', name: 'e_shentsize', type: 'uint16', size: 2 },
        { id: '', name: 'e_shnum', type: 'uint16', size: 2 },
        { id: '', name: 'e_shstrndx', type: 'uint16', size: 2 },
      ],
    },
    {
      name: 'Elf32_Shdr',
      kind: 'struct',
      fields: [
        { id: '', name: 'sh_name', type: 'uint32', size: 4 },
        { id: '', name: 'sh_type', type: 'uint32', size: 4 },
        { id: '', name: 'sh_flags', type: 'uint32', size: 4 },
        { id: '', name: 'sh_addr', type: 'uint32', size: 4 },
        { id: '', name: 'sh_offset', type: 'uint32', size: 4 },
        { id: '', name: 'sh_size', type: 'uint32', size: 4 },
        { id: '', name: 'sh_link', type: 'uint32', size: 4 },
        { id: '', name: 'sh_info', type: 'uint32', size: 4 },
        { id: '', name: 'sh_addralign', type: 'uint32', size: 4 },
        { id: '', name: 'sh_entsize', type: 'uint32', size: 4 },
      ],
    },
  ]),
];

const initialState = (): DataTypesState => {
  const snapshotId = createId();
  const seedDefinitions = TEMPLATE_LIBRARIES[0]?.definitions
    ? TEMPLATE_LIBRARIES[0].definitions.slice(0, 1).map((definition) => ({
        ...definition,
        id: createId(),
        fields: definition.fields.map((field) => ({ ...field, id: createId() })),
      }))
    : [];
  return {
    snapshots: [
      {
        id: snapshotId,
        name: 'Default snapshot',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        definitions: seedDefinitions,
        applications: [],
      },
    ],
    activeId: snapshotId,
  };
};

function isField(value: unknown): value is DataTypeField {
  if (!value || typeof value !== 'object') return false;
  const v = value as DataTypeField;
  return (
    typeof v.name === 'string' &&
    typeof v.type === 'string' &&
    typeof v.size === 'number'
  );
}

function isDefinition(value: unknown): value is DataTypeDefinition {
  if (!value || typeof value !== 'object') return false;
  const v = value as DataTypeDefinition;
  return (
    typeof v.name === 'string' &&
    (v.kind === 'struct' || v.kind === 'union') &&
    Array.isArray(v.fields) &&
    v.fields.every(isField)
  );
}

function isApplication(value: unknown): value is MemoryApplication {
  if (!value || typeof value !== 'object') return false;
  const v = value as MemoryApplication;
  return (
    typeof v.typeId === 'string' &&
    typeof v.address === 'string' &&
    typeof v.length === 'number'
  );
}

function isTypeSnapshot(value: unknown): value is TypeSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as TypeSnapshot;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number' &&
    Array.isArray(v.definitions) &&
    v.definitions.every(isDefinition) &&
    Array.isArray(v.applications) &&
    v.applications.every(isApplication)
  );
}

function isDataTypesState(value: unknown): value is DataTypesState {
  if (!value || typeof value !== 'object') return false;
  const v = value as DataTypesState;
  return (
    Array.isArray(v.snapshots) &&
    v.snapshots.every(isTypeSnapshot) &&
    (v.activeId === null || typeof v.activeId === 'string')
  );
}

const uniqueName = <T extends { name: string }>(existing: T[], base: string) => {
  const taken = new Set(existing.map((item) => item.name));
  if (!taken.has(base)) return base;
  let counter = 1;
  while (taken.has(`${base}_${counter}`)) {
    counter += 1;
  }
  return `${base}_${counter}`;
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

const exportSnapshotToString = (snapshot: TypeSnapshot) =>
  JSON.stringify(
    {
      name: snapshot.name,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      definitions: snapshot.definitions,
      applications: snapshot.applications,
    },
    null,
    2,
  );

const validateLength = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

interface TypeFieldEditorProps {
  definition: DataTypeDefinition;
  field: DataTypeField;
  availableTypes: string[];
  onChange: (field: DataTypeField) => void;
  onRemove: (id: string) => void;
}

const TypeFieldEditor = ({ definition, field, availableTypes, onChange, onRemove }: TypeFieldEditorProps) => {
  const [sizeInput, setSizeInput] = useState(field.size.toString());

  useEffect(() => {
    setSizeInput(field.size.toString());
  }, [field.size]);

  const options = useMemo(
    () => Array.from(new Set([...PRIMITIVE_TYPES, ...availableTypes])),
    [availableTypes],
  );

  return (
    <div className="grid grid-cols-5 gap-2 items-center text-xs md:text-sm">
      <input
        value={field.name}
        onChange={(event) => onChange({ ...field, name: event.target.value })}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Field"
        aria-label="Field name"
      />
      <input
        value={field.type}
        onChange={(event) => onChange({ ...field, type: event.target.value })}
        list={`datatype-${definition.id}`}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Type"
        aria-label="Field type"
      />
      <input
        value={sizeInput}
        onChange={(event) => {
          setSizeInput(event.target.value);
          const parsed = validateLength(event.target.value);
          onChange({ ...field, size: parsed });
        }}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Size"
        inputMode="numeric"
        aria-label="Field size"
      />
      <input
        value={field.comment || ''}
        onChange={(event) => onChange({ ...field, comment: event.target.value })}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Comment"
        aria-label="Field comment"
      />
      {definition.kind === 'struct' ? (
        <input
          value={field.offset?.toString() || ''}
          onChange={(event) =>
            onChange({
              ...field,
              offset: event.target.value ? validateLength(event.target.value) : undefined,
            })
          }
          className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
          placeholder="Offset"
          inputMode="numeric"
          aria-label="Field offset"
        />
      ) : (
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="col-span-1 rounded border border-gray-600 bg-red-700 px-2 py-1 text-white hover:bg-red-600"
        >
          Remove
        </button>
      )}
      {definition.kind === 'struct' && (
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="col-span-5 justify-self-end rounded border border-gray-600 bg-red-700 px-2 py-1 text-white hover:bg-red-600 md:col-span-1 md:justify-self-auto"
        >
          Remove
        </button>
      )}
        <datalist id={`datatype-${definition.id}`}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </datalist>
    </div>
  );
};

interface ApplicationRowProps {
  entry: MemoryApplication;
  typeName: string;
  onChange: (application: MemoryApplication) => void;
  onRemove: (id: string) => void;
}

const ApplicationRow = ({ entry, typeName, onChange, onRemove }: ApplicationRowProps) => {
  const [lengthInput, setLengthInput] = useState(entry.length.toString());

  useEffect(() => {
    setLengthInput(entry.length.toString());
  }, [entry.length]);

  return (
    <div className="grid grid-cols-5 gap-2 items-center text-xs md:text-sm">
      <input
        value={entry.address}
        onChange={(event) => onChange({ ...entry, address: event.target.value })}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Address"
        aria-label="Memory address"
      />
      <span className="col-span-1 truncate" title={typeName}>
        {typeName || 'Unknown type'}
      </span>
      <input
        value={lengthInput}
        onChange={(event) => {
          setLengthInput(event.target.value);
          const parsed = validateLength(event.target.value);
          onChange({ ...entry, length: parsed });
        }}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Length"
        inputMode="numeric"
        aria-label="Type application length"
      />
      <input
        value={entry.comment || ''}
        onChange={(event) => onChange({ ...entry, comment: event.target.value })}
        className="col-span-1 rounded border border-gray-600 bg-gray-800 px-2 py-1"
        placeholder="Comment"
        aria-label="Type application comment"
      />
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        className="col-span-1 rounded border border-gray-600 bg-red-700 px-2 py-1 text-white hover:bg-red-600"
      >
        Remove
      </button>
    </div>
  );
};

interface SnapshotToolbarProps {
  state: DataTypesState;
  activeSnapshot: TypeSnapshot | null;
  onSelect: (id: string) => void;
  onAddSnapshot: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

const SnapshotToolbar = ({ state, activeSnapshot, onSelect, onAddSnapshot, onDuplicate, onDelete, onRename }: SnapshotToolbarProps) => {
  const [nameInput, setNameInput] = useState(activeSnapshot?.name || '');

  useEffect(() => {
    setNameInput(activeSnapshot?.name || '');
  }, [activeSnapshot?.name]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={activeSnapshot?.id || ''}
          onChange={(event) => onSelect(event.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs md:text-sm"
          aria-label="Select data type snapshot"
        >
          {state.snapshots.map((snapshot) => (
            <option key={snapshot.id} value={snapshot.id}>
              {snapshot.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAddSnapshot}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs md:text-sm hover:bg-gray-600"
          aria-label="Create new data type snapshot"
        >
          New snapshot
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs md:text-sm hover:bg-gray-600"
          disabled={!activeSnapshot}
          aria-label="Duplicate selected data type snapshot"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs md:text-sm hover:bg-gray-600"
          disabled={!activeSnapshot || state.snapshots.length <= 1}
          aria-label="Delete selected data type snapshot"
        >
          Delete
        </button>
      </div>
      {activeSnapshot && (
        <div className="grid gap-2 text-xs md:text-sm">
          <label className="flex flex-col">
            <span className="mb-1 text-gray-300">Snapshot name</span>
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              onBlur={() => onRename(nameInput.trim() || 'Untitled snapshot')}
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
              aria-label="Snapshot name"
            />
          </label>
          <div className="text-gray-400">
            Updated {formatDate(activeSnapshot.updatedAt)}
          </div>
        </div>
      )}
    </div>
  );
};

interface TemplatePickerProps {
  onApply: (definitions: DataTypeDefinition[]) => void;
}

const TemplatePicker = ({ onApply }: TemplatePickerProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleApply = () => {
    const template = TEMPLATE_LIBRARIES.find((item) => item.id === selectedTemplate);
    if (!template) return;
    onApply(template.definitions);
    setSelectedTemplate('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
      <select
        value={selectedTemplate}
        onChange={(event) => setSelectedTemplate(event.target.value)}
        className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
        aria-label="Select type template"
      >
        <option value="">Apply template…</option>
        {TEMPLATE_LIBRARIES.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleApply}
        disabled={!selectedTemplate}
        className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Apply selected type template"
      >
        Insert
      </button>
      {selectedTemplate && (
        <p className="text-gray-400">
          {TEMPLATE_LIBRARIES.find((template) => template.id === selectedTemplate)?.description}
        </p>
      )}
    </div>
  );
};

interface ExportImportControlsProps {
  snapshot: TypeSnapshot | null;
  onImport: (snapshot: TypeSnapshot) => void;
}

const ExportImportControls = ({ snapshot, onImport }: ExportImportControlsProps) => {
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!snapshot) return;
    const text = exportSnapshotToString(snapshot);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setError('Copied to clipboard');
        return;
      } catch (err) {
        setError((err as Error).message);
      }
    }
    setError('Clipboard API unavailable. Copy manually from the export panel.');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!isTypeSnapshot(parsed)) {
        throw new Error('Invalid snapshot format');
      }
      const snapshotToImport: TypeSnapshot = {
        ...parsed,
        id: createId(),
        name: parsed.name || 'Imported snapshot',
        createdAt: parsed.createdAt || Date.now(),
        updatedAt: Date.now(),
        definitions: parsed.definitions.map((definition) => ({
          ...definition,
          id: createId(),
          fields: definition.fields.map((field) => ({ ...field, id: createId() })),
        })),
        applications: parsed.applications.map((application) => ({
          ...application,
          id: createId(),
        })),
      };
      onImport(snapshotToImport);
      setImportText('');
      setError('Snapshot imported');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-2 text-xs md:text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowExport((value) => !value)}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
          disabled={!snapshot}
        >
          {showExport ? 'Hide export' : 'Export JSON'}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
          disabled={!snapshot}
        >
          Copy snapshot
        </button>
      </div>
      {showExport && snapshot && (
        <textarea
          className="h-32 w-full rounded border border-gray-600 bg-gray-900 p-2 font-mono"
          readOnly
          value={exportSnapshotToString(snapshot)}
          aria-label="Exported snapshot JSON"
        />
      )}
      <div className="grid gap-2">
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder="Paste exported snapshot JSON to import"
          className="h-24 w-full rounded border border-gray-600 bg-gray-900 p-2 font-mono"
          aria-label="Import snapshot JSON"
        />
        <button
          type="button"
          onClick={handleImport}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
          disabled={!importText.trim()}
        >
          Import snapshot
        </button>
      </div>
      {error && <div className="text-gray-400">{error}</div>}
    </div>
  );
};

const DataTypes: React.FC<DataTypesProps> = ({ onActiveSnapshotChange }) => {
  const [state, setState] = usePersistentState<DataTypesState>(
    'ghidra-data-types',
    initialState,
    isDataTypesState,
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const activeSnapshot = useMemo(
    () => state.snapshots.find((snapshot) => snapshot.id === state.activeId) || null,
    [state.activeId, state.snapshots],
  );

  useEffect(() => {
    if (onActiveSnapshotChange) {
      onActiveSnapshotChange(activeSnapshot);
    }
  }, [activeSnapshot, onActiveSnapshotChange]);

  useEffect(() => {
    if (activeSnapshot && activeSnapshot.definitions.length > 0) {
      if (!selectedTypeId || !activeSnapshot.definitions.some((definition) => definition.id === selectedTypeId)) {
        setSelectedTypeId(activeSnapshot.definitions[0].id);
      }
    } else {
      setSelectedTypeId(null);
    }
  }, [activeSnapshot, selectedTypeId]);

  const updateActiveSnapshot = useCallback(
    (updater: (snapshot: TypeSnapshot) => TypeSnapshot) => {
      setState((prev) => {
        const index = prev.snapshots.findIndex((snapshot) => snapshot.id === prev.activeId);
        if (index === -1) return prev;
        const nextSnapshots = [...prev.snapshots];
        const nextSnapshot = updater(nextSnapshots[index]);
        nextSnapshots[index] = {
          ...nextSnapshot,
          updatedAt: Date.now(),
        };
        return { ...prev, snapshots: nextSnapshots };
      });
    },
    [setState],
  );

  const addType = (kind: DataTypeKind) => {
    const newTypeId = createId();
    const newType: DataTypeDefinition = {
      id: newTypeId,
      name: uniqueName(
        activeSnapshot?.definitions || [],
        kind === 'struct' ? 'struct_type' : 'union_type',
      ),
      kind,
      fields: [],
    };
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      definitions: [...snapshot.definitions, newType],
    }));
    setSelectedTypeId(newTypeId);
  };

  const updateDefinition = (definition: DataTypeDefinition) => {
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      definitions: snapshot.definitions.map((item) => (item.id === definition.id ? definition : item)),
    }));
  };

  const removeDefinition = (id: string) => {
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      definitions: snapshot.definitions.filter((item) => item.id !== id),
      applications: snapshot.applications.filter((application) => application.typeId !== id),
    }));
    setSelectedTypeId((value) => (value === id ? null : value));
  };

  const addField = (definition: DataTypeDefinition) => {
    const newField: DataTypeField = {
      id: createId(),
      name: uniqueName(definition.fields, 'field'),
      type: 'uint32',
      size: 4,
      offset: definition.kind === 'struct' ? definition.fields.reduce((sum, field) => sum + field.size, 0) : undefined,
    };
    updateDefinition({
      ...definition,
      fields: [...definition.fields, newField],
    });
  };

  const addApplication = (typeId: string, address: string, length: number, comment?: string) => {
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      applications: [
        ...snapshot.applications,
        {
          id: createId(),
          typeId,
          address,
          length,
          comment,
        },
      ],
    }));
  };

  const updateApplication = (application: MemoryApplication) => {
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      applications: snapshot.applications.map((entry) =>
        entry.id === application.id ? application : entry,
      ),
    }));
  };

  const removeApplication = (id: string) => {
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      applications: snapshot.applications.filter((entry) => entry.id !== id),
    }));
  };

  const selectSnapshot = (id: string) => {
    setState((prev) => ({
      ...prev,
      activeId: id,
    }));
  };

  const addSnapshot = () => {
    setState((prev) => {
      const newSnapshot: TypeSnapshot = {
        id: createId(),
        name: `Snapshot ${prev.snapshots.length + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        definitions: [],
        applications: [],
      };
      return {
        snapshots: [...prev.snapshots, newSnapshot],
        activeId: newSnapshot.id,
      };
    });
  };

  const duplicateSnapshot = () => {
    if (!activeSnapshot) return;
    setState((prev) => {
      const duplicated: TypeSnapshot = {
        ...activeSnapshot,
        id: createId(),
        name: `${activeSnapshot.name} copy`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        definitions: activeSnapshot.definitions.map((definition) => ({
          ...definition,
          id: createId(),
          fields: definition.fields.map((field) => ({ ...field, id: createId() })),
        })),
        applications: activeSnapshot.applications.map((application) => ({
          ...application,
          id: createId(),
        })),
      };
      return {
        snapshots: [...prev.snapshots, duplicated],
        activeId: duplicated.id,
      };
    });
  };

  const deleteSnapshot = () => {
    if (!activeSnapshot) return;
    setState((prev) => {
      const nextSnapshots = prev.snapshots.filter((snapshot) => snapshot.id !== activeSnapshot.id);
      const nextActiveId = nextSnapshots[0]?.id || null;
      return {
        snapshots: nextSnapshots,
        activeId: nextActiveId,
      };
    });
  };

  const renameSnapshot = (name: string) => {
    setState((prev) => ({
      ...prev,
      snapshots: prev.snapshots.map((snapshot) =>
        snapshot.id === prev.activeId ? { ...snapshot, name, updatedAt: Date.now() } : snapshot,
      ),
    }));
  };

  const handleTemplateApply = (definitions: DataTypeDefinition[]) => {
    if (!activeSnapshot) return;
    const createdDefinitions = definitions.map((definition) => ({
      ...definition,
      id: createId(),
      fields: definition.fields.map((field) => ({ ...field, id: createId() })),
    }));
    updateActiveSnapshot((snapshot) => ({
      ...snapshot,
      definitions: [...snapshot.definitions, ...createdDefinitions],
    }));
    if (createdDefinitions.length > 0) {
      setSelectedTypeId(createdDefinitions[0].id);
    }
  };

  const [newApplicationAddress, setNewApplicationAddress] = useState('0x0000');
  const [newApplicationLength, setNewApplicationLength] = useState('16');
  const [newApplicationComment, setNewApplicationComment] = useState('');

  const handleAddApplication = () => {
    if (!selectedTypeId) return;
    const length = validateLength(newApplicationLength);
    addApplication(selectedTypeId, newApplicationAddress.trim() || '0x0000', length, newApplicationComment.trim() || undefined);
    setNewApplicationComment('');
  };

  const selectedDefinition = activeSnapshot?.definitions.find((definition) => definition.id === selectedTypeId) || null;

  return (
    <div className="space-y-4 text-gray-200">
      <SnapshotToolbar
        state={state}
        activeSnapshot={activeSnapshot}
        onSelect={selectSnapshot}
        onAddSnapshot={addSnapshot}
        onDuplicate={duplicateSnapshot}
        onDelete={deleteSnapshot}
        onRename={renameSnapshot}
      />

      <TemplatePicker onApply={handleTemplateApply} />

      <ExportImportControls
        snapshot={activeSnapshot}
        onImport={(snapshot) =>
          setState((prev) => ({
            snapshots: [...prev.snapshots, snapshot],
            activeId: snapshot.id,
          }))
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <button
              type="button"
              onClick={() => addType('struct')}
              className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
              disabled={!activeSnapshot}
            >
              New struct
            </button>
            <button
              type="button"
              onClick={() => addType('union')}
              className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
              disabled={!activeSnapshot}
            >
              New union
            </button>
          </div>
          <ul className="space-y-1 text-xs md:text-sm">
            {activeSnapshot?.definitions.map((definition) => (
              <li key={definition.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTypeId(definition.id)}
                  className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left ${
                    selectedTypeId === definition.id
                      ? 'border-yellow-500 bg-gray-800'
                      : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  <span>{definition.name}</span>
                  <span className="text-xs uppercase text-gray-400">{definition.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          {selectedDefinition ? (
            <div className="space-y-3 rounded border border-gray-700 bg-gray-900 p-3">
              <div className="flex flex-col gap-2 text-xs md:text-sm">
                <label className="flex flex-col">
                  <span className="mb-1 text-gray-300">Type name</span>
                  <input
                    value={selectedDefinition.name}
                    onChange={(event) =>
                      updateDefinition({ ...selectedDefinition, name: event.target.value })
                    }
                    className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
                    aria-label="Data type name"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="mb-1 text-gray-300">Comment</span>
                  <textarea
                    value={selectedDefinition.comment || ''}
                    onChange={(event) =>
                      updateDefinition({ ...selectedDefinition, comment: event.target.value })
                    }
                    className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
                    aria-label="Data type comment"
                  />
                </label>
                <div className="text-gray-400">
                  {selectedDefinition.fields.length} fields
                </div>
                <div className="space-y-2">
                  {selectedDefinition.fields.map((field) => (
                    <TypeFieldEditor
                      key={field.id}
                      definition={selectedDefinition}
                      field={field}
                      availableTypes={
                        activeSnapshot?.definitions.map((definition) => definition.name) || []
                      }
                      onChange={(updatedField) =>
                        updateDefinition({
                          ...selectedDefinition,
                          fields: selectedDefinition.fields.map((item) =>
                            item.id === updatedField.id ? updatedField : item,
                          ),
                        })
                      }
                      onRemove={(id) =>
                        updateDefinition({
                          ...selectedDefinition,
                          fields: selectedDefinition.fields.filter((item) => item.id !== id),
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addField(selectedDefinition)}
                  className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
                >
                  Add field
                </button>
                <button
                  type="button"
                  onClick={() => removeDefinition(selectedDefinition.id)}
                  className="w-full rounded border border-red-700 bg-red-800 px-2 py-1 hover:bg-red-700"
                >
                  Delete type
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-gray-700 bg-gray-900 p-3 text-gray-400">
              Select a type to edit or create a new struct/union.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded border border-gray-700 bg-gray-900 p-3">
        <h3 className="text-sm font-semibold text-gray-100">Apply type to memory</h3>
        <div className="grid gap-2 md:grid-cols-4 text-xs md:text-sm">
            <label className="flex flex-col">
              <span className="mb-1 text-gray-300">Address</span>
              <input
                value={newApplicationAddress}
                onChange={(event) => setNewApplicationAddress(event.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
                placeholder="0x1000"
                aria-label="Memory address to annotate"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-300">Length</span>
              <input
                value={newApplicationLength}
                onChange={(event) => setNewApplicationLength(event.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
                placeholder="16"
                inputMode="numeric"
                aria-label="Annotation length"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-300">Comment</span>
              <input
                value={newApplicationComment}
                onChange={(event) => setNewApplicationComment(event.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
                placeholder="Why this type fits"
                aria-label="Annotation comment"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-300">Type</span>
              <select
                value={selectedTypeId || ''}
                onChange={(event) => setSelectedTypeId(event.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-2 py-1"
                aria-label="Type to apply"
              >
              <option value="" disabled>
                Select type…
              </option>
              {activeSnapshot?.definitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleAddApplication}
          className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600"
          disabled={!selectedTypeId}
        >
          Apply type
        </button>
        <div className="space-y-2">
          {activeSnapshot?.applications.length ? (
            activeSnapshot.applications.map((application) => (
              <ApplicationRow
                key={application.id}
                entry={application}
                typeName={
                  activeSnapshot.definitions.find((definition) => definition.id === application.typeId)?.name ||
                  'Unknown'
                }
                onChange={updateApplication}
                onRemove={removeApplication}
              />
            ))
          ) : (
            <div className="text-gray-400">No memory ranges annotated yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTypes;
