/**
 * Kinematics helpers (SI units).
 */
export const kinematics = {
  displacement: (v0, t, a) => v0 * t + 0.5 * a * t * t,
  velocity: (v0, a, t) => v0 + a * t,
};
