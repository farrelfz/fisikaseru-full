// Global math utilities
window.FSMath = {
  clamp(x, min, max) { return Math.min(max, Math.max(min, x)); },
  round(x, digits = 3) {
    const p = Math.pow(10, digits);
    return Math.round(x * p) / p;
  },
};
