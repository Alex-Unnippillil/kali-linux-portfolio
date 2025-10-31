import { useEffect } from 'react';

type Orientation = 'horizontal' | 'vertical' | 'both';

type UseRovingOptions = {
  orientation?: Orientation;
  loop?: boolean;
  typeahead?: boolean;
  selectors?: string;
};

const DEFAULT_SELECTOR =
  '[role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"]';

const isElementDisabled = (element: HTMLElement) => {
  if (element.hasAttribute('disabled')) {
    return true;
  }

  const ariaDisabled = element.getAttribute('aria-disabled');
  return ariaDisabled === 'true';
};

const getTextContent = (element: HTMLElement) => {
  const text = element.getAttribute('data-menu-text') ?? element.textContent ?? '';
  return text.trim().toLowerCase();
};

const isTypeaheadKey = (event: KeyboardEvent) => {
  if (event.metaKey || event.altKey || event.ctrlKey) {
    return false;
  }

  if (event.key.length !== 1) {
    return false;
  }

  return !/\s/.test(event.key) || event.key === ' ';
};

export default function useRovingTabIndex(
  ref: React.RefObject<HTMLElement>,
  active: boolean = true,
  orientationOrOptions: Orientation | UseRovingOptions = 'horizontal',
  maybeOptions?: UseRovingOptions,
) {
  const options: UseRovingOptions =
    typeof orientationOrOptions === 'string'
      ? { orientation: orientationOrOptions, ...maybeOptions }
      : orientationOrOptions;

  const {
    orientation = 'horizontal',
    loop = true,
    typeahead = false,
    selectors = DEFAULT_SELECTOR,
  } = options;

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const allItems = Array.from(node.querySelectorAll<HTMLElement>(selectors));
    const items = allItems.filter((el) => !isElementDisabled(el));
    if (items.length === 0) return;

    let index = items.findIndex((el) => el.tabIndex === 0 || el === document.activeElement);
    if (index === -1) index = 0;

    const setFocus = (nextIndex: number) => {
      index = nextIndex;
      items.forEach((el, i) => {
        el.tabIndex = i === index ? 0 : -1;
      });
      const target = items[index];
      if (target && document.activeElement !== target) {
        target.focus();
      }
    };

    setFocus(index);

    let typeaheadBuffer = '';
    let typeaheadTimeout: number | undefined;

    const resetTypeahead = () => {
      typeaheadBuffer = '';
      if (typeaheadTimeout) {
        window.clearTimeout(typeaheadTimeout);
        typeaheadTimeout = undefined;
      }
    };

    const focusByTypeahead = (value: string) => {
      const normalized = value.toLowerCase();
      if (!normalized) return;

      const startIndex = index;
      const total = items.length;

      for (let offset = 1; offset <= total; offset += 1) {
        const candidateIndex = (startIndex + offset) % total;
        const candidate = items[candidateIndex];
        if (!candidate) continue;

        const text = getTextContent(candidate);
        if (text.startsWith(normalized)) {
          setFocus(candidateIndex);
          break;
        }
      }
    };

    const move = (direction: 1 | -1) => {
      const total = items.length;
      let nextIndex = index + direction;

      if (!loop) {
        nextIndex = Math.max(0, Math.min(total - 1, nextIndex));
      } else {
        nextIndex = (nextIndex + total) % total;
      }

      if (nextIndex === index) return;

      setFocus(nextIndex);
    };

    const handleKey = (event: KeyboardEvent) => {
      const forwardKeys: string[] = [];
      const backwardKeys: string[] = [];

      if (orientation === 'horizontal' || orientation === 'both') {
        forwardKeys.push('ArrowRight');
        backwardKeys.push('ArrowLeft');
      }

      if (orientation === 'vertical' || orientation === 'both') {
        forwardKeys.push('ArrowDown');
        backwardKeys.push('ArrowUp');
      }

      if (forwardKeys.includes(event.key)) {
        event.preventDefault();
        move(1);
        resetTypeahead();
        return;
      }

      if (backwardKeys.includes(event.key)) {
        event.preventDefault();
        move(-1);
        resetTypeahead();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setFocus(0);
        resetTypeahead();
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setFocus(items.length - 1);
        resetTypeahead();
        return;
      }

      if (typeahead && isTypeaheadKey(event)) {
        const char = event.key === ' ' ? ' ' : event.key.toLowerCase();
        typeaheadBuffer += char;
        if (typeaheadTimeout) {
          window.clearTimeout(typeaheadTimeout);
        }
        typeaheadTimeout = window.setTimeout(() => {
          typeaheadBuffer = '';
          typeaheadTimeout = undefined;
        }, 500);

        if (typeaheadBuffer.length === 1) {
          focusByTypeahead(typeaheadBuffer);
        } else {
          const current = getTextContent(items[index]);
          if (!current.startsWith(typeaheadBuffer)) {
            focusByTypeahead(typeaheadBuffer);
          }
        }
      }
    };

    node.addEventListener('keydown', handleKey);

    return () => {
      node.removeEventListener('keydown', handleKey);
      resetTypeahead();
    };
  }, [ref, active, orientation, loop, typeahead, selectors]);
}
