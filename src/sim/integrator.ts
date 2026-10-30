/**
 * Fixed-timestep integration helpers + deterministic RNG.
 * 고정 스텝 적분 도우미 + 결정적 난수 (교사 시연 재현용).
 */

/** Physics substep: 120 Hz — 반암시적 오일러용 기본 스텝. */
export const FIXED_DT = 1 / 120;

/**
 * Seeded RNG (mulberry32). 같은 seed → 같은 수열이 보장되어
 * 교사 시연이 항상 동일하게 재현된다.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run `step(h)` in fixed substeps that sum to `totalDt`.
 * 남는 시간은 버리지 않고 마지막 스텝에 합치지 않는다 — 항상 h 이하로 쪼갠다.
 */
export function substepLoop(totalDt: number, h: number, step: (h: number) => void): void {
  let remaining = totalDt;
  while (remaining > 1e-12) {
    const dt = Math.min(h, remaining);
    step(dt);
    remaining -= dt;
  }
}

/**
 * Zero-crossing period detection (rising edge, 선형 보간).
 * 진자·용수철 주기 측정에 공통 사용. 주기를 못 찾으면 null.
 */
export function detectPeriodRising(
  times: ArrayLike<number>,
  values: ArrayLike<number>,
): number | null {
  const crossings: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    if (prev < 0 && cur >= 0) {
      const t0 = times[i - 1];
      const t1 = times[i];
      const frac = cur === prev ? 0 : (0 - prev) / (cur - prev);
      crossings.push(t0 + frac * (t1 - t0));
      if (crossings.length >= 3) break;
    }
  }
  if (crossings.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < crossings.length; i++) intervals.push(crossings[i] - crossings[i - 1]);
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

/** Peak detector — 파형 마루 검출 (간단한 지역 최대값). */
export function findPeaks(values: ArrayLike<number>): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && values[i] >= values[i + 1]) peaks.push(i);
  }
  return peaks;
}
