import { describe, expect, it } from 'vitest';
import {
  standingNodeCount,
  standingWave,
  superpose,
  wavelength,
} from '../../sim/waves';

describe('waves', () => {
  it('two in-phase sources reinforce at the midpoint', () => {
    const n = 101;
    const L = 10;
    const single = superpose(n, L, 0.13, [{ x: 2, amplitude: 0.2, frequency: 1 }]);
    const dual = superpose(n, L, 0.13, [
      { x: 2, amplitude: 0.2, frequency: 1 },
      { x: 8, amplitude: 0.2, frequency: 1 },
    ]);
    const mid = Math.round(((L / 2 - 2) / L) * (n - 1)); // equidistant point x=5
    expect(Math.abs(dual[mid])).toBeGreaterThan(Math.abs(single[mid]));
  });

  it('standing wave has nodes at both fixed ends', () => {
    const f = standingWave(121, 10, 0.31, 0.2, 1, 2);
    expect(Math.abs(f[0])).toBeLessThan(1e-9);
    expect(Math.abs(f[f.length - 1])).toBeLessThan(1e-9);
  });

  it('harmonic 2 → 3 nodes', () => {
    expect(standingNodeCount(2)).toBe(3);
  });

  it('λ = v/f', () => {
    expect(wavelength(1, 2)).toBeCloseTo(2, 10);
    expect(wavelength(2, 2)).toBeCloseTo(1, 10);
  });
});
