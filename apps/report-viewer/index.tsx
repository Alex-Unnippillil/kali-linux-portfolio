import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FixedSizeList as List } from 'react-window';
import Papa from 'papaparse';

type FileType = 'markdown' | 'json' | 'csv' | 'pdf' | 'text' | '';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ReportViewer: React.FC = () => {
  const [fileType, setFileType] = useState<FileType>('');
  const [markdown, setMarkdown] = useState('');
  const [jsonLines, setJsonLines] = useState<string[]>([]);
  const [jsonKeyMap, setJsonKeyMap] = useState<Record<string, number>>({});
  const listRef = useRef<List>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [search, setSearch] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const sniff = (file: File, text: string): FileType => {
    const name = file.name.toLowerCase();
    const type = file.type;
    if (type.includes('markdown') || name.endsWith('.md') || name.endsWith('.markdown'))
      return 'markdown';
    if (type.includes('json') || name.endsWith('.json')) return 'json';
    if (type.includes('csv') || name.endsWith('.csv')) return 'csv';
    if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    const trimmed = text.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.split('\n')[0].includes(',')) return 'csv';
    return 'text';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawText(text);
      const kind = sniff(file, text);
      setFileType(kind);
      setSearch('');
      if (kind === 'markdown') {
        setMarkdown(text);
      } else if (kind === 'json') {
        try {
          const obj = JSON.parse(text);
          const lines = JSON.stringify(obj, null, 2).split('\n');
          const map: Record<string, number> = {};
          lines.forEach((line, idx) => {
            const m = line.match(/^\s{2}\"([^\"]+)\":/);
            if (m && !(m[1] in map)) map[m[1]] = idx;
          });
          setJsonKeyMap(map);
          setJsonLines(lines);
        } catch {
          setJsonLines(text.split('\n'));
          setJsonKeyMap({});
        }
      } else if (kind === 'csv') {
        const parsed = Papa.parse(text.trim());
        setCsvData(parsed.data as string[][]);
      } else if (kind === 'pdf') {
        const urlReader = new FileReader();
        urlReader.onload = () => {
          const dataUrl = urlReader.result as string;
          setPdfUrl(dataUrl);
        };
        urlReader.readAsDataURL(file);
      }
    };
    reader.readAsText(file);
  };

  const headings = useMemo(() => {
    const result: { id: string; text: string; level: number }[] = [];
    const regex = /^(#{1,6})\s+(.*)$/gm;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(markdown))) {
      const level = m[1].length;
      const text = m[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      result.push({ id, text, level });
    }
    return result;
  }, [markdown]);

  const highlight = (text: string) => {
    if (!search) return text;
    const regex = new RegExp(`(${escapeRegExp(search)})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    if (fileType !== 'markdown') return;
    const el = contentRef.current;
    if (!el) return;
    // Remove old marks
    el.querySelectorAll('mark').forEach((m) => {
      const textNode = document.createTextNode(m.textContent || '');
      m.replaceWith(textNode);
    });
    if (!search) return;
    const regex = new RegExp(escapeRegExp(search), 'gi');
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
      const { data } = node;
      if (!regex.test(data)) return;
      const span = document.createElement('span');
      span.innerHTML = data.replace(regex, '<mark>$&</mark>');
      node.parentNode?.replaceChild(span, node);
    });
  }, [search, markdown, fileType]);

  const filteredCsv = useMemo(() => {
    if (!search) return csvData;
    const q = search.toLowerCase();
    return csvData.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
  }, [csvData, search]);

  const Outline = () => {
    if (fileType === 'markdown' && headings.length > 0) {
      return (
        <div className="w-48 overflow-auto pr-2 text-sm">
          {headings.map((h) => (
            <div key={h.id} style={{ paddingLeft: (h.level - 1) * 8 }}>
              <a href={`#${h.id}`}>{h.text}</a>
            </div>
          ))}
        </div>
      );
    }
    if (fileType === 'json' && Object.keys(jsonKeyMap).length > 0) {
      return (
        <div className="w-48 overflow-auto pr-2 text-sm">
          {Object.keys(jsonKeyMap).map((k) => (
            <div key={k}>
              <button
                className="text-left w-full hover:underline"
                onClick={() => listRef.current?.scrollToItem(jsonKeyMap[k])}
              >
                {k}
              </button>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const jsonRenderer = () => (
    <List
      height={400}
      itemCount={jsonLines.length}
      itemSize={20}
      width="100%"
      ref={listRef}
    >
      {({ index, style }) => (
        <div style={style} className="font-mono text-sm">
          {highlight(jsonLines[index])}
        </div>
      )}
    </List>
  );

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <div className="mb-4 flex flex-wrap items-center space-x-2">
        <input type="file" onChange={handleFileUpload} className="text-black" />
        {fileType && fileType !== 'pdf' && (
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-black p-1"
          />
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Outline />
        <div className="flex-1 overflow-auto" ref={contentRef}>
          {fileType === 'markdown' && (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => {
                    const text = String(props.children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h1 id={id} {...props} />;
                  },
                  h2: ({ node, ...props }) => {
                    const text = String(props.children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h2 id={id} {...props} />;
                  },
                  h3: ({ node, ...props }) => {
                    const text = String(props.children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h3 id={id} {...props} />;
                  },
                  h4: ({ node, ...props }) => {
                    const text = String(props.children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h4 id={id} {...props} />;
                  },
                  h5: ({ node, ...props }) => {
                    const text = String(props.children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h5 id={id} {...props} />;
                  },
                  h6: ({ node, ...props }) => {
                    const text = String(props.children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return <h6 id={id} {...props} />;
                  },
                  p: ({ node, ...props }) => <p {...props}>{highlight(String(props.children))}</p>,
                  li: ({ node, ...props }) => <li {...props}>{highlight(String(props.children))}</li>,
                  span: ({ node, ...props }) => <span {...props}>{highlight(String(props.children))}</span>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          )}
          {fileType === 'json' && jsonRenderer()}
          {fileType === 'csv' && (
            <table className="w-full text-left border-collapse text-sm">
              <tbody>
                {filteredCsv.map((row, i) => (
                  <tr key={i} className="odd:bg-gray-800">
                    {row.map((cell, j) => (
                      <td key={j} className="p-1 border-b">
                        {highlight(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {fileType === 'pdf' && pdfUrl && (
            <iframe
              title="pdf"
              src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
                pdfUrl
              )}`}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-downloads"
            />
          )}
          {fileType === 'text' && (
            <pre className="whitespace-pre-wrap font-mono text-sm">{highlight(rawText)}</pre>
          )}
          {!fileType && (
            <div className="text-center mt-20">Upload a file to view its contents</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;

