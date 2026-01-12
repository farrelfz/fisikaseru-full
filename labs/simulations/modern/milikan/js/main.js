import { experimentGate } from '../../../../../public/js/core/experiment-gate.js';
import { dataAnalysis } from '../../../../../public/js/core/data-analysis.js';
import { mathUtils } from '../../../../../public/js/core/math-utils.js';
import { storage } from './storage.js';
import { state } from './state.js';
import { physicsAdapter } from './physics.js';
import { uiControls } from './ui-controls.js';
import { renderer2D } from './renderer2D.js';

const stage = document.body.dataset.stage;
uiControls.renderStepper(stage);

const getPrelim = () => experimentGate.read(state.getUserId(), state.simKey);

const renderTable = (rows) => {
  const tbody = document.querySelector('#run-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((run, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${mathUtils.round(run.tDown, 4)}</td>
      <td>${mathUtils.round(run.tUp, 4)}</td>
      <td>${mathUtils.round(run.vDown, 6)}</td>
      <td>${mathUtils.round(run.vUp, 6)}</td>
      <td>${mathUtils.round(run.electricField, 2)}</td>
      <td>${mathUtils.round(run.radius, 8)}</td>
      <td>${mathUtils.round(run.charge, 22)}</td>
    `;
    tbody.appendChild(tr);
  });
};

const renderAnalysisTable = (rows) => {
  const tbody = document.querySelector('#analysis-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach((run, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${mathUtils.round(run.tDown, 4)}</td>
      <td>${mathUtils.round(run.tUp, 4)}</td>
      <td>${mathUtils.round(run.vDown, 6)}</td>
      <td>${mathUtils.round(run.vUp, 6)}</td>
      <td>${mathUtils.round(run.charge, 22)}</td>
    `;
    tbody.appendChild(tr);
  });
};

const renderStats = (runs) => {
  const statsList = document.getElementById('stats-list');
  if (!statsList) return;
  const charges = runs.map((r) => r.charge);
  const velocities = runs.map((r) => r.vDown);
  statsList.innerHTML = `
    <li>Jumlah run: ${runs.length}</li>
    <li>Rata-rata q: ${mathUtils.round(mathUtils.mean(charges), 22)} C</li>
    <li>Simpangan baku q: ${mathUtils.round(mathUtils.stddev(charges), 22)} C</li>
    <li>Rata-rata v↓: ${mathUtils.round(mathUtils.mean(velocities), 6)} m/s</li>
  `;
};

const plotPoints = (canvas, points) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  if (!points.length) return;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 20;
  points.forEach((p) => {
    const px = pad + ((p.x - minX) / (maxX - minX || 1)) * (canvas.width - pad * 2);
    const py = canvas.height - pad - ((p.y - minY) / (maxY - minY || 1)) * (canvas.height - pad * 2);
    ctx.beginPath();
    ctx.fillStyle = '#3b82f6';
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  });
};

const handlePrelim = () => {
  const submit = document.getElementById('prelim-submit');
  if (!submit) return;
  submit.addEventListener('click', () => {
    const checks = Array.from(document.querySelectorAll('.prelim-check'));
    const allChecked = checks.every((c) => c.checked);
    const name = document.getElementById('student-name').value.trim();
    const studentId = document.getElementById('student-id').value.trim();
    if (!allChecked || !name || !studentId) {
      alert('Lengkapi checklist dan identitas terlebih dahulu.');
      return;
    }
    const uid = `${studentId}`;
    state.setUserId(uid);
    experimentGate.complete(uid, state.simKey, { name, studentId, completedAt: Date.now() });
    window.location.href = 'stage-2.html';
  });
};

const handleStage2 = async () => {
  const gate = getPrelim();
  if (!gate) {
    alert('Stage 0 belum selesai.');
    window.location.href = 'preliminary.html';
    return;
  }
  const runButton = document.getElementById('run-sim');
  const clearButton = document.getElementById('clear-runs');
  const canvas = document.getElementById('sim-canvas');
  renderer2D.drawDroplet(canvas, 0.2);
  const refresh = async () => {
    const runs = await storage.getRuns(state.simKey);
    renderTable(runs);
  };
  runButton.addEventListener('click', async () => {
    const params = {
      rhoOil: Number(document.getElementById('input-density').value),
      voltage: Number(document.getElementById('input-voltage').value),
      plateDistance: Number(document.getElementById('input-distance').value),
      fallDistance: Number(document.getElementById('input-fall').value),
      riseDistance: Number(document.getElementById('input-rise').value),
    };
    const run = physicsAdapter.simulateRun(params);
    await storage.addRun({ ...run, simKey: state.simKey });
    renderer2D.drawDroplet(canvas, Math.random());
    refresh();
  });
  clearButton.addEventListener('click', async () => {
    await storage.clearRuns(state.simKey);
    refresh();
  });
  refresh();
};

