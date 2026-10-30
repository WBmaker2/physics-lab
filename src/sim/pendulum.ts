/**
 * Pendulum bench physics — 진자 물리 (비선형 θ, 반암시적 오일러 120 Hz).
 */
import { FIXED_DT, detectPeriodRising } from './integrator';

export interface PendulumParams {
  length: number; // m
  gravity: number; // m/s²
  mass: number; // kg (에너지 표시용)
  theta0Deg: number; // 초기 각도
  damping?: number; // 감쇠 계수 (1/s)
}

export interface PendulumSample {
  t: number;
  theta: number;
  omega: number;
  ke: number;
  pe: number;
}

export interface PendulumResult {
  samples: PendulumSample[];
  measuredPeriod: number | null;
  theoryPeriod: number;
  errorPct: number | null;
}

/** 이론식 T = 2π√(L/g) */
export function pendulumTheoryPeriod(length: number, gravity: number): number {
  if (length <= 0 || gravity <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(length / gravity);
}

export function simulatePendulum(
  params: PendulumParams,
  duration = 12,
  dt: number = FIXED_DT,
): PendulumResult {
  const { length: L, gravity: g, mass: m, theta0Deg, damping = 0 } = params;
  const theta0 = (theta0Deg * Math.PI) / 180;
  let theta = theta0;
  let omega = 0;
  let t = 0;
  const samples: PendulumSample[] = [];
  const times: number[] = [];
  const thetas: number[] = [];

  const steps = Math.max(1, Math.round(duration / dt));
  for (let i = 0; i <= steps; i++) {
    const v = L * omega;
    const ke = 0.5 * m * v * v;
    const pe = m * g * L * (1 - Math.cos(theta));
    samples.push({ t, theta, omega, ke, pe });
    times.push(t);
    thetas.push(theta);
    // 반암시적 오일러
    const alpha = -(g / L) * Math.sin(theta) - damping * omega;
    omega = omega + alpha * dt;
    theta = theta + omega * dt;
    t = t + dt;
  }

  // 평형점(0) 기준 상승 영점교차 → 주기. 초기값이 0 근처면 감지용으로 미소 진동 대신
  // theta - 평균 제거 없이 그대로 사용 (초기각>0에서 시작하면 첫 하강 후 상승 교차가 잡힘)
  const measuredPeriod = detectPeriodRising(times, thetas);
  const theoryPeriod = pendulumTheoryPeriod(L, g);
  const errorPct =
    measuredPeriod == null || theoryPeriod === 0
      ? null
      : (Math.abs(measuredPeriod - theoryPeriod) / theoryPeriod) * 100;
  return { samples, measuredPeriod, theoryPeriod, errorPct };
}
