import React, { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import { logEvent } from '../../../utils/analytics';
import GameLayout from '../GameLayout';
import VirtualPad from '../Games/common/VirtualPad';
import InputRemap from '../Games/common/input-remap/InputRemap';
import useInputMapping from '../Games/common/input-remap/useInputMapping';
import usePersistentState from '../../../hooks/usePersistentState';
import { consumeGameKey, shouldHandleGameKey } from '../../../utils/gameInput';
import { BlackjackGame, handValue, cardValue, calculateBustProbability, isSoft } from './engine';
import { recommendAction } from '../../../games/blackjack/coach';
import PracticeCount from './PracticeCount';

const CHIP_VALUES = [1, 5, 25, 100];
const CHIP_COLORS = {
  1: 'bg-kali-surface text-kali-text shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
  5: 'bg-kali-muted text-kali-text shadow-[0_0_12px_rgba(15,148,210,0.2)]',
  25: 'bg-kali-primary text-kali-inverse shadow-[0_0_14px_rgba(15,148,210,0.35)]',
  100: 'bg-kali-control text-kali-inverse shadow-[0_0_18px_rgba(15,148,210,0.45)]',
};

const CONTROL_BUTTON_BASE =
  'rounded bg-kali-muted text-kali-text transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus hover:bg-kali-primary hover:text-kali-inverse';

const DEFAULT_MAPPING = {
  deal: 'Enter',
  hit: 'h',
  stand: 's',
  double: 'd',
  split: 'p',
  surrender: 'r',
  chip1: '1',
  chip5: '2',
  chip25: '3',
  chip100: '4',
};

const ACTION_LABELS = {
  deal: 'Deal',
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
  chip1: '+1 chip',
  chip5: '+5 chip',
  chip25: '+25 chip',
  chip100: '+100 chip',
};

const Card = ({ card, faceDown, peeking }) => {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const prefersReduced = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    if (faceDown) {
      setFlipped(false);
    } else if (prefersReduced.current) {
      setFlipped(true);
    } else {
      requestAnimationFrame(() => setFlipped(true));
    }
  }, [faceDown, card]);

  return (
    <div
      className={`h-16 w-12 sm:h-24 sm:w-16 card ${flipped ? 'flipped' : ''} ${peeking || (faceDown && hovered) ? 'peek' : ''
        } animate-deal`}
      aria-label={faceDown ? 'Hidden card' : `${card.value}${card.suit}`}
      role="img"
      onMouseEnter={() => faceDown && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-face card-front" aria-hidden="true">{`${card.value}${card.suit}`}</div>
      <div className="card-face card-back" aria-hidden="true">?</div>
    </div>
  );
};

const BetChips = ({ amount }) => {
  const [chips, setChips] = useState([]);
  const stackRef = useRef(null);
  const prefersReduced = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    const newChips = [];
    let remaining = amount;
    const values = [...CHIP_VALUES].reverse();
    values.forEach((val) => {
      const count = Math.floor(remaining / val);
      remaining %= val;
      for (let i = 0; i < count; i += 1) {
        newChips.push({ val, id: `${val}-${i}-${amount}` });
      }
    });
    setChips(newChips);
  }, [amount]);

  useEffect(() => {
    if (!prefersReduced.current && stackRef.current) {
      const last = stackRef.current.lastElementChild;
      if (last) {
        requestAnimationFrame(() => last.classList.add('chip-pop'));
      }
    }
  }, [chips]);

  return (
    <div
      ref={stackRef}
      className="chip-stack relative h-10 w-10"
      aria-label={`Bet ${amount}`}
      role="img"
    >
      {chips.map((chip, index) => (
        <div
          key={chip.id}
          className={`chip ${CHIP_COLORS[chip.val]}`}
          style={{ top: `-${index * 2}px`, zIndex: index }}
          aria-hidden="true"
        >
          {chip.val}
        </div>
      ))}
    </div>
  );
};

