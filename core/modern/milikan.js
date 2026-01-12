import { PHYSICS_CONSTANTS, DEFAULTS } from '../constants.js';

/**
 * Millikan oil drop model (SI units only).
 * All formulas are documented and centralized here.
 */
const CUNNINGHAM = {
  A: 1.257,
  B: 0.4,
  C: 1.1,
};

const meanFreePath = (temperatureK = DEFAULTS.temperature_K, pressurePa = DEFAULTS.pressure_Pa) => {
  // Approximate mean free path of air (m) using reference at STP.
  const lambda0 = 65e-9; // 65 nm at 1 atm, 300 K
  return lambda0 * (temperatureK / 300) * (101325 / pressurePa);
};

const cunninghamCorrection = (radius, temperatureK, pressurePa) => {
  const lambda = meanFreePath(temperatureK, pressurePa);
  const { A, B, C } = CUNNINGHAM;
  return 1 + (2 * lambda / radius) * (A + B * Math.exp(-C * radius / lambda));
};

const dragCoefficient = (radius, etaAir, temperatureK, pressurePa) => {
  const cc = cunninghamCorrection(radius, temperatureK, pressurePa);
  return (6 * Math.PI * etaAir * radius) / cc;
};

const terminalVelocity = ({ radius, rhoOil, rhoAir = PHYSICS_CONSTANTS.rho_air, g = PHYSICS_CONSTANTS.g, etaAir = PHYSICS_CONSTANTS.eta_air, temperatureK = DEFAULTS.temperature_K, pressurePa = DEFAULTS.pressure_Pa, }) => {
  // v_terminal = (2 r^2 (rho_oil - rho_air) g) / (9 eta) * Cc
  const cc = cunninghamCorrection(radius, temperatureK, pressurePa);
  return (2 * radius * radius * (rhoOil - rhoAir) * g * cc) / (9 * etaAir);
};

const radiusFromTerminalVelocity = ({ vTerminal, rhoOil, rhoAir = PHYSICS_CONSTANTS.rho_air, g = PHYSICS_CONSTANTS.g, etaAir = PHYSICS_CONSTANTS.eta_air, temperatureK = DEFAULTS.temperature_K, pressurePa = DEFAULTS.pressure_Pa, }) => {
  // Solve r from v_terminal with Cunningham correction via fixed-point iteration.
  const base = Math.sqrt((9 * etaAir * vTerminal) / (2 * (rhoOil - rhoAir) * g));
  let radius = base;
  for (let i = 0; i < 6; i += 1) {
    const cc = cunninghamCorrection(radius, temperatureK, pressurePa);
    radius = Math.sqrt((9 * etaAir * vTerminal) / (2 * (rhoOil - rhoAir) * g * cc));
  }
  return radius;
};

const effectiveWeight = ({ radius, rhoOil, rhoAir = PHYSICS_CONSTANTS.rho_air, g = PHYSICS_CONSTANTS.g }) => {
  const volume = (4 / 3) * Math.PI * radius ** 3;
  return (rhoOil - rhoAir) * volume * g;
};

const chargeFromVelocities = ({ radius, vDown, vUp, electricField, etaAir = PHYSICS_CONSTANTS.eta_air, temperatureK = DEFAULTS.temperature_K, pressurePa = DEFAULTS.pressure_Pa, }) => {
  // q = (drag * (v_down + v_up)) / E
  const drag = dragCoefficient(radius, etaAir, temperatureK, pressurePa);
  return (drag * (vDown + vUp)) / electricField;
};

export const milikan = {
  meanFreePath,
  cunninghamCorrection,
  dragCoefficient,
  terminalVelocity,
  radiusFromTerminalVelocity,
  effectiveWeight,
  chargeFromVelocities,
  simulateRun: ({
    rhoOil,
    voltage,
    plateDistance,
    fallDistance,
    riseDistance,
    noiseScale = 0.03,
    temperatureK = DEFAULTS.temperature_K,
    pressurePa = DEFAULTS.pressure_Pa,
  }) => {
    const electricField = voltage / plateDistance;
    const idealRadius = 0.7e-6 + Math.random() * 0.8e-6;
    const vDown = terminalVelocity({ radius: idealRadius, rhoOil, temperatureK, pressurePa });
    const vUp = vDown * (0.4 + Math.random() * 0.6);
    const noisy = (value) => value * (1 + (Math.random() - 0.5) * noiseScale * 2);
    const tDown = fallDistance / noisy(vDown);
    const tUp = riseDistance / noisy(vUp);
    const estimatedRadius = radiusFromTerminalVelocity({ vTerminal: vDown, rhoOil, temperatureK, pressurePa });
    const charge = chargeFromVelocities({ radius: estimatedRadius, vDown, vUp, electricField, temperatureK, pressurePa });
    return {
      timestamp: Date.now(),
      electricField,
      vDown,
      vUp,
      tDown,
      tUp,
      radius: estimatedRadius,
      charge,
      voltage,
      plateDistance,
      fallDistance,
      riseDistance,
    };
  },
};
