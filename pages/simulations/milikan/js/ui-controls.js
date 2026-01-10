import {
  simulationState,
  randomizeDroplet,
  resetSimulationState,
  setPlateDistance,
  setVoltage,
} from './state.js';
import { appendMeasurement, loadMeasurements } from './storage.js';
import * as renderer3D from './renderer3D.js';
import * as microscope from './microscope.js';
import { initEmbeddedMode, initIframeAutoResize, injectDhwsDataInjector } from './platform.js';

let initialized = false;

function $(id) {
  return document.getElementById(id);
}

export function initStage2() {
  if (initialized) return;

  const elements = {
    tab3D: $('tab3D'),
    tabMicroscope: $('tabMicroscope'),
    view3D: $('view3D'),
    viewMicroscope: $('viewMicroscope'),
    chamber3D: $('chamber3D'),
    microscopeCanvas: $('microscopeCanvas'),

    particleCount: $('particleCount'),
    statusIndicator: $('statusIndicator'),
    statusText: $('statusText'),
    positionY: $('positionY'),
    velocityDisplay: $('velocityDisplay'),

    btnStart: $('btnStart'),
    btnPause: $('btnPause'),
    btnReset: $('btnReset'),
    voltageSlider: $('voltageSlider'),
    distanceSlider: $('distanceSlider'),
    voltageValue: $('voltageValue'),
    distanceValue: $('distanceValue'),

    v1Display: $('v1Display'),
    v2Display: $('v2Display'),
    radiusDisplay: $('radiusDisplay'),
    chargeDisplay: $('chargeDisplay'),
    chargeCorrectedDisplay: $('chargeCorrectedDisplay'),

    btnCapture: $('btnCapture'),
    dataTableBody: $('dataTableBody'),
    dataCount: $('dataCount'),
    btnNextStage: $('btnNextStage'),

    methodFloating: $('methodFloating'),
    methodRising: $('methodRising'),
  };

  if (!elements.btnStart || !elements.chamber3D) return;

  initEmbeddedMode();
  initIframeAutoResize();
  injectDhwsDataInjector();

  // Init renderers (no RAF here)
  renderer3D.init(elements.chamber3D);
  microscope.init(elements.microscopeCanvas);

  // Load stored data
  simulationState.measurements = loadMeasurements();
  updateDataTable(elements, simulationState);
  updateStage3Unlock(elements, simulationState);

  // Wire controls (single attach)
  elements.voltageSlider.addEventListener('input', (e) => {
    setVoltage(e.target.value);
    elements.voltageValue.textContent = `${simulationState.settings.voltage_V} V`;
  });

  elements.distanceSlider.addEventListener('input', (e) => {
    setPlateDistance(e.target.value);
    elements.distanceValue.textContent = `${simulationState.settings.plateDistance_mm.toFixed(1)} mm`;
  });

  elements.btnStart.addEventListener('click', () => start(elements));
  elements.btnPause.addEventListener('click', () => togglePause(elements));
  elements.btnReset.addEventListener('click', () => reset(elements));

  elements.tab3D.addEventListener('click', () => setActiveView(elements, '3D'));
  elements.tabMicroscope.addEventListener('click', () => setActiveView(elements, 'Microscope'));

  if (elements.methodFloating) {
    elements.methodFloating.addEventListener('click', () => setMethod(elements, 'floating'));
  }
  if (elements.methodRising) {
    elements.methodRising.addEventListener('click', () => setMethod(elements, 'rising'));
  }

  elements.btnCapture.addEventListener('click', () => {
    if (!simulationState.flags.running) return;

    const measurement = {
      voltage: simulationState.settings.voltage_V,
      distance: simulationState.settings.plateDistance_mm,
      v1: simulationState.measurement.v1_mm_s,
      v2: simulationState.measurement.v2_mm_s,
      radius: simulationState.measurement.radius_um,
      charge: simulationState.measurement.chargeScaled,
      chargeCorrected: simulationState.measurement.chargeCorrectedScaled,
      timestamp: new Date().toISOString(),
    };

    const result = appendMeasurement(measurement);

    if (result.ok) {
      simulationState.measurements = result.list;
      updateDataTable(elements, simulationState);
      updateStage3Unlock(elements, simulationState);

      // Notify parent iframe (SPA gating) if present
      try {
        if (window !== window.parent) {
          window.parent.postMessage({ type: 'millikan:measurementsUpdated', count: result.count }, '*');
        }
      } catch {}
    }
  });

  // Tick -> update UI (no loop in UI layer)
  window.addEventListener('millikan:tick', () => {
    updateMeasurementDisplays(elements, simulationState);
  });

  // Default UI state
  elements.voltageValue.textContent = `${simulationState.settings.voltage_V} V`;
  elements.distanceValue.textContent = `${simulationState.settings.plateDistance_mm.toFixed(1)} mm`;
  elements.voltageSlider.value = String(simulationState.settings.voltage_V);
  elements.distanceSlider.value = String(simulationState.settings.plateDistance_mm);

  setActiveView(elements, '3D');
  setStatus(elements, 'stopped', 'Siap Memulai');
  elements.btnPause.disabled = true;
  elements.btnCapture.disabled = true;

  // Resize handling (single listener)
  window.addEventListener('resize', () => {
    renderer3D.resize();
    microscope.resize();
  });

  updateMeasurementDisplays(elements, simulationState);
  initialized = true;
}

