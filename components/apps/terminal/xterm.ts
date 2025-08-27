import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import '@xterm/xterm/css/xterm.css';

export interface XtermInstance {
  term: Terminal;
  fitAddon: FitAddon;
  search: (regex: string) => boolean;
  exportAsText: () => string;
  exportAsHTML: () => string;
}

/**
 * Create an xterm.js instance with search and linkify addons.
 * Also wires up bracketed paste handling and session export helpers.
 */
export function createXterm(
  container: HTMLElement,
  onData: (data: string) => void,
): XtermInstance {
  const term = new Terminal({
    cursorBlink: true,
    convertEol: true,
    allowProposedApi: true,
  });
  const fitAddon = new FitAddon();
  const searchAddon = new SearchAddon();
  const webLinksAddon = new WebLinksAddon((e, uri) => window.open(uri, '_blank'));
  const serializeAddon = new SerializeAddon();

  term.loadAddon(fitAddon);
  term.loadAddon(searchAddon);
  term.loadAddon(webLinksAddon);
  term.loadAddon(serializeAddon);

  term.open(container);
  fitAddon.fit();

  // Enable bracketed paste mode and intercept multi-line pastes
  term.options.bracketedPasteMode = true;
  let pasteBuffer: string | null = null;
  term.onData((data) => {
    if (pasteBuffer !== null) {
      if (data.includes('\u001b[201~')) {
        pasteBuffer += data.replace('\u001b[201~', '');
        const content = pasteBuffer;
        pasteBuffer = null;
        if (
          content.includes('\n') &&
          typeof window !== 'undefined' &&
          !window.confirm('Paste multiple lines?')
        ) {
          return;
        }
        for (const ch of content) {
          onData(ch);
        }
      } else {
        pasteBuffer += data;
      }
      return;
    }
    if (data.startsWith('\u001b[200~')) {
      pasteBuffer = data.replace('\u001b[200~', '');
      return;
    }
    for (const ch of data) {
      onData(ch);
    }
  });

  const search = (regex: string) => searchAddon.findNext(regex, { regex: true });
  const exportAsText = () => serializeAddon.serialize();
  const exportAsHTML = () => serializeAddon.serializeAsHTML();

  return { term, fitAddon, search, exportAsText, exportAsHTML };
}

