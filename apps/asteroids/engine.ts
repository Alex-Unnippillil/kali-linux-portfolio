import Matter, { Engine, World, Bodies, Body, Events } from 'matter-js';

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  score: number;
  id?: string;
}

interface PoolItem<T> {
  body: Body;
  active: boolean;
  data: T;
}

interface BulletData {
  life: number;
}

interface PowerUpData {
  type: string;
  timer: number;
}

export class AsteroidsEngine {
  engine: Engine;
  ship: Body;
  width: number;
  height: number;
  bullets: PoolItem<BulletData>[] = [];
  asteroids: PoolItem<{}>[] = [];
  powerUps: PoolItem<PowerUpData>[] = [];
  score = 0;
  level = 1;
  cooldown = 0;
  rng = () => Math.random();
  rapidFireTimer = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.engine = Engine.create();
    this.engine.gravity.y = 0;
    this.ship = Bodies.polygon(width / 2, height / 2, 3, 15, {
      frictionAir: 0.05,
    });
    World.add(this.engine.world, this.ship);
    // pools
    for (let i = 0; i < 40; i += 1) {
      const b = Bodies.circle(-100, -100, 2, { isSensor: true });
      this.bullets.push({ body: b, active: false, data: { life: 0 } });
    }
    for (let i = 0; i < 20; i += 1) {
      const a = Bodies.circle(-100, -100, 20 + this.rng() * 20, {
        isSensor: true,
      });
      this.asteroids.push({ body: a, active: false, data: {} });
    }
    for (let i = 0; i < 5; i += 1) {
      const p = Bodies.circle(-100, -100, 10, { isSensor: true });
      this.powerUps.push({
        body: p,
        active: false,
        data: { type: 'rapid', timer: 0 },
      });
    }
    World.add(this.engine.world, this.bullets.map((b) => b.body));
    World.add(this.engine.world, this.asteroids.map((a) => a.body));
    World.add(this.engine.world, this.powerUps.map((p) => p.body));

    Events.on(this.engine, 'collisionStart', (e) => {
      e.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const bullet = this.bullets.find((b) => b.body === bodyA || b.body === bodyB);
        const asteroid = this.asteroids.find((a) => a.body === bodyA || a.body === bodyB);
        const power = this.powerUps.find((p) => p.body === bodyA || p.body === bodyB);
        if (bullet && asteroid && bullet.active && asteroid.active) {
          bullet.active = false;
          asteroid.active = false;
          this.score += 100;
        }
        if (asteroid && bodyA === this.ship || asteroid && bodyB === this.ship) {
          // simple death
          this.score = Math.max(0, this.score - 500);
        }
        if (power && (bodyA === this.ship || bodyB === this.ship) && power.active) {
          power.active = false;
          if (power.data.type === 'rapid') this.rapidFireTimer = 600; // 10s
        }
      });
    });

    this.spawnAsteroids(4);
  }

  spawnAsteroids(count: number) {
    for (let i = 0; i < count; i += 1) {
      const a = this.asteroids.find((x) => !x.active);
      if (!a) return;
      const x = this.rng() * this.width;
      const y = this.rng() * this.height;
      Body.setPosition(a.body, { x, y });
      Body.setVelocity(a.body, {
        x: (this.rng() - 0.5) * 2,
        y: (this.rng() - 0.5) * 2,
      });
      a.active = true;
    }
  }

  spawnPowerUp() {
    const p = this.powerUps.find((x) => !x.active);
    if (!p) return;
    Body.setPosition(p.body, { x: this.rng() * this.width, y: this.rng() * this.height });
    p.data.type = 'rapid';
    p.active = true;
  }

  shoot() {
    if (this.cooldown > 0) return;
    const b = this.bullets.find((x) => !x.active);
    if (!b) return;
    Body.setPosition(b.body, this.ship.position);
    const speed = 8;
    Body.setVelocity(b.body, {
      x: Math.cos(this.ship.angle) * speed + this.ship.velocity.x,
      y: Math.sin(this.ship.angle) * speed + this.ship.velocity.y,
    });
    b.data.life = 60;
    b.active = true;
    this.cooldown = this.rapidFireTimer > 0 ? 5 : 15;
  }

  rotate(dir: number) {
    Body.setAngularVelocity(this.ship, dir * 0.05);
  }

  thrust(power: number) {
    const force = {
      x: Math.cos(this.ship.angle) * power,
      y: Math.sin(this.ship.angle) * power,
    };
    Body.applyForce(this.ship, this.ship.position, force);
  }

  wrap(body: Body) {
    let { x, y } = body.position;
    if (x < 0) x = this.width;
    if (x > this.width) x = 0;
    if (y < 0) y = this.height;
    if (y > this.height) y = 0;
    Body.setPosition(body, { x, y });
  }

  update() {
    Engine.update(this.engine, 1000 / 60);
    this.wrap(this.ship);
    this.bullets.forEach((b) => {
      if (!b.active) return;
      this.wrap(b.body);
      b.data.life -= 1;
      if (b.data.life <= 0) b.active = false;
    });
    this.asteroids.forEach((a) => {
      if (!a.active) return;
      this.wrap(a.body);
    });
    this.powerUps.forEach((p) => {
      if (!p.active) return;
      this.wrap(p.body);
    });
    this.cooldown -= 1;
    if (this.rapidFireTimer > 0) this.rapidFireTimer -= 1;
    // difficulty
    if (this.asteroids.every((a) => !a.active)) {
      this.level += 1;
      this.spawnAsteroids(4 + this.level);
      if (this.level % 2 === 0) this.spawnPowerUp();
    }
  }

  getState() {
    return {
      ship: this.ship,
      bullets: this.bullets.filter((b) => b.active).map((b) => b.body),
      asteroids: this.asteroids.filter((a) => a.active).map((a) => a.body),
      powerUps: this.powerUps.filter((p) => p.active),
      score: this.score,
      level: this.level,
    };
  }
}

export default AsteroidsEngine;
