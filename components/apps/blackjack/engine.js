// Blackjack game engine with multi-deck shoe and basic strategy

export const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const buildDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, value: rank });
    }
  }
  return deck;
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export class Shoe {
  constructor(decks = 6, penetration = 0.75) {
    this.decks = decks;
    this.penetration = penetration;
    this.shuffleCount = 0;
    this.runningCount = 0;
    this.composition = {};
    this.shuffle();
  }

  shuffle() {
    this.cards = [];
    for (let i = 0; i < this.decks; i += 1) {
      this.cards.push(...buildDeck());
    }
    shuffleArray(this.cards);
    this.shufflePoint = Math.floor(this.cards.length * this.penetration);
    this.dealt = 0;
    this.shuffleCount += 1;
    this.runningCount = 0;
    this.composition = {};
    RANKS.forEach((r) => {
      this.composition[r] = this.decks * 4;
    });
    // burn one card
    this.draw();
  }

  draw() {
    if (this.dealt >= this.shufflePoint || this.cards.length === 0) {
      this.shuffle();
    }
    this.dealt += 1;
    const card = this.cards.pop();
    const v = card.value;
    if (this.composition[v] !== undefined) this.composition[v] -= 1;
    if (['2', '3', '4', '5', '6'].includes(v)) this.runningCount += 1;
    else if (['10', 'J', 'Q', 'K', 'A'].includes(v)) this.runningCount -= 1;
    return card;
  }
}

export const cardValue = (card) => {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value, 10);
};

