'use client';

import React, { useEffect, useMemo } from 'react';
import { trackEvent } from '@/lib/analytics-client';

export type AdvisorContext = {
  hashTypeId: string;
  attackMode: string;
  ruleSet: string;
  mask: string;
  maskStats: {
    count: number;
    time: number;
  };
  wordlist: string;
  pattern: string;
  maskModeActive: boolean;
};

export type AdvisorMessage = {
  id: string;
  defaultMessage: string;
};

export type AdvisorRule = {
  id: string;
  message: AdvisorMessage;
  tone: 'info' | 'caution';
  test: (context: AdvisorContext) => boolean;
};

export const advisorRules: readonly AdvisorRule[] = [
  {
    id: 'hash-type-bcrypt',
    tone: 'info',
    message: {
      id: 'hashcat.tip.bcryptSlow',
      defaultMessage:
        'bcrypt hashes are intentionally slow. Training against them highlights how adaptive hashing increases verification cost.',
    },
    test: (context) => context.hashTypeId === '3200',
  },
  {
    id: 'mask-required',
    tone: 'caution',
    message: {
      id: 'hashcat.tip.maskRequired',
      defaultMessage:
        'Brute-force style modes need a mask to stay within a safe demo space. Add tokens like ?l or ?d to focus the simulation.',
    },
    test: (context) => context.maskModeActive && !context.mask,
  },
  {
    id: 'mask-large-space',
    tone: 'caution',
    message: {
      id: 'hashcat.tip.maskLargeSpace',
      defaultMessage:
        'This mask opens a very large candidate space. Use the estimate to discuss why narrowing patterns keeps demos responsible.',
    },
    test: (context) => context.maskStats.count > 100_000_000,
  },
  {
    id: 'rules-enabled',
    tone: 'info',
    message: {
      id: 'hashcat.tip.rulesEnabled',
      defaultMessage:
        'Rule files mutate dictionary entries for experimentation. Review the sample rules to explain each transformation step.',
    },
    test: (context) => context.ruleSet !== 'none',
  },
  {
    id: 'wordlist-missing',
    tone: 'info',
    message: {
      id: 'hashcat.tip.wordlistMissing',
      defaultMessage:
        'Straight mode demonstrates best when paired with a curated wordlist. The demo includes safe stand-ins like rockyou.txt.',
    },
    test: (context) => context.attackMode === '0' && !context.wordlist,
  },
  {
    id: 'pattern-present',
    tone: 'info',
    message: {
      id: 'hashcat.tip.patternPresent',
      defaultMessage:
        'Generated wordlists stay in-browser. Short patterns keep downloads quick and reinforce how pattern design shapes results.',
    },
    test: (context) => Boolean(context.pattern.trim()),
  },
] as const;

export type HashcatAdvisorProps = AdvisorContext;

const toneStyles: Record<AdvisorRule['tone'], string> = {
  info: 'border-sky-500/40 bg-sky-500/5 text-sky-100',
  caution: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
};

const HashcatAdvisor: React.FC<HashcatAdvisorProps> = (props) => {
  const {
    hashTypeId,
    attackMode,
    ruleSet,
    mask,
    maskStats,
    wordlist,
    pattern,
    maskModeActive,
  } = props;

  const context = useMemo(
    () => ({
      hashTypeId,
      attackMode,
      ruleSet,
      mask,
      maskStats: {
        count: maskStats.count,
        time: maskStats.time,
      },
      wordlist,
      pattern,
      maskModeActive,
    }),
    [
      hashTypeId,
      attackMode,
      ruleSet,
      mask,
      maskStats.count,
      maskStats.time,
      wordlist,
      pattern,
      maskModeActive,
    ],
  );

  const tips = useMemo(
    () =>
      advisorRules.filter((rule) => rule.test(context)).map((rule) => ({
        id: rule.id,
        tone: rule.tone,
        message: rule.message,
      })),
    [context],
  );

  useEffect(() => {
    const analyticsEnabled =
      typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
    if (!tips.length || !analyticsEnabled) {
      return;
    }
    trackEvent('hashcat_tip_impression', {
      rules: tips.map((tip) => tip.id).join(','),
      mask: context.mask ? 'present' : 'absent',
    });
  }, [tips, context.mask]);

  return (
    <section
      aria-label="Hashcat advisor"
      className="w-full max-w-md rounded border border-white/10 bg-black/40 p-4 text-xs text-white/90"
    >
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
        Strategy Advisor
      </h2>
      <div aria-live="polite" role="status" className="space-y-2">
        {tips.length ? (
          tips.map((tip) => (
            <p
              key={tip.id}
              className={`rounded border px-3 py-2 leading-relaxed ${toneStyles[tip.tone]}`}
              data-testid={`advisor-tip-${tip.id}`}
            >
              {tip.message.defaultMessage}
            </p>
          ))
        ) : (
          <p className="rounded border border-white/10 bg-white/5 px-3 py-2 text-white/80">
            This advisor surfaces general guidance for the training lab. Adjust the
            options above to explore how strategy notes change without leaving the
            safe simulation.
          </p>
        )}
      </div>
    </section>
  );
};

export default HashcatAdvisor;
