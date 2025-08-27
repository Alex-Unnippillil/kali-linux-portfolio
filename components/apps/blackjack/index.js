import React, { useState, useEffect, useRef, useReducer } from 'react';
import ReactGA from 'react-ga4';
import { BlackjackGame, handValue, basicStrategy, cardValue, Shoe, houseEdge } from './engine';

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

const Blackjack = ({
  decks = 6,
  hitSoft17 = true,
  allowSurrender = true,
  penetration: initialPenetration = 0.75,
}) => {
  const [penetration, setPenetration] = useState(initialPenetration);
  const gameRef = useRef(
    new BlackjackGame({ bankroll: 1000, penetration: initialPenetration, decks, hitSoft17, allowSurrender })
  );
  const [bet, setBet] = useState(0);
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
  const [shoePen, setShoePen] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [edge, setEdge] = useState(
    houseEdge({ decks, hitSoft17, surrender: allowSurrender })
  );
  const [practice, setPractice] = useState(false);
  const practiceShoe = useRef(new Shoe(1));
  const shuffleCount = useRef(gameRef.current.shoe.shuffleCount);
  const [practiceCard, setPracticeCard] = useState(null);
  const [practiceGuess, setPracticeGuess] = useState('');
  const [streak, setStreak] = useState(0);
  const [dealerPeeking, setDealerPeeking] = useState(false);

  const [_, dispatch] = useReducer(gameReducer, {
    gameRef,
    setMessage,
    version: 0,
  });

  const bankroll = gameRef.current.bankroll;
  const availableBankroll = bankroll - bet;

  const update = () => {
    setDealerHand([...gameRef.current.dealerHand]);
    setPlayerHands(gameRef.current.playerHands.map((h) => ({ ...h, cards: [...h.cards] })));
    setStats({ ...gameRef.current.stats });
    setCurrent(gameRef.current.current);
    setRunningCount(gameRef.current.shoe.runningCount);
    setShoePen(gameRef.current.shoe.currentPenetration());
    if (gameRef.current.shoe.shuffleCount !== shuffleCount.current) {
      shuffleCount.current = gameRef.current.shoe.shuffleCount;
      setShuffling(true);
      setTimeout(() => setShuffling(false), 500);
    }
  };

  useEffect(() => {
    gameRef.current.shoe.penetration = penetration;
    gameRef.current.shoe.shufflePoint = Math.floor(gameRef.current.shoe.cards.length * penetration);
  }, [penetration]);

  useEffect(() => {
    const old = gameRef.current;
    const newGame = new BlackjackGame({
      decks,
      hitSoft17,
      penetration,
      bankroll: old.bankroll,
      allowSurrender,
    });
    newGame.stats = { ...old.stats };
    gameRef.current = newGame;
    setEdge(houseEdge({ decks, hitSoft17, surrender: allowSurrender }));
    update();
  }, [decks, hitSoft17, allowSurrender]);

  const start = () => {
    try {
      setShuffling(true);
      setTimeout(() => setShuffling(false), 500);
      gameRef.current.startRound(bet);
      ReactGA.event({ category: 'Blackjack', action: 'hand_start', value: bet });
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
    return basicStrategy(hand.cards, dealerHand[0], {
      canDouble: bankroll >= hand.bet,
      canSplit:
        hand.cards.length === 2 &&
        cardValue(hand.cards[0]) === cardValue(hand.cards[1]) &&
        bankroll >= hand.bet,
      canSurrender: allowSurrender && hand.cards.length === 2,
    });
  };

  const startPractice = () => {
    practiceShoe.current.shuffle();
    setStreak(0);
    setPracticeCard(practiceShoe.current.draw());
    setPractice(true);
    ReactGA.event({ category: 'Blackjack', action: 'count_practice_start' });
  };

  const submitPractice = () => {
    const guess = parseInt(practiceGuess, 10);
    if (guess === practiceShoe.current.runningCount) {
      setStreak((s) => s + 1);
    } else {
      ReactGA.event({ category: 'Blackjack', action: 'count_streak', value: streak });
      setStreak(0);
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
        if (bet + val <= bankroll) setBet(bet + val);
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

  useEffect(() => {
    if (!autoPlay || practice) return;
    if (playerHands.length === 0 && bet > 0) {
      const t = setTimeout(start, 500);
      return () => clearTimeout(t);
    }
    if (playerHands.length > 0) {
      if (gameRef.current.current >= gameRef.current.playerHands.length) {
        const t = setTimeout(start, 800);
        return () => clearTimeout(t);
      }
      const rec = recommended();
      if (rec) {
        const t = setTimeout(() => act(rec), 600);
        return () => clearTimeout(t);
      }
    }
  }, [autoPlay, playerHands, current, bet, practice]);

  const bustProbability = (hand) => {
    const total = handValue(hand.cards);
    const remaining = gameRef.current.shoe.cards;
    const bustCards = remaining.filter((c) => cardValue(c) + total > 21).length;
    return remaining.length ? bustCards / remaining.length : 0;
  };

  const renderHand = (hand, hideFirst, showProb, peeking = false) => (
    <div
      className="flex space-x-2"
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
        <div className="mt-4">Streak: {streak}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="mb-2 flex items-center space-x-4">
        <div>Bankroll: {availableBankroll}</div>
        <div className={`h-8 w-6 bg-gray-700 ${shuffling ? 'shuffle' : ''}`}></div>
        <div>Pen: {(shoePen * 100).toFixed(0)}%</div>
        <div>Edge: {edge.toFixed(2)}%</div>
        {showCount && <div>RC: {runningCount}</div>}
      </div>
        <div className="mb-2 flex items-center space-x-2">
          <button className="px-2 py-1 bg-gray-700" onClick={() => setShowHints(!showHints)}>
            {showHints ? 'Hide Hints' : 'Show Hints'}
          </button>
          <button className="px-2 py-1 bg-gray-700" onClick={() => setShowCount(!showCount)}>
            {showCount ? 'Hide Count' : 'Show Count'}
          </button>
          <button className={`px-2 py-1 bg-gray-700 ${autoPlay ? 'border-2 border-yellow-400' : ''}`} onClick={() => setAutoPlay(!autoPlay)}>
            {autoPlay ? 'Stop Auto' : 'Autoplay'}
          </button>
          <button className="px-2 py-1 bg-gray-700" onClick={startPractice}>
            Practice Count
          </button>
          <label className="flex items-center space-x-1">
            <span className="text-sm">Pen</span>
            <input
              type="number"
              step="0.05"
            min="0.5"
            max="0.95"
            value={penetration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val)) setPenetration(val);
            }}
            className="w-16 text-black px-1"
          />
        </label>
      </div>
      {playerHands.length === 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center space-x-2" aria-live="polite" role="status">
            <span>Bet: {bet}</span>
            <BetChips amount={bet} />
          </div>
          <div className="flex space-x-2 mb-2">
            {CHIP_VALUES.map((v) => (
              <button
                key={v}
                className={`chip ${CHIP_COLORS[v]} ${
                  bet + v > bankroll ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => bet + v <= bankroll && setBet(bet + v)}
                aria-label={`Add ${v} chip`}
              >
                {v}
              </button>
            ))}
            <button className="px-2 py-1 bg-gray-700" onClick={() => setBet(0)}>
              Clear
            </button>
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
            {renderHand(hand, false, true)}
          </div>
          {idx === current && playerHands.length > 0 && (
            <div className="mt-2 flex flex-col items-start">
              <div className="flex space-x-2">
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'hit' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('hit')}>Hit</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'stand' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('stand')}>Stand</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'double' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('double')}>Double</button>
                <button className={`px-3 py-1 bg-gray-700 ${rec === 'split' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('split')}>Split</button>
                <button
                  className={`px-3 py-1 bg-gray-700 ${
                    rec === 'surrender' ? 'border-2 border-yellow-400' : ''
                  } ${!allowSurrender ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => allowSurrender && act('surrender')}
                  disabled={!allowSurrender}
                >
                  Surrender
                </button>
              </div>
              {showHints && rec && <div className="mt-1 text-sm">Hint: {rec.toUpperCase()}</div>}
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
