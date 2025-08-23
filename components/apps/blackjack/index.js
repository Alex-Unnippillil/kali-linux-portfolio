import React, { useState, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import { BlackjackGame, handValue, basicStrategy, cardValue } from './engine';

const CHIP_VALUES = [1, 5, 25, 100];

const Blackjack = () => {
  const gameRef = useRef(new BlackjackGame({ bankroll: 1000 }));
  const [bet, setBet] = useState(0);
  const [message, setMessage] = useState('Place your bet');
  const [dealerHand, setDealerHand] = useState([]);
  const [playerHands, setPlayerHands] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showInsurance, setShowInsurance] = useState(false);
  const [stats, setStats] = useState(gameRef.current.stats);
  const [showHints, setShowHints] = useState(true);

  const bankroll = gameRef.current.bankroll;

  const update = () => {
    setDealerHand([...gameRef.current.dealerHand]);
    setPlayerHands(gameRef.current.playerHands.map((h) => ({ ...h, cards: [...h.cards] })));
    setStats({ ...gameRef.current.stats });
    setCurrent(gameRef.current.current);
  };

  const start = () => {
    try {
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
    try {
      if (type === 'hit') gameRef.current.hit();
      if (type === 'stand') {
        gameRef.current.stand();
        ReactGA.event({ category: 'Blackjack', action: 'stand' });
      }
      if (type === 'double') {
        gameRef.current.double();
        ReactGA.event({ category: 'Blackjack', action: 'double' });
      }
      if (type === 'split') {
        gameRef.current.split();
        ReactGA.event({ category: 'Blackjack', action: 'split' });
      }
      if (type === 'surrender') gameRef.current.surrender();
      update();
      if (gameRef.current.current >= gameRef.current.playerHands.length) {
        setMessage('Round complete');
        gameRef.current.playerHands.forEach((h) => {
          if (h.result) ReactGA.event({ category: 'Blackjack', action: 'result', label: h.result });
        });
      }
    } catch (e) {
      setMessage(e.message);
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

  const renderHand = (hand, hideFirst) => (
    <div className="flex space-x-2">
      {hand.cards.map((card, idx) => (
        <div key={idx} className="h-16 w-12 bg-white text-black flex items-center justify-center">
          {hideFirst && idx === 0 && playerHands.length > 0 && current < playerHands.length ? '?' : `${card.value}${card.suit}`}
        </div>
      ))}
      <div className="ml-2 self-center">{handValue(hand.cards)}</div>
    </div>
  );

  const rec = showHints ? recommended() : '';

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4 select-none">
      <div className="mb-2">Bankroll: {bankroll}</div>
      <div className="mb-2">
        <button className="px-2 py-1 bg-gray-700" onClick={() => setShowHints(!showHints)}>
          {showHints ? 'Hide Hints' : 'Show Hints'}
        </button>
      </div>
      {playerHands.length === 0 ? (
        <div className="mb-4">
          <div className="mb-2">Bet: {bet}</div>
          <div className="flex space-x-2 mb-2">
            {CHIP_VALUES.map((v, i) => (
              <button key={v} className="px-2 py-1 bg-gray-700" onClick={() => bet + v <= bankroll && setBet(bet + v)}>
                {v}
              </button>
            ))}
            <button className="px-2 py-1 bg-gray-700" onClick={() => setBet(0)}>Clear</button>
            <button className="px-2 py-1 bg-gray-700" onClick={start} disabled={bet === 0}>
              Deal
            </button>
          </div>
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
          {renderHand(hand)}
          {idx === current && playerHands.length > 0 && (
            <div className="mt-2 flex space-x-2">
              <button className={`px-3 py-1 bg-gray-700 ${rec === 'hit' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('hit')}>Hit</button>
              <button className={`px-3 py-1 bg-gray-700 ${rec === 'stand' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('stand')}>Stand</button>
              <button className={`px-3 py-1 bg-gray-700 ${rec === 'double' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('double')}>Double</button>
              <button className={`px-3 py-1 bg-gray-700 ${rec === 'split' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('split')}>Split</button>
              <button className={`px-3 py-1 bg-gray-700 ${rec === 'surrender' ? 'border-2 border-yellow-400' : ''}`} onClick={() => act('surrender')}>Surrender</button>
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
