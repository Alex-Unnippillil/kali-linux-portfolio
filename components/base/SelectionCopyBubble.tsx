import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { copyToClipboard, normalizeSelectionText } from "../../utils/clipboard";

interface BubbleState {
  visible: boolean;
  top: number;
  left: number;
  rawText: string;
  height: number;
}

const initialState: BubbleState = {
  visible: false,
  top: 0,
  left: 0,
  rawText: "",
  height: 0,
};

const isEditable = (node: Node | null): boolean => {
  if (!node) return false;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : (node.parentElement as Element | null);
  if (!element) return false;
  return Boolean(element.closest("input, textarea, [contenteditable='true']"));
};

const announce = (message: string) => {
  if (typeof window === "undefined") return;
  const region = document.getElementById("live-region");
  if (!region) return;
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
};

const SelectionCopyBubble = () => {
  const [state, setState] = useState<BubbleState>(initialState);
  const [mounted, setMounted] = useState(false);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const visibleRef = useRef(false);

  const hide = useCallback(() => {
    setState((prev) => (prev.visible ? initialState : prev));
    rangeRef.current = null;
  }, []);

  const updateFromSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hide();
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText || !selectedText.trim()) {
      hide();
      return;
    }

    let range: Range;
    try {
      range = selection.getRangeAt(0).cloneRange();
    } catch {
      hide();
      return;
    }

    const containerNode = range.commonAncestorContainer;
    if (isEditable(containerNode) || isEditable(selection.anchorNode) || isEditable(selection.focusNode)) {
      hide();
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hide();
      return;
    }

    rangeRef.current = range;
    setState({
      visible: true,
      top: rect.top,
      left: rect.left + rect.width / 2,
      rawText: selectedText,
      height: rect.height,
    });
  }, [hide]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    visibleRef.current = state.visible;
  }, [state.visible]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      if (!visibleRef.current) return;
      const target = event.target as Node | null;
      if (bubbleRef.current?.contains(target)) {
        return;
      }
      hide();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hide();
      }
    };

    document.addEventListener("selectionchange", updateFromSelection);
    document.addEventListener("mouseup", updateFromSelection);
    document.addEventListener("keyup", updateFromSelection);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      document.removeEventListener("selectionchange", updateFromSelection);
      document.removeEventListener("mouseup", updateFromSelection);
      document.removeEventListener("keyup", updateFromSelection);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [hide, updateFromSelection]);

  const positioning = useMemo(() => {
    if (!state.visible) {
      return { style: undefined, placementClass: "-translate-y-full" as const };
    }
    const shouldFlip = state.top < 56;
    let left = state.left;
    if (typeof window !== "undefined") {
      const maxLeft = window.innerWidth - 16;
      left = Math.min(Math.max(left, 16), maxLeft);
    }
    const top = shouldFlip
      ? Math.max(state.top + state.height + 12, 8)
      : Math.max(state.top - 12, 8);
    return {
      style: {
        top,
        left,
      } as const,
      placementClass: shouldFlip ? "translate-y-0" : "-translate-y-full",
    } as const;
  }, [state.height, state.left, state.top, state.visible]);

  const handleCopy = useCallback(async () => {
    const raw = rangeRef.current ? rangeRef.current.toString() : state.rawText;
    const normalized = normalizeSelectionText(raw);
    if (!normalized) {
      hide();
      return;
    }

    const success = await copyToClipboard(normalized);
    if (success) {
      const snippet = normalized.length > 60 ? `${normalized.slice(0, 57)}…` : normalized;
      announce(`Copied selection: ${snippet}`);
    }
    hide();
  }, [hide, state.rawText]);

  if (!mounted) return null;

  return (
    <div
      ref={bubbleRef}
      className={clsx(
        "fixed z-[9999] -translate-x-1/2 transform transition-opacity duration-150",
        positioning.placementClass,
        state.visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      style={positioning.style}
    >
      <button
        type="button"
        onClick={handleCopy}
        onMouseDown={(event) => event.preventDefault()}
        className="rounded-full border border-white/20 bg-black/80 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur"
      >
        Copy
      </button>
    </div>
  );
};

export default SelectionCopyBubble;
