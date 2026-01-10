export const constants = {
  g: 9.81,
  eta: 1.81e-5,
  rho_oil: 886,
  rho_air: 1.29,
  e: 1.602e-19,
  lambda: 6.53e-8,
  defaultDistance_mm: 10,
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createDefaultState() {
  return {
    flags: {
      running: false,
      paused: false,
    },
    view: {
      active: '3D',
    },
    settings: {
      voltage_V: 500,
      plateDistance_mm: 10,
    },
    method: 'floating',
    droplet: {
      radius_um: 1.0,
      charge_n: 3,
      positionY_mm: 0,
      velocityY_mm_s: 0,
    },
    measurement: {
      v1_mm_s: 0,
      v2_mm_s: 0,
      radius_um: 0,
      chargeScaled: 0,
      chargeCorrectedScaled: 0,
    },
    measurements: [],
  };
}

export const simulationState = createDefaultState();

export function randomizeDroplet(state = simulationState) {
  const radius_um = 0.6 + Math.random() * 1.6; // 0.6–2.2 µm
  const charge_n = 1 + Math.floor(Math.random() * 7); // 1–7e

  state.droplet.radius_um = radius_um;
  state.droplet.charge_n = charge_n;
  state.droplet.positionY_mm = 0;
  state.droplet.velocityY_mm_s = 0;
}

export function resetSimulationState(state = simulationState) {
  state.flags.running = false;
  state.flags.paused = false;
  state.view.active = '3D';
  state.settings.voltage_V = 500;
  state.settings.plateDistance_mm = 10;
  state.method = 'floating';

  state.measurement.v1_mm_s = 0;
  state.measurement.v2_mm_s = 0;
  state.measurement.radius_um = 0;
  state.measurement.chargeScaled = 0;
  state.measurement.chargeCorrectedScaled = 0;

  randomizeDroplet(state);
}

export function setVoltage(voltage_V, state = simulationState) {
  state.settings.voltage_V = clamp(Number(voltage_V) || 0, 0, 1000);
}

export function setPlateDistance(distance_mm, state = simulationState) {
  state.settings.plateDistance_mm = clamp(Number(distance_mm) || 0, 5, 20);
}

// Backward compatible global (avoids breaking any legacy code paths).
// Note: state remains the single source of truth in this module.
if (typeof window !== 'undefined') {
  window.Millikan = {
    constants,
    simulationState,
    createDefaultState,
    resetSimulationState,
    randomizeDroplet,
    setVoltage: (state, voltage) => setVoltage(voltage, state),
    setPlateDistance: (state, distance) => setPlateDistance(distance, state),
  };
}
