export const mathUtils = {
  mean: (arr) => arr.reduce((sum, v) => sum + v, 0) / (arr.length || 1),
  variance: (arr) => {
    const mu = mathUtils.mean(arr);
    return arr.reduce((sum, v) => sum + (v - mu) ** 2, 0) / (arr.length || 1);
  },
  stddev: (arr) => Math.sqrt(mathUtils.variance(arr)),
  median: (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  },
  round: (value, digits = 4) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  },
};