export const handValue = (hand) => {
  let total = 0;
  let aces = 0;
  hand.forEach((card) => {
    total += cardValue(card);
    if (card.value === 'A') aces += 1;
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
};

export const calculateBustProbability = (handCards, composition) => {
  if (!handCards || !composition) return 0;
  const counts = Object.entries(composition);
  const totalCards = counts.reduce((sum, [, count]) => sum + count, 0);
  if (totalCards === 0) return 0;
  const bustCards = counts.reduce((sum, [value, count]) => {
    if (count <= 0) return sum;
    const wouldBust = handValue([...handCards, { value, suit: '♠' }]) > 21;
    return sum + (wouldBust ? count : 0);
  }, 0);
  return bustCards / totalCards;
};

export const isSoft = (hand) => {
  let total = 0;
  let aces = 0;
  hand.forEach((card) => {
    total += cardValue(card);
    if (card.value === 'A') aces += 1;
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return aces > 0 && total < 21;
};

// Basic strategy for 4-8 decks, dealer stands on soft 17, double after split allowed
export function basicStrategy(playerCards, dealerUpCard, options = {}) {
  const { canSplit = false, canDouble = false, canSurrender = false } = options;
  const up = dealerUpCard.value === 'A' ? 11 : cardValue(dealerUpCard);
  const values = playerCards.map((c) => c.value);
  const total = handValue(playerCards);
  const pair = values.length === 2 && cardValue(playerCards[0]) === cardValue(playerCards[1]);
  const soft = values.includes('A') && total <= 21;

  if (canSurrender) {
    if (total === 16 && [9, 10, 11].includes(up)) return 'surrender';
    if (total === 15 && up === 10) return 'surrender';
  }

  if (pair && canSplit) {
    const v = cardValue(playerCards[0]);
    if ([8, 11].includes(v)) return 'split'; // 8s or Aces
    if ([2, 3, 7].includes(v) && up >= 2 && up <= 7) return 'split';
    if (v === 6 && up >= 2 && up <= 6) return 'split';
    if (v === 9 && [2, 3, 4, 5, 6, 8, 9].includes(up)) return 'split';
    if (v === 4 && [5, 6].includes(up)) return 'split';
    if (v === 2 && [2, 3, 4, 5, 6, 7].includes(up)) return 'split';
    if (v === 3 && [2, 3, 4, 5, 6, 7].includes(up)) return 'split';
    if (v === 7 && [2, 3, 4, 5, 6, 7].includes(up)) return 'split';
    if (v === 6 && [2, 3, 4, 5, 6].includes(up)) return 'split';
    if (v === 5) {
      // treat as hard 10
      if (canDouble && up >= 2 && up <= 9) return 'double';
      return 'hit';
    }
  }

  if (soft) {
    if (total <= 17) return canDouble && up >= 3 && up <= 6 ? 'double' : 'hit';
    if (total === 18) {
      if (canDouble && up >= 3 && up <= 6) return 'double';
      if (up >= 9 || up === 11) return 'hit';
      return 'stand';
    }
    return 'stand';
  }

  // hard totals
  if (total <= 8) return 'hit';
  if (total === 9) return canDouble && up >= 3 && up <= 6 ? 'double' : 'hit';
  if (total === 10) return canDouble && up >= 2 && up <= 9 ? 'double' : 'hit';
  if (total === 11) return canDouble && up !== 11 ? 'double' : 'hit';
  if (total === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit';
  if (total >= 13 && total <= 16) return up >= 2 && up <= 6 ? 'stand' : 'hit';
  return 'stand';
}

export class BlackjackGame {
  constructor({ decks = 6, bankroll = 10000, hitSoft17 = true, penetration = 0.75 } = {}) {
    this.shoe = new Shoe(decks, penetration);
    this.bankroll = bankroll; // in chips (integers)
    this.stats = { wins: 0, losses: 0, pushes: 0, hands: 0 };
    this.hitSoft17 = hitSoft17;
    this.history = [];
    this.resetRound();
  }

  resetRound() {
    this.playerHands = [];
    this.dealerHand = [];
    this.current = 0;
    this.bet = 0;
    this.insuranceBet = 0;
    this.dealerBlackjack = false;
    this.insuranceResolved = false;
  }

  startRound(bet, presetDeck, hands = 1) {
    if (bet * hands > this.bankroll) throw new Error('Bet exceeds bankroll');
    this.resetRound();
    this.bet = bet;
    this.bankroll -= bet * hands;
    if (presetDeck) {
      // ensure deterministic order for tests by appending cards to be drawn
      this.shoe.cards = this.shoe.cards.concat(presetDeck.slice().reverse());
    }
    const players = Array.from({ length: hands }, () => ({
      cards: [this.shoe.draw(), this.shoe.draw()],
      bet,
      finished: false,
      doubled: false,
      surrendered: false,
    }));
    const dealer = [this.shoe.draw(), this.shoe.draw()];
    this.playerHands = players;
    this.dealerHand = dealer;
    this.dealerBlackjack = handValue(dealer) === 21;
    return { player: players[0], dealer };
  }

  currentHand() {
    return this.playerHands[this.current];
  }

  hit() {
    const hand = this.currentHand();
    hand.cards.push(this.shoe.draw());
    if (handValue(hand.cards) > 21) {
      hand.finished = true;
      hand.busted = true;
      this.nextHand();
    }
  }

  stand() {
    const hand = this.currentHand();
    hand.finished = true;
    this.nextHand();
  }

  double() {
    const hand = this.currentHand();
    if (this.bankroll < hand.bet) throw new Error('Not enough bankroll');
    this.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(this.shoe.draw());
    hand.finished = true;
    if (handValue(hand.cards) > 21) hand.busted = true;
    this.nextHand();
  }

  split() {
    const hand = this.currentHand();
    const card1 = hand.cards[0];
    const card2 = hand.cards[1];
    if (cardValue(card1) !== cardValue(card2)) throw new Error('Cannot split');
    if (this.bankroll < hand.bet) throw new Error('Not enough bankroll');
    this.bankroll -= hand.bet;
    const newHand = { cards: [card2, this.shoe.draw()], bet: hand.bet, finished: false, doubled: false, surrendered: false };
    hand.cards = [card1, this.shoe.draw()];
    this.playerHands.splice(this.current + 1, 0, newHand);
  }

  surrender() {
    const hand = this.currentHand();
    if (hand.cards.length !== 2 || hand.finished) throw new Error('Cannot surrender');
    hand.finished = true;
    hand.surrendered = true;
    this.bankroll += Math.floor(hand.bet / 2);
    this.nextHand();
  }

  takeInsurance() {
    if (this.dealerHand[0].value !== 'A') throw new Error('Insurance not offered');
    if (this.insuranceResolved) return;
    const bet = Math.floor((this.bet * this.playerHands.length) / 2);
    if (bet > this.bankroll) throw new Error('Not enough bankroll');
    this.bankroll -= bet;
    this.insuranceBet = bet;
    this.insuranceResolved = true;
    if (this.dealerBlackjack) {
      // pays 2:1
      this.bankroll += bet * 3;
    }
  }

  nextHand() {
    while (this.current < this.playerHands.length && this.playerHands[this.current].finished) {
      this.current += 1;
    }
    if (this.current >= this.playerHands.length) {
      this.dealerPlayAndSettle();
    }
  }

  dealerPlayAndSettle() {
    if (!this.dealerBlackjack) {
      while (
        handValue(this.dealerHand) < 17 ||
        (this.hitSoft17 && handValue(this.dealerHand) === 17 && isSoft(this.dealerHand) && this.dealerHand.some((c) => c.value === 'A'))
      ) {
        this.dealerHand.push(this.shoe.draw());
      }
    }
    const dealerTotal = handValue(this.dealerHand);
    this.playerHands.forEach((hand) => {
      if (hand.surrendered) {
        this.stats.losses += 1;
        this.stats.hands += 1;
        hand.result = 'lose';
        return;
      }
      const playerTotal = handValue(hand.cards);
      const blackjack = hand.cards.length === 2 && playerTotal === 21;
      if (hand.busted || (!this.dealerBlackjack && dealerTotal > playerTotal && dealerTotal <= 21)) {
        this.stats.losses += 1;
        hand.result = 'lose';
      } else if (blackjack && !this.dealerBlackjack) {
        this.bankroll += Math.floor(hand.bet * 5 / 2);
        this.stats.wins += 1;
        hand.result = 'win';
      } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
        this.bankroll += hand.bet * 2;
        this.stats.wins += 1;
        hand.result = 'win';
      } else if (playerTotal === dealerTotal) {
        this.bankroll += hand.bet;
        this.stats.pushes += 1;
        hand.result = 'push';
      } else {
        this.stats.losses += 1;
        hand.result = 'lose';
      }
      this.stats.hands += 1;
    });

    this.history.push({
      dealer: [...this.dealerHand],
      playerHands: this.playerHands.map((h) => ({
        cards: [...h.cards],
        bet: h.bet,
        result: h.result,
      })),
    });
  }
}
