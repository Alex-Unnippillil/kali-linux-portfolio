import React, { useEffect, useRef, useState } from "react";

const highlightLine = (line) => {
  if (/vulnerability/i.test(line)) return "bg-red-700 text-white";
  if (/not defined/i.test(line)) return "bg-yellow-700 text-white";
  return "";
};

const NiktoApp = () => {
  const [target, setTarget] = useState("example.com");
  const [status, setStatus] = useState("");
  const [results, setResults] = useState({});
  const [tuning, setTuning] = useState("");
  const [report, setReport] = useState("");
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./nikto.worker.js", import.meta.url),
    );
    workerRef.current.onmessage = (e) => {
      const { clusters, error } = e.data || {};
      if (error) {
        setStatus(error);
        setResults({});
      } else if (clusters) {
        setResults(clusters);
        setStatus("Scan complete");
      }
    };
    workerRef.current.onerror = () => {
      setStatus("Worker error");
    };
    return () => workerRef.current?.terminate();
  }, []);

  const runDemo = async () => {
    setStatus("Running scan...");
    setResults({});
    setReport("");
    try {
      const res = await fetch("/demo/nikto-output.txt");
      const text = await res.text();
      setStatus("Parsing results...");
      setReport(text);
      workerRef.current?.postMessage({ text });
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const command = `nikto -h ${target}${tuning ? ` -Tuning ${tuning}` : ""}`;

  return (
    <div className="h-full w-full flex flex-col md:flex-row text-white">
      <div className="md:w-1/2 p-4 bg-ub-dark overflow-y-auto">
        <h1 className="text-lg mb-4">Nikto Demo</h1>
        <div className="bg-yellow-900 text-yellow-100 p-2 rounded mb-4 text-sm">
          Nikto scans for known web vulnerabilities. Running it against systems
          without permission may be illegal and can disrupt services. Tuning
          flags limit tests but misconfiguration might still trigger security
          defenses.
        </div>
        <label htmlFor="target" className="block text-sm mb-1">
          Target
        </label>
        <input
          id="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full p-2 mb-4 text-black"
        />
        <label htmlFor="tuning" className="block text-sm mb-1">
          Tuning Flags
        </label>
        <input
          id="tuning"
          value={tuning}
          onChange={(e) => setTuning(e.target.value)}
          className="w-full p-2 mb-4 text-black"
          placeholder="e.g. 1,2,3"
        />
        <pre className="bg-black text-green-400 p-2 rounded mb-4 overflow-auto">
          {command}
        </pre>
        <button
          type="button"
          onClick={runDemo}
          className="px-4 py-2 bg-ubt-blue rounded focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        >
          Run Demo
        </button>
        {status && <p className="mt-4 text-sm">{status}</p>}
        <div aria-live="polite" className="sr-only">
          {status}
        </div>
        <p className="mt-4 text-sm">
          <a
            href="https://cirt.net/Nikto2"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-ubt-blue"
          >
            Official documentation
          </a>
        </p>
      </div>
      <div className="md:w-1/2 p-4 bg-black overflow-y-auto">
        <h2 className="text-lg mb-4">Demo results</h2>
        {Object.keys(results).length === 0 ? (
          <p>No results</p>
        ) : (
          <div className="grid gap-4">
            {Object.entries(results).map(([cat, { proofs }]) => (
              <div key={cat} className="bg-ub-cool-grey p-4 rounded shadow">
                <h3 className="font-bold mb-2">{cat}</h3>
                <ul className="list-disc pl-4 text-sm">
                  {proofs.map((p, i) => (
                    <li key={i} className="mb-1">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {report && (
          <div className="mt-4">
            <h3 className="text-lg mb-2">Example Report</h3>
            <pre className="bg-black text-green-400 p-2 rounded overflow-auto">
              {report.split("\n").map((line, i) => (
                <span key={i} className={`block ${highlightLine(line)}`}>
                  {line}
                </span>
              ))}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default NiktoApp;
export const displayNikto = () => <NiktoApp />;
