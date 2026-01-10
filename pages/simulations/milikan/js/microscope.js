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
let canvasEl;
let ctx;

let rafId = 0;
let lastTs = 0;
let lastUiTickTs = 0;

export function init(canvas) {
  if (initialized) return;
  if (!canvas) return;

  canvasEl = canvas;
  ctx = canvasEl.getContext('2d');
  resize();

  initialized = true;
}

export function resize() {
  if (!canvasEl) return;
  const parent = canvasEl.parentElement;
  if (!parent) return;

  const width = parent.clientWidth || 1;
  const height = parent.clientHeight || 1;

  canvasEl.width = width;
  canvasEl.height = height;
}

export function render(state) {
  if (!initialized || !ctx || !canvasEl) return;

  const w = canvasEl.width;
  const h = canvasEl.height;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(59,130,246,0.2)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Crosshair
  ctx.strokeStyle = 'rgba(6,182,212,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Droplet
  const y_mm = state && state.droplet ? Number(state.droplet.positionY_mm) || 0 : 0;
  const y = h / 2 - y_mm * 4; // scale: 1 mm -> 4 px
  const x = w / 2;

  const r = 10;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, '#60A5FA');
  gradient.addColorStop(1, '#3B82F6');

  ctx.shadowBlur = 15;
  ctx.shadowColor = '#3B82F6';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
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
  window.MillikanMicroscope = api;
}
