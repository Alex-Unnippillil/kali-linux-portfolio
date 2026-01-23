import React, { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import ReactGA from 'react-ga4';
import GameLayout from '../GameLayout';
import VirtualPad from '../Games/common/VirtualPad';
import InputRemap from '../Games/common/input-remap/InputRemap';
import useInputMapping from '../Games/common/input-remap/useInputMapping';
import { BlackjackGame, handValue, cardValue, Shoe } from './engine';
import { recommendAction } from '../../../games/blackjack/coach';

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
      className={`h-16 w-12 sm:h-24 sm:w-16 card ${flipped ? 'flipped' : ''} ${
        peeking || (faceDown && hovered) ? 'peek' : ''
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
        ReactGA.event({ category: 'Blackjack', action: 'stand' });
        break;
      case 'double':
        game.double();
        ReactGA.event({ category: 'Blackjack', action: 'double' });
        break;
      case 'split':
        game.split();
        ReactGA.event({ category: 'Blackjack', action: 'split' });
        break;
      case 'surrender':
        game.surrender();
        break;
      default:
        break;
    }
  } catch (e) {
    state.setError(e.message);
  }
  // trigger re-render by bumping version
  return { ...state, version: state.version + 1 };
};

const Blackjack = ({ testPresetDeck } = {}) => {
  const [penetration, setPenetration] = useState(0.75);
  const gameRef = useRef(new BlackjackGame({ bankroll: 1000, penetration }));
  const [bet, setBet] = useState(0);
  const [handCount, setHandCount] = useState(1);
  const [message, setMessage] = useState('Place your bet');
  const [errorMessage, setErrorMessage] = useState('');
  const [dealerHand, setDealerHand] = useState([]);
  const [playerHands, setPlayerHands] = useState([]);
  const [current, setCurrent] = useState(0);
  const [insurancePending, setInsurancePending] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const [revealDealerHoleCard, setRevealDealerHoleCard] = useState(false);
  const [lastRoundNet, setLastRoundNet] = useState(0);
  const [stats, setStats] = useState(gameRef.current.stats);
  const [showHints, setShowHints] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [runningCount, setRunningCount] = useState(0);
  const [practice, setPractice] = useState(false);
  const practiceShoe = useRef(new Shoe(1));
  const [practiceCard, setPracticeCard] = useState(null);
  const [practiceGuess, setPracticeGuess] = useState('');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bj_best_streak');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });
  const [practiceFeedback, setPracticeFeedback] = useState('');
  const [dealerPeeking, setDealerPeeking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mapping, setKey] = useInputMapping('blackjack', DEFAULT_MAPPING);
  const shuffleTimerRef = useRef(null);
  const peekTimerRef = useRef(null);

  const [, dispatch] = useReducer(gameReducer, {
    gameRef,
    setError: setErrorMessage,
    version: 0,
  });

  const bankroll = gameRef.current.bankroll;
  const availableBankroll = bankroll - (playerHands.length === 0 ? bet * handCount : 0);

  const update = useCallback(() => {
    setDealerHand([...gameRef.current.dealerHand]);
    setPlayerHands(gameRef.current.playerHands.map((h) => ({ ...h, cards: [...h.cards] })));
    setStats({ ...gameRef.current.stats });
    setCurrent(gameRef.current.current);
    setRunningCount(gameRef.current.shoe.runningCount);
    setInsurancePending(gameRef.current.insurancePending);
    setRoundComplete(gameRef.current.roundComplete);
    setRevealDealerHoleCard(gameRef.current.revealDealerHoleCard);
    setLastRoundNet(gameRef.current.lastRoundNet);
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current = new BlackjackGame({ bankroll: 1000, penetration });
    setBet(0);
    setHandCount(1);
    setMessage('Place your bet');
    setDealerHand([]);
    setPlayerHands([]);
    setCurrent(0);
    setInsurancePending(false);
    setRoundComplete(false);
    setRevealDealerHoleCard(false);
    setLastRoundNet(0);
    setStats(gameRef.current.stats);
    setShuffling(false);
    setRunningCount(gameRef.current.shoe.runningCount);
    setPractice(false);
    setPracticeFeedback('');
    setPracticeGuess('');
    setPracticeCard(null);
    setErrorMessage('');
  }, [penetration]);

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

  const start = useCallback(() => {
    if (paused) return;
    try {
      setShuffling(true);
      if (shuffleTimerRef.current) {
        clearTimeout(shuffleTimerRef.current);
      }
      shuffleTimerRef.current = setTimeout(() => setShuffling(false), 500);
      const preset =
        testPresetDeck ||
        (typeof window !== 'undefined' &&
          process.env.NODE_ENV === 'test' &&
          window.__BJ_PRESET_DECK__);
      gameRef.current.startRound(bet, preset, handCount);
      ReactGA.event({ category: 'Blackjack', action: 'hand_start', value: bet * handCount });
      setErrorMessage('');
      update();
      if (['A', '10', 'J', 'Q', 'K'].includes(gameRef.current.dealerHand[0].value)) {
        setDealerPeeking(true);
        if (peekTimerRef.current) {
          clearTimeout(peekTimerRef.current);
        }
        peekTimerRef.current = setTimeout(() => setDealerPeeking(false), 1000);
      }
    } catch (e) {
      setErrorMessage(e.message);
    }
  }, [bet, handCount, paused, testPresetDeck, update]);

  const actionState = (hand) => {
    if (!hand || roundComplete || insurancePending) {
      return { hit: false, stand: false, double: false, split: false, surrender: false };
    }
    return {
      hit: !hand.finished && !hand.blackjack,
      stand: !hand.finished,
      double:
        hand.cards.length === 2 &&
        !hand.finished &&
        !hand.doubled &&
        !hand.blackjack &&
        gameRef.current.bankroll >= hand.bet,
      split:
        hand.cards.length === 2 &&
        !hand.finished &&
        !hand.blackjack &&
        hand.cards[0].value === hand.cards[1].value &&
        gameRef.current.bankroll >= hand.bet,
      surrender:
        hand.cards.length === 2 &&
        !hand.finished &&
        !hand.surrendered &&
        !hand.blackjack &&
        !hand.isSplit,
    };
  };

  const currentHand = playerHands[current];
  const currentActions = currentHand ? actionState(currentHand) : null;

  const recommended = useCallback(() => {
    const hand = playerHands[current];
    if (!hand) return '';
    return recommendAction(hand, dealerHand[0], bankroll);
  }, [bankroll, current, dealerHand, playerHands]);

  const act = useCallback(
    (type) => {
      if (paused) return;
      if (!currentActions?.[type]) return;
      const rec = recommended();
      if (rec && rec !== type) {
        ReactGA.event({ category: 'Blackjack', action: 'deviation', label: `${rec}->${type}` });
      }
      dispatch({ type });
      update();
      if (gameRef.current.roundComplete) {
        gameRef.current.playerHands.forEach((h) => {
          if (h.result) ReactGA.event({ category: 'Blackjack', action: 'result', label: h.result });
        });
      }
    },
    [currentActions, paused, recommended, update],
  );

  const takeInsurance = useCallback(() => {
    try {
      gameRef.current.takeInsurance();
      setErrorMessage('');
      update();
    } catch (e) {
      setErrorMessage(e.message);
    }
  }, [update]);

  const declineInsurance = useCallback(() => {
    try {
      gameRef.current.declineInsurance();
      setErrorMessage('');
      update();
    } catch (e) {
      setErrorMessage(e.message);
    }
  }, [update]);

  const startPractice = useCallback(() => {
    practiceShoe.current.shuffle();
    setStreak(0);
    setPracticeCard(practiceShoe.current.draw());
    setPractice(true);
    setPracticeFeedback('');
    ReactGA.event({ category: 'Blackjack', action: 'count_practice_start' });
  }, []);

  const submitPractice = useCallback(() => {
    const guess = parseInt(practiceGuess, 10);
    const actual = practiceShoe.current.runningCount;
    if (guess === actual) {
      setStreak((s) => {
        const newStreak = s + 1;
        setBestStreak((b) => (newStreak > b ? newStreak : b));
        return newStreak;
      });
      setPracticeFeedback(`Correct! Count is ${actual}`);
    } else {
      ReactGA.event({ category: 'Blackjack', action: 'count_streak', value: streak });
      setStreak(0);
      setPracticeFeedback(`Nope. Count is ${actual}`);
    }
    setPracticeGuess('');
    setPracticeCard(practiceShoe.current.draw());
  }, [practiceGuess, streak]);

  const endPractice = useCallback(() => {
    if (streak > 0) {
      ReactGA.event({ category: 'Blackjack', action: 'count_streak', value: streak });
    }
    setPractice(false);
  }, [streak]);

  useEffect(() => {
    gameRef.current.shoe.penetration = penetration;
    gameRef.current.shoe.shufflePoint = Math.floor(gameRef.current.shoe.cards.length * penetration);
  }, [penetration]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bj_best_streak', bestStreak.toString());
    }
  }, [bestStreak]);

  useEffect(() => {
    const onKey = (e) => {
      if (practice || paused) return;
      const key = e.key;
      if (playerHands.length === 0 && bet >= 0) {
        if (key === mapping.chip1) adjustBet(CHIP_VALUES[0]);
        if (key === mapping.chip5) adjustBet(CHIP_VALUES[1]);
        if (key === mapping.chip25) adjustBet(CHIP_VALUES[2]);
        if (key === mapping.chip100) adjustBet(CHIP_VALUES[3]);
        if (key === mapping.deal && bet > 0) start();
      }
      if (playerHands.length > 0 && currentActions) {
        if (key.toLowerCase() === mapping.hit.toLowerCase() && currentActions.hit) act('hit');
        if (key.toLowerCase() === mapping.stand.toLowerCase() && currentActions.stand) act('stand');
        if (key.toLowerCase() === mapping.double.toLowerCase() && currentActions.double) act('double');
        if (key.toLowerCase() === mapping.split.toLowerCase() && currentActions.split) act('split');
        if (key.toLowerCase() === mapping.surrender.toLowerCase() && currentActions.surrender)
          act('surrender');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, adjustBet, bet, currentActions, mapping, paused, playerHands.length, practice, start]);

  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  const bustProbability = (hand) => {
    const total = handValue(hand.cards);
    const remaining = gameRef.current.shoe.cards;
    const bustCards = remaining.filter((c) => cardValue(c) + total > 21).length;
    return remaining.length ? bustCards / remaining.length : 0;
  };

  const renderHand = (hand, hideFirst, showProb, peeking = false, overlay = null, totalOverride = null, testId) => (
    <div
      data-testid={testId}
      className="relative flex flex-wrap items-center gap-2 sm:gap-3"
      title={showProb ? `Bust chance: ${(bustProbability(hand) * 100).toFixed(1)}%` : undefined}
    >
      {hand.cards.map((card, idx) => (
        <div key={`${card.value}-${card.suit}-${idx}`} data-testid={`${testId}-card-${idx}`}>
          <Card
            card={card}
            faceDown={hideFirst && idx === 1 && playerHands.length > 0 && current < playerHands.length}
            peeking={peeking && idx === 1}
          />
        </div>
      ))}
      <div className="min-w-[2rem] rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-2 py-1 text-center text-sm sm:text-base text-kali-text">
        {totalOverride ?? handValue(hand.cards)}
      </div>
      {overlay && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded border border-[color:color-mix(in_srgb,var(--kali-control)_35%,var(--kali-border))] bg-[var(--kali-control-overlay)] px-2 text-xs font-semibold text-[color:var(--kali-control)] shadow-[0_6px_20px_rgba(9,15,23,0.55)]">
          {overlay.toUpperCase()}
        </div>
      )}
    </div>
  );

  const rec = showHints ? recommended() : '';
  const statusMessage = useMemo(() => {
    if (playerHands.length === 0) return 'Place your bet';
    if (insurancePending) return 'Insurance?';
    if (dealerPeeking) return 'Dealer checks for blackjack';
    if (roundComplete) {
      const sign = lastRoundNet >= 0 ? '+' : '';
      return `Round complete: ${sign}${lastRoundNet}`;
    }
    return 'Your move';
  }, [dealerPeeking, insurancePending, lastRoundNet, playerHands.length, roundComplete]);

  const displayMessage = errorMessage || statusMessage;

  useEffect(() => {
    setMessage(displayMessage);
  }, [displayMessage]);

  useEffect(() => {
    if (!errorMessage) return undefined;
    const timer = setTimeout(() => setErrorMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const settingsPanel = useMemo(
    () => (
      <div className="space-y-3 text-sm text-kali-text">
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
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-kali-control">Key remapping</div>
          <InputRemap mapping={mapping} setKey={setKey} actions={ACTION_LABELS} />
        </div>
      </div>
    ),
    [mapping, penetration, setKey, setPenetration, setShowCount, setShowHints, showCount, showHints],
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[color:color-mix(in_srgb,var(--color-surface)_65%,transparent)] p-4 text-kali-text select-none">
      {practiceCard && (
        <div className="text-4xl">{`${practiceCard.value}${practiceCard.suit}`}</div>
      )}
      <input
        type="number"
        value={practiceGuess}
        onChange={(e) => setPracticeGuess(e.target.value)}
        className="w-24 rounded border border-[color:var(--kali-border)] bg-[var(--kali-surface)] px-2 py-1 text-center text-kali-text transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        aria-label="Enter running count guess"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-medium`}
          onClick={submitPractice}
        >
          Submit
        </button>
        <button
          type="button"
          className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-medium`}
          onClick={endPractice}
        >
          Exit
        </button>
      </div>
      {practiceFeedback && <div className="text-center text-sm">{practiceFeedback}</div>}
      <div className="text-sm sm:text-base">Streak: {streak}</div>
      <div className="text-sm sm:text-base">Best: {bestStreak}</div>
      <div className="text-sm sm:text-base">RC: {practiceShoe.current.runningCount}</div>
      <div className="text-center text-xs sm:text-sm">
        {Object.entries(practiceShoe.current.composition)
          .map(([v, c]) => `${v}:${c}`)
          .join(' ')}
      </div>
    </div>
  );

  return (
    <GameLayout
      gameId="blackjack"
      score={availableBankroll}
      highScore={bestStreak}
      onPauseChange={setPaused}
      onRestart={resetGame}
      settingsPanel={settingsPanel}
    >
      {practice ? (
        practiceView
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[color:color-mix(in_srgb,var(--color-surface)_65%,transparent)] p-4 text-kali-text select-none">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
            <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
              Bankroll: {availableBankroll}
            </div>
            <div
              className={`h-8 w-6 rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-muted)_88%,transparent)] ${
                shuffling ? 'shuffle' : ''
              }`}
              aria-hidden="true"
            ></div>
            {showCount && (
              <div className="rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_82%,transparent)] px-3 py-1 text-kali-text">
                RC: {runningCount}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base">
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm sm:text-base font-medium`}
              onClick={() => setShowHints(!showHints)}
            >
              {showHints ? 'Hide Hints' : 'Show Hints'}
            </button>
            <button
              type="button"
              className={`${CONTROL_BUTTON_BASE} px-2 py-1 text-sm sm:text-base font-medium`}
              onClick={() => setShowCount(!showCount)}
            >
              {showCount ? 'Hide Count' : 'Show Count'}
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
                  Bet: {bet} x {handCount}
                </span>
                <BetChips amount={bet} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {CHIP_VALUES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`chip transition ${CHIP_COLORS[v]} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                      bet + v > bankroll / handCount
                        ? 'cursor-not-allowed opacity-40'
                        : 'hover:scale-105 hover:bg-kali-primary hover:text-kali-inverse hover:shadow-[0_0_18px_rgba(15,148,210,0.45)]'
                    }`}
                    onClick={() => bet + v <= bankroll / handCount && setBet(bet + v)}
                    aria-label={`Add ${v} chip`}
                    disabled={bet + v > bankroll / handCount}
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
              {renderHand(
                { cards: dealerHand },
                !revealDealerHoleCard && current < playerHands.length,
                false,
                dealerPeeking,
                null,
                !revealDealerHoleCard && dealerHand.length > 0
                  ? `${handValue([dealerHand[0]])}+?`
                  : null,
                'dealer-hand',
              )}
            </div>
          )}
          {playerHands.map((hand, idx) => (
            <div key={idx} className="flex w-full max-w-xl flex-col items-center gap-2">
              <div className="text-sm uppercase tracking-wide text-kali-control">
                {`Player${playerHands.length > 1 ? ` ${idx + 1}` : ''}`}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <BetChips amount={hand.bet} />
                {renderHand(
                  hand,
                  false,
                  true,
                  false,
                  hand.blackjack ? 'Blackjack' : idx === current && showHints ? rec : null,
                  null,
                  `player-hand-${idx}`,
                )}
              </div>
              {idx === current && playerHands.length > 0 && (
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
                        className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm sm:text-base font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                          isRecommended
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
          ))}
          {insurancePending && (
            <div
              className="flex flex-wrap items-center justify-center gap-2 rounded border border-[color:color-mix(in_srgb,var(--kali-control)_35%,var(--kali-border))] bg-[var(--kali-control-overlay)] px-4 py-3"
              aria-label="Insurance decision"
            >
              <span className="text-sm uppercase tracking-wide text-kali-control">Insurance?</span>
              <button
                type="button"
                className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-medium`}
                onClick={takeInsurance}
              >
                Take Insurance
              </button>
              <button
                type="button"
                className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-medium`}
                onClick={declineInsurance}
              >
                No Insurance
              </button>
            </div>
          )}
          <div className="mt-2 text-center text-base sm:text-lg" aria-live="polite" role="status">
            {message}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded border border-[color:color-mix(in_srgb,var(--kali-control)_35%,var(--kali-border))] bg-[var(--kali-control-overlay)] px-4 py-2 text-sm sm:text-base text-kali-text">
            <span>Wins: {stats.wins}</span>
            <span>Losses: {stats.losses}</span>
            <span>Pushes: {stats.pushes}</span>
          </div>
          <div className="mt-2 sm:hidden">
            <VirtualPad onDirection={handlePadDirection} onButton={handlePadButton} />
          </div>
        </div>
      )}
    </GameLayout>
  );
};

export default Blackjack;
