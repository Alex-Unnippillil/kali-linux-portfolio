(function(){
  const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;
  const width = 640;
  const height = 480;
  const rows = 5;
  const cols = 8;
  const paddleWidth = 80;
  const editorEl = document.getElementById('editor');
  const shareBtn = document.getElementById('share');
  const canvas = document.getElementById('game');

  const engine = Engine.create();
  const world = engine.world;
  const render = Render.create({
    canvas,
    engine,
    options: { width, height, wireframes: false, background: '#000' }
  });
  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  // Walls
  World.add(world, [
    Bodies.rectangle(width / 2, -10, width, 20, { isStatic: true }),
    Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true }),
    Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true })
  ]);

  // Paddle
  const paddle = Bodies.rectangle(width / 2, height - 30, paddleWidth, 10, {
    isStatic: true
  });
  World.add(world, paddle);

  // Ball
  const ball = Bodies.circle(width / 2, height / 2, 8, {
    restitution: 1,
    friction: 0,
    frictionAir: 0,
    label: 'ball'
  });
  World.add(world, ball);

  let paddleV = 0;
  const keys = { left: false, right: false };
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });

  Events.on(engine, 'beforeUpdate', () => {
    let vx = 0;
    if (keys.left) vx -= 7;
    if (keys.right) vx += 7;
    paddleV = vx;
    const newX = Math.max(paddleWidth / 2, Math.min(width - paddleWidth / 2, paddle.position.x + vx));
    Body.setPosition(paddle, { x: newX, y: paddle.position.y });
  });

  let bricks = [];
  function buildBricks(layout){
    bricks.forEach(b => World.remove(world, b));
    bricks = [];
    const brickH = 20;
    const brickW = width / cols;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(layout[r][c]){
          const brick = Bodies.rectangle(c*brickW + brickW/2, r*brickH + 40, brickW-2, brickH-2, {
            isStatic: true,
            label: 'brick'
          });
          bricks.push(brick);
        }
      }
    }
    World.add(world, bricks);
  }

  function encodeLayout(layout){
    return btoa(JSON.stringify(layout));
  }
  function decodeLayout(str){
    try {
      return JSON.parse(atob(str));
    } catch (e){
      return null;
    }
  }

  function layoutFromUrl(){
    const params = new URLSearchParams(location.search);
    const l = params.get('layout');
    if(l){
      const decoded = decodeLayout(decodeURIComponent(l));
      if (Array.isArray(decoded)) return decoded;
    }
    // default layout
    return Array.from({length: rows}, () => Array(cols).fill(1));
  }

  let currentLayout = layoutFromUrl();

  function updateUrl(){
    const encoded = encodeLayout(currentLayout);
    const url = `${location.pathname}?layout=${encodeURIComponent(encoded)}`;
    history.replaceState(null, '', url);
  }

  function rebuildEditor(){
    editorEl.innerHTML = '';
    editorEl.style.gridTemplateColumns = `repeat(${cols}, 24px)`;
    currentLayout.forEach((row, r) => {
      row.forEach((cell, c) => {
        const div = document.createElement('div');
        if(cell) div.classList.add('active');
        div.addEventListener('click', () => {
          currentLayout[r][c] = currentLayout[r][c] ? 0 : 1;
          rebuildEditor();
          buildBricks(currentLayout);
          updateUrl();
        });
        editorEl.appendChild(div);
      });
    });
  }

  rebuildEditor();
  buildBricks(currentLayout);
  updateUrl();

  shareBtn.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}?layout=${encodeURIComponent(encodeLayout(currentLayout))}`;
    window.prompt('Share this URL', url);
  });

  Events.on(engine, 'collisionStart', event => {
    event.pairs.forEach(pair => {
      const bodies = [pair.bodyA, pair.bodyB];
      if(bodies.includes(ball) && bodies.includes(paddle)){
        const relative = (ball.position.x - paddle.position.x) / (paddleWidth/2);
        const vx = ball.velocity.x + relative * 5 + paddleV * 0.5;
        Body.setVelocity(ball, { x: vx, y: -Math.abs(ball.velocity.y) });
        Body.setAngularVelocity(ball, paddleV * 0.1);
      }
      bricks.forEach(brick => {
        if(bodies.includes(brick) && bodies.includes(ball)){
          World.remove(world, brick);
          bricks.splice(bricks.indexOf(brick),1);
        }
      });
    });
  });

  Events.on(engine, 'afterUpdate', () => {
    if(ball.position.y > height + 30){
      Body.setPosition(ball, { x: width/2, y: height/2 });
      Body.setVelocity(ball, { x: 0, y: -6 });
      Body.setAngularVelocity(ball, 0);
    }
  });
})();
