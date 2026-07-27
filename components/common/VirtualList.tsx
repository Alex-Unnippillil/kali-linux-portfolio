"use client";

import type { CSSProperties, ReactElement } from 'react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualListNavigation } from '../../hooks/useVirtualListNavigation';

type ListComponent = 'div' | 'ul' | 'ol';

type ItemKey<T> = keyof T | ((item: T, index: number) => React.Key);

interface VirtualListProps<T> {
  data: readonly T[];
  itemHeight: number;
  itemKey: ItemKey<T>;
  children: (item: T, index: number) => ReactElement;
  overscan?: number;
  height?: number;
  component?: ListComponent;
  className?: string;
  style?: CSSProperties;
  listStyle?: CSSProperties;
  listProps?: React.HTMLAttributes<HTMLElement>;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  stickyIndices?: number[];
  renderStickyItem?: (item: T, index: number) => React.ReactNode;
  stickyHeader?: React.ReactNode;
  scrollBehavior?: ScrollBehavior;
  role?: React.AriaRole;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
  onScroll?: (offset: number) => void;
}

interface Range {
  start: number;
  end: number;
}

const isListTag = (tag: ListComponent) => tag === 'ul' || tag === 'ol';

const createSpacer = (
  component: ListComponent,
  height: number,
  position: 'start' | 'end'
) => {
  if (height <= 0) {
    return null;
  }

  const Tag = isListTag(component) ? 'li' : 'div';

  return React.createElement(Tag, {
    key: `virtual-spacer-${position}`,
    'data-virtual-spacer': position,
    'aria-hidden': true,
    role: 'presentation',
    style: {
      height,
      margin: 0,
      border: 0,
      padding: 0,
      flexShrink: 0,
    },
  });
};

const getItemKey = <T,>(item: T, index: number, key: ItemKey<T>): React.Key => {
  if (typeof key === 'function') {
    return key(item, index);
  }

  const value = (item as Record<string, unknown>)[key as string];
  return value as React.Key;
};

const binarySearchOffset = (offsets: number[], value: number) => {
  let low = 0;
  let high = offsets.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (offsets[mid] <= value) {
      if (mid === offsets.length - 1) {
        return mid;
      }

      if (offsets[mid + 1] > value) {
        return mid;
      }

      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return low;
};

const useContainerHeight = (height?: number) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState(height ?? 0);

  useLayoutEffect(() => {
    if (height != null) {
      setMeasuredHeight(height);
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setMeasuredHeight((prev) => {
        const next = element.clientHeight;
        if (Math.abs(prev - next) < 0.5) {
          return prev;
        }

        return next;
      });
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateHeight);
        return () => {
          window.removeEventListener('resize', updateHeight);
        };
      }

      return undefined;
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(element);

    return () => observer.disconnect();
  }, [height]);

  return { containerRef, viewportHeight: height ?? measuredHeight } as const;
};

type AssignNode = (index: number, node: HTMLElement | null, observe?: boolean) => void;

