import React, { useRef, useEffect, useState, useCallback } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import { BlackjackGame, basicStrategy, cardValue, handValue } from './blackjack/engine';

const WIDTH = 600;
const HEIGHT = 400;
const CARD_W = 60;
const CARD_H = 90;
const CHIP_VALUES = [1, 5, 25, 100];

const Blackjack = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const gameRef = useRef(null);
  const animRef = useRef(null);
  const animationsRef = useRef([]); // active tweens
  const audioCtxRef = useRef(null);

  const [bet, setBet] = useState(0);
  const [bankroll, setBankroll] = useState(1000);
  const [high, setHigh] = useState(1000);
  const [message, setMessage] = useState('Place your bet');
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [options, setOptions] = useState({ decks: 6, hitSoft17: true, penetration: 0.75 });
  const [showHints, setShowHints] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [history, setHistory] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);

  const initGame = useCallback(
    (br = bankroll) => {
      gameRef.current = new BlackjackGame({
        bankroll: br,
        decks: options.decks,
        hitSoft17: options.hitSoft17,
        penetration: options.penetration,
      });
    },
    [bankroll, options.decks, options.hitSoft17, options.penetration],
  );

  const computeCardPos = (handIdx, cardIdx, isDealer = false) => {
    if (isDealer) {
      return { x: WIDTH / 2 - CARD_W / 2 + cardIdx * CARD_W * 0.7, y: 40 };
    }
    const game = gameRef.current;
    const baseX = WIDTH / 2 - (game.playerHands.length * CARD_W * 0.7) / 2 + handIdx * CARD_W * 1.5;
    // mirror dealer/player spacing for visual balance
    return { x: baseX + cardIdx * CARD_W * 0.7, y: HEIGHT - CARD_H - 40 };
  };

  const addCardAnimation = (card, handIdx, cardIdx, isDealer = false, faceDown = false, delay = 0) => {
    const from = { x: WIDTH - CARD_W - 20, y: 20 };
    const to = computeCardPos(handIdx, cardIdx, isDealer);
    const ctrl = { x: WIDTH / 2, y: HEIGHT / 2 };
    animationsRef.current.push({ type: 'card', card, from, to, ctrl, start: performance.now() + delay, duration: 500, faceDown });
  };

  const addChipAnimation = (index) => {
    const from = { x: 50 + index * 40, y: HEIGHT + 10 };
    const to = { x: WIDTH / 2, y: HEIGHT - CARD_H - 40 };
    const ctrl = { x: WIDTH / 2, y: HEIGHT / 2 };
    animationsRef.current.push({ type: 'chip', from, to, ctrl, start: performance.now(), duration: 300 });
  };

  const addBet = (value, idx) => {
    if (bet + value > bankroll) return;
    setBet(bet + value);
    playChipSound();
    addChipAnimation(idx);
  };

  // init bankroll/highscore and game
  useEffect(() => {
    const br = parseInt(localStorage.getItem('blackjackBankroll') || '1000', 10);
    const hs = parseInt(localStorage.getItem('blackjackHigh') || br.toString(), 10);
    setBankroll(br);
    setHigh(hs);
    initGame(br);
  }, [initGame]);

  // re-init when options change and no active hand
  useEffect(() => {
    if (gameRef.current && gameRef.current.playerHands.length === 0) {
      initGame(bankroll);
      setHistory([]);
    }
  }, [options, bankroll, initGame]);

  // persist bankroll/highscore
  useEffect(() => {
    localStorage.setItem('blackjackBankroll', bankroll.toString());
    setHigh((h) => {
      const nh = Math.max(h, bankroll);
      localStorage.setItem('blackjackHigh', nh.toString());
      return nh;
    });
  }, [bankroll]);

  const playSound = () => {
    if (!sound) return;
    const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const playChipSound = () => {
    if (!sound) return;
    const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600 + Math.random() * 400; // pitch jitter
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const start = () => {
    try {
      const { player, dealer } = gameRef.current.startRound(bet);
      setBet(0);
      setMessage('Hit, Stand, Double or Split');
      playSound();
      addCardAnimation(player.cards[0], 0, 0, false, false, 0);
      addCardAnimation(dealer[0], 0, 0, true, true, 150);
      addCardAnimation(player.cards[1], 0, 1, false, false, 300);
      addCardAnimation(dealer[1], 0, 1, true, false, 450);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const finishRound = () => {
    const dealer = [...gameRef.current.dealerHand];
    const extra = dealer.slice(2);
    setHistory([...gameRef.current.history]);
    let delay = 0;

    extra.forEach((_, i) => {
      const total = handValue(dealer.slice(0, 2 + i + 1));
      setTimeout(() => setMessage(`Dealer hits to ${total}`), delay);
      delay += 1000;
    });

    const finalTotal = handValue(dealer);
    const finalAction = finalTotal > 21 ? `Dealer busts with ${finalTotal}` : `Dealer stands on ${finalTotal}`;
    const results = gameRef.current.playerHands.map((h, i) => `Hand ${i + 1} ${h.result}`).join(', ');

    setTimeout(() => {
      setMessage(`${finalAction}. ${results}`);
      setBankroll(gameRef.current.bankroll);
    }, delay);
    delay += 1000;

    setTimeout(() => {
      gameRef.current.resetRound();
      setMessage('Place your bet');
    }, delay);
  };

  const act = (type) => {
    try {
      const idx = gameRef.current.current;
      gameRef.current[type]();
      playSound();
      if (['hit', 'double'].includes(type)) {
        const hand = gameRef.current.playerHands[idx];
        const card = hand.cards[hand.cards.length - 1];
        addCardAnimation(card, idx, hand.cards.length - 1);
      } else if (type === 'split') {
        const hand1 = gameRef.current.playerHands[idx];
        const hand2 = gameRef.current.playerHands[idx + 1];
        addCardAnimation(hand1.cards[1], idx, 1);
        addCardAnimation(hand2.cards[1], idx + 1, 1);
      }
      if (gameRef.current.current >= gameRef.current.playerHands.length) {
        finishRound();
      }
    } catch (e) {
      setMessage(e.message);
    }
  };

  const reset = () => {
    const br = 1000;
    initGame(br);
    setBankroll(br);
    setBet(0);
    setMessage('Place your bet');
    setHistory([]);
  };

  // drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawCard = (card, x, y, faceDown = false) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = faceDown ? '#999' : '#fff';
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(0, 0, CARD_W, CARD_H);
      if (!faceDown) {
        ctx.fillStyle = card.suit === '\u2665' || card.suit === '\u2666' ? 'red' : 'black';
        ctx.font = '20px sans-serif';
        ctx.fillText(card.value + card.suit, 5, 25);
        // draw mirrored value for consistent card faces
        ctx.save();
        ctx.rotate(Math.PI);
        ctx.fillText(card.value + card.suit, -CARD_W + 5, -CARD_H + 25);
        ctx.restore();
      }
      ctx.restore();
    };

    const runAnimations = () => {
      const now = performance.now();
      const next = [];
      const animCards = new Set();
      animationsRef.current.forEach((a) => {
        if (now < a.start) {
          next.push(a);
          return;
        }
        const t = Math.min(1, (now - a.start) / a.duration);
        const x = (1 - t) * (1 - t) * a.from.x + 2 * (1 - t) * t * a.ctrl.x + t * t * a.to.x;
        const y = (1 - t) * (1 - t) * a.from.y + 2 * (1 - t) * t * a.ctrl.y + t * t * a.to.y;
        if (a.type === 'card') {
          drawCard(a.card, x, y, a.faceDown);
          animCards.add(a.card);
        } else if (a.type === 'chip') {
          ctx.fillStyle = '#b8860b';
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t < 1) next.push(a);
      });
      animationsRef.current = next;
      return animCards;
    };

    const loop = () => {
      if (!paused) {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#35654d';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const game = gameRef.current;
        if (game) {
          const animatedCards = runAnimations();
          // spotlight on active hand
          if (game.playerHands.length && game.current < game.playerHands.length) {
            const pos = computeCardPos(game.current, 0);
            const grad = ctx.createRadialGradient(
              pos.x + CARD_W / 2,
              pos.y + CARD_H / 2,
              20,
              pos.x + CARD_W / 2,
              pos.y + CARD_H / 2,
              120,
            );
            grad.addColorStop(0, 'rgba(255,255,255,0.2)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
          }

          const dealer = game.dealerHand;
          dealer.forEach((c, i) => {
            const hide = i === 0 && game.playerHands.length && game.current < game.playerHands.length;
            const { x, y } = computeCardPos(0, i, true);
            if (!animatedCards.has(c)) drawCard(c, x, y, hide);
          });

          game.playerHands.forEach((hand, idx) => {
            const baseX = WIDTH / 2 - (game.playerHands.length * CARD_W * 0.7) / 2 + idx * CARD_W * 1.5;
            hand.cards.forEach((c, i) => {
              if (!animatedCards.has(c)) drawCard(c, baseX + i * CARD_W * 0.7, HEIGHT - CARD_H - 40);
            });
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.fillText(hand.bet.toString(), baseX, HEIGHT - 70);

          if (showHints) {
            const hint = basicStrategy(hand.cards, dealer[0], {
              canDouble: game.bankroll >= hand.bet && hand.cards.length === 2,
              canSplit:
                hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1]) && game.bankroll >= hand.bet,
              canSurrender: hand.cards.length === 2,
            });
            const badgeX = baseX + hand.cards.length * CARD_W * 0.7 + 10;
            const badgeY = HEIGHT - CARD_H - 50;
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = '12px sans-serif';
            ctx.fillText(hint[0].toUpperCase(), badgeX - 4, badgeY + 4);
          }
        });

        if (showCount) {
          const shoe = game.shoe;
          const decksRemaining = shoe.cards.length / 52;
          const trueCount = shoe.runningCount / Math.max(1, decksRemaining);
          const penetration = shoe.dealt / (shoe.decks * 52);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(10, 10, 140, 60);
          ctx.fillStyle = 'white';
          ctx.font = '14px sans-serif';
          ctx.fillText(`RC: ${shoe.runningCount}`, 15, 30);
          ctx.fillText(`TC: ${trueCount.toFixed(1)}`, 15, 45);
          ctx.fillText(`Pen: ${(penetration * 100).toFixed(0)}%`, 15, 60);
        }
      }
    }
    animRef.current = requestAnimationFrame(loop);
  };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [paused, canvasRef, showHints, showCount]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <canvas ref={canvasRef} className="border border-gray-700" aria-label="Blackjack table" />
      <div className="mt-2 space-x-2">
        <span>Bankroll: {bankroll}</span>
        <span>High: {high}</span>
        <button className="px-2 py-1 bg-gray-700" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={() => setSound((s) => !s)}>
          {sound ? 'Sound:On' : 'Sound:Off'}
        </button>
        <button className="px-2 py-1 bg-gray-700" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="mt-2 flex space-x-4 items-center">
        <label className="flex items-center space-x-1">
          <span>Decks</span>
          <select
            className="bg-gray-700"
            value={options.decks}
            onChange={(e) => setOptions((o) => ({ ...o, decks: parseInt(e.target.value, 10) }))}
            disabled={gameRef.current && gameRef.current.playerHands.length > 0}
          >
            {[1, 2, 4, 6, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center space-x-1">
          <span>Penetration</span>
          <select
            className="bg-gray-700"
            value={options.penetration}
            onChange={(e) =>
              setOptions((o) => ({ ...o, penetration: parseFloat(e.target.value) }))
            }
            disabled={gameRef.current && gameRef.current.playerHands.length > 0}
          >
            {[0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9].map((p) => (
              <option key={p} value={p}>
                {Math.round(p * 100)}%
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={options.hitSoft17}
            onChange={(e) => setOptions((o) => ({ ...o, hitSoft17: e.target.checked }))}
            disabled={gameRef.current && gameRef.current.playerHands.length > 0}
            aria-label="Dealer hits soft 17"
          />
          <span>Dealer hits soft 17</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={showHints}
            onChange={(e) => setShowHints(e.target.checked)}
            aria-label="Show hints"
          />
          <span>Show hints</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={showCount}
            onChange={(e) => setShowCount(e.target.checked)}
            aria-label="Counting overlay"
          />
          <span>Counting overlay</span>
        </label>
      </div>
      <div
        className="mt-2 text-sm text-center bg-gray-800 px-4 py-1 rounded"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </div>
      {gameRef.current && gameRef.current.playerHands.length === 0 ? (
        <div className="mt-2">
          <div>Bet: {bet}</div>
          <div className="flex space-x-2 mt-1">
            {CHIP_VALUES.map((v, i) => (
              <button
                key={v}
                className={`w-6 h-6 flex items-center justify-center bg-gray-700 text-xs rounded ${
                  bet + v > bankroll ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => addBet(v, i)}
              >
                {v}
              </button>
            ))}
            <button className="px-2 py-1 bg-gray-700" onClick={() => setBet(0)}>
              Clear
            </button>
            <button className="px-2 py-1 bg-gray-700" disabled={bet === 0} onClick={start}>
              Deal
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-center">
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-gray-700" onClick={() => act('hit')}>
              Hit
            </button>
            <button className="px-3 py-1 bg-gray-700" onClick={() => act('stand')}>
              Stand
            </button>
            <button className="px-3 py-1 bg-gray-700" onClick={() => setPendingAction('double')}>
              Double
            </button>
            <button className="px-3 py-1 bg-gray-700" onClick={() => setPendingAction('split')}>
              Split
            </button>
          </div>
        </div>
      )}
      {pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded space-y-4 text-center">
            <div className="text-lg">
              {pendingAction === 'double' ? 'Double down?' : 'Split hand?'}
            </div>
            <div className="flex justify-center space-x-4">
              <button
                className="px-6 py-3 bg-green-600 rounded-lg text-white text-lg"
                onClick={() => {
                  act(pendingAction);
                  setPendingAction(null);
                }}
              >
                {pendingAction === 'double' ? 'Double' : 'Split'}
              </button>
              <button
                className="px-6 py-3 bg-gray-600 rounded-lg text-white text-lg"
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-2 text-xs max-h-32 overflow-auto w-full px-4">
          {history.map((h, i) => (
            <div key={i}>
              Round {i + 1}: Dealer {h.dealer.map((c) => c.value).join(' ')} |
              {h.playerHands
                .map(
                  (ph, j) =>
                    ` Hand ${j + 1} ${ph.cards
                      .map((c) => c.value)
                      .join(' ')} ${ph.result}`,
                )
                .join(' | ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blackjack;
