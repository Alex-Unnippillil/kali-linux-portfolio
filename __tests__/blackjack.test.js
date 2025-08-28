import { Shoe, BlackjackGame, basicStrategy } from '../components/apps/blackjack/engine';
const card = (v) => ({ suit: '\u2660', value: v });
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
    test('surrender returns half bet', () => {
        const game = new BlackjackGame({ decks: 1, bankroll: 1000 });
        const deck = [card('10'), card('6'), card('10'), card('5')];
        game.startRound(100, deck);
        game.surrender();
        expect(game.bankroll).toBe(950);
        expect(game.stats.losses).toBe(1);
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
    test('recommends surrender on 16 vs 10', () => {
        expect(basicStrategy([card('10'), card('6')], card('10'), { canSurrender: true })).toBe('surrender');
    });
    test('recommends split on 8s vs 10', () => {
        expect(basicStrategy([card('8'), card('8')], card('10'), { canSplit: true })).toBe('split');
    });
    test('recommends hit on A7 vs 9', () => {
        expect(basicStrategy([card('A'), card('7')], card('9'), { canDouble: true })).toBe('hit');
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
