/* eslint-env browser */
(function () {
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const leaderboardDiv = document.getElementById('leaderboard');
const holdBtn = document.getElementById('hold-btn');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvases = [
  document.getElementById('next1').getContext('2d'),
  document.getElementById('next2').getContext('2d'),
  document.getElementById('next3').getContext('2d'),
];
const CELL = 24;
const COLS = 10;
const ROWS = 20;

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
[holdCtx, ...nextCanvases].forEach((c) => {
  c.canvas.width = 4 * CELL;
  c.canvas.height = 4 * CELL;
});

const SHAPES = {
  I: [
    [
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
      [0,0,0,0],
    ],
    [
      [0,0,1,0],
      [0,0,1,0],
      [0,0,1,0],
      [0,0,1,0],
    ],
    [
      [0,0,0,0],
      [0,0,0,0],
      [1,1,1,1],
      [0,0,0,0],
    ],
    [
      [0,1,0,0],
      [0,1,0,0],
      [0,1,0,0],
      [0,1,0,0],
    ],
  ],
  J: [
    [
      [1,0,0],
      [1,1,1],
      [0,0,0],
    ],
    [
      [0,1,1],
      [0,1,0],
      [0,1,0],
    ],
    [
      [0,0,0],
      [1,1,1],
      [0,0,1],
    ],
    [
      [0,1,0],
      [0,1,0],
      [1,1,0],
    ],
  ],
  L: [
    [
      [0,0,1],
      [1,1,1],
      [0,0,0],
    ],
    [
      [0,1,0],
      [0,1,0],
      [0,1,1],
    ],
    [
      [0,0,0],
      [1,1,1],
      [1,0,0],
    ],
    [
      [1,1,0],
      [0,1,0],
      [0,1,0],
    ],
  ],
  O: [
    [
      [1,1],
      [1,1],
    ],
    [
      [1,1],
      [1,1],
    ],
    [
      [1,1],
      [1,1],
    ],
    [
      [1,1],
      [1,1],
    ],
  ],
  S: [
    [
      [0,1,1],
      [1,1,0],
      [0,0,0],
    ],
    [
      [0,1,0],
      [0,1,1],
      [0,0,1],
    ],
    [
      [0,0,0],
      [0,1,1],
      [1,1,0],
    ],
    [
      [1,0,0],
      [1,1,0],
      [0,1,0],
    ],
  ],
  T: [
    [
      [0,1,0],
      [1,1,1],
      [0,0,0],
    ],
    [
      [0,1,0],
      [0,1,1],
      [0,1,0],
    ],
    [
      [0,0,0],
      [1,1,1],
      [0,1,0],
    ],
    [
      [0,1,0],
      [1,1,0],
      [0,1,0],
    ],
  ],
  Z: [
    [
      [1,1,0],
      [0,1,1],
      [0,0,0],
    ],
    [
      [0,0,1],
      [0,1,1],
      [0,1,0],
    ],
    [
      [0,0,0],
      [1,1,0],
      [0,1,1],
    ],
    [
      [0,1,0],
      [1,1,0],
      [1,0,0],
    ],
  ],
};

const COLORS = {
  I: '#06b6d4',
  J: '#3b82f6',
  L: '#f97316',
  O: '#eab308',
  S: '#22c55e',
  T: '#a855f7',
  Z: '#ef4444',
};

const JLSTZ_KICKS = {
  0: {
    1: [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    3: [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  },
  1: {
    2: [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    0: [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  },
  2: {
    3: [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    1: [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  },
  3: {
    0: [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    2: [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  }
};

const I_KICKS = {
  0: {
    1: [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    3: [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  },
  1: {
    2: [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    0: [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  },
  2: {
    3: [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    1: [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  },
  3: {
    0: [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    2: [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  }
};

function createMatrix(r, c) {
  return Array.from({length:r}, () => Array(c).fill(0));
}

let board = createMatrix(ROWS, COLS);

let bag = [];
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function nextType(){
  if(bag.length===0){
    bag = shuffle('IJLOSTZ'.split(''));
  }
  return bag.pop();
}

function createPiece(type){
  return {
    type,
    rot:0,
    matrix: SHAPES[type][0],
    x:3,
    y:0
  };
}

let queue = [createPiece(nextType()), createPiece(nextType()), createPiece(nextType())];
let current = queue.shift();
let hold = null;
let canHold = true;
let locking = null;
let lockTime = 0;

drawPreviews();

function collide(board, piece, x, y){
  const m = piece.matrix;
  for(let r=0;r<m.length;r++){
    for(let c=0;c<m[r].length;c++){
      if(m[r][c]){
        const nx = x + c;
        const ny = y + r;
        if(nx<0 || nx>=COLS || ny>=ROWS || (ny>=0 && board[ny][nx])){
          return true;
        }
      }
    }
  }
  return false;
}

function merge(board, piece){
  piece.matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if(v && y+piece.y>=0){
        board[y+piece.y][x+piece.x] = piece.type;
      }
    });
  });
}

function drawMatrixOn(targetCtx, matrix, offset, color, ghost=false){
  targetCtx.globalAlpha = ghost ? 0.3 : 1;
  matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if(v){
        targetCtx.fillStyle = color;
        targetCtx.fillRect((x+offset.x)*CELL, (y+offset.y)*CELL, CELL, CELL);
        targetCtx.strokeStyle = '#111';
        targetCtx.strokeRect((x+offset.x)*CELL, (y+offset.y)*CELL, CELL, CELL);
      }
    });
  });
  targetCtx.globalAlpha = 1;
}

function drawPreviews(){
  holdCtx.fillStyle = '#222';
  holdCtx.fillRect(0,0,holdCanvas.width, holdCanvas.height);
  if(hold){
    const m = SHAPES[hold][0];
    const offset = {x: Math.floor((4 - m[0].length)/2), y: Math.floor((4 - m.length)/2)};
    drawMatrixOn(holdCtx, m, offset, COLORS[hold]);
  }
  nextCanvases.forEach((ctx, i)=>{
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
    const p = queue[i];
    if(p){
      const m = SHAPES[p.type][0];
      const offset = {x: Math.floor((4 - m[0].length)/2), y: Math.floor((4 - m.length)/2)};
      drawMatrixOn(ctx, m, offset, COLORS[p.type]);
    }
  });
}

function getDropY(piece){
  let y = piece.y;
  while(!collide(board, piece, piece.x, y+1)){
    y++;
  }
  return y;
}

function draw(){
  ctx.fillStyle = '#222';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  drawMatrixOn(ctx, board, {x:0,y:0}, '#444');
  if(current){
    const ghostY = getDropY(current);
    drawMatrixOn(ctx, current.matrix, {x:current.x, y:ghostY}, COLORS[current.type], true);
    drawMatrixOn(ctx, current.matrix, {x:current.x, y:current.y}, COLORS[current.type]);
  } else if(locking){
    ctx.globalAlpha = Math.max(lockTime/100, 0.4);
    drawMatrixOn(ctx, locking.matrix, {x:locking.x, y:locking.y}, COLORS[locking.type]);
    ctx.globalAlpha = 1;
  }
  drawPreviews();
}

function attemptRotate(dir){
  const type = current.type;
  const newRot = (current.rot + dir + 4)%4;
  const kicks = (type==='I'?I_KICKS:JLSTZ_KICKS)[current.rot][newRot];
  const newMatrix = SHAPES[type][newRot];
  for(const [dx,dy] of kicks){
    if(!collide(board,{matrix:newMatrix}, current.x+dx, current.y+dy)){
      current.matrix = newMatrix;
      current.rot = newRot;
      current.x += dx;
      current.y += dy;
      return true;
    }
  }
  return false;
}

function holdPiece(){
  if(!canHold) return;
  if(!hold){
    hold = current.type;
    current = queue.shift();
    queue.push(createPiece(nextType()));
  } else {
    const tmp = hold;
    hold = current.type;
    current = createPiece(tmp);
  }
  current.x = 3; current.y = 0; current.rot = 0; current.matrix = SHAPES[current.type][0];
  canHold = false;
  updateInfo();
}
holdBtn.addEventListener('click', holdPiece);

function hardDrop(){
  while(!collide(board,current,current.x,current.y+1)){
    current.y++;
  }
  pieceDrop();
}

function pieceDrop(){
  if(current && !collide(board,current,current.x,current.y+1)){
    current.y++;
  } else if(current){
    locking = { ...current };
    current = null;
    lockTime = 100;
  }
}

function sweep(){
  let cleared = 0;
  outer: for(let y=board.length-1; y>=0; y--){
    for(let x=0; x<board[y].length; x++){
      if(!board[y][x]) continue outer;
    }
    const row = board.splice(y,1)[0].fill(0);
    board.unshift(row);
    y++;
    cleared++;
  }
  return cleared;
}

function resetPiece(){
  current = queue.shift();
  current.x = 3;
  current.y = 0;
  queue.push(createPiece(nextType()));
  updateInfo();
}

function resetBoard(){
  board = createMatrix(ROWS,COLS);
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let mode = null;
let startTime = 0;
let lines = 0;
let score = 0;

function update(time=0){
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if(lockTime > 0){
    lockTime -= delta;
    if(lockTime <= 0){
      merge(board, locking);
      canHold = true;
      const linesCleared = sweep();
      lines += linesCleared;
      score += [0,100,300,500,800][linesCleared];
      if(mode==='sprint' && lines>=40){
        finishSprint();
        return;
      }
      resetPiece();
      if(collide(board,current,current.x,current.y)){
        gameOver();
      }
      locking = null;
    }
  } else if(dropCounter > dropInterval){
    pieceDrop();
    dropCounter = 0;
  }
  draw();
  if(mode){
    requestAnimationFrame(update);
  }
}

function updateInfo(){
  let text = `Score: ${score} Lines: ${lines}`;
  if(mode==='sprint'){
    const t = ((performance.now()-startTime)/1000).toFixed(2);
    text += ` Time: ${t}`;
  }
  if(hold) text += ` Hold: ${hold}`;
  if(queue[0]) text += ` Next: ${queue[0].type}`;
  info.textContent = text;
}

function startSprint(){
  mode='sprint';
  resetBoard();
  queue = [createPiece(nextType()), createPiece(nextType()), createPiece(nextType())];
  current = queue.shift();
  hold = null; canHold=true; lines=0; score=0;
  startTime = performance.now();
  updateInfo();
  drawPreviews();
  update();
}

function finishSprint(){
  mode=null;
  const time = (performance.now()-startTime)/1000;
  saveLeaderboard('sprint', time);
  showLeaderboard('sprint');
}

function startMarathon(){
  mode='marathon';
  resetBoard();
  queue = [createPiece(nextType()), createPiece(nextType()), createPiece(nextType())];
  current = queue.shift();
  hold = null; canHold=true; lines=0; score=0;
  updateInfo();
  drawPreviews();
  update();
}

function gameOver(){
  if(mode==='marathon'){
    saveLeaderboard('marathon', score);
    showLeaderboard('marathon');
  }
  mode=null;
}

function saveLeaderboard(type, value){
  const key = `tetris-${type}`;
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  data.push(value);
  if(type==='sprint') data.sort((a,b)=>a-b); else data.sort((a,b)=>b-a);
  localStorage.setItem(key, JSON.stringify(data.slice(0,5)));
}

function showLeaderboard(type){
  const key = `tetris-${type}`;
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  let html = `<h3>${type==='sprint'?'Sprint':'Marathon'} Leaderboard</h3><ol>`;
  for(const v of data){
    html += `<li>${type==='sprint'?v.toFixed(2)+'s':v}</li>`;
  }
  html += '</ol>';
  leaderboardDiv.innerHTML = html;
}

document.getElementById('mode-sprint').addEventListener('click', ()=>{mode=null;showLeaderboard('sprint');startSprint();});
document.getElementById('mode-marathon').addEventListener('click', ()=>{mode=null;showLeaderboard('marathon');startMarathon();});

document.addEventListener('keydown', e=>{
  if(!mode) return;
  if(e.key==='ArrowLeft' && !collide(board,current,current.x-1,current.y)) current.x--;
  else if(e.key==='ArrowRight' && !collide(board,current,current.x+1,current.y)) current.x++;
  else if(e.key==='ArrowDown'){pieceDrop();}
  else if(e.key==='ArrowUp'){attemptRotate(1);}
  else if(e.key==='z' || e.key==='Z'){attemptRotate(-1);}
  else if(e.key===' '){hardDrop();}
  else if(e.key==='Shift' || e.key==='c' || e.key==='C'){holdPiece();}
  updateInfo();
});

showLeaderboard('sprint');
})();
