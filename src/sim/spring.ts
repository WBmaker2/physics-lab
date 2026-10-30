/**
 * Spring bench physics — 용수철 진동 물리 (감쇠 포함, 120 Hz 반암시적 오일러).
 */
import { FIXED_DT, detectPeriodRising } from './integrator';

export interface SpringParams {
  mass: number; // kg
  k: number; // N/m
  x0: number; // m (초기 변위)
  damping?: number; // 1/s
}

export interface SpringSample {
  t: number;
  x: number;
  v: number;
  ke: number;
  pe: number;
}

export interface SpringResult {
  samples: SpringSample[];
  measuredPeriod: number | null;
  theoryPeriod: number;
  errorPct: number | null;
}

/** 이론식 T = 2π√(m/k) */
export function springTheoryPeriod(mass: number, k: number): number {
  if (mass <= 0 || k <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(mass / k);
}

export function simulateSpring(
  params: SpringParams,
  duration = 12,
  dt: number = FIXED_DT,
): SpringResult {
  const { mass: m, k, x0, damping = 0 } = params;
  let x = x0;
  let v = 0;
  let t = 0;
  const samples: SpringSample[] = [];
  const times: number[] = [];
  const xs: number[] = [];

  const steps = Math.max(1, Math.round(duration / dt));
  for (let i = 0; i <= steps; i++) {
    const ke = 0.5 * m * v * v;
    const pe = 0.5 * k * x * x;
    samples.push({ t, x, v, ke, pe });
    times.push(t);
    xs.push(x);
    const a = -(k / m) * x - damping * v;
    v = v + a * dt;
    x = x + v * dt;
    t = t + dt;
  }

  const measuredPeriod = detectPeriodRising(times, xs);
  const theoryPeriod = springTheoryPeriod(m, k);
  const errorPct =
    measuredPeriod == null || theoryPeriod === 0
      ? null
      : (Math.abs(measuredPeriod - theoryPeriod) / theoryPeriod) * 100;
  return { samples, measuredPeriod, theoryPeriod, errorPct };
}
