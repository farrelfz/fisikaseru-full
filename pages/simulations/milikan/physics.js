// Compatibility shim.
// Prefer including:
//   ./js/state.js
//   ./js/physics.js
//   ./js/storage.js
// directly from Millikan stage pages.

(function () {
  'use strict';

  if (window.Physics && window.Physics.computeField) return;

  function loadScript(src, onload) {
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = onload || null;
    document.head.appendChild(s);
  }

  // Ensure constants are defined before physics is evaluated.
  loadScript('./js/state.js', function () {
    loadScript('./js/physics.js');
  });
})();
