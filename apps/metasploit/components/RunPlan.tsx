'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface ModuleOptionDefinition {
  desc: string;
  default?: string | number | boolean;
  required?: boolean;
}

export interface RunPlanModule {
  name: string;
  description: string;
  type: string;
  severity?: string;
  tags?: string[];
  options?: Record<string, ModuleOptionDefinition>;
  [key: string]: unknown;
}

export interface PlanStepState {
  id: string;
  moduleName: string;
  options: Record<string, string>;
}

export interface SerializedStep {
  module: string;
  options: Record<string, string>;
}

type ValidationErrorType = 'module' | 'option' | 'dependency';

export interface ValidationError {
  stepIndex: number;
  type: ValidationErrorType;
  message: string;
  details?: string[];
}

interface ModuleCapability {
  requires?: string[];
  produces?: string[];
}

const moduleCapabilities: Record<string, ModuleCapability> = {
  'auxiliary/admin/2wire/xslt_password_reset': {
    produces: ['router_admin_access', 'admin_credentials'],
  },
  'auxiliary/admin/appletv/appletv_display_image': {
    requires: ['router_admin_access'],
  },
  'auxiliary/admin/appletv/appletv_display_video': {
    requires: ['router_admin_access'],
    produces: ['visual_distraction'],
  },
  'auxiliary/admin/backupexec/dump': {
    requires: ['admin_credentials'],
    produces: ['backup_archive'],
  },
};

export const serializePlan = (steps: PlanStepState[]): SerializedStep[] =>
  steps
    .filter((step) => step.moduleName)
    .map((step) => ({
      module: step.moduleName,
      options: Object.fromEntries(
        Object.entries(step.options).filter(([, value]) =>
          String(value ?? '')
            .trim()
            .length,
        ),
      ),
    }));

export const validatePlan = (
  steps: PlanStepState[],
  modules: RunPlanModule[],
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const produced = new Set<string>();
  const moduleIndex = new Map(modules.map((mod) => [mod.name, mod]));

  steps.forEach((step, index) => {
    if (!step.moduleName) {
      errors.push({
        stepIndex: index,
        type: 'module',
        message: 'Select a module to configure this step.',
      });
      return;
    }

    const moduleDef = moduleIndex.get(step.moduleName);
    if (!moduleDef) {
      errors.push({
        stepIndex: index,
        type: 'module',
        message: 'Module metadata missing for validation.',
      });
      return;
    }

    const capability = moduleCapabilities[step.moduleName];
    if (capability?.requires?.length) {
      const missing = capability.requires.filter((artifact) => !produced.has(artifact));
      if (missing.length) {
        errors.push({
          stepIndex: index,
          type: 'dependency',
          message: 'Missing required artifacts from earlier steps.',
          details: missing,
        });
      }
    }

    const moduleOptions = moduleDef.options ?? {};
    Object.entries(moduleOptions).forEach(([key, option]) => {
      if (!option.required) return;
      const value = step.options[key];
      if (!String(value ?? '').trim().length) {
        errors.push({
          stepIndex: index,
          type: 'option',
          message: `Option "${key}" is required.`,
        });
      }
    });

    capability?.produces?.forEach((artifact) => produced.add(artifact));
  });

  return errors;
};

interface RunPlanProps {
  modules: RunPlanModule[];
  onRun?: (plan: SerializedStep[]) => void;
}

const buildOptionDefaults = (
  moduleName: string,
  modules: RunPlanModule[],
): Record<string, string> => {
  const moduleMeta = modules.find((mod) => mod.name === moduleName);
  if (!moduleMeta?.options) return {};

  return Object.fromEntries(
    Object.entries(moduleMeta.options).map(([key, option]) => [
      key,
      option.default === undefined || option.default === null
        ? ''
        : String(option.default),
    ]),
  );
};

