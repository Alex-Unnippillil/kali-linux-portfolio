import React, { useState, useEffect, useRef, useReducer } from 'react';
import ReactGA from 'react-ga4';
import { BlackjackGame, handValue, cardValue, Shoe } from './engine';
import { recommendAction } from '../../../games/blackjack/coach';

const CHIP_VALUES = [1, 5, 25, 100];
const CHIP_COLORS = {
  1: 'bg-gray-200 text-black',
  5: 'bg-red-800 text-white',
  25: 'bg-green-800 text-white',
  100: 'bg-blue-900 text-white',
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
      className={`h-16 w-12 card ${flipped ? 'flipped' : ''} ${
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
  const [streakSummary, setStreakSummary] = useState({ current: 0, type: null, winRate: 0 });

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
    const history = gameRef.current.history;
    const flatResults = history.flatMap((round) =>
      round.playerHands.map((h) => h.result).filter(Boolean),
    );
    let type = null;
    let count = 0;
    for (let i = flatResults.length - 1; i >= 0; i -= 1) {
      if (!type) {
        type = flatResults[i];
        count = 1;
      } else if (flatResults[i] === type) {
        count += 1;
      } else {
        break;
      }
    }
    const wins = flatResults.filter((r) => r === 'win').length;
    setStreakSummary({
      current: count,
      type,
      winRate: flatResults.length ? Math.round((wins / flatResults.length) * 100) : 0,
    });
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
      className="relative flex space-x-2"
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
      <div className="ml-2 self-center">{handValue(hand.cards)}</div>
      {overlay && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black bg-opacity-75 px-1 text-xs rounded">
          {overlay.toUpperCase()}
        </div>
      )}
    </div>
  );

  const rec = showHints ? recommended() : '';

  if (practice) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
        {practiceCard && (
          <div className="text-4xl mb-4">{`${practiceCard.value}${practiceCard.suit}`}</div>
        )}
        <input
          type="number"
          value={practiceGuess}
          onChange={(e) => setPracticeGuess(e.target.value)}
          className="text-black mb-2 px-2 py-1"
        />
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-gray-700" onClick={submitPractice}>
            Submit
          </button>
          <button className="px-3 py-1 bg-gray-700" onClick={endPractice}>
            Exit
          </button>
        </div>
        {practiceFeedback && <div className="mt-2">{practiceFeedback}</div>}
        <div className="mt-4">Streak: {streak}</div>
        <div className="mt-1">Best: {bestStreak}</div>
        <div className="mt-1">RC: {practiceShoe.current.runningCount}</div>
        <div className="mt-1 text-xs">
          {Object.entries(practiceShoe.current.composition)
            .map(([v, c]) => `${v}:${c}`)
            .join(' ')}
        </div>
      </div>
    );
  }

  const actionsDisabled = playerHands.length === 0 || current >= playerHands.length;
  const shoe = gameRef.current.shoe;
  const shuffleProgress = shoe.shufflePoint ? Math.min(1, shoe.dealt / shoe.shufflePoint) : 0;
  const shufflePercent = Math.round(shuffleProgress * 100);
  const penetrationPercent = Math.round((penetration || 0) * 100);
  const streakLabel = (() => {
    if (!streakSummary.type || streakSummary.current === 0) return 'No streak yet';
    const labelMap = { win: 'Winning', lose: 'Losing', push: 'Push' };
    return `${labelMap[streakSummary.type] || 'Mixed'} streak: ${streakSummary.current}`;
  })();
  const actions = [
    { type: 'hit', label: 'Hit' },
    { type: 'stand', label: 'Stand' },
    { type: 'double', label: 'Double' },
    { type: 'split', label: 'Split' },
    { type: 'surrender', label: 'Surrender' },
  ];

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <section className="rounded-lg bg-black/40 p-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-lg font-semibold">
                Bankroll: <span className="text-green-300">{availableBankroll}</span>
              </div>
              <div className="flex items-center gap-2" aria-live="polite" role="status">
                <span className="text-xs uppercase tracking-wide text-gray-300">Shuffle</span>
                <div
                  className={`h-6 w-4 rounded bg-gray-700 ${shuffling ? 'shuffle' : ''}`}
                  aria-label={shuffling ? 'Shuffling new shoe' : 'Shoe ready'}
                ></div>
                <span className="text-xs text-gray-300">{shufflePercent}% to shuffle</span>
              </div>
              {showCount && (
                <div className="rounded bg-black/50 px-2 py-1 text-sm">RC: {runningCount}</div>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
                <button
                  className="rounded bg-gray-700 px-3 py-1 transition hover:bg-gray-600"
                  onClick={() => setShowHints(!showHints)}
                >
                  {showHints ? 'Hide Hints' : 'Show Hints'}
                </button>
                <button
                  className="rounded bg-gray-700 px-3 py-1 transition hover:bg-gray-600"
                  onClick={() => setShowCount(!showCount)}
                >
                  {showCount ? 'Hide Count' : 'Show Count'}
                </button>
                <button
                  className="rounded bg-indigo-700 px-3 py-1 transition hover:bg-indigo-600"
                  onClick={startPractice}
                >
                  Practice Count
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-300">Penetration</span>
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
                  className="w-28"
                  aria-label="Set shuffle penetration"
                />
                <span>{penetrationPercent}%</span>
              </label>
            </div>
            {playerHands.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {actions.map(({ type, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => act(type)}
                      disabled={actionsDisabled}
                      className={`rounded px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        rec === type && showHints
                          ? 'border-2 border-yellow-400 bg-gray-700 text-yellow-200 shadow-lg'
                          : 'bg-gray-700 hover:bg-gray-600'
                      } ${actionsDisabled ? 'cursor-not-allowed opacity-40 hover:bg-gray-700' : ''}`}
                      aria-pressed={rec === type && showHints}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="flex flex-col gap-4 rounded-lg bg-black/20 p-4 shadow">
            {playerHands.length === 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite" role="status">
                  <span>
                    Bet: {bet} x {handCount}
                  </span>
                  <BetChips amount={bet} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {CHIP_VALUES.map((v) => (
                    <button
                      key={v}
                      className={`chip ${CHIP_COLORS[v]} ${
                        bet + v > bankroll / handCount ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                      onClick={() => bet + v <= bankroll / handCount && setBet(bet + v)}
                      aria-label={`Add ${v} chip`}
                    >
                      {v}
                    </button>
                  ))}
                  <button className="rounded bg-gray-700 px-3 py-1" onClick={() => setBet(0)}>
                    Clear
                  </button>
                  <label className="flex items-center gap-2 text-sm">
                    <span>Hands</span>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={handCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) setHandCount(val);
                      }}
                      className="w-16 rounded border border-gray-600 bg-white px-2 py-1 text-black"
                    />
                  </label>
                  <button
                    className="rounded bg-green-700 px-3 py-1 font-semibold transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={start}
                    disabled={bet === 0}
                  >
                    Deal
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-sm uppercase tracking-wide text-gray-300">Dealer</div>
                {renderHand(
                  { cards: dealerHand },
                  !message.includes('complete') && current < playerHands.length,
                  false,
                  dealerPeeking,
                )}
              </div>
            )}
            {playerHands.map((hand, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-sm uppercase tracking-wide text-gray-300">
                  {`Player${playerHands.length > 1 ? ` ${idx + 1}` : ''}`}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <BetChips amount={hand.bet} />
                  {renderHand(hand, false, true, false, idx === current && showHints ? rec : null)}
                </div>
              </div>
            ))}
            {showInsurance && (
              <button
                className="w-full rounded bg-blue-800 px-3 py-2 font-semibold transition hover:bg-blue-700"
                onClick={takeInsurance}
              >
                Take Insurance
              </button>
            )}
            <div className="text-sm" aria-live="polite" role="status">
              {message}
            </div>
            <div className="text-xs text-gray-300">
              Wins: {stats.wins} Losses: {stats.losses} Pushes: {stats.pushes}
            </div>
          </section>
        </div>
        <aside className="w-full shrink-0 rounded-lg bg-black/30 p-4 text-sm shadow lg:w-72">
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-gray-200">Table Insights</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Current Advice</div>
              <div className="text-lg font-semibold text-yellow-200">
                {playerHands.length > 0 && rec ? rec.toUpperCase() : 'Waiting for deal'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Shoe Penetration</div>
              <div>
                {shufflePercent}% of target &bull; Shuffle at {penetrationPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Streak Summary</div>
              <div>{streakLabel}</div>
              <div className="text-xs text-gray-400">Win rate: {streakSummary.winRate}%</div>
            </div>
            {showHints && playerHands.length > 0 && (
              <p className="rounded bg-black/40 p-2 text-xs text-gray-300">
                Hints highlight the recommended move above. Trust deviations sparingly for a realistic practice session.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Blackjack;
