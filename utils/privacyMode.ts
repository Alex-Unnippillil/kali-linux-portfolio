const PRIVACY_MODE_CLASS = 'privacy-mode';
const PRIVACY_MODE_ARMED_CLASS = 'privacy-mode-armed';
const SENSITIVE_SELECTOR = '[data-privacy="sensitive"]';
const AVATAR_SELECTOR = '[data-privacy-avatar]';
const WHITELIST_FLAG = 'true';
const HIDDEN_ATTR = 'data-privacy-hidden';
const AVATAR_HIDDEN_ATTR = 'data-privacy-avatar-hidden';
const ORIGINAL_ARIA_ATTR = 'privacyOriginalAria';

export const PRIVACY_STORAGE_KEY = 'qs-privacy-mode';

export interface ApplyPrivacyModeOptions {
  enabled: boolean;
  obscured: boolean;
}

const isBrowser = () => typeof document !== 'undefined';

const restoreAria = (node: HTMLElement) => {
  if (!(ORIGINAL_ARIA_ATTR in node.dataset)) {
    node.removeAttribute('aria-hidden');
    return;
  }

  const original = node.dataset[ORIGINAL_ARIA_ATTR];
  if (original === undefined || original === '') {
    node.removeAttribute('aria-hidden');
  } else {
    node.setAttribute('aria-hidden', original);
  }
  delete node.dataset[ORIGINAL_ARIA_ATTR];
};

export const applyPrivacyMode = ({ enabled, obscured }: ApplyPrivacyModeOptions) => {
  if (!isBrowser()) return;

  const root = document.documentElement;
  root.classList.toggle(PRIVACY_MODE_ARMED_CLASS, enabled);
  root.classList.toggle(PRIVACY_MODE_CLASS, obscured);

  const handleSensitiveNode = (node: HTMLElement) => {
    const isWhitelisted = node.dataset.privacyWhitelist === WHITELIST_FLAG;

    if (obscured && !isWhitelisted) {
      if (!(ORIGINAL_ARIA_ATTR in node.dataset)) {
        const current = node.getAttribute('aria-hidden');
        node.dataset[ORIGINAL_ARIA_ATTR] = current ?? '';
      }
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute(HIDDEN_ATTR, 'true');
    } else {
      node.removeAttribute(HIDDEN_ATTR);
      restoreAria(node);
    }
  };

  const handleAvatarNode = (node: HTMLElement) => {
    const isWhitelisted = node.dataset.privacyWhitelist === WHITELIST_FLAG;
    if (obscured && !isWhitelisted) {
      node.setAttribute(AVATAR_HIDDEN_ATTR, 'true');
    } else {
      node.removeAttribute(AVATAR_HIDDEN_ATTR);
    }
  };

  document.querySelectorAll<HTMLElement>(SENSITIVE_SELECTOR).forEach(handleSensitiveNode);
  document.querySelectorAll<HTMLElement>(AVATAR_SELECTOR).forEach(handleAvatarNode);
};

export const clearPrivacyModeEffects = () => {
  if (!isBrowser()) return;
  const root = document.documentElement;
  root.classList.remove(PRIVACY_MODE_CLASS, PRIVACY_MODE_ARMED_CLASS);

  document
    .querySelectorAll<HTMLElement>(`${SENSITIVE_SELECTOR}, ${AVATAR_SELECTOR}`)
    .forEach((node) => {
      node.removeAttribute(HIDDEN_ATTR);
      node.removeAttribute(AVATAR_HIDDEN_ATTR);
      restoreAria(node);
    });
};

export const PRIVACY_CONSTANTS = {
  PRIVACY_MODE_CLASS,
  PRIVACY_MODE_ARMED_CLASS,
  SENSITIVE_SELECTOR,
  AVATAR_SELECTOR,
  HIDDEN_ATTR,
  AVATAR_HIDDEN_ATTR,
  WHITELIST_FLAG,
};

