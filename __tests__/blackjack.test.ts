import { Shoe, BlackjackGame, basicStrategy } from '../components/apps/blackjack/engine';

const card = (v: string) => ({ suit: '\u2660', value: v });
const buildHand = (...values: string[]) => values.map((v) => card(v));

describe('Shoe mechanics', () => {
  test('burn card and cut card shuffle', () => {
    const shoe = new Shoe(2, 0.5);
    expect(shoe.cards.length).toBe(2 * 52 - 1); // burn card removed
    const count = shoe.shuffleCount;
    for (let i = 0; i < shoe.shufflePoint; i += 1) {
      shoe.draw();
    }
    expect(shoe.shuffleCount).toBe(count + 1);
  });
});

describe('Game actions', () => {
  test('hit and bust', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('10'), card('6'), card('9'), card('7'), card('9')];
    game.startRound(100, deck);
    game.hit();
    expect(game.playerHands[0].busted).toBe(true);
    expect(game.bankroll).toBe(900);
  });

  test('double down payout', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('5'), card('6'), card('9'), card('7'), card('10'), card('9')];
    game.startRound(100, deck);
    game.double();
    expect(game.bankroll).toBe(1200);
    expect(game.stats.wins).toBe(1);
  });

  test('split and win both hands', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('8'), card('8'), card('6'), card('10'), card('3'), card('2'), card('9')];
    game.startRound(100, deck);
    game.split();
    game.stand(); // first hand
    game.stand(); // second hand
    expect(game.bankroll).toBe(1200);
    expect(game.stats.wins).toBe(2);
  });

  test('split hands play sequentially', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [
      card('8'),
      card('8'),
      card('6'),
      card('10'),
      card('2'),
      card('3'),
      card('4'),
      card('5'),
      card('9'),
    ];
    game.startRound(100, deck);
    game.split();
    game.hit();
    game.stand();
    expect(game.current).toBe(1);
    game.hit();
    game.stand();
    expect(game.playerHands[0].cards.map((c) => c.value)).toEqual(['8', '3', '4']);
    expect(game.playerHands[1].cards.map((c) => c.value)).toEqual(['8', '2', '5']);
    expect(game.bankroll).toBe(1200);
  });

  test('surrender returns half bet', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('10'), card('6'), card('10'), card('5')];
    game.startRound(100, deck);
    game.surrender();
    expect(game.bankroll).toBe(950);
    expect(game.stats.losses).toBe(1);
  });

  test('startRound supports multiple hands', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    game.startRound(100, undefined, 2);
    expect(game.playerHands.length).toBe(2);
    expect(game.bankroll).toBe(800);
  });

  test('insurance pays 2:1 on dealer blackjack', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('10'), card('10'), card('A'), card('10')];
    game.startRound(100, deck);
    game.takeInsurance();
    game.stand();
    expect(game.bankroll).toBe(1000);
    expect(game.stats.losses).toBe(1);
  });

  test('dealer stands on soft 17 when configured', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000, hitSoft17: false });
    const deck = [card('10'), card('7'), card('A'), card('6'), card('5')];
    game.startRound(100, deck);
    game.stand();
    expect(game.dealerHand.length).toBe(2);
    expect(game.bankroll).toBe(1000);
    expect(game.playerHands[0].result).toBe('push');
  });
});

