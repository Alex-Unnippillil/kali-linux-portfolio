import { Shoe, handValue, basicStrategy } from '../components/apps/blackjack/engine';

describe('legacy blackjack engine compatibility', () => {
  test('shoe draws cards', () => {
    const shoe = new Shoe(1, 1, 1);
    const card = shoe.draw();
    expect(card).toHaveProperty('value');
  });

  test('hand value works', () => {
    expect(handValue([{ suit: '♠', value: 'A' }, { suit: '♠', value: '9' }])).toBe(20);
  });

  test('strategy returns an action', () => {
    const action = basicStrategy([{ suit: '♠', value: '10' }, { suit: '♠', value: '6' }], { suit: '♠', value: '10' });
    expect(typeof action).toBe('string');
  });
});
