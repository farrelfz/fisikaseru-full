/**
 * Electromagnetism helpers (SI units).
 */
export const electromagnetism = {
  electricField: (voltage, distance) => voltage / distance,
  coulombForce: (q1, q2, r, epsilon0) => (1 / (4 * Math.PI * epsilon0)) * (q1 * q2) / (r * r),
};