describe('Basic strategy', () => {
  const dealerValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
  const defaultOptions = { canDouble: true, canSplit: true, canSurrender: true };

  test('recommends surrender on 16 vs 10', () => {
    expect(basicStrategy(buildHand('10', '6'), card('10'), { canSurrender: true })).toBe('surrender');
  });
  test('recommends split on 8s vs 10', () => {
    expect(basicStrategy(buildHand('8', '8'), card('10'), { canSplit: true })).toBe('split');
  });
  test('recommends hit on A7 vs 9', () => {
    expect(basicStrategy(buildHand('A', '7'), card('9'), { canDouble: true })).toBe('hit');
  });

  const HARD_HANDS: Record<number, [string, string]> = {
    5: ['2', '3'],
    6: ['2', '4'],
    7: ['3', '4'],
    8: ['3', '5'],
    9: ['4', '5'],
    10: ['4', '6'],
    11: ['5', '6'],
    12: ['9', '3'],
    13: ['8', '5'],
    14: ['9', '5'],
    15: ['9', '6'],
    16: ['9', '7'],
    17: ['9', '8'],
  };

  const HARD_EXPECTATIONS: Record<number, Record<string, string>> = {
    5: { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'hit', '6': 'hit', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    6: { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'hit', '6': 'hit', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    7: { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'hit', '6': 'hit', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    8: { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'hit', '6': 'hit', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    9: { '2': 'hit', '3': 'double', '4': 'double', '5': 'double', '6': 'double', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    10: {
      '2': 'double',
      '3': 'double',
      '4': 'double',
      '5': 'double',
      '6': 'double',
      '7': 'double',
      '8': 'double',
      '9': 'double',
      '10': 'hit',
      'A': 'hit',
    },
    11: {
      '2': 'double',
      '3': 'double',
      '4': 'double',
      '5': 'double',
      '6': 'double',
      '7': 'double',
      '8': 'double',
      '9': 'double',
      '10': 'double',
      'A': 'hit',
    },
    12: { '2': 'hit', '3': 'hit', '4': 'stand', '5': 'stand', '6': 'stand', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    13: { '2': 'stand', '3': 'stand', '4': 'stand', '5': 'stand', '6': 'stand', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    14: { '2': 'stand', '3': 'stand', '4': 'stand', '5': 'stand', '6': 'stand', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    15: {
      '2': 'stand',
      '3': 'stand',
      '4': 'stand',
      '5': 'stand',
      '6': 'stand',
      '7': 'hit',
      '8': 'hit',
      '9': 'hit',
      '10': 'surrender',
      'A': 'hit',
    },
    16: {
      '2': 'stand',
      '3': 'stand',
      '4': 'stand',
      '5': 'stand',
      '6': 'stand',
      '7': 'hit',
      '8': 'hit',
      '9': 'surrender',
      '10': 'surrender',
      'A': 'surrender',
    },
    17: { '2': 'stand', '3': 'stand', '4': 'stand', '5': 'stand', '6': 'stand', '7': 'stand', '8': 'stand', '9': 'stand', '10': 'stand', 'A': 'stand' },
  };

  test('hard totals follow multi-deck S17 DAS chart', () => {
    Object.entries(HARD_EXPECTATIONS).forEach(([totalKey, expectations]) => {
      const total = Number(totalKey);
      const handValues = HARD_HANDS[total];
      dealerValues.forEach((dealerValue) => {
        const expected = expectations[dealerValue];
        expect(expected).toBeDefined();
        const action = basicStrategy(buildHand(...handValues), card(dealerValue), defaultOptions);
        expect(action).toBe(expected);
      });
    });
  });

  const SOFT_HANDS: Record<number, [string, string]> = {
    13: ['A', '2'],
    14: ['A', '3'],
    15: ['A', '4'],
    16: ['A', '5'],
    17: ['A', '6'],
    18: ['A', '7'],
    19: ['A', '8'],
    20: ['A', '9'],
  };

  const SOFT_EXPECTATIONS: Record<number, Record<string, string>> = {
    13: { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'double', '6': 'double', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    14: { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'double', '6': 'double', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    15: { '2': 'hit', '3': 'hit', '4': 'double', '5': 'double', '6': 'double', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    16: { '2': 'hit', '3': 'hit', '4': 'double', '5': 'double', '6': 'double', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    17: { '2': 'hit', '3': 'double', '4': 'double', '5': 'double', '6': 'double', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    18: { '2': 'stand', '3': 'double', '4': 'double', '5': 'double', '6': 'double', '7': 'stand', '8': 'stand', '9': 'hit', '10': 'hit', 'A': 'hit' },
    19: { '2': 'stand', '3': 'stand', '4': 'stand', '5': 'stand', '6': 'double', '7': 'stand', '8': 'stand', '9': 'stand', '10': 'stand', 'A': 'stand' },
    20: { '2': 'stand', '3': 'stand', '4': 'stand', '5': 'stand', '6': 'stand', '7': 'stand', '8': 'stand', '9': 'stand', '10': 'stand', 'A': 'stand' },
  };

  test('soft totals follow multi-deck S17 DAS chart', () => {
    Object.entries(SOFT_EXPECTATIONS).forEach(([totalKey, expectations]) => {
      const total = Number(totalKey);
      const handValues = SOFT_HANDS[total];
      dealerValues.forEach((dealerValue) => {
        const expected = expectations[dealerValue];
        expect(expected).toBeDefined();
        const action = basicStrategy(buildHand(...handValues), card(dealerValue), defaultOptions);
        expect(action).toBe(expected);
      });
    });
  });

  const PAIR_EXPECTATIONS: Record<string, Record<string, string>> = {
    '2': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'split', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    '3': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'split', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    '4': { '2': 'hit', '3': 'hit', '4': 'hit', '5': 'split', '6': 'split', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    '5': { '2': 'double', '3': 'double', '4': 'double', '5': 'double', '6': 'double', '7': 'double', '8': 'double', '9': 'double', '10': 'hit', 'A': 'hit' },
    '6': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'hit', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    '7': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'split', '8': 'hit', '9': 'hit', '10': 'hit', 'A': 'hit' },
    '8': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'split', '8': 'split', '9': 'split', '10': 'split', 'A': 'split' },
    '9': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'stand', '8': 'split', '9': 'split', '10': 'stand', 'A': 'stand' },
    '10': { '2': 'stand', '3': 'stand', '4': 'stand', '5': 'stand', '6': 'stand', '7': 'stand', '8': 'stand', '9': 'stand', '10': 'stand', 'A': 'stand' },
    'A': { '2': 'split', '3': 'split', '4': 'split', '5': 'split', '6': 'split', '7': 'split', '8': 'split', '9': 'split', '10': 'split', 'A': 'split' },
  };

  test('pair plays align with standard chart', () => {
    Object.entries(PAIR_EXPECTATIONS).forEach(([rank, expectations]) => {
      dealerValues.forEach((dealerValue) => {
        const expected = expectations[dealerValue];
        expect(expected).toBeDefined();
        const action = basicStrategy(buildHand(rank, rank), card(dealerValue), defaultOptions);
        expect(action).toBe(expected);
      });
    });
  });

  test('double recommendations fall back when double is unavailable', () => {
    const action = basicStrategy(buildHand('5', '6'), card('6'), {
      canDouble: false,
      canSplit: false,
      canSurrender: false,
    });
    expect(action).toBe('hit');
  });

  test('split recommendations fall back when split is unavailable', () => {
    const action = basicStrategy(buildHand('8', '8'), card('6'), {
      canDouble: true,
      canSplit: false,
      canSurrender: true,
    });
    expect(action).toBe('stand');
  });

  test('surrender recommendations fall back when surrender is unavailable', () => {
    const action = basicStrategy(buildHand('10', '6'), card('10'), {
      canDouble: true,
      canSplit: false,
      canSurrender: false,
    });
    expect(action).toBe('hit');
  });
});

describe('Bankroll integrity', () => {
  test('blackjack pays 3:2', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('A'), card('K'), card('9'), card('10')];
    game.startRound(100, deck);
    game.stand();
    expect(game.bankroll).toBe(1150);
    expect(game.playerHands[0].result).toBe('win');
  });

  test('blackjack payout uses integers', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('A'), card('10'), card('9'), card('6'), card('10')];
    game.startRound(100, deck);
    game.stand();
    expect(game.bankroll).toBe(1150);
    expect(Number.isInteger(game.bankroll)).toBe(true);
  });
});

describe('Split rules', () => {
  test('cannot split different ranks', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('8'), card('9'), card('5'), card('7')];
    game.startRound(100, deck);
    expect(() => game.split()).toThrow('Cannot split');
  });
});

describe('Hand history', () => {
  test('records hands after each round', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
    const deck = [card('10'), card('9'), card('7'), card('8'), card('6')];
    game.startRound(100, deck);
    game.stand();
    expect(game.history.length).toBe(1);
    expect(game.history[0].dealer.map((c) => c.value)).toEqual(['7', '8', '6']);
  });
});

describe('Counting and penetration', () => {
  test('running count updates with drawn cards', () => {
    const shoe = new Shoe(1, 1);
    shoe.cards = [card('2'), card('5'), card('K')];
    shoe.shufflePoint = Infinity;
    shoe.dealt = 0;
    shoe.runningCount = 0;
    shoe.draw();
    expect(shoe.runningCount).toBe(-1); // K
    shoe.draw();
    expect(shoe.runningCount).toBe(0); // 5
    shoe.draw();
    expect(shoe.runningCount).toBe(1); // 2
  });

  test('BlackjackGame allows custom penetration', () => {
    const game = new BlackjackGame({ decks: 1, bankroll: 1000, penetration: 0.6 });
    expect(game.shoe.penetration).toBe(0.6);
  });
});