// simple reducer so that game actions can be dispatched and extended easily
const gameReducer = (state, action) => {
  const game = state.gameRef.current;
  try {
    switch (action.type) {
      case 'hit':
        game.hit();
        break;
      case 'stand':
        game.stand();
        logEvent({ category: 'Blackjack', action: 'stand' });
        break;
      case 'double':
        game.double();
        logEvent({ category: 'Blackjack', action: 'double' });
        break;
      case 'split':
        game.split();
        logEvent({ category: 'Blackjack', action: 'split' });
        break;
      case 'surrender':
        game.surrender();
        break;
      default:
        break;
    }
  } catch (e) {
    state.setMessage(e.message);
  }
  // trigger re-render by bumping version
  return { ...state, version: state.version + 1 };
};

const Blackjack = ({ windowMeta, testDeck } = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const [penetration, setPenetration] = usePersistentState(
    'blackjack-penetration',
    0.75,
    (v) => typeof v === 'number' && v >= 0.5 && v <= 0.95,
  );
  const [deckCount, setDeckCount] = usePersistentState(
    'blackjack-decks',
    6,
    (v) => typeof v === 'number' && [1, 2, 4, 6, 8].includes(v),
  );
  const [hitSoft17, setHitSoft17] = usePersistentState(
    'blackjack-hit-soft-17',
    true,
    (v) => typeof v === 'boolean',
  );
  const [showHints, setShowHints] = usePersistentState(
    'blackjack-show-hints',
    true,
    (v) => typeof v === 'boolean',
  );
  const [showCount, setShowCount] = usePersistentState(
    'blackjack-show-count',
    false,
    (v) => typeof v === 'boolean',
  );
  const [showHistory, setShowHistory] = usePersistentState(
    'blackjack-show-history',
    false,
    (v) => typeof v === 'boolean',
  );
  const [soundEnabled, setSoundEnabled] = usePersistentState(
    'blackjack-sound',
    false,
    (v) => typeof v === 'boolean',
  );
  const [hapticsEnabled, setHapticsEnabled] = usePersistentState(
    'blackjack-haptics',
    false,
    (v) => typeof v === 'boolean',
  );
  const [bestStreak, setBestStreak] = usePersistentState(
    'bj_best_streak',
    0,
    (v) => typeof v === 'number',
  );
  const gameRef = useRef(null);
  if (!gameRef.current) {
    gameRef.current = new BlackjackGame({
      bankroll: 1000,
      penetration,
      decks: deckCount,
      hitSoft17,
    });
  }
  const [bet, setBet] = useState(0);
  const [lastBet, setLastBet] = usePersistentState(
    'blackjack-last-bet',
    0,
    (v) => typeof v === 'number' && v >= 0,
  );
  const [handCount, setHandCount] = useState(1);
  const [message, setMessage] = useState('');
  const [dealerHand, setDealerHand] = useState([]);
  const [playerHands, setPlayerHands] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showInsurance, setShowInsurance] = useState(false);
  const [stats, setStats] = useState(gameRef.current.stats);
  const [shuffling, setShuffling] = useState(false);
  const [runningCount, setRunningCount] = useState(gameRef.current.shoe.runningCount);
  const [shoeComposition, setShoeComposition] = useState({ ...gameRef.current.shoe.composition });
  const [practice, setPractice] = useState(false);
  const [dealerPeeking, setDealerPeeking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [history, setHistory] = useState([]);
  const [mapping, setKey] = useInputMapping('blackjack', DEFAULT_MAPPING);
  const shuffleTimeoutRef = useRef(null);
  const peekTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const presetDeckRef = useRef(testDeck);
  const settingsRef = useRef({ penetration, deckCount, hitSoft17 });

  useEffect(() => {
    presetDeckRef.current = testDeck;
  }, [testDeck]);

  useEffect(() => {
    settingsRef.current = { penetration, deckCount, hitSoft17 };
  }, [penetration, deckCount, hitSoft17]);

  const [, dispatch] = useReducer(gameReducer, {
    gameRef,
    setMessage,
    version: 0,
  });

  const bankroll = gameRef.current.bankroll;
  const inPlay = playerHands.length
    ? playerHands.reduce((sum, hand) => sum + hand.bet, 0)
    : 0;
  const reservedBet = playerHands.length === 0 ? bet * handCount : 0;
  const availableBankroll = Math.max(0, bankroll - reservedBet);
  const totalBankroll = bankroll + inPlay;
  const maxBet = Math.floor(bankroll / handCount);

  const update = useCallback(() => {
    setDealerHand([...gameRef.current.dealerHand]);
    setPlayerHands(gameRef.current.playerHands.map((h) => ({ ...h, cards: [...h.cards] })));
    setStats({ ...gameRef.current.stats });
    setCurrent(gameRef.current.current);
    setRunningCount(gameRef.current.shoe.runningCount);
    setShoeComposition({ ...gameRef.current.shoe.composition });
    setHistory([...gameRef.current.history]);
  }, []);

  const resetGame = useCallback(() => {
    if (shuffleTimeoutRef.current) {
      clearTimeout(shuffleTimeoutRef.current);
    }
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
    }
    const { penetration: nextPenetration, deckCount: nextDecks, hitSoft17: nextHitSoft17 } =
      settingsRef.current;
    gameRef.current = new BlackjackGame({
      bankroll: 1000,
      penetration: nextPenetration,
      decks: nextDecks,
      hitSoft17: nextHitSoft17,
    });
    setBet(0);
    setHandCount(1);
    setMessage('');
    setDealerHand([]);
    setPlayerHands([]);
    setCurrent(0);
    setShowInsurance(false);
    setStats(gameRef.current.stats);
    setShuffling(false);
    setRunningCount(gameRef.current.shoe.runningCount);
    setShoeComposition({ ...gameRef.current.shoe.composition });
    setHistory([]);
    setPractice(false);
  }, []);

  const playSound = useCallback(
    (type) => {
      if (!soundEnabled || typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        if (!audioRef.current) {
          audioRef.current = new AudioContext();
        }
        const ctx = audioRef.current;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const settings = {
          deal: { freq: 520, duration: 0.08 },
          hit: { freq: 620, duration: 0.08 },
          win: { freq: 820, duration: 0.12 },
          lose: { freq: 320, duration: 0.12 },
        };
        const { freq, duration } = settings[type] || settings.deal;
        oscillator.frequency.value = freq;
        oscillator.type = 'triangle';
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + duration);
      } catch {
        // ignore audio errors
      }
    },
    [soundEnabled],
  );

  const triggerHaptics = useCallback(
    (pattern) => {
      if (!hapticsEnabled || typeof navigator === 'undefined') return;
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    },
    [hapticsEnabled],
  );

  const adjustBet = useCallback(
    (delta) => {
      setBet((prev) => {
        const next = Math.max(0, prev + delta);
        const max = bankroll / handCount;
        return Math.min(next, max);
      });
    },
    [bankroll, handCount],
  );

  useEffect(() => {
    setBet((prev) => Math.min(prev, bankroll / handCount));
  }, [bankroll, handCount]);

  const start = useCallback(() => {
    if (paused) return;
    try {
      setShuffling(true);
      if (shuffleTimeoutRef.current) {
        clearTimeout(shuffleTimeoutRef.current);
      }
      shuffleTimeoutRef.current = window.setTimeout(() => setShuffling(false), 500);
      const preset = presetDeckRef.current;
      presetDeckRef.current = null;
      gameRef.current.startRound(bet, preset, handCount);
      setLastBet(bet);
      logEvent({ category: 'Blackjack', action: 'hand_start', value: bet * handCount });
      setMessage('');
      setShowInsurance(gameRef.current.dealerHand[0].value === 'A');
      update();
      playSound('deal');
      triggerHaptics(8);
      if (['A', '10', 'J', 'Q', 'K'].includes(gameRef.current.dealerHand[0].value)) {
        setDealerPeeking(true);
        if (peekTimeoutRef.current) {
          clearTimeout(peekTimeoutRef.current);
        }
        peekTimeoutRef.current = window.setTimeout(() => setDealerPeeking(false), 1000);
      }
    } catch (e) {
      setMessage(e.message);
    }
  }, [bet, handCount, paused, playSound, setLastBet, triggerHaptics, update]);

  const recommended = useCallback(() => {
    const hand = playerHands[current];
    if (!hand) return '';
    return recommendAction(hand, dealerHand[0], bankroll);
  }, [bankroll, current, dealerHand, playerHands]);

  const act = useCallback(
    (type) => {
      if (paused) return;
      const rec = recommended();
      if (rec && rec !== type) {
        logEvent({ category: 'Blackjack', action: 'deviation', label: `${rec}->${type}` });
      }
      setShowInsurance(false);
      dispatch({ type });
      setMessage('');
      update();
      if (type === 'hit' || type === 'double' || type === 'split') {
        playSound('hit');
        triggerHaptics(6);
      }
      if (gameRef.current.current >= gameRef.current.playerHands.length) {
        gameRef.current.playerHands.forEach((h) => {
          if (h.result) logEvent({ category: 'Blackjack', action: 'result', label: h.result });
        });
        const results = gameRef.current.playerHands.map((h) => h.result);
        const hasWin = results.includes('win');
        const hasPush = results.includes('push');
        if (hasWin) {
          playSound('win');
          triggerHaptics([10, 30, 10]);
        } else if (!hasPush) {
          playSound('lose');
          triggerHaptics(14);
        }
      }
    },
    [paused, playSound, recommended, triggerHaptics, update],
  );

  const takeInsurance = useCallback(() => {
    try {
      gameRef.current.takeInsurance();
      setShowInsurance(false);
      update();
    } catch (e) {
      setMessage(e.message);
    }
  }, [update]);

  const startPractice = useCallback(() => {
    setPractice(true);
    logEvent({ category: 'Blackjack', action: 'count_practice_start' });
  }, []);

  const endPractice = useCallback(() => {
    setPractice(false);
  }, []);

  useEffect(() => {
    gameRef.current.shoe.penetration = penetration;
    gameRef.current.shoe.shufflePoint = Math.floor(gameRef.current.shoe.cards.length * penetration);
  }, [penetration]);

  useEffect(() => {
    resetGame();
  }, [deckCount, hitSoft17, resetGame]);

  useEffect(() => {
    return () => {
      if (shuffleTimeoutRef.current) {
        clearTimeout(shuffleTimeoutRef.current);
      }
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (practice || paused) return;
      if (!shouldHandleGameKey(e, { isFocused })) return;
      const key = e.key;
      const lowerKey = key.toLowerCase();
      let handled = false;
      if (playerHands.length === 0 && bet >= 0) {
        if (lowerKey === mapping.chip1.toLowerCase()) {
          adjustBet(CHIP_VALUES[0]);
          handled = true;
        }
        if (lowerKey === mapping.chip5.toLowerCase()) {
          adjustBet(CHIP_VALUES[1]);
          handled = true;
        }
        if (lowerKey === mapping.chip25.toLowerCase()) {
          adjustBet(CHIP_VALUES[2]);
          handled = true;
        }
        if (lowerKey === mapping.chip100.toLowerCase()) {
          adjustBet(CHIP_VALUES[3]);
          handled = true;
        }
        if (lowerKey === mapping.deal.toLowerCase() && bet > 0) {
          start();
          handled = true;
        }
      }
      if (playerHands.length > 0) {
        if (lowerKey === mapping.hit.toLowerCase()) {
          act('hit');
          handled = true;
        }
        if (lowerKey === mapping.stand.toLowerCase()) {
          act('stand');
          handled = true;
        }
        if (lowerKey === mapping.double.toLowerCase()) {
          act('double');
          handled = true;
        }
        if (lowerKey === mapping.split.toLowerCase()) {
          act('split');
          handled = true;
        }
        if (lowerKey === mapping.surrender.toLowerCase()) {
          act('surrender');
          handled = true;
        }
      }
      if (handled) {
        consumeGameKey(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, adjustBet, bet, isFocused, mapping, paused, playerHands.length, practice, start]);

  const bustProbabilities = useMemo(
    () => playerHands.map((hand) => calculateBustProbability(hand.cards, shoeComposition)),
    [playerHands, shoeComposition],
  );

  const renderHand = (
    hand,
    { hideFirst, showProb, peeking = false, overlay = null, bustProb = 0 },
  ) => {
    const total = handValue(hand.cards);
    const soft = isSoft(hand.cards);
    const label = hideFirst ? '?' : soft ? `Soft ${total}` : `${total}`;
    return (
      <div
        className="relative flex flex-wrap items-center gap-2 sm:gap-3"
        title={showProb ? `Bust chance: ${(bustProb * 100).toFixed(1)}%` : undefined}
      >
        {hand.cards.map((card, idx) => (
          <Card
            key={idx}
            card={card}
            faceDown={hideFirst && idx === 1 && playerHands.length > 0 && current < playerHands.length}
            peeking={peeking && idx === 1}
          />
        ))}
        <div className="min-w-[2rem] rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-2 py-1 text-center text-sm sm:text-base text-kali-text">
          {label}
        </div>
        {hideFirst && (
          <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-muted)_70%,transparent)] px-2 py-1 text-[0.65rem] uppercase tracking-wide text-kali-muted">
            Hole card hidden
          </div>
        )}
        {overlay && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded border border-[color:color-mix(in_srgb,var(--kali-control)_35%,var(--kali-border))] bg-[var(--kali-control-overlay)] px-2 text-xs font-semibold text-[color:var(--kali-control)] shadow-[0_6px_20px_rgba(9,15,23,0.55)]">
            {overlay.toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  const rec = showHints ? recommended() : '';

  const statusMessage = useMemo(() => {
    if (playerHands.length === 0) return 'Place your bet to start the next round.';
    if (current < playerHands.length) {
      const handLabel =
        playerHands.length > 1 ? `Hand ${current + 1} of ${playerHands.length}` : 'Your hand';
      const insuranceNote = showInsurance ? 'Insurance is available.' : '';
      return `${handLabel}: choose your action.${insuranceNote ? ` ${insuranceNote}` : ''}`;
    }
    return 'Round settled. Adjust your bet or deal again.';
  }, [current, playerHands.length, showInsurance]);

  const displayMessage = message || statusMessage;

  const roundSummary = useMemo(() => {
    if (current < playerHands.length || history.length === 0) return '';
    const latest = history[history.length - 1];
    if (!latest) return '';
    const results = latest.playerHands
      .map((hand, index) => `P${index + 1} ${hand.result.toUpperCase()}`)
      .join(' · ');
    return `Results: ${results}`;
  }, [current, history, playerHands.length]);

  const outcomeLabel = useCallback((hand) => {
    if (hand.surrendered) return 'Surrender';
    if (hand.busted) return 'Bust';
    const total = handValue(hand.cards);
    const blackjack = hand.cards.length === 2 && total === 21 && hand.result === 'win';
    if (blackjack) return 'Blackjack';
    if (hand.result === 'win') return 'Win';
    if (hand.result === 'push') return 'Push';
    if (hand.result === 'lose') return 'Lose';
    return '';
  }, []);

  const recentHistory = useMemo(() => history.slice(-5).reverse(), [history]);

  const actionState = (hand) => ({
    hit: !hand.finished,
    stand: !hand.finished,
    double:
      hand.cards.length === 2 &&
      !hand.finished &&
      !hand.doubled &&
      gameRef.current.bankroll >= hand.bet,
    split:
      hand.cards.length === 2 &&
      !hand.finished &&
      cardValue(hand.cards[0]) === cardValue(hand.cards[1]) &&
      gameRef.current.bankroll >= hand.bet,
    surrender: hand.cards.length === 2 && !hand.finished && !hand.surrendered,
  });

  const currentHand = playerHands[current];
  const currentActions = currentHand ? actionState(currentHand) : null;

  const settingsPanel = useMemo(
    () => (
      <div className="space-y-3 text-sm text-kali-text">
        <div className="text-xs uppercase tracking-wide text-kali-control">Table rules</div>
        <label className="flex items-center justify-between gap-2">
          <span>Decks</span>
          <select
            value={deckCount}
            onChange={(e) => setDeckCount(parseInt(e.target.value, 10))}
            className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-surface)] px-2 py-1 text-kali-text"
            aria-label="Deck count"
          >
            {[1, 2, 4, 6, 8].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-2">
          <span>Dealer hits soft 17</span>
          <input
            type="checkbox"
            checked={hitSoft17}
            onChange={(e) => setHitSoft17(e.target.checked)}
            aria-label="Dealer hits soft 17"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Show hints</span>
          <input
            type="checkbox"
            checked={showHints}
            onChange={(e) => setShowHints(e.target.checked)}
            aria-label="Toggle basic strategy hints"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Show running count</span>
          <input
            type="checkbox"
            checked={showCount}
            onChange={(e) => setShowCount(e.target.checked)}
            aria-label="Toggle running count"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Show hand history</span>
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
            aria-label="Toggle hand history"
          />
        </div>
        <label className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Penetration</span>
          <input
            type="range"
            step="0.05"
            min="0.5"
            max="0.95"
            value={penetration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) setPenetration(val);
            }}
            className="h-1 w-28 accent-[var(--color-control-accent)]"
            aria-label="Penetration"
          />
          <span className="tabular-nums">{(penetration * 100).toFixed(0)}%</span>
        </label>
        <div className="text-xs uppercase tracking-wide text-kali-control">Feedback</div>
        <div className="flex items-center justify-between gap-2">
          <span>Sound cues</span>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            aria-label="Toggle sound cues"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Haptic cues</span>
          <input
            type="checkbox"
            checked={hapticsEnabled}
            onChange={(e) => setHapticsEnabled(e.target.checked)}
            aria-label="Toggle haptic cues"
          />
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-kali-control">Key remapping</div>
          <InputRemap mapping={mapping} setKey={setKey} actions={ACTION_LABELS} />
        </div>
      </div>
    ),
    [
      deckCount,
      hapticsEnabled,
      hitSoft17,
      mapping,
      penetration,
      setDeckCount,
      setHapticsEnabled,
      setHitSoft17,
      setKey,
      setPenetration,
      setShowCount,
      setShowHints,
      setShowHistory,
      setSoundEnabled,
      showCount,
      showHistory,
      showHints,
      soundEnabled,
    ],
  );

  const handlePadDirection = useCallback(
    ({ x, y }) => {
      if (practice || paused) return;
      if (playerHands.length === 0) {
        if (x > 0) adjustBet(1);
        if (x < 0) adjustBet(-1);
        if (y > 0 && handCount > 1) setHandCount((c) => Math.max(1, c - 1));
        if (y < 0) {
          if (bet > 0) start();
          else if (handCount < 4) setHandCount((c) => Math.min(4, c + 1));
        }
        return;
      }
      if (currentActions?.hit && y < 0) act('hit');
      else if (currentActions?.stand && y > 0) act('stand');
      else if (currentActions?.double && x > 0) act('double');
      else if (currentActions?.surrender && x < 0) act('surrender');
    },
    [act, adjustBet, bet, currentActions, handCount, paused, playerHands.length, practice, start],
  );

  const handlePadButton = useCallback(
    (button) => {
      if (practice || paused) return;
      if (playerHands.length === 0) {
        if (button === 'A' && bet > 0) start();
        if (button === 'B') adjustBet(5);
        return;
      }
      if (button === 'A' && currentActions?.hit) act('hit');
      else if (button === 'B' && currentActions?.stand) act('stand');
    },
    [act, adjustBet, bet, currentActions, paused, playerHands.length, practice, start],
  );

  const practiceView = (
    <PracticeCount onExit={endPractice} onBestStreakChange={setBestStreak} />
  );

  return (
    <GameLayout
      gameId="blackjack"
      score={totalBankroll}
      highScore={bestStreak}
      onPauseChange={setPaused}
      onRestart={resetGame}
      settingsPanel={settingsPanel}
      isFocused={isFocused}
    >
      {practice ? (
        practiceView
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[color:color-mix(in_srgb,var(--color-surface)_65%,transparent)] p-4 text-kali-text select-none">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
            <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
              Bankroll: {totalBankroll}
            </div>
            {playerHands.length === 0 ? (
              <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
                Reserved: {reservedBet}
              </div>
            ) : (
              <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
                In play: {inPlay}
              </div>
            )}
            <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
              Available: {availableBankroll}
            </div>
            <div
              className={`h-8 w-6 rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-muted)_88%,transparent)] ${shuffling ? 'shuffle' : ''
                }`}
              aria-hidden="true"
            ></div>
            {showCount && (
              <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
                RC: {runningCount}
              </div>
            )}
          </div>
          <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_78%,transparent)] px-3 py-1 text-center text-xs text-kali-muted">
            Rules: {deckCount} decks · Dealer {hitSoft17 ? 'hits' : 'stands'} soft 17 · Blackjack pays 3:2
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base">
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm sm:text-base font-medium`}
              onClick={() => setShowHints(!showHints)}
              aria-pressed={showHints}
            >
              {showHints ? 'Hide Hints' : 'Show Hints'}
            </button>
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm sm:text-base font-medium`}
              onClick={() => setShowCount(!showCount)}
              aria-pressed={showCount}
            >
              {showCount ? 'Hide Count' : 'Show Count'}
            </button>
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm sm:text-base font-medium`}
              onClick={() => setShowHistory((prev) => !prev)}
              aria-pressed={showHistory}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm sm:text-base font-medium`}
              onClick={startPractice}
            >
              Practice Count
            </button>
            <label
              htmlFor="penetration-slider"
              className="flex items-center gap-2 rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_78%,transparent)] px-2 py-1 text-xs sm:text-sm text-kali-text"
            >
              <span className="uppercase tracking-wide">Pen</span>
              <input
                id="penetration-slider"
                type="range"
                step="0.05"
                min="0.5"
                max="0.95"
                value={penetration}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val)) setPenetration(val);
                }}
                className="h-1 w-24 accent-[var(--color-control-accent)]"
                aria-label="Penetration"
              />
              <span>{(penetration * 100).toFixed(0)}%</span>
            </label>
          </div>
          {playerHands.length === 0 ? (
            <div className="flex w-full max-w-xl flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3" aria-live="polite" role="status">
                <span>
                  Bet: {bet} per hand · Total: {bet * handCount}
                </span>
                <BetChips amount={bet} />
              </div>
              <div className="text-xs text-kali-muted">Max per hand: {maxBet}</div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {CHIP_VALUES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`chip transition ${CHIP_COLORS[v]} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${bet + v > maxBet
                        ? 'cursor-not-allowed opacity-40'
                        : 'hover:scale-105 hover:bg-kali-primary hover:text-kali-inverse hover:shadow-[0_0_18px_rgba(15,148,210,0.45)]'
                      }`}
                    onClick={() => bet + v <= maxBet && setBet(bet + v)}
                    aria-label={`Add ${v} chip`}
                    disabled={bet + v > maxBet}
                  >
                    {v}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm font-medium`}
                  onClick={() => setBet(0)}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm font-medium`}
                  onClick={() => setBet(maxBet)}
                  disabled={maxBet === 0}
                >
                  Max
                </button>
                {lastBet > 0 && (
                  <button
                    type="button"
                    className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm font-medium`}
                    onClick={() => setBet(Math.min(lastBet, maxBet))}
                    disabled={maxBet === 0}
                  >
                    Repeat {lastBet}
                  </button>
                )}
                <label
                  htmlFor="hand-count"
                  className="flex items-center gap-2 rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_78%,transparent)] px-2 py-1 text-xs sm:text-sm text-kali-text"
                >
                  <span className="text-sm">Hands</span>
                  <input
                    id="hand-count"
                    type="number"
                    min="1"
                    max="4"
                    value={handCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) setHandCount(val);
                    }}
                    className="w-12 rounded border border-[color:var(--kali-border)] bg-[var(--kali-surface)] px-1 text-kali-text transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                    aria-label="Hand count"
                  />
                </label>
                <button
                  type="button"
                  className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-kali-muted disabled:hover:text-kali-text`}
                  onClick={start}
                  disabled={bet === 0}
                >
                  Deal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-xl flex-col items-center gap-2 text-center">
              <div className="text-sm uppercase tracking-wide text-kali-control">Dealer</div>
              {renderHand({
                cards: dealerHand,
              }, {
                hideFirst: current < playerHands.length,
                showProb: false,
                peeking: dealerPeeking,
              })}
            </div>
          )}
          {playerHands.map((hand, idx) => {
            const isActive = idx === current && current < playerHands.length;
            const resultLabel = outcomeLabel(hand);
            return (
              <div
                key={idx}
                className={`flex w-full max-w-xl flex-col items-center gap-2 rounded-xl border border-transparent px-3 py-2 ${isActive
                    ? 'border-[color:color-mix(in_srgb,var(--kali-primary)_55%,var(--kali-border))] bg-[color:color-mix(in_srgb,var(--color-surface)_72%,transparent)] shadow-[0_0_16px_rgba(15,148,210,0.2)]'
                    : ''
                  }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="text-sm uppercase tracking-wide text-kali-control">
                  {`Player${playerHands.length > 1 ? ` ${idx + 1}` : ''}`}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <BetChips amount={hand.bet} />
                  {renderHand(hand, {
                    hideFirst: false,
                    showProb: true,
                    peeking: false,
                    overlay: isActive && showHints ? rec : null,
                    bustProb: bustProbabilities[idx] || 0,
                  })}
                </div>
                {resultLabel && (
                  <div className="rounded border border-[color:color-mix(in_srgb,var(--kali-primary)_35%,var(--kali-border))] bg-[var(--kali-control-overlay)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-kali-text">
                    {resultLabel}
                  </div>
                )}
                {isActive && playerHands.length > 0 && (
                  <div className="flex w-full flex-wrap items-center justify-center gap-2">
                    {['hit', 'stand', 'double', 'split', 'surrender'].map((type) => {
                      const isRecommended = rec === type;
                      const available = actionState(hand)[type];
                      const labels = {
                        hit: { text: 'Hit', shortcut: mapping.hit || 'H' },
                        stand: { text: 'Stand', shortcut: mapping.stand || 'S' },
                        double: { text: 'Double', shortcut: mapping.double || 'D' },
                        split: { text: 'Split', shortcut: mapping.split || 'P' },
                        surrender: { text: 'Surrender', shortcut: mapping.surrender || 'R' },
                      };
                      const { text, shortcut } = labels[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm sm:text-base font-medium disabled:cursor-not-allowed disabled:opacity-50 ${isRecommended
                              ? 'bg-kali-primary text-kali-inverse shadow-[0_0_18px_rgba(15,148,210,0.45)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_85%,transparent)]'
                              : ''
                            }`}
                          onClick={() => act(type)}
                          disabled={!available}
                          aria-keyshortcuts={shortcut}
                          title={`Press ${shortcut.toUpperCase()} to ${text}`}
                        >
                          {text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {showInsurance && current < playerHands.length && (
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-medium`}
              onClick={takeInsurance}
            >
              Take Insurance
            </button>
          )}
          <div className="mt-2 text-center text-base sm:text-lg" aria-live="polite" role="status">
            {displayMessage}
          </div>
          {roundSummary && (
            <div className="text-center text-xs uppercase tracking-wide text-kali-control">
              {roundSummary}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded border border-[color:color-mix(in_srgb,var(--kali-control)_35%,var(--kali-border))] bg-[var(--kali-control-overlay)] px-4 py-2 text-sm sm:text-base text-kali-text">
            <span>Wins: {stats.wins}</span>
            <span>Losses: {stats.losses}</span>
            <span>Pushes: {stats.pushes}</span>
          </div>
          {showHistory && recentHistory.length > 0 && (
            <div className="w-full max-w-xl rounded border border-[color:color-mix(in_srgb,var(--kali-control)_35%,var(--kali-border))] bg-[color:color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-4 py-3 text-xs text-kali-text">
              <div className="mb-2 text-xs uppercase tracking-wide text-kali-control">
                Recent hands
              </div>
              <ul className="space-y-2">
                {recentHistory.map((round, roundIndex) => (
                  <li key={`${history.length}-${roundIndex}`} className="space-y-1">
                    <div>
                      Dealer: {round.dealer.map((c) => `${c.value}${c.suit}`).join(' ')} (
                      {handValue(round.dealer)})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {round.playerHands.map((hand, handIndex) => (
                        <span key={`${roundIndex}-${handIndex}`} className="rounded bg-black/20 px-2 py-0.5">
                          {`P${handIndex + 1}: ${hand.result.toUpperCase()} ${handValue(hand.cards)} (bet ${hand.bet})`}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-2 sm:hidden">
            <VirtualPad onDirection={handlePadDirection} onButton={handlePadButton} />
          </div>
        </div>
      )}
    </GameLayout>
  );
};

export default Blackjack;
