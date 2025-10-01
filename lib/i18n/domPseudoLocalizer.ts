import { isPseudoLocalized, pseudoLocalize } from './pseudoLocale';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'OPTION',
]);

function shouldSkipNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  if (node.closest('[data-pseudo-exempt]')) return true;
  if (SKIP_TAGS.has(node.tagName)) return true;
  if (node.getAttribute('contenteditable') === 'true') return true;
  return false;
}

class DomPseudoLocalizer {
  private observer: MutationObserver | null = null;

  private originals = new Map<Text, string>();

  private applying = false;

  enable(): void {
    if (typeof window === 'undefined') return;
    if (this.observer) return;
    this.walk(document.body);
    this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  disable(): void {
    if (!this.observer) return;
    this.observer.disconnect();
    this.observer = null;
    this.applyOriginals();
    this.originals.clear();
  }

  private handleMutations(mutations: MutationRecord[]): void {
    if (!this.observer || this.applying) return;
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => this.walk(node));
      } else if (mutation.type === 'characterData') {
        const target = mutation.target;
        if (target instanceof Text) {
          this.originals.set(target, target.textContent ?? '');
          this.applyToNode(target);
        }
      }
    });
  }

  private walk(node: Node | null): void {
    if (!node) return;
    if (node instanceof Text) {
      this.applyToNode(node);
      return;
    }
    if (!(node instanceof Element)) return;
    if (shouldSkipNode(node)) return;
    node.childNodes.forEach((child) => this.walk(child));
  }

  private applyOriginals(): void {
    this.originals.forEach((value, node) => {
      if (!node.isConnected) return;
      this.applying = true;
      node.textContent = value;
      this.applying = false;
    });
  }

  private applyToNode(node: Text): void {
    const parent = node.parentElement;
    if (parent && shouldSkipNode(parent)) return;
    const current = node.textContent ?? '';
    const trimmed = current.trim();
    if (!trimmed) {
      if (!this.originals.has(node)) this.originals.set(node, current);
      return;
    }
    if (!this.originals.has(node)) {
      this.originals.set(node, current);
    }
    const source = this.originals.get(node) ?? current;
    if (!source.trim()) return;
    if (isPseudoLocalized(source)) {
      this.applying = true;
      node.textContent = source;
      this.applying = false;
      return;
    }
    const localized = pseudoLocalize(source);
    if (localized === current) return;
    this.applying = true;
    node.textContent = localized;
    this.applying = false;
  }
}

const controller = new DomPseudoLocalizer();

export function enableDomPseudoLocalization(): void {
  controller.enable();
}

export function disableDomPseudoLocalization(): void {
  controller.disable();
}
