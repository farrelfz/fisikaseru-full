// UI controls helpers (placeholder)
// Intended: consistent binding of sliders, toggles, validation states.
window.FSControls = {
  bindNumberInput(input, onChange) {
    input.addEventListener('input', () => onChange(Number(input.value)));
  },
};