const RunPlan: React.FC<RunPlanProps> = ({ modules, onRun }) => {
  const [steps, setSteps] = useState<PlanStepState[]>([
    { id: 'step-0', moduleName: '', options: {} },
  ]);
  const [counter, setCounter] = useState(1);
  const [serializedPlan, setSerializedPlan] = useState('');

  useEffect(() => {
    setSerializedPlan('');
  }, [steps]);

  const validationErrors = useMemo(
    () => validatePlan(steps, modules),
    [steps, modules],
  );

  const canRun =
    steps.length > 0 &&
    validationErrors.length === 0 &&
    steps.every((step) => step.moduleName);

  const modulesSorted = useMemo(
    () =>
      [...modules].sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type.localeCompare(b.type);
      }),
    [modules],
  );

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: `step-${counter}`, moduleName: '', options: {} },
    ]);
    setCounter((value) => value + 1);
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => {
      const updated = prev.filter((step) => step.id !== id);
      if (updated.length === 0) {
        return [{ id: 'step-0', moduleName: '', options: {} }];
      }
      return updated;
    });
  };

  const handleModuleChange = (id: string, moduleName: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              moduleName,
              options: buildOptionDefaults(moduleName, modules),
            }
          : step,
      ),
    );
  };

  const handleOptionChange = (
    id: string,
    key: string,
    value: string,
  ) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              options: {
                ...step.options,
                [key]: value,
              },
            }
          : step,
      ),
    );
  };

  const handleRun = () => {
    const plan = serializePlan(steps);
    setSerializedPlan(JSON.stringify(plan, null, 2));
    onRun?.(plan);
  };

  const getErrorsForStep = (index: number) =>
    validationErrors.filter((error) => error.stepIndex === index);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Module Run Planner</h3>
        <button
          type="button"
          onClick={handleAddStep}
          className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          + Add Step
        </button>
      </div>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const selectedModule = modules.find((mod) => mod.name === step.moduleName);
          const stepErrors = getErrorsForStep(index);

          return (
            <div
              key={step.id}
              className="border rounded bg-white shadow-sm p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Step {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(step.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Module
                  <select
                    className="mt-1 block w-full border rounded p-2 text-sm"
                    value={step.moduleName}
                    onChange={(event) => handleModuleChange(step.id, event.target.value)}
                  >
                    <option value="">Select a module</option>
                    {modulesSorted.map((mod) => (
                      <option key={mod.name} value={mod.name}>
                        [{mod.type}] {mod.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedModule && (
                  <p className="mt-1 text-xs text-gray-600">
                    {selectedModule.description}
                  </p>
                )}
              </div>
              {selectedModule?.options && (
                <div className="space-y-2">
                  {Object.entries(selectedModule.options).map(([key, option]) => {
                    const fieldId = `${step.id}-${key}`;
                    return (
                      <div key={key} className="space-y-1">
                        <label
                          htmlFor={fieldId}
                          className="block text-sm font-medium text-gray-700"
                        >
                          {key}
                          {option.required && (
                            <span className="ml-1 text-red-600">*</span>
                          )}
                        </label>
                        <input
                          id={fieldId}
                          type="text"
                          className="block w-full border rounded p-2 text-sm"
                          aria-label={key}
                          value={step.options[key] ?? ''}
                          onChange={(event) =>
                            handleOptionChange(step.id, key, event.target.value)
                          }
                          aria-describedby={option.desc ? `${fieldId}-help` : undefined}
                        />
                        {option.desc && (
                          <span
                            id={`${fieldId}-help`}
                            className="text-xs text-gray-500"
                          >
                            {option.desc}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {stepErrors.length > 0 && (
                <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                  {stepErrors.map((error, errorIndex) => (
                    <li key={`${step.id}-error-${errorIndex}`}>
                      {error.message}
                      {error.details?.length ? (
                        <span className="ml-1 text-gray-700">
                          Missing: {error.details.join(', ')}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleRun}
        disabled={!canRun}
        className={`px-3 py-1 text-sm font-medium rounded ${
          canRun
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Run Plan
      </button>
      {serializedPlan && (
        <div className="pt-2 border-t">
          <h4 className="font-semibold text-sm mb-1">Serialized plan</h4>
          <pre className="bg-black text-green-300 text-xs p-2 rounded overflow-auto max-h-48">
            {serializedPlan}
          </pre>
        </div>
      )}
    </div>
  );
};

export default RunPlan;
