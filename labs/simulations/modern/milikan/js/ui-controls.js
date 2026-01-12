const steps = [
  { id: 'preliminary', label: 'Stage 0' },
  { id: 'stage-1', label: 'Stage 1' },
  { id: 'stage-2', label: 'Stage 2' },
  { id: 'stage-3', label: 'Stage 3' },
  { id: 'stage-4', label: 'Stage 4' },
  { id: 'post-test', label: 'Post-test' },
];

export const uiControls = {
  renderStepper: (current) => {
    const stepper = document.getElementById('stepper');
    if (!stepper) return;
    stepper.innerHTML = '';
    steps.forEach((step) => {
      const el = document.createElement('span');
      el.className = `step ${current === step.id ? 'active' : ''}`;
      el.textContent = step.label;
      stepper.appendChild(el);
    });
  },
};
