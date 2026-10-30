/**
 * Bench renderers — Canvas 2D 렌더러 (포물선·진자·용수철·파동).
 * 60fps / 500 트레일 포인트를 가볍게 그리기 위해 path 1회 stroke 위주로 작성.
 */
import type { TrajectoryPoint } from '../sim/projectile';
import {
  drawGroundRuler,
  drawPredictedMarker,
  drawTargetFlag,
  drawProtractor,
  type MeterScale,
} from './rulers';

// ---------- Projectile ----------

export interface ProjectileView {
  points: TrajectoryPoint[];
  progress: number; // 0..1 현재 애니메이션 위치
  predictedX: number | null;
  showTarget: boolean;
  angleDeg: number;
}

export function renderProjectile(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: ProjectileView,
): void {
  ctx.clearRect(0, 0, w, h);
  const pts = view.points;
  const maxX = Math.max(10, ...pts.map((p) => p.x), view.predictedX ?? 0, 14);
  const maxY = Math.max(5, ...pts.map((p) => p.y));
  const padL = 34;
  const padR = 16;
  const padT = 18;
  const groundY = h - 30;
  const pxPerMeter = Math.min(
    (w - padL - padR) / maxX,
    (groundY - padT) / maxY,
    40,
  );
  const scale: MeterScale = { pxPerMeter, originX: padL, originY: groundY };
  const X = (m: number) => scale.originX + m * pxPerMeter;
  const Y = (m: number) => groundY - m * pxPerMeter;

  drawGroundRuler(ctx, w, h, scale, maxX);
  drawProtractor(ctx, X(0), Y(0), 56, view.angleDeg);

  // 전체 궤적 (희미한 예정선)
  if (pts.length > 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(125,223,158,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = X(p.x);
      const py = Y(p.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 지금까지 날아간 궤적 (진한 선, 최대 500점 샘플)
  const upto = Math.max(2, Math.floor(pts.length * view.progress));
  const stride = Math.max(1, Math.ceil(upto / 500));
  ctx.save();
  ctx.strokeStyle = '#7ddf9e';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < upto; i += stride) {
    const px = X(pts[i].x);
    const py = Y(pts[i].y);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else ctx.lineTo(px, py);
  }
  // 마지막 점 정확히 연결
  const last = pts[upto - 1];
  if (last) ctx.lineTo(X(last.x), Y(last.y));
  ctx.stroke();
  ctx.restore();

  // 발사기 본체
  const bx = X(0);
  const by = Y(0);
  ctx.save();
  ctx.fillStyle = '#1e3327';
  ctx.strokeStyle = '#7ddf9e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 현재 공
  if (last && view.progress > 0 && view.progress < 1) {
    ctx.save();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(X(last.x), Y(last.y), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 착지점 마커 (완주 시) — 오른쪽 끝에 닿으면 안쪽으로 정렬
  if (view.progress >= 1 && pts.length > 1) {
    const end = pts[pts.length - 1];
    ctx.save();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(X(end.x), Y(0), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9f2ec';
    ctx.font = '12px system-ui, sans-serif';
    const nearRight = X(end.x) > w - 70;
    ctx.textAlign = nearRight ? 'right' : 'center';
    ctx.fillText(`${end.x.toFixed(2)} m`, nearRight ? X(end.x) - 8 : X(end.x), Y(0) - 12);
    ctx.restore();
  }

  if (view.predictedX != null && Number.isFinite(view.predictedX)) {
    drawPredictedMarker(ctx, X(view.predictedX), groundY, `예측 ${view.predictedX.toFixed(1)}m`);
  }
  if (view.showTarget) {
    drawTargetFlag(ctx, X(12), groundY, '표적 12m');
  }
}

// ---------- Pendulum ----------

export interface PendulumView {
  length: number; // m
  theta: number; // rad
  omega: number;
}

export function renderPendulum(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: PendulumView,
): void {
  ctx.clearRect(0, 0, w, h);
  const pivotX = w / 2;
  const pivotY = 56;
  const maxL = Math.max(0.3, view.length);
  const rodPx = Math.min(h - 130, 300, maxL * 160);
  const bobX = pivotX + Math.sin(view.theta) * rodPx;
  const bobY = pivotY + Math.cos(view.theta) * rodPx;

  // 각도 눈금 (라벨은 오른쪽에만 — 겹침 방지)
  ctx.save();
  ctx.strokeStyle = '#33523f';
  ctx.fillStyle = '#9db8a5';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let deg = -60; deg <= 60; deg += 15) {
    const a = (deg * Math.PI) / 180;
    const r1 = 34;
    const r2 = 42;
    ctx.beginPath();
    ctx.moveTo(pivotX + Math.sin(a) * r1, pivotY + Math.cos(a) * r1);
    ctx.lineTo(pivotX + Math.sin(a) * r2, pivotY + Math.cos(a) * r2);
    ctx.stroke();
    if (deg % 30 === 0 && deg >= 0) {
      ctx.fillText(
        `${deg}°`,
        pivotX + Math.sin(a) * 56,
        pivotY + Math.cos(a) * 56 + 3,
      );
    }
  }
  ctx.restore();

  // 지지대
  ctx.save();
  ctx.fillStyle = '#1e3327';
  ctx.fillRect(pivotX - 46, pivotY - 14, 92, 10);
  ctx.strokeStyle = '#3f6a4e';
  ctx.strokeRect(pivotX - 46, pivotY - 14, 92, 10);
  // 줄
  ctx.strokeStyle = '#e9f2ec';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY - 4);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  // 추
  const speed = Math.abs(view.omega);
  ctx.fillStyle = speed > 1.2 ? '#ffd166' : '#7ddf9e';
  ctx.beginPath();
  ctx.arc(bobX, bobY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0a1f10';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 길이 라벨
  ctx.fillStyle = '#9db8a5';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`실 길이 ${view.length.toFixed(2)} m`, pivotX, h - 18);
  ctx.restore();
}

// ---------- Spring ----------

export interface SpringView {
  x: number; // 변위 m
  x0: number;
}

export function renderSpring(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: SpringView,
): void {
  ctx.clearRect(0, 0, w, h);
  const midY = h / 2 - 10;
  const left = 30;
  const eqX = left + (w - 140) / 2;
  const scale = (w - 140) / 2 / Math.max(0.5, Math.abs(view.x0) * 1.4, 0.6);
  const massX = eqX + view.x * scale;

  // 평형선
  ctx.save();
  ctx.strokeStyle = '#33523f';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(eqX, 24);
  ctx.lineTo(eqX, h - 44);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#9db8a5';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('평형', eqX, h - 26);

  // 용수철 코일 (지그재그)
  ctx.strokeStyle = '#7ddf9e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const coils = 9;
  const x0 = left + 8;
  const x1 = massX - 20;
  ctx.moveTo(x0, midY);
  for (let i = 1; i < coils; i++) {
    const cx = x0 + ((x1 - x0) * i) / coils;
    const cy = midY + (i % 2 === 0 ? -16 : 16);
    ctx.lineTo(cx, cy);
  }
  ctx.lineTo(x1, midY);
  ctx.stroke();

  // 벽
  ctx.fillStyle = '#1e3327';
  ctx.fillRect(left - 12, midY - 44, 12, 88);

  // 추
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(massX - 20, midY - 24, 52, 48);
  ctx.strokeStyle = '#0a1f10';
  ctx.lineWidth = 2;
  ctx.strokeRect(massX - 20, midY - 24, 52, 48);
  ctx.fillStyle = '#0a1f10';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('m', massX + 6, midY + 4);

  // 변위 화살표
  if (Math.abs(view.x) > 0.005) {
    ctx.strokeStyle = '#7cc7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(eqX, midY + 44);
    ctx.lineTo(massX + 6, midY + 44);
    ctx.stroke();
    ctx.fillStyle = '#bfe3ff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`x = ${view.x >= 0 ? '+' : ''}${view.x.toFixed(2)} m`, (eqX + massX) / 2 + 6, midY + 60);
  }
  ctx.restore();
}

// ---------- Waves ----------

export interface WavesView {
  field: ArrayLike<number>;
  length: number; // 수조 길이 m
  maxAmp: number;
  mode: 'travel' | 'standing' | 'interference';
  sources: { x: number }[];
  nodeXs?: number[];
}

export function renderWaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: WavesView,
): void {
  ctx.clearRect(0, 0, w, h);
  const padL = 28;
  const padR = 20;
  const padT = 30;
  const tankH = h - padT - 46;
  const tankY = padT;
  const tankW = w - padL - padR;
  const X = (m: number) => padL + (m / view.length) * tankW;
  const midY = tankY + tankH / 2;
  const ampPx = (tankH / 2 - 8) / Math.max(0.05, view.maxAmp);

  // 수조
  ctx.save();
  ctx.fillStyle = 'rgba(124,199,255,0.07)';
  ctx.fillRect(padL, tankY, tankW, tankH);
  ctx.strokeStyle = '#3f6a4e';
  ctx.lineWidth = 2;
  ctx.strokeRect(padL, tankY, tankW, tankH);
  // 중앙선
  ctx.strokeStyle = 'rgba(51,82,63,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, midY);
  ctx.lineTo(padL + tankW, midY);
  ctx.stroke();

  // 파형 path (타입배열 순회 1회)
  ctx.strokeStyle = view.mode === 'standing' ? '#ffd166' : '#7cc7ff';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const n = view.field.length;
  for (let i = 0; i < n; i++) {
    const m = (i / (n - 1)) * view.length;
    const px = X(m);
    const py = midY - view.field[i] * ampPx;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 파원 마커
  ctx.fillStyle = '#ff8fa3';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const s of view.sources) {
    const px = X(s.x);
    ctx.beginPath();
    ctx.arc(px, tankY + tankH - 2, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffc9d4';
    ctx.fillText('파원', px, tankY + tankH + 16);
    ctx.fillStyle = '#ff8fa3';
  }

  // 정상파 마디
  if (view.nodeXs) {
    ctx.fillStyle = '#ffd166';
    for (const nx of view.nodeXs) {
      const px = X(nx);
      ctx.beginPath();
      ctx.arc(px, midY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`마디 ${view.nodeXs.length}개`, padL + tankW / 2, tankY - 10);
  }
  ctx.restore();
}
