"use client";

import { Howl } from 'howler';
import { getDb } from '../../utils/safeIDB';

let cachedPhaserPromise;
const loadPhaser = async () => {
  if (!cachedPhaserPromise) {
    cachedPhaserPromise = import('phaser').then((mod) => mod.default || mod);
  }
  return cachedPhaserPromise;
};

// IndexedDB helpers for persistent highscore
const DB_NAME = 'phaser-template';
const STORE_NAME = 'scores';

function openDB() {
  return getDb(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

async function getHighscore() {
  try {
    const dbp = openDB();
    if (!dbp) return 0;
    const db = await dbp;
    return (await db.get(STORE_NAME, 'highscore')) || 0;
  } catch {
    return 0;
  }
}

async function setHighscore(score) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.put(STORE_NAME, score, 'highscore');
  } catch {
    // ignore
  }
}

// Daily challenge seed based on YYYY-MM-DD
export const dailySeed = new Date().toISOString().slice(0, 10);

const createGameScene = (Phaser) => {
  // Simple Phaser scene demonstrating fixed timestep physics and controls
  return class GameScene extends Phaser.Scene {
    constructor() {
      super('game');
      this.accumulator = 0;
      this.fixedStep = 1 / 60; // 60 Hz physics
      this.score = 0;
      this.highscore = 0;
    }

    async create() {
      this.highscore = await getHighscore();
      this.scoreText = this.add.text(10, 10, 'Score: 0', { color: '#fff' });
      this.highText = this.add.text(10, 30, `Highscore: ${this.highscore}`, {
        color: '#fff',
      });

      // Input setup
      this.cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown-P', () => this.togglePause());
      this.input.keyboard.on('keydown-R', () => this.scene.restart());
      this.input.on('pointerdown', () => this.handleAction());

      // Howler audio example
      this.jumpSound = new Howl({ src: ['jump.mp3'], volume: 0.5 });
    }

    togglePause() {
      if (this.scene.isPaused()) this.scene.resume();
      else this.scene.pause();
    }

    handleAction() {
      this.jumpSound.play();
      this.score += 1;
      this.scoreText.setText(`Score: ${this.score}`);
    }

    update(time, delta) {
      const dt = delta / 1000;
      this.accumulator += dt;

      while (this.accumulator >= this.fixedStep) {
        this.physicsStep(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
    }

    physicsStep(dt) {
      // Example physics update
      if (this.cursors.left.isDown) {
        // move player left (placeholder)
      }
    }

    async gameOver() {
      if (this.score > this.highscore) {
        await setHighscore(this.score);
        this.highscore = this.score;
        this.highText.setText(`Highscore: ${this.highscore}`);
      }
    }
  };
};

export async function startPhaserGame(parent) {
  const Phaser = await loadPhaser();
  const GameScene = createGameScene(Phaser);
  const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 240,
    parent,
    scene: GameScene,
    physics: { default: 'arcade' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  };
  return new Phaser.Game(config);
}
