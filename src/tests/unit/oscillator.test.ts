import { describe, expect, it } from 'vitest';
import { pendulumTheoryPeriod, simulatePendulum } from '../../sim/pendulum';
import { simulateSpring, springTheoryPeriod } from '../../sim/spring';
import { detectPeriodRising, mulberry32 } from '../../sim/integrator';

describe('pendulum', () => {
  it('measured period matches 2π√(L/g) within 2%', () => {
    const res = simulatePendulum({ length: 1, gravity: 9.8, mass: 1, theta0Deg: 15 });
    expect(res.theoryPeriod).toBeCloseTo(pendulumTheoryPeriod(1, 9.8), 10);
    expect(res.measuredPeriod).not.toBeNull();
    expect(res.errorPct).not.toBeNull();
    expect(res.errorPct as number).toBeLessThan(2);
  });

  it('longer string → longer period', () => {
    const short = simulatePendulum({ length: 0.5, gravity: 9.8, mass: 1, theta0Deg: 15 });
    const long = simulatePendulum({ length: 2, gravity: 9.8, mass: 1, theta0Deg: 15 });
    expect((long.measuredPeriod as number) / (short.measuredPeriod as number)).toBeCloseTo(2, 0);
  });
});

describe('spring', () => {
  it('measured period matches 2π√(m/k) within 2%', () => {
    const res = simulateSpring({ mass: 0.5, k: 20, x0: 0.2 });
    expect(res.theoryPeriod).toBeCloseTo(springTheoryPeriod(0.5, 20), 10);
    expect(res.measuredPeriod).not.toBeNull();
    expect(res.errorPct as number).toBeLessThan(2);
  });
});

describe('integrator', () => {
  it('seeded RNG reproduces the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('zero-crossing detects a 2 s sine period', () => {
    const times: number[] = [];
    const vals: number[] = [];
    for (let i = 0; i <= 1200; i++) {
      const t = i / 120;
      times.push(t);
      vals.push(Math.sin(Math.PI * t));
    }
    expect(detectPeriodRising(times, vals)).toBeCloseTo(2, 1);
  });
});
