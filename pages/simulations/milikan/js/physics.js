import { constants } from './state.js';

export function computeRadiusFromV2(v2_mm_s) {
    // Stokes’ law at terminal velocity:
    // r = sqrt( (9 η v) / (2 g (ρ_oil − ρ_air)) )
    const v2_m_s = v2_mm_s * 1e-3;
    const r_m = Math.sqrt(
      (9 * constants.eta * v2_m_s) /
        (2 * constants.g * (constants.rho_oil - constants.rho_air))
    );
    return r_m * 1e6;
  }

export function computeField(voltage_V, distance_mm) {
    // E = V / d
    const d_m = distance_mm / 1000;
    return voltage_V / d_m;
  }

export function computeChargeScaled(radius_um, v1_mm_s, v2_mm_s, E_V_per_m) {
    // q = (6π η r (v₁ + v₂)) / E
    const r_m = radius_um * 1e-6;
    const v_sum_m_s = (v1_mm_s + v2_mm_s) * 1e-3;
    const q_C = (6 * Math.PI * constants.eta * r_m * v_sum_m_s) / E_V_per_m;
    return q_C / 1e-19;
  }

export function computeCunninghamCorrectedScaled(chargeScaled, radius_um) {
    // q_c = q · [1 + (λ / r) (2.52 + 0.8 exp(−0.55 r / λ))]
    const r_m = radius_um * 1e-6;
    const factor =
      1 +
      (constants.lambda / r_m) *
        (2.52 + 0.8 * Math.exp((-0.55 * r_m) / constants.lambda));
    return chargeScaled * factor;
  }

export function computeV2FromRadius(radius_um) {
    // v = (2 g r² (ρ_oil − ρ_air)) / (9 η)
    const r_m = radius_um * 1e-6;
    const v_m_s =
      (2 * constants.g * r_m * r_m * (constants.rho_oil - constants.rho_air)) /
      (9 * constants.eta);
    return v_m_s * 1e3;
  }

export function computeV1FromCharge(radius_um, v2_mm_s, q_scaled, E_V_per_m) {
    // v₁ = (q E)/(6π η r) − v₂
    const r_m = radius_um * 1e-6;
    const q_C = q_scaled * 1e-19;
    const term_m_s =
      (q_C * E_V_per_m) / (6 * Math.PI * constants.eta * r_m);
    const v2_m_s = v2_mm_s * 1e-3;
    const v1_m_s = term_m_s - v2_m_s;
    return v1_m_s * 1e3;
  }

export function updateExperimentPhysics(state, dt_s) {
    if (!state || !state.droplet || !state.measurement) return;

    const voltage = state.settings.voltage_V;
    const distance = state.settings.plateDistance_mm;

    const radius_um = state.droplet.radius_um;
    const v2 = computeV2FromRadius(radius_um);

    const E = computeField(voltage, distance);
    const qScaledTrue = (state.droplet.charge_n * constants.e) / 1e-19;

    let v1 = computeV1FromCharge(radius_um, v2, qScaledTrue, E);
    if (!Number.isFinite(v1) || v1 < 0) v1 = 0;

    const chargeScaled = computeChargeScaled(radius_um, v1, v2, E);
    const chargeCorrectedScaled = computeCunninghamCorrectedScaled(chargeScaled, radius_um);

    state.measurement.v1_mm_s = v1;
    state.measurement.v2_mm_s = v2;
    state.measurement.radius_um = radius_um;
    state.measurement.chargeScaled = chargeScaled;
    state.measurement.chargeCorrectedScaled = chargeCorrectedScaled;

    // Visualization-only motion: upward if v1 > v2
    const velY = v1 - v2;
    state.droplet.velocityY_mm_s = velY;
    state.droplet.positionY_mm += velY * dt_s;

    const maxY = 18;
    if (state.droplet.positionY_mm > maxY) {
      state.droplet.positionY_mm = maxY;
    }
    if (state.droplet.positionY_mm < -maxY) {
      state.droplet.positionY_mm = -maxY;
    }
  }


// Backward compatible global (legacy access only)
if (typeof window !== 'undefined') {
  window.Physics = {
    CONSTANTS: constants,
    computeRadiusFromV2,
    computeField,
    computeChargeScaled,
    computeCunninghamCorrectedScaled,
    computeV2FromRadius,
    computeV1FromCharge,
    updateExperimentPhysics,
  };
}
