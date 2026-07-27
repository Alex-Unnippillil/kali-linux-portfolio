'use client';

import React from 'react';

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'startsWith'
  | 'endsWith';

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface FilterBuilderState {
  mode: 'all' | 'any';
  conditions: FilterCondition[];
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'notContains', label: 'does not contain' },
  { value: 'equals', label: 'equals' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
];

export const createConditionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const createCondition = (column: string): FilterCondition => ({
  id: createConditionId(),
  column,
  operator: 'contains',
  value: '',
});

interface FilterBuilderProps {
  value: FilterBuilderState;
  onChange: (value: FilterBuilderState) => void;
  columns: string[];
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  value,
  onChange,
  columns,
}) => {
  const updateCondition = (
    id: string,
    patch: Partial<Omit<FilterCondition, 'id'>>
  ) => {
    onChange({
      ...value,
      conditions: value.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition
      ),
    });
  };

  const removeCondition = (id: string) => {
    onChange({
      ...value,
      conditions: value.conditions.filter((condition) => condition.id !== id),
    });
  };

  const addCondition = () => {
    const fallbackColumn = columns[0] ?? 'Source';
    onChange({
      ...value,
      conditions: [...value.conditions, createCondition(fallbackColumn)],
    });
  };

  const setMode = (mode: 'all' | 'any') => {
    if (mode === value.mode) return;
    onChange({ ...value, mode });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold">Advanced filter</span>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="filter-builder-mode"
            value="all"
            checked={value.mode === 'all'}
            onChange={() => setMode('all')}
            aria-label="Match all conditions"
          />
          Match all
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="filter-builder-mode"
            value="any"
            checked={value.mode === 'any'}
            onChange={() => setMode('any')}
            aria-label="Match any condition"
          />
          Match any
        </label>
        <button
          type="button"
          onClick={addCondition}
          className="ml-auto px-2 py-1 bg-gray-800 rounded text-xs"
        >
          Add condition
        </button>
      </div>
      {value.conditions.length === 0 ? (
        <p className="text-xs text-gray-400">
          Combine column rules to refine the packet list.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.conditions.map((condition, index) => (
            <li
              key={condition.id}
              className="flex flex-wrap items-center gap-2 text-xs bg-gray-800 rounded p-2"
            >
              <span className="text-gray-400">#{index + 1}</span>
              <label className="flex items-center gap-1">
                <span className="sr-only">Column for condition {index + 1}</span>
                <select
                  aria-label={`Column for condition ${index + 1}`}
                  value={condition.column}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      column: e.target.value,
                    })
                  }
                  className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                >
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span className="sr-only">Operator for condition {index + 1}</span>
                <select
                  aria-label={`Operator for condition ${index + 1}`}
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      operator: e.target.value as FilterOperator,
                    })
                  }
                  className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                >
                  {OPERATORS.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 min-w-[140px]">
                <span className="sr-only">Value for condition {index + 1}</span>
                <input
                  aria-label={`Value for condition ${index + 1}`}
                  type="text"
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(condition.id, { value: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  placeholder="Match text"
                />
              </label>
              <button
                type="button"
                onClick={() => removeCondition(condition.id)}
                aria-label={`Remove condition ${index + 1}`}
                className="px-2 py-1 bg-gray-700 rounded"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FilterBuilder;
