import React, { useState } from 'react';

const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () => {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const cardValue = (card) => {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value, 10);
};

const handValue = (hand) => {
  let value = 0;
  let aces = 0;
  hand.forEach((card) => {
    value += cardValue(card);
    if (card.value === 'A') aces += 1;
  });
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
};

const Blackjack = () => {
  const [deck, setDeck] = useState(createDeck());
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [chips, setChips] = useState(100);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Place your bet');
  const [gameOver, setGameOver] = useState(true);

  const startRound = () => {
    if (bet > chips) {
      setMessage('Not enough chips');
      return;
    }
    const newDeck = deck.length < 10 ? createDeck() : [...deck];
    const pHand = [newDeck.pop(), newDeck.pop()];
    const dHand = [newDeck.pop(), newDeck.pop()];
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setDeck(newDeck);
    setChips(chips - bet);
    setGameOver(false);
    setMessage('Hit or Stand?');
  };

  const hit = () => {
    if (gameOver) return;
    const newDeck = [...deck];
    const newHand = [...playerHand, newDeck.pop()];
    setPlayerHand(newHand);
    setDeck(newDeck);
    if (handValue(newHand) > 21) {
      setGameOver(true);
      setMessage('Bust! Dealer wins.');
    }
  };

  const dealerTurn = (dHand, newDeck) => {
    while (handValue(dHand) < 17) {
      dHand.push(newDeck.pop());
    }
    return [dHand, newDeck];
  };

  const stand = () => {
    if (gameOver) return;
    let newDeck = [...deck];
    let dHand = [...dealerHand];
    [dHand, newDeck] = dealerTurn(dHand, newDeck);
    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dHand);
    let outcome;
    if (dealerVal > 21 || playerVal > dealerVal) {
      setChips(chips + bet * 2);
      outcome = 'You win!';
    } else if (playerVal === dealerVal) {
      setChips(chips + bet);
      outcome = 'Push';
    } else {
      outcome = 'Dealer wins';
    }
    setDealerHand(dHand);
    setDeck(newDeck);
    setMessage(outcome);
    setGameOver(true);
  };

  const reset = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setGameOver(true);
    setMessage('Place your bet');
  };

  const renderHand = (hand, hideFirst = false) => (
    <div className="flex space-x-2">
      {hand.map((card, idx) => (
        <div
          key={idx}
          className="h-16 w-12 bg-white text-black flex items-center justify-center"
        >
          {hideFirst && idx === 0 && !gameOver ? '?' : `${card.value}${card.suit}`}
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2">Chips: {chips}</div>
      <div className="mb-2 flex items-center">
        <span className="mr-2">Bet:</span>
        <input
          className="text-black w-16 mr-2 px-1"
          type="number"
          value={bet}
          onChange={(e) => setBet(parseInt(e.target.value, 10))}
          disabled={!gameOver}
        />
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={startRound}
          disabled={!gameOver}
        >
          Deal
        </button>
      </div>
      <div className="mb-4">
        <div className="mb-1">Dealer</div>
        {renderHand(dealerHand, true)}
        <div className="mt-1">{gameOver ? handValue(dealerHand) : '?'}</div>
      </div>
      <div className="mb-4">
        <div className="mb-1">Player</div>
        {renderHand(playerHand)}
        <div className="mt-1">{handValue(playerHand)}</div>
      </div>
      <div className="mb-4">{message}</div>
      <div>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 mr-2"
          onClick={hit}
          disabled={gameOver}
        >
          Hit
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 mr-2"
          onClick={stand}
          disabled={gameOver}
        >
          Stand
        </button>
        <button
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={reset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Blackjack;
