/**
 * Oscillation helpers (SI units).
 */
export const oscillation = {
  angularFrequency: (k, m) => Math.sqrt(k / m),
  period: (omega) => (2 * Math.PI) / omega,
};
