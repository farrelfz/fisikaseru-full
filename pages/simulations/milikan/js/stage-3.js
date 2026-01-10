import { constants } from './state.js';
import {
  computeChargeScaled,
  computeCunninghamCorrectedScaled,
  computeField,
} from './physics.js';
import { appendMeasurement, loadMeasurements, saveMeasurements } from './storage.js';
import { initEmbeddedMode, initIframeAutoResize, injectDhwsDataInjector } from './platform.js';

let experimentalData = [];

export function initStage3() {
  initEmbeddedMode();
  initIframeAutoResize();
  injectDhwsDataInjector();

  loadDataFromLocalStorage();
  renderTableOrEmptyState();
  initializeCharts();
  setupEventListeners();
  loadSavedAnalysis();
  updateStatistics();

  // Table sorting (was previously top-level; keep it after DOM exists)
  document.querySelectorAll('.sortable-header').forEach((header) => {
    header.addEventListener('click', function () {
      const sortKey = this.dataset.sort;
      sortTable(sortKey);
    });
  });
}

function loadDataFromLocalStorage() {
  const parsed = loadMeasurements();

  if (!Array.isArray(parsed) || parsed.length === 0) {
    experimentalData = [];
    return;
  }

  // Normalize into Stage 3 row schema
  experimentalData = parsed.map((m, idx) => ({
    trial: idx + 1,
    voltage: Number.isFinite(Number(m.voltage)) ? Number(m.voltage) : 0,
    radius: Number(m.radius) || 0, // µm
    v1: Number(m.v1) || 0, // mm/s
    v2: Number(m.v2) || 0, // mm/s
    charge: parseFloat(Number(m.charge).toFixed(2)), // ×10⁻¹⁹ C
    corrected: parseFloat(Number(m.chargeCorrected).toFixed(2)), // ×10⁻¹⁹ C
  }));
}

function renderTableOrEmptyState() {
  const tableBody = document.getElementById('dataTableBody');
  const emptyState = document.getElementById('emptyState');

  if (!tableBody || !emptyState) return;

  if (experimentalData.length === 0) {
    tableBody.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'py-12');
    return;
  }

  emptyState.classList.add('hidden');
  emptyState.classList.remove('flex', 'flex-col', 'items-center', 'justify-center', 'py-12');
  tableBody.classList.remove('hidden');

  tableBody.innerHTML = '';
  experimentalData.forEach((data) => {
    const row = createTableRow(data);
    tableBody.appendChild(row);
  });
}

