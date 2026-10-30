/**
 * Wave tank physics — 파동 수조.
 * JS 타입배열(Float64Array) 중첩 합산 + 두 파원 거리함수 간섭 + 고정단 정상파.
 */

export interface WaveSource {
  x: number; // 파원 위치 (m)
  amplitude: number; // m
  frequency: number; // Hz
  phase?: number; // rad
}

export const DEFAULT_WAVE_SPEED = 2; // m/s (수조 개념 모형)

export function wavelength(frequency: number, speed: number = DEFAULT_WAVE_SPEED): number {
  if (frequency <= 0 || speed <= 0) return 0;
  return speed / frequency;
}

/**
 * 진행파 중첩: y(x,t) = Σ A·sin(k·|x−xs| − ωt + φ)
 * 두 점파원의 간섭은 거리함수 |x−xs| 로 자연스럽게 구현된다.
 */
export function superpose(
  n: number,
  length: number,
  t: number,
  sources: WaveSource[],
  speed: number = DEFAULT_WAVE_SPEED,
): Float64Array {
  const out = new Float64Array(n);
  if (n < 2) return out;
  const dx = length / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = i * dx;
    let y = 0;
    for (const s of sources) {
      if (s.frequency <= 0) continue;
      const k = (2 * Math.PI * s.frequency) / speed;
      const omega = 2 * Math.PI * s.frequency;
      y += s.amplitude * Math.sin(k * Math.abs(x - s.x) - omega * t + (s.phase ?? 0));
    }
    out[i] = y;
  }
  return out;
}

/**
 * 고정단 정상파: y(x,t) = 2A·sin(n·π·x/L)·cos(ωt), n = 배음수.
 * 양 끝 마디 고정.
 */
export function standingWave(
  n: number,
  length: number,
  t: number,
  amplitude: number,
  frequency: number,
  harmonic = 1,
): Float64Array {
  const out = new Float64Array(n);
  if (n < 2 || frequency <= 0) return out;
  const dx = length / (n - 1);
  const omega = 2 * Math.PI * frequency;
  for (let i = 0; i < n; i++) {
    const x = i * dx;
    out[i] = 2 * amplitude * Math.sin((harmonic * Math.PI * x) / length) * Math.cos(omega * t);
  }
  return out;
}

/** 정상파 마디 개수 (고정단, 배음수 harmonic → 마디 = harmonic + 1) */
export function standingNodeCount(harmonic: number): number {
  return Math.max(2, Math.floor(harmonic) + 1);
}
