"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import Ajv2020 from "ajv/dist/2020";
import type { AnySchema, ErrorObject } from "ajv";

type FormattedError = {
  pointer: string;
  message: string;
  keyword: string;
};

const EXAMPLE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  title: "Person",
  description: "A simple example schema for demonstration",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "integer", minimum: 0 },
    address: {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
        postalCode: { type: "string", pattern: "^[0-9A-Z-]+$" },
      },
      required: ["street", "city"],
      additionalProperties: false,
    },
  },
  required: ["name", "age"],
  additionalProperties: false,
};

const EXAMPLE_DATA = {
  name: "Alex",
  age: 32,
  address: {
    street: "Infinite Loop",
    city: "Cupertino",
    postalCode: "95014",
  },
};

const formatErrorPointer = (error: ErrorObject): string => {
  const params = error.params as Record<string, unknown>;

  if (error.keyword === "required" && typeof params.missingProperty === "string") {
    const base = error.instancePath || "";
    const suffix = params.missingProperty;
    return `${base}/${suffix}` || `/${suffix}`;
  }

  if (
    (error.keyword === "additionalProperties" || error.keyword === "unevaluatedProperties") &&
    typeof params.additionalProperty === "string"
  ) {
    const base = error.instancePath || "";
    const suffix = params.additionalProperty;
    return `${base}/${suffix}` || `/${suffix}`;
  }

  return error.instancePath || "/";
};

export default function SchemaValidator() {
  const [schemaText, setSchemaText] = useState(
    () => JSON.stringify(EXAMPLE_SCHEMA, null, 2),
  );
  const [dataText, setDataText] = useState(() => JSON.stringify(EXAMPLE_DATA, null, 2));
  const [schemaParseError, setSchemaParseError] = useState<string | null>(null);
  const [dataParseError, setDataParseError] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<FormattedError[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const schemaHelpId = useId();
  const dataHelpId = useId();
  const resultsHeadingId = useId();

  const ajv = useMemo(
    () =>
      new Ajv2020({
        allErrors: true,
        strict: false,
        allowUnionTypes: true,
      }),
    [],
  );

  const runValidation = useCallback(() => {
    setSchemaParseError(null);
    setDataParseError(null);
    setCompileError(null);
    setValidationErrors([]);
    setIsValid(null);

    let schema: unknown;
    try {
      schema = JSON.parse(schemaText);
    } catch (err) {
      setSchemaParseError(err instanceof Error ? err.message : "Unable to parse schema");
      return;
    }

    let sample: unknown;
    try {
      sample = JSON.parse(dataText);
    } catch (err) {
      setDataParseError(err instanceof Error ? err.message : "Unable to parse sample data");
      return;
    }

    let validate;
    try {
      validate = ajv.compile(schema as AnySchema);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Schema compilation failed";
      setCompileError(message);
      return;
    }

    const valid = validate(sample);
    setIsValid(Boolean(valid));

    if (!valid && validate.errors) {
      const errors = validate.errors.map((error) => ({
        pointer: formatErrorPointer(error),
        message: error.message ?? "Invalid value", 
        keyword: error.keyword,
      }));
      setValidationErrors(errors);
    }
  }, [ajv, dataText, schemaText]);

  const handleSchemaChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setSchemaText(event.target.value);
  }, []);

  const handleDataChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDataText(event.target.value);
  }, []);

  const resetToExample = useCallback(() => {
    setSchemaText(JSON.stringify(EXAMPLE_SCHEMA, null, 2));
    setDataText(JSON.stringify(EXAMPLE_DATA, null, 2));
    setSchemaParseError(null);
    setDataParseError(null);
    setCompileError(null);
    setValidationErrors([]);
    setIsValid(null);
  }, []);

  const handleTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runValidation();
      }
    },
    [runValidation],
  );

  return (
    <section className="space-y-4" aria-labelledby={resultsHeadingId}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm" htmlFor="schema-input">
          <span className="text-base font-semibold">JSON Schema</span>
          <textarea
            id="schema-input"
            className="h-64 rounded bg-black/60 p-3 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={schemaText}
            onChange={handleSchemaChange}
            onKeyDown={handleTextareaKeyDown}
            aria-describedby={schemaHelpId}
            aria-label="JSON schema input"
            spellCheck={false}
            autoComplete="off"
          />
          <span id={schemaHelpId} className="text-xs text-gray-300">
            Paste any JSON Schema draft 2020-12 document. Press Ctrl+Enter or Cmd+Enter to validate.
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm" htmlFor="data-input">
          <span className="text-base font-semibold">Sample Data</span>
          <textarea
            id="data-input"
            className="h-64 rounded bg-black/60 p-3 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={dataText}
            onChange={handleDataChange}
            onKeyDown={handleTextareaKeyDown}
            aria-describedby={dataHelpId}
            aria-label="Sample data input"
            spellCheck={false}
            autoComplete="off"
          />
          <span id={dataHelpId} className="text-xs text-gray-300">
            Provide JSON that should match the schema. Validation runs with the button or keyboard shortcut.
          </span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runValidation}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
          aria-keyshortcuts="Control+Enter Meta+Enter"
        >
          Validate
        </button>
        <button
          type="button"
          onClick={resetToExample}
          className="rounded bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
        >
          Reset to example
        </button>
      </div>
      <section
        className="space-y-3"
        aria-live="polite"
        aria-busy={isValid === null && !schemaParseError && !dataParseError && !compileError && validationErrors.length === 0}
      >
        <h2 id={resultsHeadingId} className="text-lg font-semibold">
          Validation results
        </h2>
        {schemaParseError && (
          <div
            role="alert"
            className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-200"
          >
            <span className="font-semibold">Schema parse error:</span> {schemaParseError}
          </div>
        )}
        {dataParseError && (
          <div
            role="alert"
            className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-200"
          >
            <span className="font-semibold">Sample parse error:</span> {dataParseError}
          </div>
        )}
        {compileError && (
          <div
            role="alert"
            className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-200"
          >
            <span className="font-semibold">Schema error:</span> {compileError}
          </div>
        )}
        {isValid && !validationErrors.length && !schemaParseError && !dataParseError && !compileError ? (
          <div
            role="status"
            className="rounded border border-green-500 bg-green-900/40 p-3 text-sm text-green-100"
          >
            The sample data satisfies the provided schema.
          </div>
        ) : null}
        {isValid === false && validationErrors.length > 0 && (
          <div
            role="group"
            aria-labelledby={`${resultsHeadingId}-errors`}
            className="space-y-2 rounded border border-yellow-500 bg-yellow-900/40 p-3 text-sm text-yellow-100"
          >
            <div id={`${resultsHeadingId}-errors`} className="font-semibold">
              Validation errors
            </div>
            <ul className="space-y-1" aria-label="Validation errors">
              {validationErrors.map((error, index) => (
                <li key={`${error.pointer}-${error.keyword}-${index}`} className="flex flex-col gap-1">
                  <code className="inline-block rounded bg-black/50 px-2 py-1 text-xs text-yellow-200">
                    {error.pointer}
                  </code>
                  <span>
                    <span className="font-semibold capitalize">{error.keyword}:</span> {error.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </section>
  );
}
