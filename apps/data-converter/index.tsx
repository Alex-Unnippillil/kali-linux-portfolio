"use client";

import SchemaValidator from "./components/SchemaValidator";

export default function DataConverterApp() {
  return (
    <div className="h-full overflow-hidden bg-ub-cool-grey text-white">
      <main className="flex h-full flex-col gap-4 overflow-auto p-4" aria-label="Data converter">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Data Converter</h1>
          <p className="text-sm text-gray-200">
            Validate example payloads against pasted JSON Schemas. Use the keyboard shortcut Ctrl+Enter
            (or Cmd+Enter on macOS) to run validation without leaving the textarea.
          </p>
        </header>
        <SchemaValidator />
      </main>
    </div>
  );
}
