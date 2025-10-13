import type { Heading, Root, Text } from 'mdast';

import {
  HEADING_METADATA_KEY,
  TOC_DATA_KEY,
  headingIdPlugin,
  type TocEntry,
} from '@/lib/mdx/plugins';

const createTextNode = (value: string): Text => ({
  type: 'text',
  value,
});

const createHeading = (
  depth: number,
  value: string,
  line: number,
  existingId?: string,
): Heading =>
  ({
    type: 'heading',
    depth,
    children: [createTextNode(value)],
    position: {
      start: { line, column: 1, offset: 0 },
      end: { line, column: value.length + 1, offset: value.length },
    },
    data: existingId ? { hProperties: { id: existingId } } : undefined,
  } as Heading);

describe('headingIdPlugin', () => {
  it('assigns stable ids, metadata, and accessibility attributes', () => {
    const tree: Root = {
      type: 'root',
      children: [
        createHeading(1, 'Intro', 1),
        createHeading(2, 'Usage', 5),
        createHeading(2, 'Usage', 10),
        createHeading(3, 'API Surface', 14),
      ],
    };

    const file: { data?: Record<string, unknown> } = {};
    headingIdPlugin({ minDepth: 1, maxDepth: 3 })(tree, file);

    expect(file.data?.[TOC_DATA_KEY]).toMatchInlineSnapshot(`
      [
        {
          "depth": 1,
          "id": "intro",
          "line": 1,
          "value": "Intro",
        },
        {
          "depth": 2,
          "id": "usage",
          "line": 5,
          "value": "Usage",
        },
        {
          "depth": 2,
          "id": "usage-1",
          "line": 10,
          "value": "Usage",
        },
        {
          "depth": 3,
          "id": "api-surface",
          "line": 14,
          "value": "API Surface",
        },
      ]
    `);

    expect(file.data?.[HEADING_METADATA_KEY]).toBe(file.data?.[TOC_DATA_KEY]);

    const headings = tree.children as Heading[];
    expect(headings[0].data?.hProperties).toEqual(
      expect.objectContaining({ id: 'intro', tabIndex: -1 }),
    );
    expect(headings[1].data?.hProperties).toEqual(
      expect.objectContaining({ id: 'usage', tabIndex: -1 }),
    );
    expect(headings[2].data?.hProperties).toEqual(
      expect.objectContaining({ id: 'usage-1', tabIndex: -1 }),
    );
    expect(headings[3].data?.hProperties).toEqual(
      expect.objectContaining({ id: 'api-surface', tabIndex: -1 }),
    );

    headings.forEach((heading) => {
      const style = heading.data?.hProperties?.style;
      if (typeof style === 'string') {
        expect(style).toEqual(expect.stringContaining('scroll-margin-top'));
      } else {
        expect(style).toEqual(expect.objectContaining({ scrollMarginTop: '6rem' }));
      }
    });
  });

  it('respects author-specified ids and clones metadata for collectors', () => {
    const tree: Root = {
      type: 'root',
      children: [
        createHeading(2, 'Custom Section', 3, 'Section-One'),
        createHeading(3, 'Nested Case', 8),
        createHeading(2, 'Custom Section', 12),
      ],
    };

    const file: { data?: Record<string, unknown> } = {};
    let collected: TocEntry[] | undefined;

    headingIdPlugin({
      minDepth: 2,
      maxDepth: 3,
      collect: (entries) => {
        collected = entries;
      },
    })(tree, file);

    const toc = file.data?.[TOC_DATA_KEY] as TocEntry[];
    expect(toc).toEqual([
      { id: 'Section-One', depth: 2, value: 'Custom Section', line: 3 },
      { id: 'nested-case', depth: 3, value: 'Nested Case', line: 8 },
      { id: 'custom-section', depth: 2, value: 'Custom Section', line: 12 },
    ]);

    const firstHeading = tree.children[0] as Heading;
    expect(firstHeading.data?.hProperties?.id).toBe('Section-One');
    expect(firstHeading.data?.hProperties?.tabIndex).toBe(-1);

    expect(collected).toBeDefined();
    expect(collected).not.toBe(toc);
    expect(collected).toEqual(toc);

    if (collected) {
      collected[0]!.id = 'mutated';
      expect(toc[0]!.id).toBe('Section-One');
    }
  });
});
