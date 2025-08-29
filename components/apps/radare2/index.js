import React, { useEffect, useRef, useState } from 'react';
import HexEditor from './HexEditor';
import { loadBookmarks, saveBookmarks } from './utils';
import GraphView from '../../../apps/radare2/components/GraphView';
import GuideOverlay from './GuideOverlay';
import { useTheme } from '../../../hooks/useTheme';
import useOPFS from '../../../hooks/useOPFS';
import './theme.css';

const Radare2 = ({ initialData = {} }) => {
  const { file = 'demo', hex = '', disasm = [], xrefs = {}, blocks = [] } =
    initialData;
  const [mode, setMode] = useState('code');
  const [seekAddr, setSeekAddr] = useState('');
  const [findTerm, setFindTerm] = useState('');
  const [currentAddr, setCurrentAddr] = useState(null);
  const [meta, setMeta] = useOPFS(`r2-${file}-meta.json`, {
    symbols: {},
    comments: {},
  });
  const symbols = meta.symbols || {};
  const comments = meta.comments || {};
  const [commentText, setCommentText] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const disasmRef = useRef(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBookmarks(loadBookmarks(file));
    }
  }, [file]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem('r2HelpDismissed')) {
        setShowGuide(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const scrollToAddr = (addr) => {
    const idx = disasm.findIndex(
      (l) => l.addr.toLowerCase() === addr.toLowerCase()
    );
    if (idx >= 0) {
      setCurrentAddr(disasm[idx].addr);
      const el = document.getElementById(`asm-${idx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSeek = () => {
    if (seekAddr) scrollToAddr(seekAddr);
  };

  const handleFind = () => {
    if (!findTerm) return;
    const idx = disasm.findIndex(
      (l) =>
        l.text.toLowerCase().includes(findTerm.toLowerCase()) ||
        l.addr.toLowerCase() === findTerm.toLowerCase()
    );
    if (idx >= 0) {
      setCurrentAddr(disasm[idx].addr);
      const el = document.getElementById(`asm-${idx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (currentAddr) setCommentText(comments[currentAddr] || '');
  }, [currentAddr, comments]);

  const handleSaveComment = () => {
    if (!currentAddr) return;
    const trimmed = commentText.trim();
    const next = {
      ...meta,
      comments: { ...comments, [currentAddr]: trimmed },
    };
    setMeta(next);
  };

  const handleRename = (addr) => {
    const name = prompt('New symbol name', symbols[addr] || '');
    if (name) {
      setMeta({
      ...meta,
      symbols: { ...symbols, [addr]: name },
      });
    }
  };

  const toggleBookmark = (addr) => {
    const next = bookmarks.includes(addr)
      ? bookmarks.filter((a) => a !== addr)
      : [...bookmarks, addr];
    setBookmarks(next);
    saveBookmarks(file, next);
  };

  return (
    <div
      className={`h-full w-full p-4 overflow-auto ${
        theme === 'dark' ? 'r2-dark' : 'r2-light'
      }`}
      style={{ backgroundColor: 'var(--r2-bg)', color: 'var(--r2-text)' }}
    >
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <div className="flex gap-2 mb-2 flex-wrap">
        <input
          value={seekAddr}
          onChange={(e) => setSeekAddr(e.target.value)}
          placeholder="seek 0x..."
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            color: 'var(--r2-text)',
            border: '1px solid var(--r2-border)',
          }}
        />
        <button
          onClick={handleSeek}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Seek
        </button>
        <input
          value={findTerm}
          onChange={(e) => setFindTerm(e.target.value)}
          placeholder="find"
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            color: 'var(--r2-text)',
            border: '1px solid var(--r2-border)',
          }}
        />
        <button
          onClick={handleFind}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Find
        </button>
        <button
          onClick={() => setMode((m) => (m === 'code' ? 'graph' : 'code'))}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          {mode === 'code' ? 'Graph' : 'Code'}
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          Help
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--r2-surface)',
            border: '1px solid var(--r2-border)',
          }}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {mode === 'graph' ? (
        <GraphView blocks={blocks} theme={theme} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <HexEditor hex={hex} theme={theme} />
          <div
            ref={disasmRef}
            className="overflow-auto rounded p-2 max-h-64"
            style={{
              backgroundColor: 'var(--r2-surface)',
              border: '1px solid var(--r2-border)',
            }}
          >
            <ul className="font-mono text-sm">
              {disasm.map((line, idx) => (
                <li
                  key={line.addr}
                  id={`asm-${idx}`}
                  className="cursor-pointer"
                  style={{
                    backgroundColor:
                      currentAddr === line.addr ? 'var(--r2-accent)' : 'transparent',
                    color:
                      currentAddr === line.addr ? '#000' : 'var(--r2-text)',
                  }}
                  onClick={() => setCurrentAddr(line.addr)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(line.addr);
                    }}
                    className="mr-1"
                  >
                    {bookmarks.includes(line.addr) ? '★' : '☆'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(line.addr);
                    }}
                    className="mr-1"
                  >
                    ✎
                  </button>
                  {line.addr}
                  {symbols[line.addr] ? ` (${symbols[line.addr]})` : ''}: {line.text}
                  {comments[line.addr] ? ` // ${comments[line.addr]}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {currentAddr && (
        <div className="mt-4">
          <h2 className="text-lg">Xrefs for {currentAddr}</h2>
          <p className="mb-2">
            {(xrefs[currentAddr] || []).join(', ') || 'None'}
          </p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add comment"
            className="w-full p-2 rounded"
            style={{
              backgroundColor: 'var(--r2-surface)',
              color: 'var(--r2-text)',
              border: '1px solid var(--r2-border)',
            }}
          />
          <button
            onClick={handleSaveComment}
            className="mt-2 px-3 py-1 rounded"
            style={{
              backgroundColor: 'var(--r2-surface)',
              border: '1px solid var(--r2-border)',
            }}
          >
            Save Comment
          </button>
        </div>
      )}

      {Object.keys(comments).length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg">Comments</h2>
          <ul
            className="rounded p-2"
            style={{
              backgroundColor: 'var(--r2-surface)',
              border: '1px solid var(--r2-border)',
            }}
          >
            {Object.entries(comments).map(([addr, text]) => (
              <li key={addr}>
                {addr}: {text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Radare2;
