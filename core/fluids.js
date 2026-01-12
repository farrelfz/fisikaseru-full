/**
 * Fluid mechanics helpers (SI units).
 */
export const fluids = {
  reynolds: (rho, v, L, mu) => (rho * v * L) / mu,
  buoyantForce: (rho, volume, g) => rho * volume * g,
};
