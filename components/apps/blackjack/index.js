import React, { useState, useEffect, useRef, useReducer } from 'react';
import ReactGA from 'react-ga4';
import { BlackjackGame, handValue, basicStrategy, cardValue } from './engine';

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
  };

  useEffect(() => {
    gameRef.current.shoe.penetration = penetration;
    gameRef.current.shoe.shufflePoint = Math.floor(gameRef.current.shoe.cards.length * penetration);
  }, [penetration]);

  const start = () => {
    try {
      setShuffling(true);
      setTimeout(() => setShuffling(false), 500);
      gameRef.current.startRound(bet);
      ReactGA.event({ category: 'Blackjack', action: 'hand_start', value: bet });
      setMessage('Hit, Stand, Double, Split or Surrender');
      setShowInsurance(gameRef.current.dealerHand[0].value === 'A');
      update();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const act = (type) => {
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
      canSplit: hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1]) && bankroll >= hand.bet,
      canSurrender: hand.cards.length === 2,
    });
  };

  useEffect(() => {
    const onKey = (e) => {
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
  }, [bet, playerHands.length]);

  const bustProbability = (hand) => {
    const total = handValue(hand.cards);
    const remaining = gameRef.current.shoe.cards;
    const bustCards = remaining.filter((c) => cardValue(c) + total > 21).length;
    return remaining.length ? bustCards / remaining.length : 0;
  };

  const renderHand = (hand, hideFirst, showProb) => (
    <div
      className="flex space-x-2"
      title={showProb ? `Bust chance: ${(bustProbability(hand) * 100).toFixed(1)}%` : undefined}
    >
      {hand.cards.map((card, idx) => (
        <div
          key={idx}
          className="h-16 w-12 bg-white text-black flex items-center justify-center card animate-deal"
        >
          {hideFirst && idx === 0 && playerHands.length > 0 && current < playerHands.length
            ? '?'
            : `${card.value}${card.suit}`}
        </div>
      ))}
      <div className="ml-2 self-center">{handValue(hand.cards)}</div>
    </div>
  );

  const rec = showHints ? recommended() : '';

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
        <div className="mb-4 w-full">
          <div className="mb-2">Bet: {bet}</div>
          <input
            type="range"
            min="0"
            max={bankroll}
            value={bet}
            onChange={(e) => setBet(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <button
            className="mt-2 w-full px-2 py-1 bg-gray-700"
            onClick={start}
            disabled={bet === 0}
          >
            Deal
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <div className="mb-2">Dealer</div>
          {renderHand({ cards: dealerHand }, !message.includes('complete') && current < playerHands.length)}
        </div>
      )}
      {playerHands.map((hand, idx) => (
        <div key={idx} className="mb-2">
          <div className="mb-1">{`Player${playerHands.length > 1 ? ` ${idx + 1}` : ''}`}</div>
          {renderHand(hand, false, true)}
          {idx === current && playerHands.length > 0 && (
            <div className="mt-2 flex flex-col items-stretch">
              <div className="flex flex-col space-y-2 w-full">
                <button
                  className={`w-full py-2 bg-gray-700 ${rec === 'hit' ? 'border-2 border-yellow-400' : ''}`}
                  onClick={() => act('hit')}
                >
                  Hit
                </button>
                <button
                  className={`w-full py-2 bg-gray-700 ${rec === 'stand' ? 'border-2 border-yellow-400' : ''}`}
                  onClick={() => act('stand')}
                >
                  Stand
                </button>
                <button
                  className={`w-full py-2 bg-gray-700 ${rec === 'double' ? 'border-2 border-yellow-400' : ''}`}
                  onClick={() => act('double')}
                >
                  Double
                </button>
                <button
                  className={`w-full py-2 bg-gray-700 ${rec === 'split' ? 'border-2 border-yellow-400' : ''}`}
                  onClick={() => act('split')}
                >
                  Split
                </button>
                <button
                  className={`w-full py-2 bg-gray-700 ${rec === 'surrender' ? 'border-2 border-yellow-400' : ''}`}
                  onClick={() => act('surrender')}
                >
                  Surrender
                </button>
              </div>
              {showHints && rec && (
                <div className="mt-1 text-sm text-center">Hint: {rec.toUpperCase()}</div>
              )}
            </div>
          )}
        </div>
      ))}
      {showInsurance && (
        <button className="px-3 py-1 bg-gray-700 mb-2" onClick={takeInsurance}>
          Take Insurance
        </button>
      )}
      <div className="mt-4">{message}</div>
      <div className="mt-4 text-sm">Wins: {stats.wins} Losses: {stats.losses} Pushes: {stats.pushes}</div>
    </div>
  );
};

export default Blackjack;
