import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { toPng, toSvg } from 'html-to-image';

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

const templates: Record<string, string> = {
  dfd: `\`\`\`mermaid\ngraph TD\nA[User] -->|Request| B[Web App]\nB -->|Query| C[(Database)]\nC -->|Response| B\nB -->|Reply| A\n\`\`\``,
  attack: `\`\`\`mermaid\ngraph TD\nA[Goal] --> B[Step 1]\nA --> C[Step 2]\nB --> D[Substep]\n\`\`\``,
};

const extractMermaid = (text: string): string => {
  const match = text.match(/```mermaid\s*([\s\S]*?)```/i);
  return match ? match[1] : text;
};

const ThreatModeler: React.FC = () => {
  const [input, setInput] = useState<string>(templates.dfd);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const code = extractMermaid(input);
    const id = `mermaid-${Date.now()}`;
    try {
      mermaid
        .render(id, code)
        .then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = `<pre class="text-red-400">${err}</pre>`;
          }
        });
    } catch (err) {
      if (diagramRef.current) {
        diagramRef.current.innerHTML = `<pre class="text-red-400">${err}</pre>`;
      }
    }
  }, [input]);

  const download = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const exportSvg = async () => {
    if (diagramRef.current) {
      const dataUrl = await toSvg(diagramRef.current);
      download(dataUrl, 'diagram.svg');
    }
  };

  const exportPng = async () => {
    if (diagramRef.current) {
      const dataUrl = await toPng(diagramRef.current);
      download(dataUrl, 'diagram.png');
    }
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-ub-cool-grey text-white p-2 space-y-2 md:space-y-0 md:space-x-2">
      <div className="flex-1 flex flex-col">
        <div className="flex space-x-2 mb-2">
          <select
            className="bg-gray-700 p-1 rounded"
            onChange={(e) => setInput(templates[e.target.value as keyof typeof templates])}
            defaultValue="dfd"
          >
            <option value="dfd">DFD Template</option>
            <option value="attack">Attack Tree Template</option>
          </select>
          <button className="bg-gray-700 hover:bg-gray-600 px-2 rounded" onClick={exportPng}>
            Export PNG
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 px-2 rounded" onClick={exportSvg}>
            Export SVG
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-800 text-sm p-2 rounded resize-none"
        />
        <div className="text-xs mt-2">
          <p className="font-bold">Editing Tips:</p>
          <ul className="list-disc ml-4">
            <li>Wrap Mermaid code with <code>```mermaid</code> fences.</li>
            <li>Use <code>graph TD</code> for flow-based DFDs.</li>
            <li>Use nodes and edges to represent attack paths.</li>
          </ul>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-white rounded" ref={diagramRef} />
    </div>
  );
};

export default ThreatModeler;

