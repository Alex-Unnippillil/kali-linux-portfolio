const TARGET_DIRECTORIES = /components[\\/](base|core)[\\/]/;
const ALLOW_TOKEN_REFERENCE = /--motion-|var\(--motion/;
const DISALLOWED_PATTERNS = [
  /transition[^;\n]*\d+(?:ms|s)/i,
  /\bduration-\d+/i,
  /\bease-(?:in|out|in-out)\b/i,
  /cubic-bezier\s*\(/i,
];

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw motion values in shell components; prefer motion tokens',
      recommended: false,
    },
    schema: [],
    messages: {
      useTokens: 'Use motion tokens or motion presets instead of raw transition values.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (!TARGET_DIRECTORIES.test(filename)) {
      return {};
    }

    const check = (node, value) => {
      if (typeof value !== 'string') return;
      if (ALLOW_TOKEN_REFERENCE.test(value)) return;
      if (!DISALLOWED_PATTERNS.some((pattern) => pattern.test(value))) return;
      context.report({ node, messageId: 'useTokens' });
    };

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateLiteral(node) {
        const raw = node.quasis.map((quasi) => quasi.value.cooked ?? '').join('');
        check(node, raw);
      },
    };
  },
};
