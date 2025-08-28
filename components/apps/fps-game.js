import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import GameLayout from './GameLayout';

const FPSGame = () => {
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const isLockedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 1.6, 3);
    cameraRef.current = camera;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshNormalMaterial(),
    );
    scene.add(box);

    const animate = () => {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const handlePointerLockChange = () => {
      isLockedRef.current = document.pointerLockElement === canvas;
    };

    const handleMouseMove = (event) => {
      if (!isLockedRef.current) return;
      camera.rotation.y -= event.movementX * 0.002;
      camera.rotation.x -= event.movementY * 0.002;
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const requestPointerLock = () => {
    const canvas = canvasRef.current;
    if (canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  };

  return (
    <GameLayout>
      <canvas
        ref={canvasRef}
        onClick={requestPointerLock}
        className="w-full h-full"
      />
    </GameLayout>
  );
};

export default FPSGame;