function createTableRow(data) {
  const row = document.createElement('tr');
  row.className = 'data-row';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'text-error hover:text-error-dark transition-colors';
  deleteBtn.type = 'button';
  deleteBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    `;
  deleteBtn.addEventListener('click', () => deleteRow(data.trial));

  const actionCell = document.createElement('td');
  actionCell.className = 'px-4 py-3 text-sm';
  actionCell.appendChild(deleteBtn);

  row.innerHTML = `
      <td class="px-4 py-3 text-sm font-medium text-text-primary font-mono">${data.trial}</td>
      <td class="px-4 py-3 text-sm text-text-secondary font-mono">${data.voltage}</td>
      <td class="px-4 py-3 text-sm text-text-secondary font-mono">${data.radius.toFixed(2)}</td>
      <td class="px-4 py-3 text-sm text-text-secondary font-mono">${data.v1.toFixed(3)}</td>
      <td class="px-4 py-3 text-sm text-text-secondary font-mono">${data.v2.toFixed(3)}</td>
      <td class="px-4 py-3 text-sm text-text-secondary font-mono">${data.charge.toFixed(2)}</td>
      <td class="px-4 py-3 text-sm font-medium text-primary font-mono">${data.corrected.toFixed(2)}</td>
    `;

  row.appendChild(actionCell);
  return row;
}

function initializeCharts() {
  if (typeof Chart === 'undefined') return;

  // Charge Distribution Chart
  const chargeEl = document.getElementById('chargeDistributionChart');
  if (chargeEl && chargeEl.getContext) {
    const chargeCtx = chargeEl.getContext('2d');
    // eslint-disable-next-line no-new
    new Chart(chargeCtx, {
      type: 'bar',
      data: {
        labels: buildChargeBinsLabels(),
        datasets: [
          {
            label: 'Frekuensi',
            data: buildChargeBinsData(),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
    });
  }

  // Velocity Relationship Chart
  const velocityEl = document.getElementById('velocityRelationChart');
  if (velocityEl && velocityEl.getContext) {
    const velocityCtx = velocityEl.getContext('2d');
    // eslint-disable-next-line no-new
    new Chart(velocityCtx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Data Eksperimen',
            data: experimentalData.map((d) => ({ x: d.v1, y: d.v2 })),
            backgroundColor: 'rgba(6, 182, 212, 0.5)',
            borderColor: 'rgba(6, 182, 212, 1)',
            pointRadius: 6,
            pointHoverRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: 'v₁ (mm/s)' } },
          y: { title: { display: true, text: 'v₂ (mm/s)' } },
        },
      },
    });
  }

  // Charge vs Trial Chart
  const trialEl = document.getElementById('chargeTrialChart');
  if (trialEl && trialEl.getContext) {
    const trialCtx = trialEl.getContext('2d');
    // eslint-disable-next-line no-new
    new Chart(trialCtx, {
      type: 'line',
      data: {
        labels: experimentalData.map((d) => `#${d.trial}`),
        datasets: [
          {
            label: 'Muatan Terkoreksi',
            data: experimentalData.map((d) => d.corrected),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            title: { display: true, text: 'Muatan (×10⁻¹⁹ C)' },
            min: 1.5,
            max: 1.7,
          },
        },
      },
    });
  }

  // Statistical Chart
  const statEl = document.getElementById('statisticalChart');
  const charges = experimentalData.map((d) => d.corrected).sort((a, b) => a - b);
  if (statEl && statEl.getContext && charges.length) {
    const statCtx = statEl.getContext('2d');
    const q1 = quantile(charges, 0.25);
    const median = quantile(charges, 0.5);
    const q3 = quantile(charges, 0.75);

    // eslint-disable-next-line no-new
    new Chart(statCtx, {
      type: 'bar',
      data: {
        labels: ['Distribusi Muatan'],
        datasets: [
          { label: 'Min', data: [Math.min(...charges)], backgroundColor: 'rgba(239, 68, 68, 0.5)' },
          { label: 'Q1', data: [q1], backgroundColor: 'rgba(245, 158, 11, 0.5)' },
          { label: 'Median', data: [median], backgroundColor: 'rgba(16, 185, 129, 0.5)' },
          { label: 'Q3', data: [q3], backgroundColor: 'rgba(245, 158, 11, 0.5)' },
          { label: 'Max', data: [Math.max(...charges)], backgroundColor: 'rgba(239, 68, 68, 0.5)' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
        },
        scales: {
          y: {
            title: { display: true, text: 'Muatan (×10⁻¹⁹ C)' },
            min: 1.5,
            max: 1.7,
          },
        },
      },
    });
  }
}

function updateStatistics() {
  const charges = experimentalData.map((d) => d.corrected);
  if (charges.length === 0) {
    setText('totalTrials', '0');
    setText('avgCharge', '-');
    setText('stdDev', '-');
    setText('accuracy', '-');
    setText('expAvgCharge', '-');
    setText('chargeRange', '-');
    return;
  }

  const avg = mean(charges);
  const sd = stdDev(charges);
  const [minC, maxC] = [Math.min(...charges), Math.max(...charges)];

  setText('totalTrials', String(experimentalData.length));
  setText('avgCharge', avg.toFixed(2));
  setText('stdDev', sd.toFixed(2));
  setText('expAvgCharge', `${avg.toFixed(3)} × 10⁻¹⁹ C`);
  setText('chargeRange', `${minC.toFixed(2)} - ${maxC.toFixed(2)} × 10⁻¹⁹ C`);

  // Agreement with theoretical value (%) using nearest integer multiple of e
  const agreements = experimentalData.map((d) => agreementPercentFromChargeScaled(d.corrected));
  const overallAgreement = mean(agreements);
  setText('accuracy', overallAgreement.toFixed(1));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setupEventListeners() {
  // Modal controls
  document.getElementById('addTrialBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('addTrialModal');
    modal?.classList.remove('hidden');
    modal?.classList.add('flex');
  });

  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('submitTrialBtn')?.addEventListener('click', addNewTrial);

  // Export buttons
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);
  document.getElementById('finalExportBtn')?.addEventListener('click', exportToPDF);
  document.getElementById('previewReportBtn')?.addEventListener('click', previewReport);
  document.getElementById('exportTableBtn')?.addEventListener('click', exportToCSV);

  // Save buttons
  document.getElementById('saveProgressBtn')?.addEventListener('click', saveProgress);
  document.getElementById('saveAnalysisBtn')?.addEventListener('click', saveAnalysis);

  // Character counters
  setupCharacterCounters();

  // Auto-save
  setInterval(autoSave, 30000);
}

function closeModal() {
  const modal = document.getElementById('addTrialModal');
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
}

