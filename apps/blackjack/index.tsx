import React, { useCallback, useMemo, useState, useEffect } from 'react';
import Dealer from './Dealer';
import PlayerHand from './PlayerHand';
import Controls from './Controls';
import { Card, Hand } from './types';
import { basicStrategy, fisherYates } from '@components/apps/blackjack/engine';

const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck(numDecks = 1): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }
  }
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  return fisherYates([...deck]);
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

function isSoft(hand: Card[]): boolean {
  let total = 0;
  let aces = 0;
  hand.forEach((c) => {
    total += cardScore(c);
    if (c.value === 'A') aces++;
  });
  return aces > 0 && total <= 21;
}

const Blackjack: React.FC<{ userId?: string; token?: string }> = ({ userId, token }) => {
  const [decks, setDecks] = useState(1);
  const [hitSoft17, setHitSoft17] = useState(true);
  const [showCount, setShowCount] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [deck, setDeck] = useState<Card[]>(() => shuffle(createDeck(1)));
  const [dealer, setDealer] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<Hand[]>([]);
  const [active, setActive] = useState(0);
  const [bankroll, setBankroll] = useState(1000);
  const [bet, setBet] = useState(10);
  const [runningCount, setRunningCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [betting, setBetting] = useState(false);
  const trueCount = useMemo(() => runningCount / Math.max(1, deck.length / 52), [runningCount, deck.length]);

  useEffect(() => {
    setDeck(shuffle(createDeck(decks)));
    setRunningCount(0);
  }, [decks]);

  const saveHistory = useCallback(() => {
    setHistory((h) => [
      ...h,
      {
        deck: [...deck],
        dealer: [...dealer],
        playerHands: playerHands.map((ph) => ({ ...ph, cards: [...ph.cards] })),
        active,
        bankroll,
        runningCount,
      },
    ]);
  }, [deck, dealer, playerHands, active, bankroll, runningCount]);

  const dealCard = useCallback((hand: Card[]) => {
    const card = deck[0];
    setDeck(deck.slice(1));
    hand.push(card);
    setRunningCount((c) => c + countValue(card));
  }, [deck]);

  const startRound = useCallback(() => {
    if (deck.length < 15) {
      setDeck(shuffle(createDeck(decks)));
      setRunningCount(0);
    }
    setHistory([]);
    setTookInsurance(false);
    setBetting(true);
    setTimeout(() => setBetting(false), 500);
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
  }, [bet, dealCard, deck.length, decks]);

  const hit = useCallback(() => {
    saveHistory();
    const hands = [...playerHands];
    const hand = hands[active];
    dealCard(hand.cards);
    setPlayerHands(hands);
    if (handValue(hand.cards) > 21) stand();
  }, [active, playerHands, dealCard, stand, saveHistory]);

  const stand = useCallback(() => {
    saveHistory();
    const hands = [...playerHands];
    hands[active].isFinished = true;
    setPlayerHands(hands);
    const next = hands.findIndex((h) => !h.isFinished);
    if (next !== -1) {
      setActive(next);
    } else {
      // dealer turn
      const dealerHand = [...dealer];
      while (
        handValue(dealerHand) < 17 ||
        (hitSoft17 && handValue(dealerHand) === 17 && isSoft(dealerHand))
      ) {
        dealCard(dealerHand);
      }
      setDealer(dealerHand);
      setHistory([]);
      resolveHands(dealerHand, hands);
    }
  }, [active, playerHands, dealer, dealCard, resolveHands, hitSoft17, saveHistory]);

  const resolveHands = useCallback((dealerHand: Card[], hands: Hand[]) => {
    const dealerVal = handValue(dealerHand);
    const results: ('win' | 'loss' | 'push')[] = [];
    hands.forEach((h) => {
      if (h.surrendered) {
        results.push('loss');
        return;
      }
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
    saveHistory();
    const hands = [...playerHands];
    const hand = hands[active];
    const card = hand.cards.pop()!;
    const newHand: Hand = { cards: [card], bet: hand.bet };
    dealCard(hand.cards);
    dealCard(newHand.cards);
    hands.push(newHand);
    setPlayerHands(hands);
  }, [playerHands, active, dealCard, saveHistory]);

  const canDouble = playerHands[active]?.cards.length === 2;
  const doubleDown = useCallback(() => {
    saveHistory();
    const hands = [...playerHands];
    const hand = hands[active];
    setBankroll((b) => b - hand.bet);
    hand.bet *= 2;
    dealCard(hand.cards);
    setPlayerHands(hands);
    stand();
  }, [playerHands, active, dealCard, stand, saveHistory]);

  const canSurrender = playerHands[active]?.cards.length === 2 && playerHands.length === 1 && !playerHands[active]?.isFinished;
  const surrender = useCallback(() => {
    saveHistory();
    const hands = [...playerHands];
    const hand = hands[active];
    hand.isFinished = true;
    hand.surrendered = true;
    setPlayerHands(hands);
    setBankroll((b) => b + Math.floor(hand.bet / 2));
    const next = hands.findIndex((h) => !h.isFinished);
    if (next !== -1) {
      setActive(next);
    } else {
      setHistory([]);
      resolveHands(dealer, hands);
    }
  }, [playerHands, active, dealer, resolveHands, saveHistory]);

  const [tookInsurance, setTookInsurance] = useState(false);
  const canInsurance = dealer[0]?.value === 'A' && !tookInsurance;
  const takeInsurance = useCallback(() => {
    saveHistory();
    setBankroll((b) => b - bet / 2);
    setTookInsurance(true);
  }, [bet, saveHistory]);

  const canUndo = history.length > 0;
  const undo = useCallback(() => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setDeck(prev.deck);
    setDealer(prev.dealer);
    setPlayerHands(prev.playerHands);
    setActive(prev.active);
    setBankroll(prev.bankroll);
    setRunningCount(prev.runningCount);
    setHistory(history.slice(0, -1));
  }, [history]);

  const strategy = useMemo(() => {
    if (!showStrategy || dealer.length === 0 || playerHands.length === 0) return '';
    const hand = playerHands[active];
    const dealerUp = dealer[0];
    return basicStrategy(hand.cards, dealerUp, {
      canSplit,
      canDouble,
      canSurrender,
    });
  }, [showStrategy, dealer, playerHands, active, canSplit, canDouble, canSurrender]);

  return (
    <div className="p-4" aria-label="Blackjack game">
      <div className="mb-2">
        Bankroll: {bankroll}
        {betting && <span aria-hidden="true" className="inline-block animate-bounce ml-1">💰</span>}
      </div>
      <div className="mb-2">
        <label>
          Decks:
          <input
            type="number"
            min={1}
            max={8}
            value={decks}
            onChange={(e) => setDecks(parseInt(e.target.value, 10) || 1)}
            className="ml-1 w-16 border"
            aria-label="Number of decks"
          />
        </label>
      </div>
      <div className="mb-2">
        <label>
          <input
            type="checkbox"
            checked={hitSoft17}
            onChange={(e) => setHitSoft17(e.target.checked)}
            aria-label="Dealer hits soft 17"
          />{' '}
          Dealer hits soft 17
        </label>
      </div>
      <div className="mb-2">
        <label>
          <input
            type="checkbox"
            checked={showCount}
            onChange={(e) => setShowCount(e.target.checked)}
            aria-label="Toggle card counting"
          />{' '}
          Card counting
        </label>
      </div>
      {showCount && (
        <div className="mb-2">Running count: {runningCount} True count: {trueCount.toFixed(2)}</div>
      )}
      <div className="mb-2">
        <label>
          <input
            type="checkbox"
            checked={showStrategy}
            onChange={(e) => setShowStrategy(e.target.checked)}
            aria-label="Toggle basic strategy helper"
          />{' '}
          Basic strategy
        </label>
      </div>
      {showStrategy && strategy && <div className="mb-2">Strategy: {strategy}</div>}
      {dealer.length > 0 && (
        <Dealer hand={dealer} hideHoleCard={playerHands.some((h) => !h.isFinished)} />
      )}
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
        onSurrender={surrender}
        onUndo={undo}
        onInsurance={takeInsurance}
        canSplit={!!canSplit}
        canDouble={canDouble}
        canSurrender={!!canSurrender}
        canUndo={canUndo}
        canInsurance={canInsurance}
        disabled={playerHands.length === 0}
      />
      <button className="btn mt-2" aria-label="Deal" onClick={startRound}>Deal</button>
    </div>
  );
};

export default Blackjack;
