import React, { useState, useEffect } from 'react';

const suits = ["♠", "♥", "♦", "♣"];
const colors = { "♠": "black", "♣": "black", "♥": "red", "♦": "red" };

const shuffle = (array) => {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const createDeck = () => {
  const deck = [];
  suits.forEach((suit) => {
    for (let value = 1; value <= 13; value += 1) {
      deck.push({ suit, value, color: colors[suit], faceUp: false });
    }
  });
  return shuffle(deck);
};

const setupGame = () => {
  const deck = createDeck();
  const tableau = Array.from({ length: 7 }, (_, i) =>
    Array.from({ length: i + 1 }, () => deck.pop()).map((card, idx, pile) => ({
      ...card,
      faceUp: idx === pile.length - 1,
    })),
  );
  return {
    tableau,
    stock: deck,
    waste: [],
    foundations: Array(4).fill().map(() => []),
  };
};

const valueToString = (value) => {
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
};

const Solitaire = () => {
  const [tableau, setTableau] = useState([]);
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [foundations, setFoundations] = useState([]);
  const [drag, setDrag] = useState(null);
  const [won, setWon] = useState(false);

  const init = () => {
    const game = setupGame();
    setTableau(game.tableau);
    setStock(game.stock);
    setWaste(game.waste);
    setFoundations(game.foundations);
    setWon(false);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (foundations.every((p) => p.length === 13)) setWon(true);
  }, [foundations]);

  const draw = () => {
    if (stock.length === 0) {
      const newStock = waste
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));
      setStock(newStock);
      setWaste([]);
      return;
    }
    const card = { ...stock[stock.length - 1], faceUp: true };
    setStock(stock.slice(0, -1));
    setWaste([...waste, card]);
  };

  const handleDragStart = (source, pileIndex, cardIndex) => {
    if (source === 'tableau') {
      const moving = tableau[pileIndex].slice(cardIndex);
      if (!moving[0].faceUp) return;
      setDrag({ source, pileIndex, cards: moving });
    } else if (source === 'waste' && waste.length) {
      setDrag({ source, pileIndex: null, cards: [waste[waste.length - 1]] });
    }
  };

  const finishDrag = () => setDrag(null);

  const dropToTableau = (pileIndex) => {
    if (!drag) return;
    const moving = drag.cards;
    const dest = tableau[pileIndex];
    const card = moving[0];
    if (dest.length === 0) {
      if (card.value !== 13) return;
    } else {
      const top = dest[dest.length - 1];
      if (top.color === card.color || top.value !== card.value + 1) return;
    }

    const newTableau = tableau.map((p, idx) => {
      if (idx === pileIndex) return [...p, ...moving];
      if (drag.source === 'tableau' && idx === drag.pileIndex)
        return p.slice(0, p.length - moving.length);
      return p;
    });

    if (drag.source === 'tableau') {
      const src = newTableau[drag.pileIndex];
      if (src.length && !src[src.length - 1].faceUp) src[src.length - 1].faceUp = true;
      setTableau(newTableau);
    } else {
      setTableau(newTableau);
      setWaste(waste.slice(0, -1));
    }
    finishDrag();
  };

  const dropToFoundation = (pileIndex) => {
    if (!drag) return;
    if (drag.cards.length > 1) return;
    const card = drag.cards[0];
    const dest = foundations[pileIndex];
    if (dest.length === 0) {
      if (card.value !== 1) return;
    } else {
      const top = dest[dest.length - 1];
      if (top.suit !== card.suit || top.value + 1 !== card.value) return;
    }
    const newFoundations = foundations.map((p, idx) =>
      idx === pileIndex ? [...p, card] : p,
    );

    if (drag.source === 'tableau') {
      const newTableau = tableau.slice();
      newTableau[drag.pileIndex] = newTableau[drag.pileIndex].slice(0, -1);
      const src = newTableau[drag.pileIndex];
      if (src.length && !src[src.length - 1].faceUp) src[src.length - 1].faceUp = true;
      setTableau(newTableau);
    } else {
      setWaste(waste.slice(0, -1));
    }
    setFoundations(newFoundations);
    finishDrag();
  };

  const renderCard = (card) => (
    <div
      className="w-16 h-24 rounded border border-black bg-white flex items-center justify-center"
    >
      <span className={card.color === 'red' ? 'text-red-600' : ''}>
        {valueToString(card.value)}{card.suit}
      </span>
    </div>
  );

  const renderFaceDown = () => (
    <div className="w-16 h-24 rounded border border-black bg-blue-800" />
  );

  return (
    <div className="h-full w-full bg-green-700 text-white select-none p-2">
      {won && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-2xl">
          You win!
        </div>
      )}
      <div className="flex space-x-4 mb-4">
        <div
          className="w-16 h-24" 
          onClick={draw}
        >
          {stock.length ? renderFaceDown() : <div />}
        </div>
        <div className="w-16 h-24" onDragOver={(e) => e.preventDefault()}>
          {waste.length ? (
            <div
              draggable
              onDragStart={() => handleDragStart('waste')}
            >
              {renderCard(waste[waste.length - 1])}
            </div>
          ) : (
            <div className="w-16 h-24" />
          )}
        </div>
        {foundations.map((pile, i) => (
          <div
            key={`f-${i}`}
            className="w-16 h-24"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropToFoundation(i)}
          >
            {pile.length ? renderCard(pile[pile.length - 1]) : <div className="w-16 h-24 border border-dashed border-white rounded" />}
          </div>
        ))}
      </div>
      <div className="flex space-x-4">
        {tableau.map((pile, i) => (
          <div
            key={`t-${i}`}
            className="relative w-16 h-96 border border-black"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropToTableau(i)}
          >
            {pile.map((card, idx) => (
              <div
                key={idx}
                className="absolute"
                style={{ top: idx * 24 }}
                draggable={card.faceUp}
                onDragStart={() => handleDragStart('tableau', i, idx)}
              >
                {card.faceUp ? renderCard(card) : renderFaceDown()}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={init}
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default Solitaire;
