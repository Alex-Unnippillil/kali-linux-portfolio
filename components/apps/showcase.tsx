import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ShowcaseApp() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { clientWidth: width, clientHeight: height } = container;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    let controls: any;
    let cleanupARButton: () => void;

    const animate = () => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    (async () => {
      const [{ OrbitControls }, { ARButton }] = await Promise.all([
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/webxr/ARButton.js'),
      ]);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const button = ARButton.createButton(renderer);
      button.style.position = 'absolute';
      button.style.top = '20px';
      button.style.left = '20px';
      container.appendChild(button);
      cleanupARButton = () => button.remove();
    })();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      controls?.dispose();
      cleanupARButton?.();
      container.replaceChildren();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full bg-black" />;
}

export const displayShowcase = () => <ShowcaseApp />;
