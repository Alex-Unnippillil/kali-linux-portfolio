import React, { useState, useEffect, useRef, useReducer } from 'react';
import { trackEvent, GA_EVENTS } from '../../lib/analytics';
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
        trackEvent(GA_EVENTS.BLACKJACK.STAND);
        break;
      case 'double':
        // implement double down logic
        game.double();
        trackEvent(GA_EVENTS.BLACKJACK.DOUBLE);
        break;
      case 'split':
        // implement split logic
        game.split();
        trackEvent(GA_EVENTS.BLACKJACK.SPLIT);
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
      trackEvent(GA_EVENTS.BLACKJACK.HAND_START(bet * handCount));
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
      trackEvent(GA_EVENTS.BLACKJACK.DEVIATION(`${rec}->${type}`));
    }
    dispatch({ type });
    update();
    if (gameRef.current.current >= gameRef.current.playerHands.length) {
      setMessage('Round complete');
      gameRef.current.playerHands.forEach((h) => {
        if (h.result) trackEvent(GA_EVENTS.BLACKJACK.RESULT(h.result));
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
    trackEvent(GA_EVENTS.BLACKJACK.COUNT_PRACTICE_START);
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
      trackEvent(GA_EVENTS.BLACKJACK.COUNT_STREAK(streak));
      setStreak(0);
      setPracticeFeedback(`Nope. Count is ${actual}`);
    }
    setPracticeGuess('');
    setPracticeCard(practiceShoe.current.draw());
  };

  const endPractice = () => {
    if (streak > 0) {
      trackEvent(GA_EVENTS.BLACKJACK.COUNT_STREAK(streak));
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

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="mb-2 flex items-center space-x-4">
        <div>Bankroll: {availableBankroll}</div>
        <div className={`h-8 w-6 bg-gray-700 ${shuffling ? 'shuffle' : ''}`}></div>
        {showCount && <div>RC: {runningCount}</div>}
      </div>
        <div className="mb-2 flex items-center space-x-2">
          <button className="px-2 py-1 bg-gray-700" onClick={() => setShowHints(!showHints)}>
            {showHints ? 'Hide Hints' : 'Show Hints'}
          </button>
          <button className="px-2 py-1 bg-gray-700" onClick={() => setShowCount(!showCount)}>
            {showCount ? 'Hide Count' : 'Show Count'}
          </button>
          <button className="px-2 py-1 bg-gray-700" onClick={startPractice}>
            Practice Count
          </button>
          <label className="flex items-center space-x-1">
            <span className="text-sm">Pen</span>
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
              className="w-24"
            />
            <span className="text-sm">{(penetration * 100).toFixed(0)}%</span>
          </label>
        </div>
      {playerHands.length === 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center space-x-2" aria-live="polite" role="status">
            <span>Bet: {bet} x {handCount}</span>
            <BetChips amount={bet} />
          </div>
          <div className="flex space-x-2 mb-2">
            {CHIP_VALUES.map((v) => (
              <button
                key={v}
                className={`chip ${CHIP_COLORS[v]} ${
                  bet + v > bankroll / handCount ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => bet + v <= bankroll / handCount && setBet(bet + v)}
                aria-label={`Add ${v} chip`}
              >
                {v}
              </button>
            ))}
            <button className="px-2 py-1 bg-gray-700" onClick={() => setBet(0)}>
              Clear
            </button>
            <label className="flex items-center space-x-1">
              <span className="text-sm">Hands</span>
              <input
                type="number"
                min="1"
                max="4"
                value={handCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) setHandCount(val);
                }}
                className="w-12 text-black px-1"
              />
            </label>
            <button className="px-2 py-1 bg-gray-700" onClick={start} disabled={bet === 0}>
              Deal
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="mb-2">Dealer</div>
          {renderHand(
            { cards: dealerHand },
            !message.includes('complete') && current < playerHands.length,
            false,
            dealerPeeking,
          )}
        </div>
      )}
      {playerHands.map((hand, idx) => (
        <div key={idx} className="mb-2">
          <div className="mb-1">{`Player${playerHands.length > 1 ? ` ${idx + 1}` : ''}`}</div>
          <div className="flex items-center space-x-2">
            <BetChips amount={hand.bet} />
            {renderHand(hand, false, true, false, idx === current && showHints ? rec : null)}
          </div>
          {idx === current && playerHands.length > 0 && (
            <div className="mt-2 flex flex-col items-start">
              <div className="flex space-x-2">
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'hit' ? 'border-2 border-yellow-400 text-yellow-300' : ''}`} onClick={() => act('hit')}>Hit</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'stand' ? 'border-2 border-yellow-400 text-yellow-300' : ''}`} onClick={() => act('stand')}>Stand</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'double' ? 'border-2 border-yellow-400 text-yellow-300' : ''}`} onClick={() => act('double')}>Double</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'split' ? 'border-2 border-yellow-400 text-yellow-300' : ''}`} onClick={() => act('split')}>Split</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'surrender' ? 'border-2 border-yellow-400 text-yellow-300' : ''}`} onClick={() => act('surrender')}>Surrender</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {showInsurance && (
        <button className="px-3 py-1 bg-gray-700 mb-2" onClick={takeInsurance}>
          Take Insurance
        </button>
      )}
      <div className="mt-4" aria-live="polite" role="status">{message}</div>
      <div className="mt-4 text-sm">Wins: {stats.wins} Losses: {stats.losses} Pushes: {stats.pushes}</div>
    </div>
  );
};

export default Blackjack;