export default function VirtualList<T>({
  data,
  itemHeight,
  itemKey,
  children,
  overscan = 6,
  height,
  component = 'div',
  className,
  style,
  listStyle,
  listProps,
  containerClassName,
  containerStyle,
  containerProps,
  stickyIndices,
  renderStickyItem,
  stickyHeader,
  scrollBehavior = 'smooth',
  role,
  onItemsRendered,
  onScroll,
}: VirtualListProps<T>) {
  const { className: containerPropsClassName, style: containerPropsStyle, ...restContainerProps } =
    containerProps ?? {};
  const { className: listPropsClassName, style: listPropsStyle, role: listPropsRole, ...restListProps } =
    listProps ?? {};
  const heightsRef = useRef<number[]>([]);
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const { containerRef, viewportHeight } = useContainerHeight(height);
  const scrollTopRef = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const nodesRef = useRef<Map<number, HTMLElement>>(new Map());
  const elementToIndexRef = useRef<WeakMap<Element, number>>(new WeakMap());
  const observerRef = useRef<ResizeObserver | null>(null);
  const [range, setRange] = useState<Range>({ start: 0, end: 0 });
  const [scrollVersion, setScrollVersion] = useState(0);

  const updateMeasurement = useCallback((index: number, heightValue: number) => {
    if (!Number.isFinite(heightValue)) {
      return;
    }

    const heights = heightsRef.current;
    const previous = heights[index] ?? itemHeight;
    if (Math.abs(previous - heightValue) < 0.5) {
      return;
    }

    heights[index] = heightValue;
    setMeasurementVersion((version) => version + 1);
  }, [itemHeight]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      observerRef.current = null;
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const index = elementToIndexRef.current.get(entry.target);
        if (index == null) {
          continue;
        }

        const size =
          (Array.isArray(entry.borderBoxSize) && entry.borderBoxSize[0]?.blockSize) ||
          entry.contentRect.height;

        updateMeasurement(index, size);
      }
    });

    observerRef.current = observer;

    nodesRef.current.forEach((node, index) => {
      elementToIndexRef.current.set(node, index);
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [updateMeasurement]);

  const assignNode = useCallback<AssignNode>((index, node, observe = true) => {
    const map = nodesRef.current;
    const existing = map.get(index);
    const observer = observerRef.current;

    if (existing && existing !== node) {
      observer?.unobserve(existing);
      elementToIndexRef.current.delete(existing);
      map.delete(index);
    }

    if (!node) {
      return;
    }

    map.set(index, node);
    elementToIndexRef.current.set(node, index);

    if (!observe) {
      updateMeasurement(index, node.getBoundingClientRect().height);
      return;
    }

    if (observer) {
      observer.observe(node);
      updateMeasurement(index, node.getBoundingClientRect().height);
    } else {
      updateMeasurement(index, node.getBoundingClientRect().height);
    }
  }, [updateMeasurement]);

  const offsets = useMemo(() => {
    const heights = heightsRef.current;
    if (heights.length !== data.length) {
      const next = Array.from({ length: data.length }, (_, index) => heights[index] ?? itemHeight);
      heightsRef.current = next;
    }

    const result = new Array(data.length + 1).fill(0);
    for (let index = 0; index < data.length; index += 1) {
      const size = heightsRef.current[index] ?? itemHeight;
      heightsRef.current[index] = size;
      result[index + 1] = result[index] + size;
    }

    return result;
  }, [data.length, itemHeight, measurementVersion]);

  const totalHeight = offsets[offsets.length - 1] ?? 0;
  const averageHeight = data.length > 0 ? totalHeight / data.length : itemHeight;
  const overscanPx = overscan * averageHeight;

  const updateVisibleRange = useCallback((scrollTop: number) => {
    const previousScroll = scrollTopRef.current;
    scrollTopRef.current = scrollTop;
    if (viewportHeight <= 0) {
      return;
    }

    const clamped = Math.max(0, Math.min(scrollTop, Math.max(0, totalHeight - viewportHeight)));
    const startIndex = binarySearchOffset(offsets, Math.max(0, clamped - overscanPx));
    const endIndex = binarySearchOffset(offsets, Math.min(totalHeight, clamped + viewportHeight + overscanPx)) + 1;

    setRange((previous) => {
      if (previous.start === startIndex && previous.end === endIndex) {
        return previous;
      }

      return { start: startIndex, end: Math.min(endIndex, data.length) };
    });

    if (previousScroll !== scrollTop) {
      setScrollVersion((version) => version + 1);
    }
  }, [data.length, offsets, overscanPx, totalHeight, viewportHeight]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      if (scrollFrame.current != null) {
        cancelAnimationFrame(scrollFrame.current);
      }

      const currentTop = element.scrollTop;
      scrollFrame.current = requestAnimationFrame(() => {
        onScroll?.(currentTop);
        updateVisibleRange(currentTop);
      });
    };

    updateVisibleRange(element.scrollTop);
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, onScroll, updateVisibleRange]);

  useEffect(() => {
    return () => {
      if (scrollFrame.current != null) {
        cancelAnimationFrame(scrollFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    if (viewportHeight > 0) {
      updateVisibleRange(scrollTopRef.current);
    }
  }, [viewportHeight, data.length, updateVisibleRange]);

  useEffect(() => {
    if (!onItemsRendered) {
      return;
    }

    if (range.end <= range.start) {
      onItemsRendered(-1, -1);
      return;
    }

    onItemsRendered(range.start, range.end - 1);
  }, [onItemsRendered, range.end, range.start]);

  const getItemElement = useCallback(
    (index: number) => nodesRef.current.get(index) ?? null,
    []
  );

  const scrollToIndex = useCallback(
    (index: number, align: 'auto' | 'start' | 'end' = 'auto') => {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      const start = offsets[index];
      const end = offsets[index + 1];
      const viewportEnd = element.scrollTop + viewportHeight;

      let target = element.scrollTop;

      if (align === 'start') {
        target = start;
      } else if (align === 'end') {
        target = end - viewportHeight;
      } else {
        if (start < element.scrollTop) {
          target = start;
        } else if (end > viewportEnd) {
          target = end - viewportHeight;
        }
      }

      target = Math.max(0, Math.min(target, Math.max(0, totalHeight - viewportHeight)));

      if ('scrollTo' in element) {
        try {
          element.scrollTo({ top: target, behavior: scrollBehavior });
          return;
        } catch (error) {
          // Some environments do not support the options bag. Fall through to assignment.
        }
      }

      element.scrollTop = target;
    },
    [containerRef, offsets, scrollBehavior, totalHeight, viewportHeight]
  );

  const navigation = useVirtualListNavigation({
    itemCount: data.length,
    getItemElement,
    scrollToIndex,
    estimatePageSize: () => {
      if (viewportHeight <= 0) {
        return 1;
      }

      return Math.max(1, Math.floor(viewportHeight / Math.max(averageHeight, 1)));
    },
  });

  const stickyCandidates = useMemo(() => {
    if (!stickyIndices || stickyIndices.length === 0) {
      return [] as number[];
    }

    const filtered = stickyIndices
      .filter((index) => index >= 0 && index < data.length)
      .sort((a, b) => a - b);

    return Array.from(new Set(filtered));
  }, [data.length, stickyIndices]);

  const stickyIndex = useMemo(() => {
    if (!stickyCandidates.length) {
      return null;
    }

    const scrollTop = scrollTopRef.current;
    let active: number | null = null;

    for (const index of stickyCandidates) {
      if (offsets[index] <= scrollTop) {
        active = index;
      } else {
        break;
      }
    }

    return active;
  }, [offsets, stickyCandidates, scrollVersion]);

  const showStickyOverlay =
    stickyIndex != null && range.start > stickyIndex && stickyIndex < data.length;

  const stickyOverlay = useMemo(() => {
    if (!showStickyOverlay || stickyIndex == null) {
      return null;
    }

    const item = data[stickyIndex];
    const rendered =
      (renderStickyItem && renderStickyItem(item, stickyIndex)) || children(item, stickyIndex);

    if (!React.isValidElement(rendered)) {
      return rendered;
    }

    const mergedStyle: CSSProperties = {
      ...(rendered.props.style ?? {}),
      position: 'sticky',
      top: 0,
      zIndex: 2,
    };

    return React.cloneElement(rendered, {
      key: `sticky-${getItemKey(item, stickyIndex, itemKey)}`,
      ref: (node: HTMLElement | null) => assignNode(stickyIndex, node, false),
      style: mergedStyle,
      tabIndex:
        rendered.props.tabIndex ?? (navigation.focusedIndex === stickyIndex ? 0 : -1),
      onFocus: (...args: unknown[]) => {
        if (typeof rendered.props.onFocus === 'function') {
          rendered.props.onFocus(...args);
        }

        navigation.onItemFocus(stickyIndex);
      },
      'data-virtual-sticky': true,
    });
  }, [
    assignNode,
    children,
    data,
    itemKey,
    navigation,
    renderStickyItem,
    showStickyOverlay,
    stickyIndex,
  ]);

  const renderedItems = useMemo(() => {
    const nodes: React.ReactNode[] = [];

    for (let index = range.start; index < range.end; index += 1) {
      const item = data[index];
      const element = children(item, index);
      const key = getItemKey(item, index, itemKey);

      if (!React.isValidElement(element)) {
        nodes.push(element);
        continue;
      }

      const mergedProps: Record<string, unknown> = {
        key,
        ref: (node: HTMLElement | null) => assignNode(index, node),
        'data-virtual-list-index': index,
      };

      if (element.props.onFocus) {
        const originalFocus = element.props.onFocus;
        mergedProps.onFocus = (...args: unknown[]) => {
          originalFocus(...args);
          navigation.onItemFocus(index);
        };
      } else {
        mergedProps.onFocus = () => navigation.onItemFocus(index);
      }

      if (element.props.tabIndex == null) {
        mergedProps.tabIndex = navigation.focusedIndex === index ? 0 : -1;
      }

      if (element.props.role == null && !isListTag(component)) {
        mergedProps.role = 'listitem';
      }

      nodes.push(React.cloneElement(element, mergedProps));
    }

    return nodes;
  }, [assignNode, children, component, data, itemKey, navigation, range.end, range.start]);

  const topPadding = offsets[range.start] ?? 0;
  const bottomPadding = totalHeight - (offsets[range.end] ?? totalHeight);

  const listRole = role ?? listPropsRole ?? (isListTag(component) ? 'list' : 'list');

  const outerClassName = [
    'virtual-list-container overflow-y-auto',
    containerPropsClassName,
    containerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const outerStyle: CSSProperties = {
    ...containerPropsStyle,
    ...containerStyle,
    height: height ?? containerStyle?.height ?? containerPropsStyle?.height,
  };

  const baseInnerStyle: CSSProperties = {
    position: 'relative',
    display: isListTag(component) ? 'block' : 'flex',
    flexDirection: 'column',
    ...listStyle,
    ...style,
  };
  const innerStyle: CSSProperties = {
    ...baseInnerStyle,
    ...listPropsStyle,
  };

  const InnerComponent = component;

  return (
    <div
      {...restContainerProps}
      className={outerClassName}
      style={outerStyle}
      ref={containerRef}
      onKeyDown={navigation.handleKeyDown}
      role="presentation"
    >
      {stickyHeader ? (
        <div className="virtual-list-sticky-header sticky top-0 z-10">
          {stickyHeader}
        </div>
      ) : null}
      {stickyOverlay}
      {React.createElement(
        InnerComponent,
        {
          ...restListProps,
          className: [className, listPropsClassName].filter(Boolean).join(' ') || undefined,
          style: innerStyle,
          role: listRole,
        },
        createSpacer(component, topPadding, 'start'),
        renderedItems,
        createSpacer(component, bottomPadding, 'end')
      )}
    </div>
  );
}

