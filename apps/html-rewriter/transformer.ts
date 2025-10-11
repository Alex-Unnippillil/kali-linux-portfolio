export type RemoveRule = {
  type: 'remove';
  selector: string;
  note?: string;
};

export type ReplaceTextRule = {
  type: 'replaceText';
  selector: string;
  value: string;
  note?: string;
};

export type SetAttributeRule = {
  type: 'setAttribute';
  selector: string;
  attribute: string;
  value: string;
  note?: string;
};

export type RemoveAttributeRule = {
  type: 'removeAttribute';
  selector: string;
  attribute: string;
  note?: string;
};

export type RewriteRule =
  | RemoveRule
  | ReplaceTextRule
  | SetAttributeRule
  | RemoveAttributeRule;

export interface TransformationSummary {
  html: string;
  appliedCount: number;
  messages: string[];
}

const formatNote = (rule: RewriteRule, matched: number) => {
  const base = rule.note ? `${rule.note} ` : '';
  return `${base}${matched} ${matched === 1 ? 'element' : 'elements'} matched`;
};

export const applyRewriteRules = (
  inputHtml: string,
  rules: RewriteRule[],
): TransformationSummary => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(inputHtml, 'text/html');
  const messages: string[] = [];
  let applied = 0;

  for (const rule of rules) {
    const elements = Array.from(doc.querySelectorAll(rule.selector));
    if (elements.length === 0) {
      messages.push(
        rule.note
          ? `${rule.note} No matches for selector "${rule.selector}".`
          : `No matches for selector "${rule.selector}".`,
      );
      continue;
    }

    switch (rule.type) {
      case 'remove':
        elements.forEach((el) => el.remove());
        applied += elements.length;
        messages.push(`Removed ${formatNote(rule, elements.length)}.`);
        break;
      case 'replaceText':
        elements.forEach((el) => {
          el.textContent = rule.value;
        });
        applied += elements.length;
        messages.push(`Replaced text on ${formatNote(rule, elements.length)}.`);
        break;
      case 'setAttribute':
        elements.forEach((el) => {
          el.setAttribute(rule.attribute, rule.value);
        });
        applied += elements.length;
        messages.push(
          `Set attribute "${rule.attribute}" on ${formatNote(rule, elements.length)}.`,
        );
        break;
      case 'removeAttribute':
        elements.forEach((el) => {
          el.removeAttribute(rule.attribute);
        });
        applied += elements.length;
        messages.push(
          `Removed attribute "${rule.attribute}" on ${formatNote(rule, elements.length)}.`,
        );
        break;
      default: {
        const _exhaustiveCheck: never = rule;
        throw new Error(`Unhandled rule: ${_exhaustiveCheck}`);
      }
    }
  }

  return {
    html: doc.body.innerHTML,
    appliedCount: applied,
    messages,
  };
};

export const serializeRules = (rules: RewriteRule[]): string =>
  JSON.stringify(rules, null, 2);
