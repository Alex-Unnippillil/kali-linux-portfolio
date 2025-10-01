const { RuleHelper } = require('textlint-rule-helper');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DEFAULT_PHRASES = [
  {
    phrase: 'click here',
    message: 'Avoid “click here”. Use descriptive link text that names the action.',
  },
  {
    phrase: 'just',
    message: 'Avoid “just”. Describe the full action without minimizing the effort.',
  },
  {
    phrase: 'simply',
    message: 'Avoid “simply”. Describe the action plainly.',
  },
  {
    phrase: 'obviously',
    message: 'Avoid “obviously”. Explain the requirement without judgment.',
  },
  {
    phrase: 'of course',
    message: 'Avoid “of course”. State the fact directly.',
  },
  {
    phrase: 'easy',
    message: 'Avoid promising that something is “easy”. Focus on the outcome or steps.',
  },
  {
    phrase: 'quickly',
    message: 'Avoid promising speed with “quickly”. Describe the outcome instead.',
  },
  {
    phrase: 'sorry for the inconvenience',
    message: 'Avoid “sorry for the inconvenience”. Explain the impact and next steps instead.',
  },
];

module.exports = function microcopyBannedPhrases(context, options = {}) {
  const helper = new RuleHelper(context);
  const { Syntax, RuleError, report } = context;

  const phrases = Array.isArray(options.phrases) && options.phrases.length > 0 ? options.phrases : DEFAULT_PHRASES;

  const descriptors = phrases.map((entry) => {
    const phrase = entry.phrase;
    if (!phrase || typeof phrase !== 'string') {
      return null;
    }
    const pattern = entry.pattern || `\\b${escapeRegExp(phrase)}\\b`;
    const flags = entry.ignoreCase === false ? 'g' : 'gi';
    return {
      phrase,
      message: entry.message || `Avoid “${phrase}” per the microcopy guidelines.`,
      regex: new RegExp(pattern, flags),
    };
  }).filter(Boolean);

  if (descriptors.length === 0) {
    return {};
  }

  return {
    [Syntax.Str](node) {
      if (helper.isChildNode(node, [Syntax.Link, Syntax.Image, Syntax.Code, Syntax.CodeBlock, Syntax.Comment])) {
        return;
      }

      const text = node.value;
      if (!text) {
        return;
      }

      descriptors.forEach(({ regex, message }) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const index = match.index;
          report(node, new RuleError(message, { index }));

          if (match[0].length === 0) {
            regex.lastIndex += 1;
          }
        }
      });
    },
  };
};

module.exports.DEFAULT_PHRASES = DEFAULT_PHRASES;
