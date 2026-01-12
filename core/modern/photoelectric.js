/**
 * Photoelectric effect helpers (SI units).
 */
export const photoelectric = {
  stoppingPotential: (frequency, workFunction, h) => (h * frequency - workFunction),
};
