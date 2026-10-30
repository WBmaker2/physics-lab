/** Bottom graph strip — 가벼운 Canvas 라인 차트 (의존성 없음). */
import { fitCanvas } from '../canvas/rulers';

export interface Series {
  label: string;
  color: string;
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
}

/** 1~2개 계열 라인 차트 + 범례 + 축 라벨. */
export function drawLineChart(
  canvas: HTMLCanvasElement,
  series: Series[],
  opts: { title: string; yUnit: string },
): void {
  const { w, h } = fitCanvas(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  const padL = 44;
  const padR = 10;
  const padT = 26;
  const padB = 22;
  const iw = Math.max(10, w - padL - padR);
  const ih = Math.max(10, h - padT - padB);

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMax = 0;
  let yMin = 0;
  for (const s of series) {
    for (let i = 0; i < s.xs.length; i++) {
      const x = s.xs[i];
      const y = s.ys[i];
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  if (!Number.isFinite(xMin) || xMax <= xMin) {
    xMin = 0;
    xMax = 1;
  }
  if (yMax <= 0) yMax = 1;
  const yPad = (yMax - yMin) * 0.08 || 0.5;
  yMax += yPad;

  const X = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * iw;
  const Y = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * ih;

  ctx.save();
  // 테두리 + 격자
  ctx.strokeStyle = '#1e3327';
  ctx.strokeRect(padL, padT, iw, ih);
  ctx.strokeStyle = 'rgba(51,82,63,0.5)';
  ctx.fillStyle = '#9db8a5';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let g = 0; g <= 3; g++) {
    const yv = yMin + ((yMax - yMin) * g) / 3;
    const py = Y(yv);
    ctx.beginPath();
    ctx.moveTo(padL, py);
    ctx.lineTo(padL + iw, py);
    ctx.stroke();
    ctx.fillText(`${yv.toFixed(1)}`, padL - 5, py + 3);
  }
  ctx.textAlign = 'center';
  ctx.fillText(`${xMax.toFixed(1)} s`, padL + iw - 14, h - 6);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e9f2ec';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${opts.title} (${opts.yUnit})`, padL, 15);

  // 계열
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const stride = Math.max(1, Math.floor(s.xs.length / 600));
    let started = false;
    for (let i = 0; i < s.xs.length; i += stride) {
      const px = X(s.xs[i]);
      const py = Y(s.ys[i]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // 범례
  let lx = padL + 8;
  ctx.font = '11px system-ui, sans-serif';
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(padL + 4 + (lx - padL - 4) * 0 + (lx - (padL + 4)), padT + 5, 14, 3);
    ctx.fillStyle = '#e9f2ec';
    ctx.fillText(s.label, lx + 18, padT + 10);
    lx += ctx.measureText(s.label).width + 44;
  }
  ctx.restore();
}
