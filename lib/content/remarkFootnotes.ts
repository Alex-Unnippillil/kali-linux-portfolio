import type { FootnoteDefinition, FootnoteReference, Parent, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { Handler, H } from 'mdast-util-to-hast';
import { all } from 'mdast-util-to-hast/lib/all.js';

interface DefinitionEntry {
  node: FootnoteDefinition;
  parent: Parent;
  index: number;
  order: number;
}

interface FootnoteMeta {
  definition: FootnoteDefinition;
  identifier: string;
  order: number;
  displayIndex: number;
  footnoteId: string;
  referenceIds: string[];
}

interface FootnoteItemNode extends Parent {
  type: 'footnoteItem';
  footnoteId: string;
  label: string;
  referenceIds: string[];
}

interface FootnotesNode extends Parent {
  type: 'footnotes';
  children: FootnoteItemNode[];
}

interface FootnoteReferenceCustom extends FootnoteReference {
  type: 'footnoteReferenceCustom';
  data: FootnoteReference['data'] & {
    footnoteId: string;
    refId: string;
    label: string;
  };
}

const normalizeIdentifier = (value: string) => value.toLowerCase();

const remarkFootnotesToElements: Plugin<[], Root> = () => (tree) => {
  const definitionEntries: DefinitionEntry[] = [];

  visit(tree, 'footnoteDefinition', (node, index, parent) => {
    if (!parent || typeof index !== 'number') {
      return;
    }
    definitionEntries.push({ node, parent, index, order: definitionEntries.length });
  });

  const metaMap = new Map<string, FootnoteMeta>();

  definitionEntries.forEach(({ node, order }) => {
    const key = normalizeIdentifier(node.identifier);
    metaMap.set(key, {
      definition: node,
      identifier: node.identifier,
      order,
      displayIndex: order + 1,
      footnoteId: `fn-${order + 1}`,
      referenceIds: [],
    });
  });

  if (definitionEntries.length > 0) {
    definitionEntries
      .slice()
      .reverse()
      .forEach(({ parent, index }) => {
        parent.children.splice(index, 1);
      });
  }

  const ensureMeta = (identifier: string): FootnoteMeta => {
    const key = normalizeIdentifier(identifier);
    let meta = metaMap.get(key);
    if (!meta) {
      const order = metaMap.size;
      const definition: FootnoteDefinition = {
        type: 'footnoteDefinition',
        identifier,
        label: identifier,
        children: [],
      };
      meta = {
        definition,
        identifier,
        order,
        displayIndex: order + 1,
        footnoteId: `fn-${order + 1}`,
        referenceIds: [],
      };
      metaMap.set(key, meta);
    }
    return meta;
  };

  visit(tree, 'footnoteReference', (node) => {
    const meta = ensureMeta(node.identifier);
    const refIndex = meta.referenceIds.length + 1;
    const refId = `fnref-${meta.displayIndex}-${refIndex}`;
    meta.referenceIds.push(refId);

    const custom = node as FootnoteReferenceCustom;
    custom.type = 'footnoteReferenceCustom';
    custom.data = {
      ...(custom.data ?? {}),
      footnoteId: meta.footnoteId,
      refId,
      label: String(meta.displayIndex),
    };
  });

  if (metaMap.size === 0) {
    return;
  }

  const footnotesNode: FootnotesNode = {
    type: 'footnotes',
    children: Array.from(metaMap.values())
      .sort((a, b) => a.order - b.order)
      .map((meta) => ({
        type: 'footnoteItem',
        footnoteId: meta.footnoteId,
        label: String(meta.displayIndex),
        referenceIds: meta.referenceIds,
        children: meta.definition.children as FootnoteItemNode['children'],
      })),
  };

  tree.children.push(footnotesNode);
};

const footnoteReferenceHandler: Handler = (h, node) => {
  const { footnoteId, refId, label } = (node as FootnoteReferenceCustom).data;
  const anchor = h(
    node,
    'a',
    {
      href: `#${footnoteId}`,
      'aria-label': `View footnote ${label}`,
      'data-footnote-ref': true,
      role: 'doc-noteref',
    },
    [{ type: 'text', value: label }],
  );
  return h(node, 'sup', { id: refId, className: ['footnote-ref'] }, [anchor]);
};

const footnotesHandler: Handler = (h, node) => h(node, 'footnotes', {}, all(h as H, node as any));

const footnoteItemHandler: Handler = (h, node) => {
  const item = node as FootnoteItemNode;
  const props: Record<string, string> = {
    'data-footnote-id': item.footnoteId,
    'data-footnote-label': item.label,
  };
  if (item.referenceIds.length > 0) {
    props['data-reference-ids'] = item.referenceIds.join(' ');
  }
  return h(node, 'footnote-item', props, all(h as H, node as any));
};

export const footnoteHandlers: Record<string, Handler> = {
  footnoteReferenceCustom: footnoteReferenceHandler,
  footnotes: footnotesHandler,
  footnoteItem: footnoteItemHandler,
};

export default remarkFootnotesToElements;
