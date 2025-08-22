import React, { useCallback, useMemo, useState } from 'react';
import Dealer from './Dealer';
import PlayerHand from './PlayerHand';
import Controls from './Controls';
import { Card, Hand } from './types';

const suits = ['♠', '♥', '♦', '♣'];
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

function shuffle(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cardScore(card: Card): number {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value, 10);
}

function countValue(card: Card): number {
  const v = card.value;
  if (['2', '3', '4', '5', '6'].includes(v)) return 1;
  if (['10', 'J', 'Q', 'K', 'A'].includes(v)) return -1;
  return 0;
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  hand.forEach((c) => {
    total += cardScore(c);
    if (c.value === 'A') aces++;
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

const Blackjack: React.FC<{ userId?: string; token?: string }> = ({ userId, token }) => {
  const [showCount, setShowCount] = useState(false);
  const [deck, setDeck] = useState<Card[]>(() => shuffle(createDeck()));
  const [dealer, setDealer] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<Hand[]>([]);
  const [active, setActive] = useState(0);
  const [bankroll, setBankroll] = useState(1000);
  const [bet, setBet] = useState(10);
  const [runningCount, setRunningCount] = useState(0);
  const trueCount = useMemo(() => runningCount / (deck.length / 52 || 1), [runningCount, deck.length]);

  const dealCard = useCallback((hand: Card[]) => {
    const card = deck[0];
    setDeck(deck.slice(1));
    hand.push(card);
    setRunningCount((c) => c + countValue(card));
  }, [deck]);

  const startRound = useCallback(() => {
    if (deck.length < 15) {
      setDeck(shuffle(createDeck()));
      setRunningCount(0);
    }
    const newDealer: Card[] = [];
    const player: Hand = { cards: [], bet };
    dealCard(newDealer);
    dealCard(player.cards);
    dealCard(newDealer);
    dealCard(player.cards);
    setDealer(newDealer);
    setPlayerHands([player]);
    setActive(0);
    setBankroll((b) => b - bet);
  }, [bet, dealCard, deck.length]);

  const hit = useCallback(() => {
    const hands = [...playerHands];
    const hand = hands[active];
    dealCard(hand.cards);
    setPlayerHands(hands);
    if (handValue(hand.cards) > 21) stand();
  }, [active, playerHands, dealCard]);

  const stand = useCallback(() => {
    const hands = [...playerHands];
    hands[active].isFinished = true;
    setPlayerHands(hands);
    const next = hands.findIndex((h) => !h.isFinished);
    if (next !== -1) {
      setActive(next);
    } else {
      // dealer turn
      const dealerHand = [...dealer];
      while (handValue(dealerHand) < 17) {
        dealCard(dealerHand);
      }
      setDealer(dealerHand);
      resolveHands(dealerHand, hands);
    }
  }, [active, playerHands, dealer, dealCard]);

  const resolveHands = useCallback((dealerHand: Card[], hands: Hand[]) => {
    const dealerVal = handValue(dealerHand);
    const results: ('win' | 'loss' | 'push')[] = [];
    hands.forEach((h) => {
      const val = handValue(h.cards);
      let result: 'win' | 'loss' | 'push' = 'loss';
      if (val > 21) result = 'loss';
      else if (dealerVal > 21 || val > dealerVal) result = 'win';
      else if (val === dealerVal) result = 'push';
      results.push(result);
      if (result === 'win') setBankroll((b) => b + h.bet * 2);
      if (result === 'push') setBankroll((b) => b + h.bet);
    });
    if (userId && token) {
      fetch(`/api/users/${userId}/blackjack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ result: results[0], bankroll }),
      });
    }
  }, [bankroll, token, userId]);

  const canSplit = playerHands[active]?.cards[0]?.value === playerHands[active]?.cards[1]?.value && playerHands.length === 1;
  const split = useCallback(() => {
    const hands = [...playerHands];
    const hand = hands[active];
    const card = hand.cards.pop()!;
    const newHand: Hand = { cards: [card], bet: hand.bet };
    dealCard(hand.cards);
    dealCard(newHand.cards);
    hands.push(newHand);
    setPlayerHands(hands);
  }, [playerHands, active, dealCard]);

  const canDouble = playerHands[active]?.cards.length === 2;
  const doubleDown = useCallback(() => {
    const hands = [...playerHands];
    const hand = hands[active];
    setBankroll((b) => b - hand.bet);
    hand.bet *= 2;
    dealCard(hand.cards);
    setPlayerHands(hands);
    stand();
  }, [playerHands, active, dealCard, stand]);

  const [tookInsurance, setTookInsurance] = useState(false);
  const canInsurance = dealer[0]?.value === 'A' && !tookInsurance;
  const takeInsurance = useCallback(() => {
    setBankroll((b) => b - bet / 2);
    setTookInsurance(true);
  }, [bet]);

  return (
    <div className="p-4" aria-label="Blackjack game">
      <div className="mb-2">Bankroll: {bankroll}</div>
      <div className="mb-2"><label><input type="checkbox" checked={showCount} onChange={e=>setShowCount(e.target.checked)} aria-label="Toggle card counting" /> Card counting</label></div>
      {showCount && <div className="mb-2">True count: {trueCount.toFixed(2)}</div>}
      {dealer.length > 0 && <Dealer hand={dealer} hideHoleCard={playerHands.some((h) => !h.isFinished)} />}
      <div className="space-y-2">
        {playerHands.map((h, idx) => (
          <PlayerHand key={idx} hand={h} active={idx === active} />
        ))}
      </div>
      <Controls
        onHit={hit}
        onStand={stand}
        onSplit={split}
        onDouble={doubleDown}
        onInsurance={takeInsurance}
        canSplit={!!canSplit}
        canDouble={canDouble}
        canInsurance={canInsurance}
        disabled={playerHands.length === 0}
      />
      <button className="btn mt-2" aria-label="Deal" onClick={startRound}>Deal</button>
    </div>
  );
};

export default Blackjack;
