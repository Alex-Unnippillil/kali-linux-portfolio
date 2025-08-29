import React, { useEffect, useRef, useState } from 'react';
import HexEditor from './HexEditor';
import {
  loadNotes,
  saveNotes,
  loadBookmarks,
  saveBookmarks,
} from './utils';
import GraphView from '../../../apps/radare2/components/GraphView';
import GuideOverlay from './GuideOverlay';

const Radare2 = ({ initialData = {} }) => {
  const { file = 'demo', hex = '', disasm = [], xrefs = {}, blocks = [] } =
    initialData;
  const [mode, setMode] = useState('code');
  const [seekAddr, setSeekAddr] = useState('');
  const [findTerm, setFindTerm] = useState('');
  const [currentAddr, setCurrentAddr] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const disasmRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotes(loadNotes(file));
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

  const handleAddNote = () => {
    if (!currentAddr || !noteText.trim()) return;
    const next = [...notes, { addr: currentAddr, text: noteText.trim() }];
    setNotes(next);
    saveNotes(file, next);
    setNoteText('');
  };

  const toggleBookmark = (addr) => {
    const next = bookmarks.includes(addr)
      ? bookmarks.filter((a) => a !== addr)
      : [...bookmarks, addr];
    setBookmarks(next);
    saveBookmarks(file, next);
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-4 overflow-auto">
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <div className="flex gap-2 mb-2 flex-wrap">
        <input
          value={seekAddr}
          onChange={(e) => setSeekAddr(e.target.value)}
          placeholder="seek 0x..."
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
        <button
          onClick={handleSeek}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Seek
        </button>
        <input
          value={findTerm}
          onChange={(e) => setFindTerm(e.target.value)}
          placeholder="find"
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
        <button
          onClick={handleFind}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Find
        </button>
        <button
          onClick={() => setMode((m) => (m === 'code' ? 'graph' : 'code'))}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          {mode === 'code' ? 'Graph' : 'Code'}
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Help
        </button>
      </div>

      {mode === 'graph' ? (
        <GraphView blocks={blocks} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <HexEditor hex={hex} />
          <div
            ref={disasmRef}
            className="overflow-auto border border-gray-600 rounded p-2 max-h-64"
          >
            <ul className="font-mono text-sm">
              {disasm.map((line, idx) => (
                <li
                  key={line.addr}
                  id={`asm-${idx}`}
                  className={`cursor-pointer ${
                    currentAddr === line.addr ? 'bg-gray-700' : ''
                  }`}
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
                  {line.addr}: {line.text}
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
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add note"
            className="w-full bg-gray-800 text-white p-2 rounded"
          />
          <button
            onClick={handleAddNote}
            className="mt-2 px-3 py-1 bg-gray-700 rounded"
          >
            Save Note
          </button>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg">Notes</h2>
          <ul className="bg-black rounded p-2">
            {notes.map((n, i) => (
              <li key={i}>
                {n.addr}: {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Radare2;
