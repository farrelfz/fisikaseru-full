import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';

const outputDir = new URL('./generated/', import.meta.url);

const latexTemplate = ({ payload }) => {
  const { prelim, runs, interpretation, discussion, conclusion } = payload;
  const rows = runs
    .map((run, i) => `${i + 1} & ${run.tDown.toFixed(4)} & ${run.tUp.toFixed(4)} & ${run.charge.toExponential(3)} \\`)
    .join('\n');
  return `\\documentclass{article}
\\usepackage{booktabs}
\\usepackage{geometry}
\\geometry{margin=1in}
\\begin{document}
\\section*{Laporan Praktikum Milikan}
\\textbf{Nama:} ${prelim?.name || '-'}\\\\
\\textbf{ID/Kelas:} ${prelim?.studentId || '-'}\\\\
\\section*{Data}
\\begin{tabular}{llll}
\\toprule
Run & t\\_down (s) & t\\_up (s) & q (C) \\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
\\section*{Interpretasi}
${interpretation || ''}
\\section*{Diskusi}
${discussion || ''}
\\section*{Kesimpulan}
${conclusion || ''}
\\section*{Disclaimer}
Simulasi memiliki keterbatasan dan digunakan untuk pembelajaran.
\\end{document}`;
};

const findLatexEngine = () => {
  const engines = ['tectonic', 'latexmk'];
  for (const engine of engines) {
    const result = spawnSync('which', [engine]);
    if (result.status === 0) return engine;
  }
  return null;
};

export const generatePdf = async (payload) => {
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `laporan-${Date.now()}.tex`;
  const texPath = path.join(outputDir.pathname, filename);
  const pdfPath = texPath.replace('.tex', '.pdf');
  await fs.writeFile(texPath, latexTemplate({ payload }));
  const engine = findLatexEngine();
  if (!engine) {
    throw new Error('Latex engine not available');
  }
  if (engine === 'tectonic') {
    spawnSync('tectonic', ['-X', 'compile', texPath], { stdio: 'ignore' });
  } else {
    spawnSync('latexmk', ['-pdf', '-interaction=nonstopmode', texPath], { stdio: 'ignore' });
  }
  return { pdfPath, filename: path.basename(pdfPath) };
};
