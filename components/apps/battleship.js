import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { MonteCarloAI, BOARD_SIZE, randomizePlacement } from './battleship/ai';

const CELL = 32; // px

const createBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const Battleship = () => {
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());
  const [ships, setShips] = useState([]); // player's ship objects
  const [ai, setAi] = useState(new MonteCarloAI());
  const [heat, setHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [message, setMessage] = useState('Place your ships');

  useEffect(() => {
    // init player ships
    const layout = randomizePlacement();
    setShips(layout.map((s, i) => ({ id: i, ...s })));
    // enemy ships
    setEnemyBoard(placeShips(createBoard(), randomizePlacement()));
  }, []);

  const placeShips = (board, layout) => {
    const newBoard = board.slice();
    layout.forEach(ship => ship.cells.forEach(c => newBoard[c] = 'ship'));
    return newBoard;
  };

  const handleDragStop = (i, e, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = [];
    for(let k=0;k<ship.len;k++){
      const cx = x + (ship.dir===0? k:0);
      const cy = y + (ship.dir===1? k:0);
      if(cx<0||cy<0||cx>=BOARD_SIZE||cy>=BOARD_SIZE) return; // out
      const idx = cy*BOARD_SIZE+cx;
      // check overlap with other ships
      for(const s of ships){
        if(s.id!==ship.id && s.cells && s.cells.includes(idx)) return;
      }
      cells.push(idx);
    }
    const updated = ships.map(s=>s.id===ship.id?{...s,x,y,cells}:s);
    setShips(updated);
    setPlayerBoard(placeShips(createBoard(), updated));
  };

  const randomize = () => {
    const layout = randomizePlacement();
    const newShips = layout.map((s,i)=>({...s,id:i}));
    setShips(newShips);
    setPlayerBoard(placeShips(createBoard(), newShips));
  };

  const start = () => {
    // ensure all ships placed (cells present)
    if(ships.some(s=>!s.cells)){
      setMessage('Place all ships');
      return;
    }
    setPhase('battle');
    setMessage('Your turn');
  };

  const fire = (idx) => {
    if(phase!=='battle' || enemyBoard[idx]) return;
    const newBoard = enemyBoard.slice();
    const hit = newBoard[idx]==='ship';
    newBoard[idx]= hit?'hit':'miss';
    setEnemyBoard(newBoard);
    ai.record(idx, hit);
    if(!newBoard.includes('ship')){
      setMessage('You win!');
      setPhase('done');
      return;
    }
    // AI turn
    setTimeout(()=>{
      const move = ai.nextMove();
      if(move==null) return;
      const pb = playerBoard.slice();
      const hit2 = pb[move]==='ship';
      pb[move]= hit2?'hit':'miss';
      setPlayerBoard(pb);
      const nh = heat.slice(); nh[move]++; setHeat(nh);
      ai.record(move, hit2);
      if(!pb.includes('ship')){ setMessage('AI wins!'); setPhase('done'); }
      else setMessage(hit?'Hit!':'Miss!');
    },100); // simulate thinking
  };

  const renderBoard = (board, isEnemy=false) => (
    <div className="grid" style={{gridTemplateColumns:`repeat(${BOARD_SIZE}, ${CELL}px)`}}>
      {board.map((cell,idx)=>{
        const heatVal = heat[idx];
        const color = heatVal? `rgba(255,0,0,${Math.min(heatVal/5,0.5)})` : 'transparent';
        return (
          <div key={idx} className="border border-ub-dark-grey relative" style={{width:CELL,height:CELL}}>
            {isEnemy && phase==='battle' && !['hit','miss'].includes(cell)?(
              <button className="w-full h-full" onClick={()=>fire(idx)} />
            ):null}
            {cell==='hit' && <div className="absolute inset-0 bg-red-600 transition-opacity"/>}
            {cell==='miss' && <div className="absolute inset-0 bg-gray-500 transition-opacity"/>}
            {!isEnemy && <div className="absolute inset-0" style={{background:color}}/>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto font-ubuntu">
      <div className="mb-2">{message}</div>
      {phase==='placement' && (
        <div className="flex space-x-4">
          <div className="relative border border-ub-dark-grey" style={{width:BOARD_SIZE*CELL,height:BOARD_SIZE*CELL}}>
            {renderBoard(playerBoard)}
            {ships.map((ship,i)=>(
              <Draggable key={ship.id} grid={[CELL,CELL]} position={{x:(ship.x||0)*CELL,y:(ship.y||0)*CELL}}
                onStop={(e,data)=>handleDragStop(i,e,data)} disabled={phase!=='placement'}>
                <div className="absolute bg-blue-700 opacity-80" style={{width:(ship.dir===0?ship.len:1)*CELL,height:(ship.dir===1?ship.len:1)*CELL}}/>
              </Draggable>
            ))}
          </div>
          <div className="flex flex-col space-y-2">
            <button className="px-2 py-1 bg-gray-700" onClick={randomize}>Randomize</button>
            <button className="px-2 py-1 bg-gray-700" onClick={start}>Start</button>
          </div>
        </div>
      )}
      {phase!=='placement' && (
        <div className="flex space-x-8">
          <div>{renderBoard(playerBoard)}</div>
          <div>{renderBoard(enemyBoard,true)}</div>
        </div>
      )}
    </div>
  );
};

export default Battleship;
