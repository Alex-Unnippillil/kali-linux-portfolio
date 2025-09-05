"use client";

import { useState } from "react";
import Modal from "../../components/base/Modal";

const DEFAULT_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

export default function Dictionary() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_DICTIONARY_API_URL || DEFAULT_API;

  const search = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(
        `${apiUrl}/${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      const definitions: string[] = [];
      if (Array.isArray(json)) {
        json.forEach((entry: any) => {
          entry.meanings?.forEach((m: any) => {
            m.definitions?.forEach((d: any) => {
              if (d.definition) definitions.push(d.definition);
            });
          });
        });
      }
      setResults(definitions.length ? definitions : ["No results"]);
    } catch {
      setError("No results found");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Dictionary"
        onClick={() => setOpen(true)}
        className="fixed top-2 right-12 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        📖
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white text-black p-4 rounded w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg mb-2">Dictionary</h2>
            <form onSubmit={onSubmit} className="flex mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-grow border border-gray-300 px-2 py-1 mr-2"
                placeholder="Enter word"
                aria-label="Word"
              />
              <button
                type="submit"
                className="bg-ub-orange px-2 py-1 rounded text-white"
              >
                Search
              </button>
            </form>
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            {!loading && !error && results.length > 0 && (
              <ul className="list-disc pl-5 max-h-64 overflow-auto">
                {results.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

