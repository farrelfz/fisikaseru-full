/**
 * Thermodynamics helpers (SI units).
 */
export const thermodynamics = {
  idealGasPressure: (n, R, T, V) => (n * R * T) / V,
};
