/**
 * Projectile bench physics — 포물선 발사기 물리.
 * Semi-implicit Euler at 120 Hz + analytic formula for error comparison.
 */
import { FIXED_DT } from './integrator';

export const GRAVITIES = {
  earth: 9.8,
  moon: 1.62,
  mars: 3.71,
} as const;

export type GravityKey = keyof typeof GRAVITIES;

export const GRAVITY_LABEL: Record<GravityKey, string> = {
  earth: '지구 (9.8 m/s²)',
  moon: '달 (1.62 m/s²)',
  mars: '화성 (3.71 m/s²)',
};

export interface ProjectileParams {
  angleDeg: number;
  speed: number;
  mass: number;
  gravity: number;
  startHeight?: number;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface ProjectileResult {
  points: TrajectoryPoint[];
  range: number;
  flightTime: number;
  maxHeight: number;
  analyticRange: number;
  errorPct: number;
}

/** 이론식 R = v²·sin2θ/g (h=0). h>0이면 2차방정식 해. */
export function analyticRange(
  speed: number,
  angleDeg: number,
  gravity: number,
  startHeight = 0,
): number {
  const th = (angleDeg * Math.PI) / 180;
  const vx = speed * Math.cos(th);
  const vy = speed * Math.sin(th);
  if (gravity <= 0) return 0;
  if (startHeight <= 0) return (speed * speed * Math.sin(2 * th)) / gravity;
  const t = (vy + Math.sqrt(vy * vy + 2 * gravity * startHeight)) / gravity;
  return vx * t;
}

/**
 * 수치 시뮬레이션 — 반암시적 오일러(속도 먼저 갱신), 지면 충돌은 선형 보간.
 * 질량은 진공에서 궤적에 영향을 주지 않는다 (수업 포인트로 UI에 명시).
 */
export function simulateProjectile(
  params: ProjectileParams,
  dt: number = FIXED_DT,
  maxT = 60,
): ProjectileResult {
  const { angleDeg, speed, gravity } = params;
  const h0 = params.startHeight ?? 0;
  const th = (angleDeg * Math.PI) / 180;
  let x = 0;
  let y = h0;
  const vx = speed * Math.cos(th);
  let vy = speed * Math.sin(th);
  let t = 0;
  let maxHeight = y;
  const points: TrajectoryPoint[] = [{ t: 0, x, y, vx, vy }];

  // 위로 발사했는데 바로 끝나지 않도록 최소 한 스텝은 진행
  while (t < maxT) {
    vy = vy - gravity * dt; // 반암시적: 속도 먼저
    x = x + vx * dt;
    y = y + vy * dt;
    t = t + dt;
    if (y > maxHeight) maxHeight = y;
    if (y <= 0 && vy < 0) {
      // 선형 보간으로 착지점 보정
      const prev = points[points.length - 1];
      const frac = prev.y / (prev.y - y);
      const landT = prev.t + frac * dt;
      const landX = prev.x + frac * (x - prev.x);
      points.push({ t: landT, x: landX, y: 0, vx, vy });
      x = landX;
      t = landT;
      break;
    }
    points.push({ t, x, y, vx, vy });
  }

  const analytic = analyticRange(speed, angleDeg, gravity, h0);
  const errorPct = analytic === 0 ? 0 : (Math.abs(x - analytic) / analytic) * 100;
  return { points, range: x, flightTime: t, maxHeight, analyticRange: analytic, errorPct };
}

/** 예측-발사 오차: |예측−실측| */
export function predictionError(predictedM: number, actualM: number): number {
  return Math.abs(predictedM - actualM);
}
