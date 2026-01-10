export const STORAGE_KEY = 'millikanMeasurements';

function safeParseJson(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

function normalizeMeasurement(m, index) {
    if (!m || typeof m !== 'object') return null;

    const v1 = Number(m.v1);
    const v2 = Number(m.v2);
    const radius = Number(m.radius);
    const charge = Number(m.charge);
    const chargeCorrected = Number(m.chargeCorrected);
    const voltage = Number(m.voltage);
    const distance = Number(m.distance);

    if (![v1, v2, radius, charge, chargeCorrected].every(Number.isFinite)) return null;

    return {
      id: Number.isFinite(Number(m.id)) ? Number(m.id) : index + 1,
      timestamp: typeof m.timestamp === 'string' ? m.timestamp : new Date().toISOString(),
      voltage: Number.isFinite(voltage) ? voltage : undefined,
      distance: Number.isFinite(distance) ? distance : undefined,
      v1,
      v2,
      radius,
      charge,
      chargeCorrected,
    };
  }

export function loadMeasurements() {
    const parsed = safeParseJson(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];

    const normalized = [];
    for (let i = 0; i < parsed.length; i++) {
      const n = normalizeMeasurement(parsed[i], i);
      if (n) normalized.push(n);
    }
    return normalized;
  }

export function saveMeasurements(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

export function getMeasurementCount() {
    return loadMeasurements().length;
  }

export function appendMeasurement(measurement) {
    const list = loadMeasurements();
    const normalized = normalizeMeasurement(measurement, list.length);
    if (!normalized) return { ok: false, count: list.length };

    normalized.id = list.length + 1;
    list.push(normalized);
    saveMeasurements(list);
    return { ok: true, count: list.length, list };
  }


// Backward compatible global (legacy access only)
if (typeof window !== 'undefined') {
  window.MillikanStorage = {
    STORAGE_KEY,
    loadMeasurements,
    saveMeasurements,
    appendMeasurement,
    getMeasurementCount,
  };
}
