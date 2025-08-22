import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import { World, Body, Box, Plane, Vec3 } from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 12);
camera.lookAt(0, 0, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7.5);
scene.add(dir);

// Track
const trackGeo = new THREE.PlaneGeometry(80, 80);
const trackMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
const track = new THREE.Mesh(trackGeo, trackMat);
track.rotation.x = -Math.PI / 2;
scene.add(track);

// Start line
const startGeo = new THREE.PlaneGeometry(10, 2);
const startMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const startLine = new THREE.Mesh(startGeo, startMat);
startLine.rotation.x = -Math.PI / 2;
startLine.position.set(0, 0.01, -40);
scene.add(startLine);

// Physics world
const world = new World({ gravity: new Vec3(0, -9.82, 0) });
const ground = new Body({ mass: 0 });
ground.addShape(new Plane());
ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(ground);

// Player car
const carGeo = new THREE.BoxGeometry(2, 1, 4);
const carMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const carMesh = new THREE.Mesh(carGeo, carMat);
scene.add(carMesh);
const carBody = new Body({ mass: 150 });
carBody.addShape(new Box(new Vec3(1, 0.5, 2)));
carBody.position.set(0, 0.5, -40);
world.addBody(carBody);

// AI car
const aiGeo = new THREE.BoxGeometry(2, 1, 4);
const aiMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
const aiMesh = new THREE.Mesh(aiGeo, aiMat);
scene.add(aiMesh);
const aiBody = new Body({ mass: 150 });
aiBody.addShape(new Box(new Vec3(1, 0.5, 2)));
aiBody.position.set(4, 0.5, -40);
world.addBody(aiBody);

// Difficulty settings
let aiSpeed = 5;
const difficulty = document.getElementById('difficulty');
difficulty.addEventListener('change', () => {
  const val = difficulty.value;
  aiSpeed = val === 'easy' ? 3 : val === 'hard' ? 7 : 5;
});

// AI path (simple rectangle)
const waypoints = [
  new Vec3(0, 0, -40),
  new Vec3(30, 0, -40),
  new Vec3(30, 0, 40),
  new Vec3(-30, 0, 40),
  new Vec3(-30, 0, -40),
];
let aiIndex = 1;

// Controls
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.code] = true));
window.addEventListener('keyup', (e) => (keys[e.code] = false));
let tilt = { gamma: 0 };
window.addEventListener('deviceorientation', (e) => {
  tilt.gamma = e.gamma || 0;
});

let ghostPath = JSON.parse(localStorage.getItem('carRacerGhost') || '[]').map(
  (p) => new THREE.Vector3(p[0], p[1], p[2])
);
let ghostMesh;
if (ghostPath.length) {
  const ghostMat = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    opacity: 0.5,
    transparent: true,
  });
  ghostMesh = new THREE.Mesh(carGeo, ghostMat);
  scene.add(ghostMesh);
}
let ghostIndex = 0;
let record = [];

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('carRacerTimes') || '[]');
const leaderboardEl = document.getElementById('leaderboard');
function renderLeaderboard() {
  leaderboardEl.innerHTML = leaderboard
    .map((t, i) => `<li>${i + 1}. ${t.toFixed(2)}s</li>`) 
    .join('');
}
renderLeaderboard();

// Lap tracking
let laps = 0;
const lapsEl = document.getElementById('laps');
let lastZ = carBody.position.z;
let lapStart = performance.now();

function saveLap(time) {
  leaderboard.push(time);
  leaderboard.sort((a, b) => a - b);
  leaderboard = leaderboard.slice(0, 5);
  localStorage.setItem('carRacerTimes', JSON.stringify(leaderboard));
  renderLeaderboard();
  localStorage.setItem('carRacerGhost', JSON.stringify(record));
  ghostPath = record.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  if (ghostMesh) scene.remove(ghostMesh);
  const ghostMat = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    opacity: 0.5,
    transparent: true,
  });
  ghostMesh = new THREE.Mesh(carGeo, ghostMat);
  scene.add(ghostMesh);
  ghostIndex = 0;
}

function animate() {
  requestAnimationFrame(animate);

  let forward = (keys['ArrowUp'] || keys['KeyW'] ? 1 : 0) -
    (keys['ArrowDown'] || keys['KeyS'] ? 1 : 0);
  let turn = (keys['ArrowLeft'] || keys['KeyA'] ? 1 : 0) -
    (keys['ArrowRight'] || keys['KeyD'] ? 1 : 0);

  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (gp) {
    forward += (gp.buttons[7]?.value || 0) - (gp.buttons[6]?.value || 0);
    turn += gp.axes[0] || 0;
  }
  const tiltTurn = tilt.gamma / 45;

  carBody.applyLocalForce(new Vec3(0, 0, -400 * forward), new Vec3(0, 0, 0));
  carBody.angularVelocity.y += -turn * 2 - tiltTurn * 2;

  // AI steering
  const target = waypoints[aiIndex];
  const dir = target.vsub(aiBody.position);
  if (dir.length() < 2) aiIndex = (aiIndex + 1) % waypoints.length;
  dir.normalize();
  aiBody.velocity.x = dir.x * aiSpeed;
  aiBody.velocity.z = dir.z * aiSpeed;

  world.step(1 / 60);

  carMesh.position.copy(carBody.position);
  carMesh.quaternion.copy(carBody.quaternion);
  aiMesh.position.copy(aiBody.position);
  aiMesh.quaternion.copy(aiBody.quaternion);

  // Ghost logic
  record.push([carBody.position.x, carBody.position.y, carBody.position.z]);
  if (ghostMesh && ghostPath[ghostIndex]) {
    ghostMesh.position.copy(ghostPath[ghostIndex]);
    ghostIndex = (ghostIndex + 1) % ghostPath.length;
  }

  // Lap detection
  if (
    lastZ > -40 &&
    carBody.position.z <= -40 &&
    Math.abs(carBody.position.x) < 5
  ) {
    laps++;
    lapsEl.textContent = `Laps: ${laps}`;
    const lapTime = (performance.now() - lapStart) / 1000;
    saveLap(lapTime);
    lapStart = performance.now();
    record = [];
  }
  lastZ = carBody.position.z;

  renderer.render(scene, camera);
}

animate();