function addNewTrial() {
  const voltage = parseFloat(document.getElementById('modalVoltage')?.value);
  const radius = parseFloat(document.getElementById('modalRadius')?.value);
  const v1 = parseFloat(document.getElementById('modalV1')?.value);
  const v2 = parseFloat(document.getElementById('modalV2')?.value);

  if (!voltage || !radius || !v1 || !v2) {
    alert('Mohon lengkapi semua field!');
    return;
  }

  const E = computeField(voltage, constants.defaultDistance_mm);
  const chargeScaled = computeChargeScaled(radius, v1, v2, E);
  const correctedScaled = computeCunninghamCorrectedScaled(chargeScaled, radius);

  const measurement = {
    voltage,
    distance: constants.defaultDistance_mm,
    v1,
    v2,
    radius,
    charge: parseFloat(chargeScaled.toFixed(2)),
    chargeCorrected: parseFloat(correctedScaled.toFixed(2)),
    timestamp: new Date().toISOString(),
  };

  appendMeasurement(measurement);

  loadDataFromLocalStorage();
  renderTableOrEmptyState();
  updateStatistics();
  closeModal();

  // Clear form
  const ids = ['modalVoltage', 'modalRadius', 'modalV1', 'modalV2'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  }
}

function deleteRow(trial) {
  if (!confirm('Hapus data percobaan ini?')) return;

  const list = loadMeasurements();
  list.splice(trial - 1, 1);
  saveMeasurements(list);

  loadDataFromLocalStorage();
  renderTableOrEmptyState();
  updateStatistics();
}

function exportToCSV() {
  let csv =
    'No,Tegangan (V),Radius (μm),v1 (mm/s),v2 (mm/s),Muatan q (×10⁻¹⁹ C),Koreksi qc (×10⁻¹⁹ C)\n';
  experimentalData.forEach((d) => {
    csv += `${d.trial},${d.voltage},${d.radius},${d.v1},${d.v2},${d.charge},${d.corrected}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `data_millikan_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

function exportToPDF() {
  if (!validateAnalysis()) {
    alert('Mohon lengkapi semua bagian analisis sebelum mengekspor laporan!');
    return;
  }

  window.location.href = 'pdf_preview.html';
}

function previewReport() {
  if (!validateAnalysis()) {
    alert('Mohon lengkapi semua bagian analisis untuk melihat pratinjau laporan!');
    return;
  }

  window.location.href = 'pdf_preview.html';
}

function validateAnalysis() {
  const methodology = document.getElementById('methodologyAnalysis')?.value || '';
  const results = document.getElementById('resultsInterpretation')?.value || '';
  const hypothesis = document.getElementById('hypothesisValidation')?.value || '';
  const error = document.getElementById('errorAnalysis')?.value || '';
  const conclusions = document.getElementById('conclusions')?.value || '';

  return (
    methodology.length >= 500 &&
    results.length >= 500 &&
    hypothesis.length >= 300 &&
    error.length >= 400 &&
    conclusions.length >= 300
  );
}

function setupCharacterCounters() {
  const textareas = [
    { id: 'methodologyAnalysis', counterId: 'methodologyCount', min: 500 },
    { id: 'resultsInterpretation', counterId: 'resultsCount', min: 500 },
    { id: 'hypothesisValidation', counterId: 'hypothesisCount', min: 300 },
    { id: 'errorAnalysis', counterId: 'errorCount', min: 400 },
    { id: 'conclusions', counterId: 'conclusionsCount', min: 300 },
  ];

  textareas.forEach(({ id, counterId, min }) => {
    const textarea = document.getElementById(id);
    const counter = document.getElementById(counterId);

    if (!textarea || !counter) return;

    textarea.addEventListener('input', () => {
      const length = textarea.value.length;
      counter.textContent = `${length} / ${min} karakter minimum`;

      if (length >= min) {
        counter.classList.remove('text-text-tertiary');
        counter.classList.add('text-success');
      } else {
        counter.classList.remove('text-success');
        counter.classList.add('text-text-tertiary');
      }
    });
  });
}

function saveAnalysisLocal() {
  const analysisData = {
    methodology: document.getElementById('methodologyAnalysis')?.value || '',
    results: document.getElementById('resultsInterpretation')?.value || '',
    hypothesis: document.getElementById('hypothesisValidation')?.value || '',
    error: document.getElementById('errorAnalysis')?.value || '',
    conclusions: document.getElementById('conclusions')?.value || '',
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem('millikan_analysis', JSON.stringify(analysisData));

  const btn = document.getElementById('saveAnalysisBtn');
  if (!btn) return;

  const originalText = btn.innerHTML;
  btn.innerHTML =
    '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Tersimpan!';
  btn.classList.add('bg-success', 'hover:bg-success-dark');

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.classList.remove('bg-success', 'hover:bg-success-dark');
  }, 2000);
}

function saveAnalysis() {
  const doSave = async () => {
    saveAnalysisLocal();
    try {
      await fetch('/api/milikan/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          kind: 'analysis',
          data: JSON.parse(localStorage.getItem('millikan_analysis') || '{}'),
        }),
      });
    } catch {
      // ignore network errors; local save already done
    }
  };

  if (window.Auth && window.Auth.requireLogin) {
    return window.Auth.requireLogin(
      {
        action: 'save_history',
        message: 'Untuk menyimpan hasil eksperimen, silakan login terlebih dahulu.',
      },
      () => {
        doSave();
      }
    );
  }

  return doSave();
}

