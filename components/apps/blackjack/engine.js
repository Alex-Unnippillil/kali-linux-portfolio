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

const hashStringToUint32 = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (a) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffleArray = (array, rng = Math.random) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export class Shoe {
  constructor(decks = 6, penetration = 0.75, options = {}) {
    let resolvedDecks = decks;
    let resolvedPenetration = penetration;
    let resolvedOptions = options;
    if (typeof decks === 'object') {
      resolvedOptions = decks;
      resolvedDecks = decks.decks ?? 6;
      resolvedPenetration = decks.penetration ?? 0.75;
    } else if (typeof penetration === 'object') {
      resolvedOptions = penetration;
      resolvedPenetration = penetration.penetration ?? 0.75;
    }
    const { rng } = resolvedOptions;
    this.decks = resolvedDecks;
    this.penetration = resolvedPenetration;
    this.rng = rng || Math.random;
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
    shuffleArray(this.cards, this.rng);
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

export const evaluateHand = (hand) => {
  let hardTotal = 0;
  let aces = 0;
  hand.forEach((card) => {
    if (card.value === 'A') {
      aces += 1;
      hardTotal += 1;
    } else {
      hardTotal += cardValue(card);
    }
  });

  const canBeSoft = aces > 0 && hardTotal + 10 <= 21;
  const total = canBeSoft ? hardTotal + 10 : hardTotal;

  return {
    total,
    isSoft: canBeSoft,
    isBlackjack: hand.length === 2 && total === 21,
    isBust: total > 21,
  };
};

export const handValue = (hand) => evaluateHand(hand).total;

export const isSoft = (hand) => evaluateHand(hand).isSoft;

// Basic strategy for 4-8 decks, dealer stands on soft 17, double after split allowed
export function basicStrategy(playerCards, dealerUpCard, options = {}) {
  const { canSplit = false, canDouble = false, canSurrender = false } = options;
  const up = dealerUpCard.value === 'A' ? 11 : cardValue(dealerUpCard);
  const values = playerCards.map((c) => c.value);
  const total = handValue(playerCards);
  const pair = values.length === 2 && cardValue(playerCards[0]) === cardValue(playerCards[1]);
  const soft = isSoft(playerCards);

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
  constructor({ decks = 6, bankroll = 10000, hitSoft17, penetration = 0.75, rules = {}, rngSeed, rng } = {}) {
    const defaultRules = {
      hitSoft17: true,
      allowSurrender: true,
      allowDoubleAfterSplit: true,
      allowSurrenderAfterSplit: false,
      maxSplits: 3,
      resplitAces: false,
      hitSplitAces: false,
      dealerPeek: true,
      blackjackPayout: 1.5,
    };

    this.rules = { ...defaultRules, ...rules };
    if (hitSoft17 !== undefined) {
      this.rules.hitSoft17 = hitSoft17;
    }

    this.stats = { wins: 0, losses: 0, pushes: 0, hands: 0 };
    this.history = [];
    this.bankroll = bankroll; // in chips (integers)

    const resolvedRng = rng || (rngSeed ? mulberry32(hashStringToUint32(rngSeed)) : undefined);
    this.shoe = new Shoe(decks, penetration, { rng: resolvedRng });
    this.phase = 'betting';
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
    this.phase = 'betting';
  }

  currentHand() {
    const hand = this.playerHands[this.current];
    if (!hand) throw new Error('No active hand');
    return hand;
  }

  startRound(bet, presetDeck, hands = 1) {
    if (this.phase !== 'betting') throw new Error('Round already in progress');
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
      fromSplit: false,
      splitDepth: 0,
      isSplitAceHand: false,
    }));
    const dealer = [this.shoe.draw(), this.shoe.draw()];
    this.playerHands = players;
    this.dealerHand = dealer;
    this.dealerBlackjack = evaluateHand(dealer).isBlackjack;
    this.phase = dealer[0].value === 'A' ? 'insurance' : 'player';
    if (this.rules.dealerPeek && this.dealerBlackjack && this.phase !== 'insurance') {
      this.dealerPlayAndSettle();
    }
    return { player: players[0], dealer };
  }

  ensurePlayerPhase() {
    if (this.phase !== 'player') {
      throw new Error('Round not in player phase');
    }
  }

  hit() {
    this.ensurePlayerPhase();
    const hand = this.currentHand();
    if (hand.finished) throw new Error('Hand already finished');
    if (hand.isSplitAceHand && !this.rules.hitSplitAces) throw new Error('Cannot hit split aces');
    hand.cards.push(this.shoe.draw());
    const evalHand = evaluateHand(hand.cards);
    if (evalHand.isBust) {
      hand.finished = true;
      hand.busted = true;
      this.nextHand();
    }
  }

  stand() {
    this.ensurePlayerPhase();
    const hand = this.currentHand();
    if (hand.finished) throw new Error('Hand already finished');
    hand.finished = true;
    this.nextHand();
  }

  double() {
    this.ensurePlayerPhase();
    const hand = this.currentHand();
    if (hand.finished) throw new Error('Hand already finished');
    if (hand.cards.length !== 2) throw new Error('Can only double on first two cards');
    if (hand.fromSplit && !this.rules.allowDoubleAfterSplit) throw new Error('Cannot double after split');
    if (this.bankroll < hand.bet) throw new Error('Not enough bankroll');
    this.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(this.shoe.draw());
    const evalHand = evaluateHand(hand.cards);
    hand.finished = true;
    if (evalHand.isBust) hand.busted = true;
    this.nextHand();
  }

  split() {
    this.ensurePlayerPhase();
    const hand = this.currentHand();
    if (hand.finished) throw new Error('Hand already finished');
    if (hand.cards.length !== 2) throw new Error('Cannot split');
    const card1 = hand.cards[0];
    const card2 = hand.cards[1];
    if (cardValue(card1) !== cardValue(card2)) throw new Error('Cannot split');
    if (hand.splitDepth >= this.rules.maxSplits) throw new Error('Maximum splits reached');
    if (hand.isSplitAceHand && !this.rules.resplitAces) throw new Error('Cannot resplit aces');
    if (this.bankroll < hand.bet) throw new Error('Not enough bankroll');
    this.bankroll -= hand.bet;

    const splitDepth = hand.splitDepth + 1;
    const splittingAces = card1.value === 'A';

    const makeHand = (firstCard) => ({
      cards: [firstCard, this.shoe.draw()],
      bet: hand.bet,
      finished: false,
      doubled: false,
      surrendered: false,
      fromSplit: true,
      splitDepth,
      isSplitAceHand: splittingAces,
    });

    const newHand = makeHand(card2);
    Object.assign(hand, makeHand(card1));

    this.playerHands.splice(this.current + 1, 0, newHand);

    if (splittingAces && !this.rules.hitSplitAces) {
      hand.finished = true;
      newHand.finished = true;
      this.nextHand();
    }
  }

  surrender() {
    this.ensurePlayerPhase();
    const hand = this.currentHand();
    if (hand.finished) throw new Error('Hand already finished');
    if (hand.cards.length !== 2) throw new Error('Cannot surrender');
    if (!this.rules.allowSurrender) throw new Error('Surrender not allowed');
    if (hand.fromSplit && !this.rules.allowSurrenderAfterSplit) throw new Error('Surrender not allowed after split');
    hand.finished = true;
    hand.surrendered = true;
    this.bankroll += Math.floor(hand.bet / 2);
    this.nextHand();
  }

  takeInsurance() {
    if (this.phase !== 'insurance') throw new Error('Insurance not available');
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
      this.dealerPlayAndSettle();
    } else {
      this.phase = 'player';
    }
  }

  skipInsurance() {
    if (this.phase !== 'insurance') throw new Error('Insurance not available');
    this.insuranceResolved = true;
    if (this.dealerBlackjack && this.rules.dealerPeek) {
      this.dealerPlayAndSettle();
    } else {
      this.phase = 'player';
    }
  }

  nextHand() {
    while (this.current < this.playerHands.length && this.playerHands[this.current].finished) {
      this.current += 1;
    }
    if (this.current >= this.playerHands.length && this.phase === 'player') {
      this.dealerPlayAndSettle();
    }
  }

  dealerPlayAndSettle() {
    this.phase = 'dealer';
    if (!this.dealerBlackjack) {
      let dealerEval = evaluateHand(this.dealerHand);
      while (
        dealerEval.total < 17 ||
        (this.rules.hitSoft17 && dealerEval.total === 17 && dealerEval.isSoft)
      ) {
        this.dealerHand.push(this.shoe.draw());
        dealerEval = evaluateHand(this.dealerHand);
      }
    }
    const dealerEval = evaluateHand(this.dealerHand);
    this.playerHands.forEach((hand) => {
      if (hand.surrendered) {
        this.stats.losses += 1;
        this.stats.hands += 1;
        hand.result = 'lose';
        return;
      }
      const playerEval = evaluateHand(hand.cards);
      const blackjack = playerEval.isBlackjack && !hand.fromSplit;

      if (playerEval.isBust || (!this.dealerBlackjack && dealerEval.total > playerEval.total && dealerEval.total <= 21)) {
        this.stats.losses += 1;
        hand.result = 'lose';
      } else if (blackjack && !this.dealerBlackjack) {
        this.bankroll += Math.floor(hand.bet * (1 + this.rules.blackjackPayout));
        this.stats.wins += 1;
        hand.result = 'win';
      } else if (dealerEval.total > 21 || playerEval.total > dealerEval.total || (this.dealerBlackjack && blackjack)) {
        const payout = this.dealerBlackjack && blackjack ? hand.bet : hand.bet * 2;
        this.bankroll += payout;
        if (this.dealerBlackjack && blackjack) {
          this.stats.pushes += 1;
          hand.result = 'push';
        } else {
          this.stats.wins += 1;
          hand.result = 'win';
        }
      } else if (playerEval.total === dealerEval.total) {
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
    this.phase = 'settled';
  }

  getLegalActions() {
    const defaults = { hit: false, stand: false, double: false, split: false, surrender: false, insurance: false };
    if (this.phase === 'insurance') {
      return { ...defaults, insurance: true };
    }
    if (this.phase !== 'player') return defaults;
    const hand = this.playerHands[this.current];
    if (!hand || hand.finished) return defaults;

    const canSplitPair =
      hand.cards.length === 2 &&
      cardValue(hand.cards[0]) === cardValue(hand.cards[1]) &&
      hand.splitDepth < this.rules.maxSplits &&
      (!hand.isSplitAceHand || this.rules.resplitAces);

    const canSplit = canSplitPair && this.bankroll >= hand.bet;
    const canDouble =
      hand.cards.length === 2 &&
      this.bankroll >= hand.bet &&
      (!hand.fromSplit || this.rules.allowDoubleAfterSplit);

    const canSurrender =
      this.rules.allowSurrender &&
      hand.cards.length === 2 &&
      !hand.surrendered &&
      (!hand.fromSplit || this.rules.allowSurrenderAfterSplit);

    return {
      hit: !hand.finished && (!hand.isSplitAceHand || this.rules.hitSplitAces),
      stand: !hand.finished,
      double: !hand.finished && canDouble,
      split: !hand.finished && canSplit,
      surrender: !hand.finished && canSurrender,
      insurance: false,
    };
  }
}

