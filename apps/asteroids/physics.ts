import Matter from 'matter-js';

export function createShip(x: number, y: number) {
  return Matter.Bodies.polygon(x, y, 3, 20, {
    label: 'ship',
    frictionAir: 0.02,
  });
}

export function createRock(x: number, y: number, radius: number) {
  const body = Matter.Bodies.polygon(x, y, 6, radius, {
    label: 'rock',
  });
  (body as any).radius = radius;
  return body;
}

export function createBullet(x: number, y: number, angle: number) {
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
