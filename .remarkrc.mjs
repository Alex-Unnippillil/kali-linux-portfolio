import {visit} from 'unist-util-visit';

const requireDescriptiveAltText = () => (tree, file) => {
  visit(tree, 'image', (node) => {
    const alt = typeof node.alt === 'string' ? node.alt.trim() : '';

    if (!alt) {
      file.message('Images must include meaningful alternative text.', node);
      return;
    }

    if (alt.length < 3) {
      file.message('Image alternative text should be descriptive enough for screen readers.', node);
    }
  });
};

export default {
  plugins: [
    ['remark-lint-heading-increment', true],
    ['remark-lint-no-heading-punctuation', true],
    ['remark-lint-no-empty-url', true],
    requireDescriptiveAltText,
  ],
};
