const steps = ['preliminary', 'stage-1', 'stage-2', 'stage-3', 'stage-4', 'post-test'];
export const uiControls = {
  renderStepper: (current) => {
    const stepper = document.getElementById('stepper');
    if (!stepper) return;
    stepper.innerHTML = '';
    steps.forEach((step) => {
      const el = document.createElement('span');
      el.className = `step ${current === step ? 'active' : ''}`;
      el.textContent = step;
      stepper.appendChild(el);
    });
  },
};
