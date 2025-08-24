"use client";

import React, { useEffect, useState } from 'react';
import { Card } from './types';
import { fisherYates } from '@components/apps/blackjack/engine';

const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function countValue(card: Card): number {
  const v = card.value;
  if (['2', '3', '4', '5', '6'].includes(v)) return 1;
  if (['10', 'J', 'Q', 'K', 'A'].includes(v)) return -1;
  return 0;
}

export default function CountingPractice() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [current, setCurrent] = useState<Card | null>(null);
  const [running, setRunning] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');

  const deal = () => {
    if (deck.length === 0) {
      setDeck(fisherYates(createDeck()));
      return;
    }
    const [card, ...rest] = deck;
    setDeck(rest);
    setCurrent(card);
    setRunning((r) => r + countValue(card));
  };

  useEffect(() => {
    setDeck(fisherYates(createDeck()));
  }, []);

  useEffect(() => {
    if (!current && deck.length > 0) deal();
  }, [deck, current]);

  const check = () => {
    if (guess.trim() === '') return;
    const g = parseInt(guess, 10);
    if (g === running) {
      setFeedback('Correct!');
    } else {
      setFeedback(`Incorrect. Count is ${running}.`);
    }
  };

  const next = () => {
    setFeedback('');
    setGuess('');
    deal();
  };

  return (
    <div className="p-4 border mt-4" aria-label="Card counting practice">
      <div className="mb-2 text-lg">{current ? `${current.value}${current.suit}` : '?'}</div>
      <input
        className="border p-1 mr-2 w-20"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        aria-label="Your running count"
      />
      <button className="btn" onClick={check} aria-label="Check count">Check</button>
      {feedback && <div className="mt-2">{feedback}</div>}
      <button className="btn mt-2" onClick={next} aria-label="Next card">Next</button>
    </div>
  );
}

