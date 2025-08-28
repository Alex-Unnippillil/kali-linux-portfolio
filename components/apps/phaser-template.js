import Phaser from 'phaser';
import { Howl } from 'howler';

// IndexedDB helpers for persistent highscore
const DB_NAME = 'phaser-template';
const STORE_NAME = 'scores';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getHighscore() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('highscore');
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function setHighscore(score) {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(score, 'highscore');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {
    // ignore
  }
}

// Daily challenge seed based on YYYY-MM-DD
export const dailySeed = new Date().toISOString().slice(0, 10);

// Simple Phaser scene demonstrating fixed timestep physics and controls
class GameScene extends Phaser.Scene {
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
    this.highText = this.add.text(10, 30, `Highscore: ${this.highscore}`, { color: '#fff' });

    // Input setup
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.on('pointerdown', () => this.handleAction());

    // Howler audio example
    this.jumpSound = new Howl({ src: ['jump.mp3'], volume: 0.25 });
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
}

export function startPhaserGame(parent) {
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
