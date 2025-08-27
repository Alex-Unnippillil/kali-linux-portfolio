import React, { useRef, useEffect, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import { BlackjackGame, basicStrategy, cardValue } from './blackjack/engine';

const WIDTH = 600;
const HEIGHT = 400;
const CARD_W = 60;
const CARD_H = 90;
const CHIP_VALUES = [1, 5, 25, 100];

const Blackjack = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const gameRef = useRef(null);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [bet, setBet] = useState(0);
  const [bankroll, setBankroll] = useState(1000);
  const [high, setHigh] = useState(1000);
  const [message, setMessage] = useState('Place your bet');
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);

  // init bankroll/highscore
  useEffect(() => {
    const br = parseInt(localStorage.getItem('blackjackBankroll') || '1000', 10);
    const hs = parseInt(localStorage.getItem('blackjackHigh') || br.toString(), 10);
    setBankroll(br);
    setHigh(hs);
    gameRef.current = new BlackjackGame({ bankroll: br });
  }, []);

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

  const start = () => {
    try {
      gameRef.current.startRound(bet);
      setBet(0);
      setMessage('Hit, Stand, Double or Split');
      playSound();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const finishRound = () => {
    setBankroll(gameRef.current.bankroll);
    gameRef.current.resetRound();
    setMessage('Place your bet');
  };

  const act = (type) => {
    try {
      gameRef.current[type]();
      playSound();
      if (gameRef.current.current >= gameRef.current.playerHands.length) {
        finishRound();
      }
    } catch (e) {
      setMessage(e.message);
    }
  };

  const reset = () => {
    const br = 1000;
    gameRef.current = new BlackjackGame({ bankroll: br });
    setBankroll(br);
    setBet(0);
    setMessage('Place your bet');
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
      }
      ctx.restore();
    };

    const loop = () => {
      if (!paused) {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#35654d';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const game = gameRef.current;
        if (game) {
          const dealer = game.dealerHand;
          dealer.forEach((c, i) => {
            const hide = i === 0 && game.playerHands.length && game.current < game.playerHands.length;
            const x = WIDTH / 2 - CARD_W / 2 + i * CARD_W * 0.7;
            drawCard(c, x, 40, hide);
          });

          game.playerHands.forEach((hand, idx) => {
            const baseX = WIDTH / 2 - (game.playerHands.length * CARD_W * 0.7) / 2 + idx * CARD_W * 1.5;
            hand.cards.forEach((c, i) => {
              drawCard(c, baseX + i * CARD_W * 0.7, HEIGHT - CARD_H - 60);
            });
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.fillText(hand.bet.toString(), baseX, HEIGHT - 70);
          });
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [paused, canvasRef]);

  const hint = () => {
    const game = gameRef.current;
    if (!game || !game.playerHands.length || game.current >= game.playerHands.length) return '';
    const hand = game.playerHands[game.current];
    return basicStrategy(hand.cards, game.dealerHand[0], {
      canDouble: game.bankroll >= hand.bet,
      canSplit:
        hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1]) && game.bankroll >= hand.bet,
      canSurrender: hand.cards.length === 2,
    });
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <canvas ref={canvasRef} className="border border-gray-700" />
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
      {gameRef.current && gameRef.current.playerHands.length === 0 ? (
        <div className="mt-2">
          <div>Bet: {bet}</div>
          <div className="flex space-x-2 mt-1">
            {CHIP_VALUES.map((v) => (
              <button
                key={v}
                className={`px-2 py-1 bg-gray-700 ${bet + v > bankroll ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => bet + v <= bankroll && setBet(bet + v)}
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
            <button className="px-3 py-1 bg-gray-700" onClick={() => act('double')}>
              Double
            </button>
            <button className="px-3 py-1 bg-gray-700" onClick={() => act('split')}>
              Split
            </button>
          </div>
          {hint() && <div className="mt-1 text-sm">Hint: {hint().toUpperCase()}</div>}
        </div>
      )}
      <div className="mt-2 text-sm">{message}</div>
    </div>
  );
};

export default Blackjack;

