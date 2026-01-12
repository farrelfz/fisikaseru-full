export const renderer2D = {
  drawDroplet: (canvas, progress = 0.5) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    const y = 20 + progress * (canvas.height - 40);
    ctx.beginPath();
    ctx.fillStyle = '#3b82f6';
    ctx.arc(canvas.width / 2, y, 8, 0, Math.PI * 2);
    ctx.fill();
  },
};
