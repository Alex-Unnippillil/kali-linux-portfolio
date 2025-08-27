const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const leaderboardDiv = document.getElementById('leaderboard');
const holdBtn = document.getElementById('hold-btn');
const CELL = 20;
const COLS = 10;
const ROWS = 20;

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

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
  I: '#00f0f0',
  J: '#0000f0',
  L: '#f0a000',
  O: '#f0f000',
  S: '#00f000',
  T: '#a000f0',
  Z: '#f00000',
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

let current = createPiece(nextType());
let next = createPiece(nextType());
let hold = null;
let canHold = true;

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

function drawMatrix(matrix, offset, color){
  matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if(v){
        ctx.fillStyle = color;
        ctx.fillRect((x+offset.x)*CELL, (y+offset.y)*CELL, CELL, CELL);
        ctx.strokeStyle = '#111';
        ctx.strokeRect((x+offset.x)*CELL, (y+offset.y)*CELL, CELL, CELL);
      }
    });
  });
}

function draw(){
  ctx.fillStyle = '#222';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  drawMatrix(board, {x:0,y:0}, '#444');
  drawMatrix(current.matrix, {x:current.x, y:current.y}, COLORS[current.type]);
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
    current = next;
    next = createPiece(nextType());
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
  if(!collide(board,current,current.x,current.y+1)){
    current.y++;
  }else{
    merge(board,current);
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
  current = next;
  current.x = 3;
  current.y = 0;
  next = createPiece(nextType());
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
  if(dropCounter > dropInterval){
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
  if(next) text += ` Next: ${next.type}`;
  info.textContent = text;
}

function startSprint(){
  mode='sprint';
  resetBoard();
  current = createPiece(nextType());
  next = createPiece(nextType());
  hold = null; canHold=true; lines=0; score=0;
  startTime = performance.now();
  updateInfo();
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
  current = createPiece(nextType());
  next = createPiece(nextType());
  hold = null; canHold=true; lines=0; score=0;
  updateInfo();
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
