import React, { useState, useEffect, useRef, useReducer } from 'react';
import ReactGA from 'react-ga4';
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
        // implement double down logic
        game.double();
        ReactGA.event({ category: 'Blackjack', action: 'double' });
        break;
      case 'split':
        // implement split logic
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
    state.setMessage(e.message);
  }
  // trigger re-render by bumping version
  return { ...state, version: state.version + 1 };
};

const Blackjack = () => {
  const [penetration, setPenetration] = useState(0.75);
  const gameRef = useRef(new BlackjackGame({ bankroll: 1000, penetration }));
  const [bet, setBet] = useState(0);
  const [handCount, setHandCount] = useState(1);
  const [message, setMessage] = useState('Place your bet');
  const [dealerHand, setDealerHand] = useState([]);
  const [playerHands, setPlayerHands] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showInsurance, setShowInsurance] = useState(false);
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

  const [_, dispatch] = useReducer(gameReducer, {
    gameRef,
    setMessage,
    version: 0,
  });

  const bankroll = gameRef.current.bankroll;
  const availableBankroll = bankroll - (playerHands.length === 0 ? bet * handCount : 0);

  const update = () => {
    setDealerHand([...gameRef.current.dealerHand]);
    setPlayerHands(gameRef.current.playerHands.map((h) => ({ ...h, cards: [...h.cards] })));
    setStats({ ...gameRef.current.stats });
    setCurrent(gameRef.current.current);
    setRunningCount(gameRef.current.shoe.runningCount);
  };

  useEffect(() => {
    gameRef.current.shoe.penetration = penetration;
    gameRef.current.shoe.shufflePoint = Math.floor(gameRef.current.shoe.cards.length * penetration);
  }, [penetration]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bj_best_streak', bestStreak.toString());
    }
  }, [bestStreak]);

  const start = () => {
    try {
      setShuffling(true);
      setTimeout(() => setShuffling(false), 500);
      gameRef.current.startRound(bet, undefined, handCount);
      ReactGA.event({ category: 'Blackjack', action: 'hand_start', value: bet * handCount });
      setMessage('Hit, Stand, Double, Split or Surrender');
      setShowInsurance(gameRef.current.dealerHand[0].value === 'A');
      update();
      if (['A', '10', 'J', 'Q', 'K'].includes(gameRef.current.dealerHand[0].value)) {
        setDealerPeeking(true);
        setTimeout(() => setDealerPeeking(false), 1000);
      }
    } catch (e) {
      setMessage(e.message);
    }
  };

  const act = (type) => {
    const rec = recommended();
    if (rec && rec !== type) {
      ReactGA.event({ category: 'Blackjack', action: 'deviation', label: `${rec}->${type}` });
    }
    dispatch({ type });
    update();
    if (gameRef.current.current >= gameRef.current.playerHands.length) {
      setMessage('Round complete');
      gameRef.current.playerHands.forEach((h) => {
        if (h.result) ReactGA.event({ category: 'Blackjack', action: 'result', label: h.result });
      });
    }
  };

  const takeInsurance = () => {
    try {
      gameRef.current.takeInsurance();
      setShowInsurance(false);
      update();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const recommended = () => {
    const hand = playerHands[current];
    if (!hand) return '';
    return recommendAction(hand, dealerHand[0], bankroll);
  };

  const startPractice = () => {
    practiceShoe.current.shuffle();
    setStreak(0);
    setPracticeCard(practiceShoe.current.draw());
    setPractice(true);
    setPracticeFeedback('');
    ReactGA.event({ category: 'Blackjack', action: 'count_practice_start' });
  };

  const submitPractice = () => {
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
  };

  const endPractice = () => {
    if (streak > 0) {
      ReactGA.event({ category: 'Blackjack', action: 'count_streak', value: streak });
    }
    setPractice(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (practice) return;
      if (['1', '2', '3', '4'].includes(e.key) && bet >= 0 && playerHands.length === 0) {
        const val = CHIP_VALUES[parseInt(e.key, 10) - 1];
        if (bet + val <= bankroll / handCount) setBet(bet + val);
      }
      if (e.key === 'Enter' && playerHands.length === 0 && bet > 0) start();
      if (playerHands.length > 0) {
        if (e.key.toLowerCase() === 'h') act('hit');
        if (e.key.toLowerCase() === 's') act('stand');
        if (e.key.toLowerCase() === 'd') act('double');
        if (e.key.toLowerCase() === 'p') act('split');
        if (e.key.toLowerCase() === 'r') act('surrender');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const bustProbability = (hand) => {
    const total = handValue(hand.cards);
    const remaining = gameRef.current.shoe.cards;
    const bustCards = remaining.filter((c) => cardValue(c) + total > 21).length;
    return remaining.length ? bustCards / remaining.length : 0;
  };

  const renderHand = (hand, hideFirst, showProb, peeking = false, overlay = null) => (
    <div
      className="relative flex flex-wrap items-center gap-2 sm:gap-3"
      title={showProb ? `Bust chance: ${(bustProbability(hand) * 100).toFixed(1)}%` : undefined}
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
        {handValue(hand.cards)}
      </div>
      {overlay && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-dark)_92%,transparent)] px-2 text-xs text-kali-text shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
          {overlay.toUpperCase()}
        </div>
      )}
    </div>
  );

  const rec = showHints ? recommended() : '';

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

  if (practice) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[color:color-mix(in_srgb,var(--color-surface)_65%,transparent)] p-4 text-kali-text select-none">
        {practiceCard && (
          <div className="text-4xl">{`${practiceCard.value}${practiceCard.suit}`}</div>
        )}
        <input
          type="number"
          value={practiceGuess}
          onChange={(e) => setPracticeGuess(e.target.value)}
          className="w-24 rounded px-2 py-1 text-center text-black"
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
  }

  return (
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
                className="w-12 rounded px-1 text-black"
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
            !message.includes('complete') && current < playerHands.length,
            false,
            dealerPeeking,
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
            {renderHand(hand, false, true, false, idx === current && showHints ? rec : null)}
          </div>
          {idx === current && playerHands.length > 0 && (
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {['hit', 'stand', 'double', 'split', 'surrender'].map((type) => {
                const isRecommended = rec === type;
                const available = actionState(hand)[type];
                const labels = {
                  hit: { text: 'Hit', shortcut: 'H' },
                  stand: { text: 'Stand', shortcut: 'S' },
                  double: { text: 'Double', shortcut: 'D' },
                  split: { text: 'Split', shortcut: 'P' },
                  surrender: { text: 'Surrender', shortcut: 'R' },
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
      {showInsurance && (
        <button
          type="button"
          className={`${CONTROL_BUTTON_BASE} px-3 py-1 text-sm font-medium`}
          onClick={takeInsurance}
        >
          Take Insurance
        </button>
      )}
      <div className="mt-2 text-center text-base sm:text-lg" aria-live="polite" role="status">
        {message}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded border border-white/10 bg-[color:color-mix(in_srgb,var(--color-surface)_80%,transparent)] px-4 py-2 text-sm sm:text-base text-kali-text">
        <span>Wins: {stats.wins}</span>
        <span>Losses: {stats.losses}</span>
        <span>Pushes: {stats.pushes}</span>
      </div>
    </div>
  );
};

export default Blackjack;
