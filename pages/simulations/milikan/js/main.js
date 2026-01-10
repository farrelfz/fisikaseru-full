import './state.js';
import './physics.js';
import './storage.js';

(async () => {
  // Stage-2 bootstrap (guarded)
  if (document.getElementById('btnStart') && document.getElementById('chamber3D')) {
    const { initStage2 } = await import('./ui-controls.js');
    initStage2();
  }

  // Stage-3 bootstrap (guarded)
  if (document.getElementById('chargeDistributionChart') && document.getElementById('dataTableBody')) {
    const { initStage3 } = await import('./stage-3.js');
    initStage3();
  }
})();
