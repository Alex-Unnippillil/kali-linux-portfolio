import Matter from 'matter-js';

export function createShip(x: number, y: number) {
  return Matter.Bodies.polygon(x, y, 3, 20, {
    label: 'ship',
    frictionAir: 0.02,
  });
}

// Create an irregular asteroid using randomised vertices so every rock
// has a slightly different shape. The average distance of the vertices
// from the centre is still roughly `radius` so the physical size remains
// consistent.
export function createRock(x: number, y: number, radius: number) {
  const verts: { x: number; y: number }[] = [];
  const points = 8;
  for (let i = 0; i < points; i += 1) {
    const ang = (i / points) * Math.PI * 2;
    const r = radius * (0.7 + Math.random() * 0.6);
    verts.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
  }
  const body = Matter.Bodies.fromVertices(x, y, [verts], {
    label: 'rock',
  }) as Matter.Body & { radius: number };
  body.radius = radius;
  return body;
}

// Bullet bodies are lightweight circles. Velocity is applied on creation
// but can be reconfigured later when reusing pooled bullets.
export function createBullet(x: number, y: number, angle = 0) {
  const speed = 5;
  const body = Matter.Bodies.circle(x, y, 2, {
    label: 'bullet',
    frictionAir: 0,
  });
  Matter.Body.setVelocity(body, {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
  });
  return body;
}

export function wrapBody(body: Matter.Body, width: number, height: number) {
  let { x, y } = body.position;
  if (x < 0) x = width;
  if (x > width) x = 0;
  if (y < 0) y = height;
  if (y > height) y = 0;
  Matter.Body.setPosition(body, { x, y });
}

export function splitRock(world: Matter.World, rock: Matter.Body) {
  const radius = (rock as any).radius || 20;
  const newRadius = radius / 2;
  Matter.World.remove(world, rock);
  if (newRadius < 10) return [] as Matter.Body[];
  const r1 = createRock(rock.position.x, rock.position.y, newRadius);
  const r2 = createRock(rock.position.x, rock.position.y, newRadius);
  Matter.Body.setVelocity(r1, { x: Math.random() - 0.5, y: Math.random() - 0.5 });
  Matter.Body.setVelocity(r2, { x: Math.random() - 0.5, y: Math.random() - 0.5 });
  Matter.World.add(world, [r1, r2]);
  return [r1, r2];
}

export function detectCollision(a: Matter.Body, b: Matter.Body) {
  return Matter.SAT.collides(a, b).collided;
}
