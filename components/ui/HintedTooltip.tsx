"use client";

import React, {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import DelayedTooltip from './DelayedTooltip';
import usePersistentState from '../../hooks/usePersistentState';

type TriggerRenderProps = {
  getTriggerProps: <T extends Record<string, unknown>>(props?: T) => T;
  hintId: string;
  showHintOnce: () => void;
  hasSeenHint: boolean;
};

type HintedTooltipProps = {
  storageKey: string;
  content: ReactNode;
  delay?: number;
  autoHideMs?: number;
  children: (props: TriggerRenderProps) => React.ReactElement;
};

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const mergeCallbacks = <E,>(
  first?: (event: E) => void,
  second?: (event: E) => void,
) => {
  if (!first && !second) return undefined;
  return (event: E) => {
    if (typeof first === 'function') first(event);
    if (typeof second === 'function') second(event);
  };
};

const assignRef = <T extends HTMLElement | null>(
  baseRef: ((node: T) => void) | undefined,
  userRef: ((instance: T) => void) | React.MutableRefObject<T> | null | undefined,
) => {
  if (!baseRef && !userRef) {
    return undefined;
  }

  return (node: T) => {
    if (typeof baseRef === 'function') {
      baseRef(node);
    }
    if (typeof userRef === 'function') {
      userRef(node);
    } else if (userRef && 'current' in userRef) {
      (userRef as React.MutableRefObject<T>).current = node;
    }
  };
};

const HintedTooltip: React.FC<HintedTooltipProps> = ({
  storageKey,
  content,
  delay,
  autoHideMs = 5000,
  children,
}) => {
  const generatedId = useId();
  const hintId = useMemo(
    () => `hint-${generatedId.replace(/[:]/g, '-')}`,
    [generatedId],
  );

  const [hasSeenHint, setHasSeenHint] = usePersistentState<boolean>(
    `onboarding:${storageKey}`,
    false,
    isBoolean,
  );
  const [manualVisible, setManualVisible] = useState(false);

  const markSeen = useCallback(() => {
    if (!hasSeenHint) {
      setHasSeenHint(true);
    }
  }, [hasSeenHint, setHasSeenHint]);

  const showHintOnce = useCallback(() => {
    if (!hasSeenHint) {
      setManualVisible(true);
      setHasSeenHint(true);
    }
  }, [hasSeenHint, setHasSeenHint]);

  useEffect(() => {
    if (!manualVisible) return undefined;
    const timer = window.setTimeout(() => {
      setManualVisible(false);
    }, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [manualVisible, autoHideMs]);

  return (
    <DelayedTooltip content={content} delay={delay} forceVisible={manualVisible}>
      {(triggerProps) => {
        const getTriggerProps = <T extends Record<string, unknown>>(props?: T) => {
          const {
            ref: userRef,
            onMouseEnter,
            onMouseLeave,
            onFocus,
            onBlur,
            ...rest
          } = (props || {}) as Record<string, unknown>;

          return {
            ...triggerProps,
            ...rest,
            ref: assignRef(triggerProps.ref, userRef as unknown as typeof triggerProps.ref),
            onMouseEnter: mergeCallbacks(triggerProps.onMouseEnter, (event) => {
              markSeen();
              if (typeof onMouseEnter === 'function') {
                (onMouseEnter as (e: unknown) => void)(event);
              }
            }),
            onMouseLeave: mergeCallbacks(triggerProps.onMouseLeave, onMouseLeave as (e: unknown) => void),
            onFocus: mergeCallbacks(triggerProps.onFocus, (event) => {
              markSeen();
              if (typeof onFocus === 'function') {
                (onFocus as (e: unknown) => void)(event);
              }
            }),
            onBlur: mergeCallbacks(triggerProps.onBlur, onBlur as (e: unknown) => void),
          } as T;
        };

        const element = children({
          getTriggerProps,
          hintId,
          showHintOnce,
          hasSeenHint,
        });

        return (
          <>
            {element}
            <span id={hintId} className="sr-only">
              {content}
            </span>
          </>
        );
      }}
    </DelayedTooltip>
  );
};

export default HintedTooltip;
