import { BlackjackGame, basicStrategy } from '@components/apps/blackjack/engine';

describe('house edge', () => {
  test('basic strategy yields small negative expectation', () => {
    let seed = 42;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    const original = Math.random;
    Math.random = random;

    const starting = 1_000_000;
    const game = new BlackjackGame({ decks: 6, bankroll: starting });
    const rounds = 10_000;
    const bet = 100;

    for (let i = 0; i < rounds; i += 1) {
      game.startRound(bet);
      while (game.playerHands.some((h) => !h.finished)) {
        const hand = game.playerHands[game.current];
        const dealerUp = game.dealerHand[0];
        const options = {
          canSplit:
            hand.cards[0]?.value === hand.cards[1]?.value && game.playerHands.length === 1,
          canDouble: hand.cards.length === 2,
          canSurrender: hand.cards.length === 2 && !hand.finished,
        };
        const action = basicStrategy(hand.cards, dealerUp, options);
        if (action === 'hit') game.hit();
        else if (action === 'stand') game.stand();
        else if (action === 'double') game.double();
        else if (action === 'split') game.split();
        else if (action === 'surrender') game.surrender();
      }
    }

    const edge = (game.bankroll - starting) / (rounds * bet);
    Math.random = original;
    expect(edge).toBeLessThan(0);
    expect(edge).toBeGreaterThan(-0.02);
  });
});
