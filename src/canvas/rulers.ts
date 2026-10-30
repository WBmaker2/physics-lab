/**
 * On-canvas measurement tools — 자·각도기·격자 (측정 도구).
 * 모든 함수는 devicePixel-independent CSS 픽셀 좌표계를 가정한다.
 */

export interface MeterScale {
  pxPerMeter: number;
  originX: number;
  originY: number; // ground line (y=0)
}

const INK = '#33523f';
const TICK = '#3f6a4e';
const LABEL = '#9db8a5';

/** 지면 격자 + 미터 눈금 (x축). 적응형 간격: 1/2/5/10m. */
export function drawGroundRuler(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: MeterScale,
  maxMeters: number,
): void {
  const candidates = [1, 2, 5, 10, 20, 50];
  const targetPx = 70;
  let step = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (c * scale.pxPerMeter >= targetPx) {
      step = c;
      break;
    }
  }
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = LABEL;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1;
  // ground line
  ctx.beginPath();
  ctx.moveTo(0, scale.originY + 0.5);
  ctx.lineTo(w, scale.originY + 0.5);
  ctx.stroke();
  for (let m = 0; m <= maxMeters + step; m += step) {
    const px = scale.originX + m * scale.pxPerMeter;
    if (px > w + 4) break;
    // faint vertical grid
    ctx.strokeStyle = 'rgba(51,82,63,0.35)';
    ctx.beginPath();
    ctx.moveTo(px, 8);
    ctx.lineTo(px, Math.min(h, scale.originY));
    ctx.stroke();
    // tick
    ctx.strokeStyle = TICK;
    ctx.beginPath();
    ctx.moveTo(px, scale.originY);
    ctx.lineTo(px, scale.originY + 7);
    ctx.stroke();
    ctx.fillText(`${m}m`, px, Math.min(h, scale.originY + 20));
  }
  ctx.restore();
}

/** 발사점 기준 각도기 (0~90°, 15° 간격). */
export function drawProtractor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  currentDeg: number,
): void {
  ctx.save();
  ctx.strokeStyle = TICK;
  ctx.fillStyle = LABEL;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1;
  for (let deg = 0; deg <= 90; deg += 15) {
    const a = (-deg * Math.PI) / 180;
    const x1 = cx + Math.cos(a) * (radius - 8);
    const y1 = cy + Math.sin(a) * (radius - 8);
    const x2 = cx + Math.cos(a) * radius;
    const y2 = cy + Math.sin(a) * radius;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (deg % 30 !== 0) continue;
    const lx = cx + Math.cos(a) * (radius + 13);
    const ly = cy + Math.sin(a) * (radius + 13) + 3;
    ctx.fillText(`${deg}°`, lx, ly);
  }
  // 현재 각도 강조선
  const ca = (-currentDeg * Math.PI) / 180;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ca) * radius, cy + Math.sin(ca) * radius);
  ctx.stroke();
  ctx.restore();
}

/** 착지 예측 마커 (파란 다이아몬드). */
export function drawPredictedMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
): void {
  ctx.save();
  ctx.fillStyle = '#7cc7ff';
  ctx.strokeStyle = '#0a1f10';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x + 7, y);
  ctx.lineTo(x, y + 9);
  ctx.lineTo(x - 7, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#bfe3ff';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - 13);
  ctx.restore();
}

/** 표적 깃발 (도전 카드용). */
export function drawTargetFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  label: string,
): void {
  ctx.save();
  ctx.strokeStyle = '#ff8fa3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - 34);
  ctx.stroke();
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath();
  ctx.moveTo(x, groundY - 34);
  ctx.lineTo(x + 22, groundY - 28);
  ctx.lineTo(x, groundY - 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffc9d4';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 11, groundY + 20);
  ctx.restore();
}

/** 캔버스 DPR 대응 리사이즈. CSS 픽셀 크기를 반환한다. */
export function fitCanvas(canvas: HTMLCanvasElement): { w: number; h: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(80, Math.round(rect.width));
  const h = Math.max(80, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