function setMethod(elements, method) {
  simulationState.method = method;
  if (elements.methodFloating) {
    elements.methodFloating.classList.toggle('selected', method === 'floating');
  }
  if (elements.methodRising) {
    elements.methodRising.classList.toggle('selected', method === 'rising');
  }
}

function setActiveView(elements, view) {
  simulationState.view.active = view;

  if (view === '3D') {
    elements.view3D.classList.remove('hidden');
    elements.viewMicroscope.classList.add('hidden');
    elements.tab3D.classList.add('active');
    elements.tabMicroscope.classList.remove('active');
  } else {
    elements.viewMicroscope.classList.remove('hidden');
    elements.view3D.classList.add('hidden');
    elements.tabMicroscope.classList.add('active');
    elements.tab3D.classList.remove('active');
  }

  if (simulationState.flags.running) {
    startActiveLoop();
  }
}

function start(elements) {
  simulationState.flags.running = true;
  simulationState.flags.paused = false;
  randomizeDroplet(simulationState);

  elements.btnStart.disabled = true;
  elements.btnPause.disabled = false;
  elements.btnCapture.disabled = false;

  setStatus(elements, 'running', 'Simulasi Berjalan');
  elements.btnPause.innerHTML =
    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Jeda</span>';

  startActiveLoop();
}

function togglePause(elements) {
  simulationState.flags.paused = !simulationState.flags.paused;

  if (simulationState.flags.paused) {
    setStatus(elements, 'paused', 'Simulasi Dijeda');
    elements.btnPause.innerHTML =
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Lanjutkan</span>';
  } else {
    setStatus(elements, 'running', 'Simulasi Berjalan');
    elements.btnPause.innerHTML =
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Jeda</span>';
    startActiveLoop();
  }
}

function reset(elements) {
  stopAllLoops();
  resetSimulationState(simulationState);

  if (elements.voltageSlider) elements.voltageSlider.value = String(simulationState.settings.voltage_V);
  if (elements.distanceSlider) {
    elements.distanceSlider.value = String(simulationState.settings.plateDistance_mm);
  }
  if (elements.voltageValue) {
    elements.voltageValue.textContent = `${simulationState.settings.voltage_V} V`;
  }
  if (elements.distanceValue) {
    elements.distanceValue.textContent = `${simulationState.settings.plateDistance_mm.toFixed(1)} mm`;
  }

  elements.btnStart.disabled = false;
  elements.btnPause.disabled = true;
  elements.btnCapture.disabled = true;

  setStatus(elements, 'stopped', 'Siap Memulai');
  updateMeasurementDisplays(elements, simulationState);
}

function setStatus(elements, status, text) {
  if (!elements.statusIndicator || !elements.statusText) return;
  elements.statusIndicator.className = `status-indicator status-${status}`;
  elements.statusText.textContent = text;
}

function stopAllLoops() {
  renderer3D.stop();
  microscope.stop();
}

function startActiveLoop() {
  stopAllLoops();
  if (!simulationState.flags.running) return;

  if (simulationState.view.active === '3D') {
    renderer3D.start();
  } else {
    microscope.start();
  }
}

function updateMeasurementDisplays(elements, state) {
  const m = state.measurement;
  if (elements.v1Display) elements.v1Display.textContent = Number(m.v1_mm_s || 0).toFixed(3);
  if (elements.v2Display) elements.v2Display.textContent = Number(m.v2_mm_s || 0).toFixed(3);
  if (elements.radiusDisplay) elements.radiusDisplay.textContent = Number(m.radius_um || 0).toFixed(3);
  if (elements.chargeDisplay) elements.chargeDisplay.textContent = Number(m.chargeScaled || 0).toFixed(3);
  if (elements.chargeCorrectedDisplay) {
    elements.chargeCorrectedDisplay.textContent = Number(m.chargeCorrectedScaled || 0).toFixed(3);
  }

  if (elements.positionY) {
    elements.positionY.textContent = `${Number(state.droplet.positionY_mm || 0).toFixed(3)} mm`;
  }
  if (elements.velocityDisplay) {
    elements.velocityDisplay.textContent = `${Math.abs(Number(state.droplet.velocityY_mm_s || 0)).toFixed(3)} mm/s`;
  }

  // Particle count stays stable (visual), keep existing UI semantics
  if (elements.particleCount) {
    elements.particleCount.textContent = '5';
  }
}

function updateDataTable(elements, state) {
  const list = Array.isArray(state.measurements) ? state.measurements : [];
  const count = list.length;
  if (elements.dataCount) elements.dataCount.textContent = `${count} pengukuran`;

  if (!elements.dataTableBody) return;

  if (count === 0) {
    elements.dataTableBody.innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-text-tertiary">Belum ada data tersimpan</td></tr>';
    return;
  }

  elements.dataTableBody.innerHTML = list
    .map(
      (m) => `
        <tr class="data-row border-b border-border">
          <td class="py-2 px-2 font-mono text-text-secondary">${m.id}</td>
          <td class="py-2 px-2 font-mono text-text-primary">${Number(m.charge).toFixed(3)}</td>
          <td class="py-2 px-2 font-mono text-primary font-semibold">${Number(m.chargeCorrected).toFixed(3)}</td>
        </tr>`
    )
    .join('');
}

function updateStage3Unlock(elements, state) {
  const unlocked = (state.measurements || []).length >= 3;
  if (unlocked && elements.btnNextStage) {
    elements.btnNextStage.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  }
}