const handleStage3 = async () => {
  const runs = await storage.getRuns(state.simKey);
  renderStats(runs);
  renderAnalysisTable(runs);
  const charges = runs.map((r) => r.charge);
  const eResult = dataAnalysis.linearizeCharge(charges);
  const eEstimate = document.getElementById('e-estimate');
  if (eEstimate) {
    eEstimate.textContent = `${mathUtils.round(eResult.eEstimate, 22)} C`;
  }
  const multiplesList = document.getElementById('multiples-list');
  if (multiplesList) {
    multiplesList.textContent = `Kelipatan: ${eResult.multiples.join(', ')}`;
  }
  plotPoints(document.getElementById('plot-main'), runs.map((run, i) => ({ x: i + 1, y: run.charge })));
  plotPoints(document.getElementById('plot-linear'), runs.map((run) => ({ x: run.vDown, y: run.charge })));
  const residuals = dataAnalysis.residuals(
    runs.map((run) => run.vDown),
    runs.map((run) => run.charge),
    dataAnalysis.weightedLinearFit(runs.map((run) => run.vDown), runs.map((run) => run.charge))
  );
  plotPoints(document.getElementById('plot-residual'), residuals.map((res, i) => ({ x: i + 1, y: res })));
};

const handleStage4 = async () => {
  const reportTemplate = document.getElementById('report-template');
  const runs = await storage.getRuns(state.simKey);
  const prelim = getPrelim();
  if (reportTemplate) {
    reportTemplate.innerHTML = `
      <p><strong>Identitas:</strong> ${prelim?.name || '-'} (${prelim?.studentId || '-'})</p>
      <p><strong>Jumlah run:</strong> ${runs.length}</p>
      <p><strong>Ringkasan data:</strong> q rata-rata = ${mathUtils.round(mathUtils.mean(runs.map((r) => r.charge)), 22)} C</p>
      <p><strong>Plot:</strong> lihat Stage 3 untuk grafik.</p>
    `;
  }
  const exportButton = document.getElementById('export-pdf');
  const saveButton = document.getElementById('save-history');
  const status = document.getElementById('export-status');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const response = await fetch(`${state.apiBase}/api/history`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simKey: state.simKey,
          summary: `Run: ${runs.length}, q avg: ${mathUtils.round(mathUtils.mean(runs.map((r) => r.charge)), 22)} C`,
        }),
      });
      status.textContent = response.ok ? 'Tersimpan di dashboard.' : 'Login diperlukan untuk menyimpan.';
    });
  }
  exportButton.addEventListener('click', async () => {
    status.textContent = 'Memproses ekspor...';
    const payload = {
      simKey: state.simKey,
      prelim,
      runs,
      interpretation: document.getElementById('report-interpretation').value,
      discussion: document.getElementById('report-discussion').value,
      conclusion: document.getElementById('report-conclusion').value,
    };
    const response = await fetch(`${state.apiBase}/api/pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      status.textContent = 'Login diperlukan atau terjadi kesalahan.';
      return;
    }
    const data = await response.json();
    status.textContent = `PDF siap: ${data.filename}`;
  });
};

const handlePostTest = () => {
  const submit = document.getElementById('posttest-submit');
  const feedback = document.getElementById('posttest-feedback');
  submit.addEventListener('click', () => {
    feedback.textContent = 'Terima kasih. Bandingkan jawaban Anda dengan model dan diskusikan deviasi.';
  });
};

if (stage === 'preliminary') handlePrelim();
if (stage === 'stage-2') handleStage2();
if (stage === 'stage-3') handleStage3();
if (stage === 'stage-4') handleStage4();
if (stage === 'post-test') handlePostTest();
