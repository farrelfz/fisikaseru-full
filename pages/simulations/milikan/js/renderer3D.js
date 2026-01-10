import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { simulationState } from './state.js';
import { updateExperimentPhysics } from './physics.js';

export const api = {
  init,
  resize,
  render,
  start,
  stop,
};

let initialized = false;
let scene;
let camera;
let renderer;
let dropletMesh;
let backgroundParticles = [];
let canvasEl;

let rafId = 0;
let lastTs = 0;
let lastUiTickTs = 0;

export function init(canvas) {
  if (initialized) return;
  if (!canvas) return;

    canvasEl = canvas;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x3b82f6, 1);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const plateGeometry = new THREE.BoxGeometry(4, 0.1, 4);
  const plateMaterial = new THREE.MeshPhongMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.3,
  });

  const topPlate = new THREE.Mesh(plateGeometry, plateMaterial);
  topPlate.position.y = 2;
  scene.add(topPlate);

  const bottomPlate = new THREE.Mesh(plateGeometry, plateMaterial);
  bottomPlate.position.y = -2;
  scene.add(bottomPlate);

  const dropletGeom = new THREE.SphereGeometry(0.07, 18, 18);
  const dropletMat = new THREE.MeshPhongMaterial({
    color: 0x60a5fa,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.4,
  });
  dropletMesh = new THREE.Mesh(dropletGeom, dropletMat);
  dropletMesh.position.set(0, 0, 0);
  scene.add(dropletMesh);

  createBackgroundParticles();

  initialized = true;
  resize();
}

function createBackgroundParticles() {
  const geom = new THREE.SphereGeometry(0.05, 16, 16);
  const mat = new THREE.MeshPhongMaterial({
    color: 0x60a5fa,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.5,
  });

  backgroundParticles = [];
  for (let i = 0; i < 5; i++) {
    const particle = new THREE.Mesh(geom, mat);
    particle.position.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
    );
    particle.userData.velocityY = (Math.random() - 0.5) * 0.02;
    backgroundParticles.push(particle);
    scene.add(particle);
  }
}

export function resize() {
  if (!initialized || !canvasEl || !camera || !renderer) return;

  const parent = canvasEl.parentElement;
  if (!parent) return;

  const width = parent.clientWidth || 1;
  const height = parent.clientHeight || 1;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

export function render(state) {
  if (!initialized || !scene || !camera || !renderer) return;

  // Background particles movement (visual only)
  for (const p of backgroundParticles) {
    p.position.y += p.userData.velocityY;
    if (p.position.y > 1.9 || p.position.y < -1.9) {
      p.userData.velocityY *= -1;
    }
  }

  // Droplet position derived from physics state (mm -> scene units)
  if (state && state.droplet && dropletMesh) {
    const yScene = (Number(state.droplet.positionY_mm) || 0) / 12;
    dropletMesh.position.y = Math.max(-1.8, Math.min(1.8, yScene));
  }

  camera.position.x = Math.sin(Date.now() * 0.0001) * 5;
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}

export function start() {
  if (rafId) return;
  lastTs = 0;
  lastUiTickTs = 0;
  rafId = requestAnimationFrame(step);
}

export function stop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  rafId = 0;
  lastTs = 0;
  lastUiTickTs = 0;
}

function step(ts) {
  if (!simulationState.flags.running) {
    stop();
    return;
  }

  rafId = requestAnimationFrame(step);

  const prev = lastTs || ts;
  const dt_s = Math.min(0.05, Math.max(0, (ts - prev) / 1000));
  lastTs = ts;

  if (!simulationState.flags.paused) {
    updateExperimentPhysics(simulationState, dt_s);
  }

  render(simulationState);

  if (!lastUiTickTs || ts - lastUiTickTs >= 100) {
    lastUiTickTs = ts;
    window.dispatchEvent(new CustomEvent('millikan:tick', { detail: { ts } }));
  }
}


// Backward compatible global (legacy access only)
if (typeof window !== 'undefined') {
  window.MillikanRenderer3D = api;
}
