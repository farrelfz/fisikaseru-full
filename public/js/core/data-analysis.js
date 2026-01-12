import { mathUtils } from './math-utils.js';

export const dataAnalysis = {
  weightedLinearFit: (x, y, w = []) => {
    const n = x.length;
    const weights = w.length ? w : Array(n).fill(1);
    const sw = weights.reduce((sum, wi) => sum + wi, 0);
    const sx = x.reduce((sum, xi, i) => sum + weights[i] * xi, 0);
    const sy = y.reduce((sum, yi, i) => sum + weights[i] * yi, 0);
    const sxx = x.reduce((sum, xi, i) => sum + weights[i] * xi * xi, 0);
    const sxy = x.reduce((sum, xi, i) => sum + weights[i] * xi * y[i], 0);
    const denom = sw * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (sw * sxy - sx * sy) / denom;
    const intercept = denom === 0 ? 0 : (sy - slope * sx) / sw;
    return { slope, intercept };
  },
  linearizeCharge: (charges) => {
    // Normalize by median to estimate elementary charge multiples.
    const median = mathUtils.median(charges);
    const eEstimate = median || 1;
    const multiples = charges.map((q) => Math.max(1, Math.round(Math.abs(q / eEstimate))));
    const refinedE = charges.reduce((sum, q, i) => sum + Math.abs(q) / multiples[i], 0) / (charges.length || 1);
    return { eEstimate: refinedE, multiples };
  },
  residuals: (x, y, fit) => y.map((yi, i) => yi - (fit.slope * x[i] + fit.intercept)),
};
