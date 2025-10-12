import { BlackjackGame } from '../components/apps/blackjack/engine';

describe('BlackjackGame scoring', () => {
  it('pays 3:2 on player blackjack', () => {
    const game = new BlackjackGame({ bankroll: 1000, hitSoft17: false });
    const presetDeck = [
      { value: 'A', suit: '\u2660' },
      { value: 'K', suit: '\u2665' },
      { value: '10', suit: '\u2663' },
      { value: '9', suit: '\u2666' },
    ];

    game.startRound(100, presetDeck);
    game.stand();

    expect(game.bankroll).toBe(1150);
    expect(game.playerHands[0].result).toBe('win');
  });

  it('awards the pot when the dealer busts', () => {
    const game = new BlackjackGame({ bankroll: 500, hitSoft17: false });
    const presetDeck = [
      { value: '9', suit: '\u2660' },
      { value: '7', suit: '\u2665' },
      { value: '10', suit: '\u2663' },
      { value: '5', suit: '\u2666' },
      { value: '9', suit: '\u2660' },
    ];

    game.startRound(50, presetDeck);
    game.stand();

    expect(game.bankroll).toBe(550);
    expect(game.playerHands[0].result).toBe('win');
  });
});
