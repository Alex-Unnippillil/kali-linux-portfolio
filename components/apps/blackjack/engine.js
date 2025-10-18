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

export const isSoft = (hand) => {
  let total = 0;
  let aces = 0;
  hand.forEach((card) => {
    total += cardValue(card);
    if (card.value === 'A') aces += 1;
  });
  return aces > 0 && total <= 21;
};

const DEALER_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const fillActions = (code) => {
  const entries = {};
  DEALER_VALUES.forEach((v) => {
    entries[v] = code;
  });
  return entries;
};

const HARD_CHART = {
  4: fillActions('H'),
  5: fillActions('H'),
  6: fillActions('H'),
  7: fillActions('H'),
  8: fillActions('H'),
  9: { ...fillActions('H'), 3: 'Dh', 4: 'Dh', 5: 'Dh', 6: 'Dh' },
  10: { ...fillActions('H'), 2: 'Dh', 3: 'Dh', 4: 'Dh', 5: 'Dh', 6: 'Dh', 7: 'Dh', 8: 'Dh', 9: 'Dh' },
  11: { ...fillActions('H'), 2: 'Dh', 3: 'Dh', 4: 'Dh', 5: 'Dh', 6: 'Dh', 7: 'Dh', 8: 'Dh', 9: 'Dh', 10: 'Dh' },
  12: { ...fillActions('H'), 4: 'S', 5: 'S', 6: 'S' },
  13: { ...fillActions('H'), 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S' },
  14: { ...fillActions('H'), 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S' },
  15: { ...fillActions('H'), 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 10: 'Rh' },
  16: { ...fillActions('H'), 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 9: 'Rh', 10: 'Rh', 11: 'Rh' },
  17: fillActions('S'),
  18: fillActions('S'),
  19: fillActions('S'),
  20: fillActions('S'),
  21: fillActions('S'),
};

const SOFT_CHART = {
  13: { ...fillActions('H'), 5: 'Dh', 6: 'Dh' },
  14: { ...fillActions('H'), 5: 'Dh', 6: 'Dh' },
  15: { ...fillActions('H'), 4: 'Dh', 5: 'Dh', 6: 'Dh' },
  16: { ...fillActions('H'), 4: 'Dh', 5: 'Dh', 6: 'Dh' },
  17: { ...fillActions('H'), 3: 'Dh', 4: 'Dh', 5: 'Dh', 6: 'Dh' },
  18: {
    ...fillActions('H'),
    2: 'S',
    3: 'Ds',
    4: 'Ds',
    5: 'Ds',
    6: 'Ds',
    7: 'S',
    8: 'S',
  },
  19: { ...fillActions('S'), 6: 'Ds' },
  20: fillActions('S'),
  21: fillActions('S'),
};

const PAIR_CHART = {
  2: { ...fillActions('H'), 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P' },
  3: { ...fillActions('H'), 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P' },
  4: { ...fillActions('H'), 5: 'P', 6: 'P' },
  5: { ...fillActions('H'), 2: 'Dh', 3: 'Dh', 4: 'Dh', 5: 'Dh', 6: 'Dh', 7: 'Dh', 8: 'Dh', 9: 'Dh' },
  6: { ...fillActions('H'), 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P' },
  7: { ...fillActions('H'), 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P' },
  8: fillActions('P'),
  9: { ...fillActions('S'), 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 8: 'P', 9: 'P' },
  10: fillActions('S'),
  11: fillActions('P'),
};

const resolveAction = (code, { canDouble, canSplit, canSurrender }) => {
  switch (code) {
    case 'H':
      return 'hit';
    case 'S':
      return 'stand';
    case 'Dh':
      return canDouble ? 'double' : 'hit';
    case 'Ds':
      return canDouble ? 'double' : 'stand';
    case 'P':
      return canSplit ? 'split' : 'hit';
    case 'Rh':
      return canSurrender ? 'surrender' : 'hit';
    case 'Rs':
      return canSurrender ? 'surrender' : 'stand';
    default:
      return 'hit';
  }
};

const getChartAction = (chart, key, dealerValue) => {
  const row = chart[key];
  if (!row) return undefined;
  return row[dealerValue] ?? row.default;
};

// Basic strategy for 4-8 decks, dealer stands on soft 17, double after split allowed
export function basicStrategy(playerCards, dealerUpCard, options = {}) {
  const { canSplit = false, canDouble = false, canSurrender = false } = options;
  if (!playerCards || playerCards.length === 0 || !dealerUpCard) return 'hit';
  const up = dealerUpCard.value === 'A' ? 11 : cardValue(dealerUpCard);
  const total = handValue(playerCards);
  const pair =
    playerCards.length === 2 && cardValue(playerCards[0]) === cardValue(playerCards[1]);
  const soft = isSoft(playerCards);

  if (playerCards.length === 2 && !soft && !pair) {
    const surrenderCode = getChartAction(HARD_CHART, total, up);
    if (surrenderCode && surrenderCode.startsWith('R')) {
      const surrenderAction = resolveAction(surrenderCode, { canDouble, canSplit, canSurrender });
      if (surrenderAction === 'surrender') {
        return surrenderAction;
      }
    }
  }

  if (pair) {
    const value = cardValue(playerCards[0]);
    const code = getChartAction(PAIR_CHART, value, up);
    if (code === 'P') {
      if (canSplit) {
        return 'split';
      }
      // otherwise fall through to hard/soft evaluation
    } else if (code) {
      return resolveAction(code, { canDouble, canSplit, canSurrender });
    }
  }

  if (soft) {
    const code = getChartAction(SOFT_CHART, total, up);
    if (code) {
      return resolveAction(code, { canDouble, canSplit, canSurrender });
    }
  }

  const code = getChartAction(HARD_CHART, total, up) || 'H';
  return resolveAction(code, { canDouble, canSplit, canSurrender });
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
    if (hand.cards.length !== 2 || hand.finished) throw new Error('Cannot double');
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
    if (hand.cards.length !== 2 || hand.finished) throw new Error('Cannot split');
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