function loadSavedAnalysis() {
  const saved = localStorage.getItem('millikan_analysis');
  if (!saved) return;

  const data = JSON.parse(saved);
  const map = {
    methodologyAnalysis: data.methodology || '',
    resultsInterpretation: data.results || '',
    hypothesisValidation: data.hypothesis || '',
    errorAnalysis: data.error || '',
    conclusions: data.conclusions || '',
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  document.querySelectorAll('.analysis-textarea').forEach((textarea) => {
    textarea.dispatchEvent(new Event('input'));
  });
}

function autoSave() {
  saveAnalysisLocal();
}

function saveProgressLocal() {
  const progressData = {
    experimentalData,
    analysis: {
      methodology: document.getElementById('methodologyAnalysis')?.value || '',
      results: document.getElementById('resultsInterpretation')?.value || '',
      hypothesis: document.getElementById('hypothesisValidation')?.value || '',
      error: document.getElementById('errorAnalysis')?.value || '',
      conclusions: document.getElementById('conclusions')?.value || '',
    },
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem('millikan_progress', JSON.stringify(progressData));

  const btn = document.getElementById('saveProgressBtn');
  if (!btn) return;

  const originalText = btn.innerHTML;
  btn.innerHTML =
    '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="font-caption">Tersimpan</span>';

  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 2000);
}

function saveProgress() {
  const doSave = async () => {
    saveProgressLocal();
    try {
      await fetch('/api/milikan/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          kind: 'progress',
          data: JSON.parse(localStorage.getItem('millikan_progress') || '{}'),
        }),
      });
    } catch {
      // ignore network errors; local save already done
    }
  };

  if (window.Auth && window.Auth.requireLogin) {
    return window.Auth.requireLogin(
      {
        action: 'save_history',
        message: 'Untuk menyimpan hasil eksperimen, silakan login terlebih dahulu.',
      },
      () => {
        doSave();
      }
    );
  }

  return doSave();
}

function sortTable(key) {
  const isAscending =
    experimentalData.length > 1 &&
    experimentalData[0][key] <= experimentalData[experimentalData.length - 1][key];
  experimentalData.sort((a, b) => (isAscending ? b[key] - a[key] : a[key] - b[key]));
  renderTableOrEmptyState();
}

function mean(arr) {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + Math.pow(x - m, 2), 0) / arr.length);
}

function quantile(sortedArr, q) {
  if (sortedArr.length === 0) return NaN;
  const pos = (sortedArr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedArr[base + 1] !== undefined) {
    return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
  }
  return sortedArr[base];
}

function agreementPercentFromChargeScaled(q_scaled) {
  const q_C = q_scaled * 1e-19;
  const e = constants.e;
  const n = Math.round(q_C / e);
  const q_theory = n * e;
  const percent = 100 * (1 - Math.abs(q_C - q_theory) / e);
  return Math.max(0, percent);
}

function buildChargeBinsLabels() {
  const charges = experimentalData.map((d) => d.corrected);
  if (charges.length === 0) return ['-', '-', '-', '-'];
  const min = Math.min(...charges);
  const max = Math.max(...charges);
  const width = (max - min) / 4 || 0.01;
  const labels = [];
  for (let i = 0; i < 4; i++) {
    const a = (min + i * width).toFixed(2);
    const b = (min + (i + 1) * width).toFixed(2);
    labels.push(`${a}-${b}`);
  }
  return labels;
}

function buildChargeBinsData() {
  const charges = experimentalData.map((d) => d.corrected);
  if (charges.length === 0) return [0, 0, 0, 0];
  const min = Math.min(...charges);
  const max = Math.max(...charges);
  const width = (max - min) / 4 || 0.01;
  const bins = [0, 0, 0, 0];
  charges.forEach((c) => {
    let idx = Math.floor((c - min) / width);
    if (idx < 0) idx = 0;
    if (idx > 3) idx = 3;
    bins[idx] += 1;
  });
  return bins;
}
