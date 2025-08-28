import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactGA from 'react-ga4';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { initializeGame, drawFromStock, moveTableauToTableau, moveWasteToTableau, moveToFoundation, valueToString, createDeck, findHint, suits, } from './engine';
const renderCard = (card) => (<div className="w-16 h-24 min-w-[24px] min-h-[24px] rounded border border-black bg-white flex items-center justify-center transition-transform duration-300">
    <span className={card.color === 'red' ? 'text-red-600' : ''}>
      {valueToString(card.value)}{card.suit}
    </span>
  </div>);
const renderFaceDown = () => (<div className="w-16 h-24 min-w-[24px] min-h-[24px] rounded border border-black bg-blue-800"/>);
const Solitaire = () => {
    const [drawMode, setDrawMode] = useState(1);
    const [variant, setVariant] = useState('klondike');
    const [game, setGame] = useState(() => initializeGame(drawMode));
    const [drag, setDrag] = useState(null);
    const [won, setWon] = useState(false);
    const [time, setTime] = useState(0);
    const [isDaily, setIsDaily] = useState(false);
    const [stats, setStats] = useState({
        gamesPlayed: 0,
        gamesWon: 0,
        bestScore: 0,
        bestTime: 0,
        dailyStreak: 0,
        lastDaily: null,
    });
    const prefersReducedMotion = usePrefersReducedMotion();
    const [cascade, setCascade] = useState([]);
    const [ariaMessage, setAriaMessage] = useState('');
    const timer = useRef(null);
    const [paused, setPaused] = useState(prefersReducedMotion);
    const [scale, setScale] = useState(1);
    const foundationRefs = useRef([]);
    const tableauRefs = useRef([]);
    const wasteRef = useRef(null);
    const rootRef = useRef(null);
    const [flying, setFlying] = useState([]);
    const [autoCompleting, setAutoCompleting] = useState(false);
    const [winnableOnly, setWinnableOnly] = useState(false);
    const [hint, setHint] = useState(null);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const saved = JSON.parse(localStorage.getItem(`solitaireStats-${variant}`) || '{}');
        setStats({
            gamesPlayed: 0,
            gamesWon: 0,
            bestScore: 0,
            bestTime: 0,
            dailyStreak: 0,
            lastDaily: null,
            ...saved,
        });
    }, [variant]);
    useEffect(() => {
        const updateScale = () => {
            const root = rootRef.current;
            if (!root)
                return;
            const width = root.scrollWidth;
            const s = Math.min(1, window.innerWidth / width);
            const minScale = 24 / 64;
            setScale(Math.max(s, minScale));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    useEffect(() => {
        const handleVis = () => {
            if (document.visibilityState === 'hidden')
                setPaused(true);
        };
        document.addEventListener('visibilitychange', handleVis);
        return () => document.removeEventListener('visibilitychange', handleVis);
    }, []);
    useEffect(() => {
        if (prefersReducedMotion)
            setPaused(true);
    }, [prefersReducedMotion]);
    const resume = useCallback(() => setPaused(false), []);
    const start = useCallback((mode = drawMode, v = variant, daily = false, winnable = winnableOnly) => {
        const seed = daily
            ? Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
            : undefined;
        let deck;
        if (winnable && !daily) {
            for (let attempt = 0; attempt < 1000; attempt += 1) {
                const d = createDeck();
                const test = initializeGame(mode, d.slice());
                if (findHint(test)) {
                    deck = d;
                    break;
                }
            }
        }
        setGame(initializeGame(mode, deck, seed));
        setWon(false);
        setCascade([]);
        setTime(0);
        setIsDaily(daily);
        setStats((s) => {
            const ns = { ...s, gamesPlayed: s.gamesPlayed + 1 };
            if (typeof window !== 'undefined') {
                localStorage.setItem(`solitaireStats-${v}`, JSON.stringify(ns));
            }
            return ns;
        });
    }, [drawMode, variant, winnableOnly]);
    useEffect(() => {
        if (variant === 'klondike')
            start(drawMode, variant);
    }, [drawMode, variant, start]);
    useEffect(() => {
        if (won) {
            if (timer.current)
                clearInterval(timer.current);
            setStats((s) => {
                const bestScore = game.score > s.bestScore ? game.score : s.bestScore;
                const bestTime = s.bestTime === 0 || time < s.bestTime ? time : s.bestTime;
                let { dailyStreak, lastDaily } = s;
                if (isDaily) {
                    const today = new Date().toISOString().slice(0, 10);
                    const yesterday = new Date(Date.now() - 86400000)
                        .toISOString()
                        .slice(0, 10);
                    if (lastDaily === today) {
                        // already counted
                    }
                    else if (lastDaily === yesterday) {
                        dailyStreak += 1;
                    }
                    else {
                        dailyStreak = 1;
                    }
                    lastDaily = today;
                }
                const ns = {
                    ...s,
                    gamesWon: s.gamesWon + 1,
                    bestScore,
                    bestTime,
                    dailyStreak,
                    lastDaily,
                };
                if (typeof window !== 'undefined') {
                    localStorage.setItem(`solitaireStats-${variant}`, JSON.stringify(ns));
                }
                return ns;
            });
            return;
        }
        if (paused) {
            if (timer.current)
                clearInterval(timer.current);
            return;
        }
        timer.current = setInterval(() => setTime((t) => t + 1), 1000);
        return () => {
            if (timer.current)
                clearInterval(timer.current);
        };
    }, [won, paused, game, time, isDaily, variant, setStats]);
    useEffect(() => {
        if (game.foundations.every((p) => p.length === 13)) {
            setWon(true);
            ReactGA.event({ category: 'Solitaire', action: 'win' });
        }
    }, [game]);
    useEffect(() => {
        if (won && !prefersReducedMotion) {
            const foundationCards = game.foundations.flat();
            const cx = (window.innerWidth / 2) / scale;
            const cy = (window.innerHeight / 2) / scale;
            const radius = Math.min(cx, cy) * 0.8;
            const cards = foundationCards.map((card, i) => {
                const angle = (i / foundationCards.length) * Math.PI * 2;
                return {
                    ...card,
                    x: cx,
                    y: cy,
                    angle: 0,
                    tx: cx + radius * Math.cos(angle),
                    ty: cy + radius * Math.sin(angle),
                    finalAngle: (angle * 180) / Math.PI,
                };
            });
            setCascade(cards);
            requestAnimationFrame(() => {
                setCascade((c) => c.map((card) => ({
                    ...card,
                    x: card.tx,
                    y: card.ty,
                    angle: card.finalAngle,
                })));
            });
        }
    }, [won, prefersReducedMotion, game.foundations, scale]);
    useEffect(() => {
        if (hint) {
            const id = setTimeout(() => setHint(null), 2000);
            return () => clearTimeout(id);
        }
    }, [hint]);
    useEffect(() => {
        setAriaMessage(`Score ${game.score}, time ${time} seconds, redeals ${game.redeals}`);
    }, [game.score, time, game.redeals]);
    useEffect(() => {
        if (won)
            setAriaMessage('You win!');
    }, [won]);
    const draw = () => setGame((g) => {
        const n = drawFromStock(g);
        if (n !== g)
            ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
        return n;
    });
    const showHint = () => {
        const h = findHint(game);
        if (h)
            setHint(h);
    };
    const handleDragStart = (source, pile, index) => {
        if (source === 'tableau') {
            const card = game.tableau[pile][index];
            if (!card.faceUp)
                return;
            setDrag({ source, pile, index });
        }
        else if (source === 'waste' && game.waste.length) {
            setDrag({ source, pile: -1, index: game.waste.length - 1 });
        }
    };
    const finishDrag = () => setDrag(null);
    const isInside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    const handleDragEnd = (e) => {
        if (!drag)
            return;
        const { clientX, clientY } = e;
        const foundationIndex = foundationRefs.current.findIndex((ref) => ref && isInside(ref.getBoundingClientRect(), clientX, clientY));
        if (foundationIndex !== -1) {
            dropToFoundation(foundationIndex);
            return;
        }
        const tableauIndex = tableauRefs.current.findIndex((ref) => ref && isInside(ref.getBoundingClientRect(), clientX, clientY));
        if (tableauIndex !== -1) {
            dropToTableau(tableauIndex);
            return;
        }
        finishDrag();
    };
    const flyMove = useCallback((fromState, toState, source, pile, cb = () => { }) => {
        const root = rootRef.current;
        if (!root) {
            setGame(toState);
            cb();
            return;
        }
        const rootRect = root.getBoundingClientRect();
        const scaleFactor = scale;
        let fromX = 0;
        let fromY = 0;
        let card;
        if (source === 'waste') {
            card = fromState.waste[fromState.waste.length - 1];
            const rect = wasteRef.current?.getBoundingClientRect();
            if (rect) {
                fromX = (rect.left - rootRect.left) / scaleFactor;
                fromY = (rect.top - rootRect.top) / scaleFactor;
            }
        }
        else {
            card = fromState.tableau[pile][fromState.tableau[pile].length - 1];
            const rect = tableauRefs.current[pile]?.getBoundingClientRect();
            if (rect) {
                fromX = (rect.left - rootRect.left) / scaleFactor;
                fromY =
                    (rect.top - rootRect.top) / scaleFactor +
                        (fromState.tableau[pile].length - 1) * 24;
            }
        }
        const destIndex = suits.indexOf(card.suit);
        const destRect = foundationRefs.current[destIndex]?.getBoundingClientRect();
        const toX = destRect
            ? (destRect.left - rootRect.left) / scaleFactor
            : fromX;
        const toY = destRect
            ? (destRect.top - rootRect.top) / scaleFactor
            : fromY;
        const tempFoundations = toState.foundations.map((p, i) => i === destIndex ? p.slice(0, -1) : p);
        const tempState = {
            ...toState,
            foundations: tempFoundations,
            score: toState.score - 10,
        };
        setGame(tempState);
        const anim = {
            ...card,
            x: fromX,
            y: fromY,
            angle: 0,
            tx: toX,
            ty: toY,
        };
        setFlying((f) => [...f, anim]);
        requestAnimationFrame(() => {
            setFlying((f) => f.map((c) => (c === anim ? { ...c, x: toX, y: toY } : c)));
        });
        setTimeout(() => {
            setFlying((f) => f.filter((c) => c !== anim));
            setGame(toState);
            cb();
        }, 300);
    }, [foundationRefs, tableauRefs, wasteRef, rootRef, scale]);
    const dropToTableau = (pileIndex) => {
        if (!drag)
            return;
        if (drag.source === 'tableau') {
            setGame((g) => {
                const n = moveTableauToTableau(g, drag.pile, drag.index, pileIndex);
                if (n !== g)
                    ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
                return n;
            });
        }
        else {
            setGame((g) => {
                const n = moveWasteToTableau(g, pileIndex);
                if (n !== g)
                    ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
                return n;
            });
        }
        finishDrag();
    };
    const dropToFoundation = (pileIndex) => {
        if (!drag)
            return;
        if (drag.source === 'tableau') {
            setGame((g) => {
                const n = moveToFoundation(g, 'tableau', drag.pile);
                if (n !== g)
                    ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
                return n;
            });
        }
        else {
            setGame((g) => {
                const n = moveToFoundation(g, 'waste', null);
                if (n !== g)
                    ReactGA.event({ category: 'Solitaire', action: 'move', label: 'manual' });
                return n;
            });
        }
        finishDrag();
    };
    const handleDoubleClick = (source, pile) => {
        const current = game;
        const next = moveToFoundation(current, source, source === 'tableau' ? pile : null);
        if (next !== current) {
            ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
            flyMove(current, next, source, source === 'tableau' ? pile : null);
        }
    };
    const autoCompleteNext = useCallback((g) => {
        let next = moveToFoundation(g, 'waste', null);
        if (next !== g) {
            ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
            flyMove(g, next, 'waste', null, () => autoCompleteNext(next));
            return;
        }
        for (let i = 0; i < g.tableau.length; i += 1) {
            next = moveToFoundation(g, 'tableau', i);
            if (next !== g) {
                ReactGA.event({ category: 'Solitaire', action: 'move', label: 'auto' });
                flyMove(g, next, 'tableau', i, () => autoCompleteNext(next));
                return;
            }
        }
        setAutoCompleting(false);
    }, [flyMove]);
    useEffect(() => {
        if (!autoCompleting &&
            game.stock.length === 0 &&
            game.tableau.every((p) => p.every((c) => c.faceUp))) {
            setAutoCompleting(true);
            autoCompleteNext(game);
        }
    }, [game, autoCompleteNext, autoCompleting]);
    if (variant !== 'klondike') {
        return (<div className="h-full w-full bg-green-700 text-white select-none p-2">
        <div className="flex justify-end mb-2">
          <select className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" value={variant} onChange={(e) => {
                const v = e.target.value;
                setVariant(v);
            }}>
            <option value="klondike">Klondike</option>
            <option value="spider">Spider</option>
            <option value="freecell">FreeCell</option>
          </select>
        </div>
        <div className="flex items-center justify-center h-full text-xl">
          {`${variant.charAt(0).toUpperCase() + variant.slice(1)} coming soon!`}
        </div>
      </div>);
    }
    return (<div ref={rootRef} className="h-full w-full bg-green-700 text-white select-none p-2 relative overflow-hidden" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {paused && (<div className="absolute inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <button type="button" onClick={resume} className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring" autoFocus>
            Resume
          </button>
        </div>)}
      {flying.map((c, i) => (<div key={`fly-${i}`} className="absolute transition-transform duration-300" style={{ transform: `translate(${c.x}px, ${c.y}px)` }}>
          {renderCard(c)}
        </div>))}
      {won && !prefersReducedMotion &&
            cascade.map((c, i) => (<div key={i} className="absolute transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{
                    transform: `translate(${c.x}px, ${c.y}px) rotate(${c.angle}deg)`,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                }}>
            {renderCard(c)}
          </div>))}
      {won && (<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-2xl" role="alert">
          You win!
        </div>)}
      <div className="flex justify-between mb-2 flex-wrap gap-2">
        <div>Score: {game.score}</div>
        <div>Time: {time}s</div>
        <div>Redeals: {game.redeals}</div>
        <div>Mode: {winnableOnly ? 'Winnable' : 'Random'}</div>
        <div>
          Best: {stats.bestScore ? `${stats.bestScore} (${stats.bestTime}s)` : 'N/A'}
        </div>
        <div>
          Wins: {stats.gamesWon}/{stats.gamesPlayed}
        </div>
        <div>Daily Streak: {stats.dailyStreak}</div>
        <select className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" value={variant} onChange={(e) => {
            const v = e.target.value;
            ReactGA.event({ category: 'Solitaire', action: 'variant_select', label: v });
            setVariant(v);
        }}>
          <option value="klondike">Klondike</option>
          <option value="spider">Spider</option>
          <option value="freecell">FreeCell</option>
        </select>
        <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={() => start(drawMode, variant, true)}>
          Daily Deal
        </button>
        <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={showHint}>
          Hint
        </button>
        <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={() => {
            const mode = drawMode === 1 ? 3 : 1;
            ReactGA.event({
                category: 'Solitaire',
                action: 'variant_select',
                label: mode === 1 ? 'draw1' : 'draw3',
            });
            setDrawMode(mode);
        }}>
          Draw {drawMode === 1 ? '1' : '3'}
        </button>
        <label className="flex items-center space-x-1">
          <input type="checkbox" checked={winnableOnly} onChange={(e) => setWinnableOnly(e.target.checked)}/>
          <span className="select-none">Winnable Only</span>
        </label>
      </div>
      <div className="flex space-x-4 mb-4">
        <div className="w-16 h-24 min-w-[24px] min-h-[24px]" onClick={draw}>
          {game.stock.length ? renderFaceDown() : <div />}
        </div>
        <div className="w-16 h-24 min-w-[24px] min-h-[24px]" onDragOver={(e) => e.preventDefault()}>
          {game.waste.length ? (<div ref={wasteRef} draggable onDoubleClick={() => handleDoubleClick('waste', 0)} onDragStart={() => handleDragStart('waste', -1, game.waste.length - 1)} onDragEnd={handleDragEnd} className={`${drag && drag.source === 'waste'
                ? 'transform -translate-y-2 scale-105 shadow-lg z-50'
                : ''} ${hint && hint.source === 'waste' ? 'ring-4 ring-yellow-400' : ''} ${!prefersReducedMotion ? 'transition-transform' : ''}`}>
              {renderCard(game.waste[game.waste.length - 1])}
            </div>) : (<div className="w-16 h-24 min-w-[24px] min-h-[24px]"/>)}
        </div>
        {game.foundations.map((pile, i) => (<div key={`f-${i}`} className="w-16 h-24 min-w-[24px] min-h-[24px]" onDragOver={(e) => e.preventDefault()} onDrop={() => dropToFoundation(i)} ref={(el) => {
                foundationRefs.current[i] = el;
            }}>
            {pile.length ? renderCard(pile[pile.length - 1]) : (<div className="w-16 h-24 min-w-[24px] min-h-[24px] border border-dashed border-white rounded"/>)}
          </div>))}
      </div>
      <div className="flex space-x-4">
        {game.tableau.map((pile, i) => (<div key={`t-${i}`} className="relative w-16 h-96 min-w-[24px] border border-black" onDragOver={(e) => e.preventDefault()} onDrop={() => dropToTableau(i)} ref={(el) => {
                tableauRefs.current[i] = el;
            }}>
            {pile.map((card, idx) => (<div key={idx} className={`absolute ${!prefersReducedMotion ? 'transition-transform duration-300' : ''} ${drag &&
                    drag.source === 'tableau' &&
                    drag.pile === i &&
                    idx >= drag.index
                    ? 'transform -translate-y-2 scale-105 shadow-lg z-50'
                    : ''} ${hint &&
                    hint.source === 'tableau' &&
                    hint.pile === i &&
                    hint.index === idx
                    ? 'ring-4 ring-yellow-400'
                    : ''}`} style={{ top: idx * 24 }} draggable={card.faceUp} onDoubleClick={() => handleDoubleClick('tableau', i)} onDragStart={() => handleDragStart('tableau', i, idx)} onDragEnd={handleDragEnd}>
                {card.faceUp ? renderCard(card) : renderFaceDown()}
              </div>))}
          </div>))}
      </div>
      <div className="mt-4">
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={() => start(drawMode, variant, isDaily)}>
          Restart
        </button>
      </div>
    </div>);
};
export default Solitaire;
