import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import GameLayout from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useIsTouchDevice from '../../hooks/useIsTouchDevice';
import useGameAudio from '../../hooks/useGameAudio';
import { SettingsProvider, useSettings } from './GameSettingsContext';
import { COLS, createEmptyBoard, evaluateColumns, getValidRow, type Cell } from '../../games/connect-four/solver';
import { consumeGameKey, shouldHandleGameKey } from '../../utils/gameInput';
import BoardView from './connect-four/BoardView';
import SettingsPanel from './connect-four/SettingsPanel';
import { clamp, DEFAULT_MATCH_STATE, DEFAULT_STATS, GAP, MAX_CELL, MIN_CELL, PALETTES } from './connect-four/constants';
import { cloneBoard, evaluateMoveOutcome, isBool, isMatchMode, isMatchState, isMode, isStatsState, isToken, opponentOf } from './connect-four/gameState';
import type { HistoryEntry, MatchMode, MoveRecord, Token } from './connect-four/types';
import useConnectFourAi from './connect-four/useConnectFourAi';

function ConnectFourInner({ windowMeta }: { windowMeta?: { isFocused?: boolean } }) {
  const isFocused = windowMeta?.isFocused ?? true;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTouch = useIsTouchDevice();
  const { playTone } = useGameAudio();
  const { difficulty, assists, setDifficulty, setAssists, palette, setPalette, highContrast, setHighContrast, quality, setQuality } = useSettings();
  const normalizedQuality = Number.isFinite(quality) ? quality : 1;

  const [mode, setMode] = usePersistentState('connect_four:mode', 'cpu', isMode);
  const [humanToken, setHumanToken] = usePersistentState('connect_four:human_token', 'yellow', isToken);
  const [humanStarts, setHumanStarts] = usePersistentState('connect_four:human_starts', true, isBool);
  const [matchMode, setMatchMode] = usePersistentState<MatchMode>('connect_four:match_mode', 'single', isMatchMode);
  const [matchState, setMatchState] = usePersistentState('connect_four:match_state', DEFAULT_MATCH_STATE, isMatchState);
  const [stats, setStats] = usePersistentState('connect_four:stats', DEFAULT_STATS, isStatsState);
  const [confirmMove, setConfirmMove] = usePersistentState('connect_four:confirm_move', isTouch, isBool);
  const [showPatterns, setShowPatterns] = usePersistentState('connect_four:show_patterns', false, isBool);

  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Token>('red');
  const [winner, setWinner] = useState<Token | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<{ r: number; c: number }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [selectedCol, setSelectedCol] = useState(3);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [hintScores, setHintScores] = useState<(number | null)[]>(Array(COLS).fill(null));
  const [aiThinking, setAiThinking] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [lastMove, setLastMove] = useState<MoveRecord | null>(null);

  const [layout, setLayout] = useState({ cellSize: 44, gap: GAP, slot: 44 + GAP, boardWidth: 44 * 7 + GAP * 6, boardHeight: 44 * 6 + GAP * 5 });
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  const boardRef = useRef(board);
  const playerRef = useRef(currentPlayer);
  const winnerRef = useRef(winner);
  const aiTaskIdRef = useRef(0);
  const { requestMove, resetTable } = useConnectFourAi();

  const aiToken = useMemo(() => opponentOf(humanToken), [humanToken]);
  const initialPlayer = useCallback((): Token => (mode === 'local' ? 'red' : humanStarts ? humanToken : aiToken), [aiToken, humanStarts, humanToken, mode]);
  const paletteConfig = useMemo(() => PALETTES[palette] ?? PALETTES.default, [palette]);
  const tokenNames = useMemo(() => ({ red: paletteConfig.tokens.red.label, yellow: paletteConfig.tokens.yellow.label }), [paletteConfig]);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { playerRef.current = currentPlayer; }, [currentPlayer]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const updateSize = () => {
      const width = boardWrapperRef.current?.getBoundingClientRect().width ?? 0;
      if (!width) return;
      const available = Math.max(0, width - 16);
      const cellSize = clamp(Math.floor((available - GAP * 6) / 7), MIN_CELL, MAX_CELL);
      setLayout({ cellSize, gap: GAP, slot: cellSize + GAP, boardWidth: cellSize * 7 + GAP * 6, boardHeight: cellSize * 6 + GAP * 5 });
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined' && boardWrapperRef.current) {
      const observer = new ResizeObserver(updateSize);
      observer.observe(boardWrapperRef.current);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const hardReset = useCallback(() => {
    aiTaskIdRef.current += 1;
    resetTable();
    setBoard(createEmptyBoard());
    setCurrentPlayer(initialPlayer());
    setWinner(null);
    setWinningCells([]);
    setHistory([]);
    setMoves([]);
    setSelectedCol(3);
    setPendingConfirm(false);
    setAiThinking(false);
    setLastMove(null);
  }, [initialPlayer, resetTable]);

  useEffect(() => { hardReset(); }, [mode, humanToken, humanStarts, hardReset]);

  const applyDrop = useCallback((col: number, token: Token) => {
    const row = getValidRow(boardRef.current, col);
    if (row === -1) {
      setLiveMessage(`Column ${col + 1} is full. Choose another column.`);
      return;
    }

    const next = cloneBoard(boardRef.current);
    next[row][col] = token;
    setHistory((prev) => [...prev, { board: cloneBoard(boardRef.current), currentPlayer: playerRef.current, winner: winnerRef.current, winningCells }]);
    setMoves((prev) => [...prev, { col, token }]);
    setLastMove({ col, token });
    playTone(240, { duration: 0.05, volume: 0.25, type: 'triangle' });

    const outcome = evaluateMoveOutcome(next, token);
    setBoard(next);
    setWinner(outcome.winner);
    setWinningCells(outcome.winningCells);
    if (!outcome.winner) setCurrentPlayer(opponentOf(token));
    if (outcome.winner && outcome.winner !== 'draw') playTone(520, { duration: 0.15, volume: 0.32, type: 'sawtooth' });
  }, [playTone, winningCells]);

  const undo = useCallback(() => {
    aiTaskIdRef.current += 1;
    setAiThinking(false);
    setHistory((h) => {
      if (!h.length) return h;
      let idx = h.length - 1;
      let state = h[idx];
      if (mode === 'cpu') {
        while (state && state.currentPlayer !== humanToken && idx > 0) {
          idx -= 1;
          state = h[idx];
        }
      }
      if (!state) return h;
      setBoard(state.board);
      setCurrentPlayer(state.currentPlayer);
      setWinner(state.winner);
      setWinningCells(state.winningCells || []);
      setMoves((prev) => prev.slice(0, idx));
      setLastMove((prev) => (idx > 0 ? prev : null));
      return h.slice(0, idx);
    });
  }, [humanToken, mode]);

  const canInteract = !winner && !aiThinking && (mode === 'local' || currentPlayer === humanToken);
  const effectiveCol = hoverCol ?? selectedCol;

  const selectColumn = useCallback((col: number, source: 'pointer' | 'keyboard') => {
    if (!canInteract || col < 0 || col >= COLS) return;
    if (source === 'pointer' && confirmMove) {
      if (selectedCol === col && pendingConfirm) {
        setPendingConfirm(false);
        applyDrop(col, currentPlayer);
        return;
      }
      setPendingConfirm(true);
      setSelectedCol(col);
      setLiveMessage(`Column ${col + 1} selected. Tap again to drop.`);
      return;
    }
    setPendingConfirm(false);
    setSelectedCol(col);
    if (source === 'pointer' || source === 'keyboard') applyDrop(col, currentPlayer);
  }, [applyDrop, canInteract, confirmMove, currentPlayer, pendingConfirm, selectedCol]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!shouldHandleGameKey(e.nativeEvent, { isFocused })) return;
    if (e.key === 'ArrowLeft') { consumeGameKey(e.nativeEvent); setSelectedCol((c) => (c + COLS - 1) % COLS); setPendingConfirm(false); }
    else if (e.key === 'ArrowRight') { consumeGameKey(e.nativeEvent); setSelectedCol((c) => (c + 1) % COLS); setPendingConfirm(false); }
    else if (e.key === 'Home') { consumeGameKey(e.nativeEvent); setSelectedCol(0); setPendingConfirm(false); }
    else if (e.key === 'End') { consumeGameKey(e.nativeEvent); setSelectedCol(COLS - 1); setPendingConfirm(false); }
    else if (e.key === 'Enter' || e.key === ' ') { consumeGameKey(e.nativeEvent); selectColumn(effectiveCol, 'keyboard'); }
    else if (e.key.toLowerCase() === 'u') { consumeGameKey(e.nativeEvent); undo(); }
    else if (e.key.toLowerCase() === 'r') { consumeGameKey(e.nativeEvent); hardReset(); }
  }, [effectiveCol, hardReset, isFocused, selectColumn, undo]);

  useEffect(() => {
    if (!assists || aiThinking) {
      setHintScores(Array(COLS).fill(null));
      return;
    }
    setHintScores(evaluateColumns(board, currentPlayer));
  }, [aiThinking, assists, board, currentPlayer]);

  useEffect(() => {
    if (mode !== 'cpu' || winner || currentPlayer !== aiToken) return;
    const taskId = aiTaskIdRef.current + 1;
    aiTaskIdRef.current = taskId;
    setAiThinking(true);

    requestMove({ taskId, board: cloneBoard(boardRef.current), player: aiToken, difficulty, quality: normalizedQuality })
      .then((payload) => {
        if (!mountedRef.current) return;
        if (payload.taskId !== aiTaskIdRef.current || winnerRef.current) return;
        setAiThinking(false);
        if (typeof payload.column !== 'number') {
          setLiveMessage('AI response failed. Falling back to safe move selection.');
          const fallback = Array.from({ length: COLS }, (_, c) => c).find((c) => getValidRow(boardRef.current, c) !== -1) ?? 0;
          applyDrop(fallback, aiToken);
          return;
        }
        applyDrop(payload.column, aiToken);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setAiThinking(false);
      });
  }, [aiToken, applyDrop, currentPlayer, difficulty, mode, normalizedQuality, requestMove, winner]);

  useEffect(() => {
    if (!winner) return;
    if (mode === 'cpu') {
      setStats((prev) => {
        const next = { ...prev, cpu: { ...prev.cpu } };
        const record = { ...next.cpu[difficulty] };
        if (winner === 'draw') { record.draws += 1; record.streak = 0; }
        else if (winner === humanToken) { record.wins += 1; record.streak += 1; }
        else { record.losses += 1; record.streak = 0; }
        next.cpu[difficulty] = record;
        return next;
      });
    } else {
      setStats((prev) => ({ ...prev, local: { redWins: prev.local.redWins + (winner === 'red' ? 1 : 0), yellowWins: prev.local.yellowWins + (winner === 'yellow' ? 1 : 0), draws: prev.local.draws + (winner === 'draw' ? 1 : 0) } }));
    }

    if (matchMode !== 'single') {
      setMatchState((prev) => {
        const next = { ...prev, red: prev.red + (winner === 'red' ? 1 : 0), yellow: prev.yellow + (winner === 'yellow' ? 1 : 0), draws: prev.draws + (winner === 'draw' ? 1 : 0), games: prev.games + 1 };
        if (!next.matchWinner) {
          if (next.red >= 2) next.matchWinner = 'red';
          if (next.yellow >= 2) next.matchWinner = 'yellow';
        }
        return next;
      });
    }
  }, [difficulty, humanToken, matchMode, mode, setMatchState, setStats, winner]);

  useEffect(() => {
    if (winner === 'draw') setLiveMessage('Draw. Press Play again to start another game.');
    else if (winner) setLiveMessage(`${tokenNames[winner]} wins. Press Play again to continue.`);
    else if (aiThinking || (mode === 'cpu' && currentPlayer === aiToken)) setLiveMessage(`${tokenNames[aiToken]} is thinking...`);
    else setLiveMessage(`Turn: ${tokenNames[currentPlayer]}.`);
  }, [aiThinking, aiToken, currentPlayer, mode, tokenNames, winner]);

  const statusId = useId();
  const instructionsId = useId();
  const isMatchComplete = matchMode !== 'single' && Boolean(matchState.matchWinner);
  const winningSet = useMemo(() => new Set(winningCells.map((cell) => `${cell.r}:${cell.c}`)), [winningCells]);
  const ghostRow = useMemo(() => (!canInteract ? -1 : getValidRow(board, effectiveCol)), [board, canInteract, effectiveCol]);
  const ghostDiscStyle = useMemo(() => (ghostRow === -1 ? null : { left: effectiveCol * layout.slot, top: ghostRow * layout.slot, width: layout.cellSize, height: layout.cellSize }), [effectiveCol, ghostRow, layout.cellSize, layout.slot]);

  const replayMoves = useCallback(() => {
    const script = [...moves];
    hardReset();
    script.forEach((move, idx) => {
      setTimeout(() => {
        if (!mountedRef.current) return;
        setCurrentPlayer(move.token);
        applyDrop(move.col, move.token);
      }, idx * 220);
    });
  }, [applyDrop, hardReset, moves]);

  return (
    <GameLayout gameId="connect-four" settingsPanel={<SettingsPanel mode={mode} setMode={setMode} matchMode={matchMode} handleMatchModeChange={(next) => { setMatchMode(next); setMatchState(DEFAULT_MATCH_STATE); }} difficulty={difficulty} setDifficulty={setDifficulty} assists={assists} setAssists={setAssists} palette={palette} setPalette={setPalette} highContrast={highContrast} setHighContrast={setHighContrast} quality={quality} setQuality={setQuality} confirmMove={confirmMove} setConfirmMove={setConfirmMove} showPatterns={showPatterns} setShowPatterns={setShowPatterns} humanToken={humanToken} setHumanToken={setHumanToken} humanStarts={humanStarts} setHumanStarts={setHumanStarts} tokenNames={tokenNames} stats={stats} hardReset={hardReset} matchModeSingle={matchMode === 'single'} resetMatch={() => { setMatchState(DEFAULT_MATCH_STATE); hardReset(); }} /> }>
      <div ref={boardWrapperRef} className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-100" id={statusId}>{winner ? (winner === 'draw' ? 'Draw.' : `${tokenNames[winner]} wins.`) : aiThinking ? `${tokenNames[aiToken]} is thinking...` : `Turn: ${tokenNames[currentPlayer]}.`}</div>
            <div className="text-xs text-gray-400">{mode === 'cpu' ? `You: ${tokenNames[humanToken]} | CPU: ${tokenNames[aiToken]}` : 'Local match'}{lastMove ? ` • Last move: ${tokenNames[lastMove.token]} in column ${lastMove.col + 1}` : ''}</div>
            {matchMode !== 'single' && <div className="mt-1 text-xs text-gray-400">Match: {matchState.red}-{matchState.yellow}{matchState.draws ? ` (${matchState.draws} draws)` : ''}</div>}
          </div>
          <div className="text-right text-xs text-gray-400" id={instructionsId}><div>Arrows: select column</div><div>Enter/Space: drop</div><div>U: undo, R: restart</div></div>
        </div>

        <div className="sr-only" aria-live="polite">{liveMessage}</div>
        <div className={clsx('outline-none rounded-xl', highContrast ? 'ring-2 ring-cyan-300/80' : 'ring-1 ring-transparent')} tabIndex={0} onKeyDown={onKeyDown} aria-label="Connect Four board" aria-describedby={`${statusId} ${instructionsId}`}>
          <BoardView board={board} layout={layout} highContrast={highContrast} normalizedQuality={normalizedQuality} prefersReducedMotion={prefersReducedMotion} winningSet={winningSet} effectiveCol={effectiveCol} assists={assists} confirmMove={confirmMove} canInteract={canInteract && !isMatchComplete} hintScores={hintScores} palette={palette} paletteConfig={paletteConfig} tokenNames={tokenNames} currentPlayer={currentPlayer} showPatterns={showPatterns} ghostDiscStyle={ghostDiscStyle} ghostRow={ghostRow} animDisc={null} setHoverCol={setHoverCol} selectColumn={selectColumn} />
        </div>

        {(winner || isMatchComplete) && <div className="rounded border border-cyan-500/50 bg-cyan-500/10 p-3 text-sm text-gray-200">{winner === 'draw' ? 'Round ended in a draw.' : `${tokenNames[winner as Token]} wins this round.`} {isMatchComplete && matchState.matchWinner ? `Match winner: ${tokenNames[matchState.matchWinner]}.` : 'Press Play again for the next round.'}</div>}

        {!!moves.length && <div className="rounded border border-gray-700/60 p-2 text-xs text-gray-300"><div className="mb-1 font-semibold text-gray-200">Move list</div><div className="max-h-20 overflow-auto">{moves.map((move, idx) => <span key={`${idx}-${move.col}`} className="mr-2">{idx + 1}.{move.token === 'red' ? 'R' : 'Y'}@{move.col + 1}</span>)}</div></div>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50" onClick={undo} disabled={history.length === 0 || aiThinking}>Undo</button>
          <button type="button" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={hardReset}>Restart</button>
          <button type="button" className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded disabled:opacity-50" onClick={replayMoves} disabled={moves.length < 2}>Replay</button>
        </div>
      </div>
    </GameLayout>
  );
}

export default function ConnectFour({ windowMeta }: { windowMeta?: { isFocused?: boolean } }) {
  return (
    <SettingsProvider>
      <ConnectFourInner windowMeta={windowMeta} />
    </SettingsProvider>
  );
}
