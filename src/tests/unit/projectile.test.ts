import { describe, expect, it } from 'vitest';
import {
  analyticRange,
  GRAVITIES,
  simulateProjectile,
} from '../../sim/projectile';

describe('projectile', () => {
  it('45° gives max range at the same speed (지구)', () => {
    const speed = 15;
    const g = GRAVITIES.earth;
    const r30 = simulateProjectile({ angleDeg: 30, speed, mass: 1, gravity: g }).range;
    const r45 = simulateProjectile({ angleDeg: 45, speed, mass: 1, gravity: g }).range;
    const r60 = simulateProjectile({ angleDeg: 60, speed, mass: 1, gravity: g }).range;
    expect(r45).toBeGreaterThan(r30);
    expect(r45).toBeGreaterThan(r60);
  });

  it('Moon gravity lands ~6× farther than Earth', () => {
    const base = { angleDeg: 45, speed: 15, mass: 1 };
    const earth = simulateProjectile({ ...base, gravity: GRAVITIES.earth }).range;
    const moon = simulateProjectile({ ...base, gravity: GRAVITIES.moon }).range;
    const ratio = moon / earth;
    expect(ratio).toBeGreaterThan(5.7);
    expect(ratio).toBeLessThan(6.4);
  });

  it('numeric sim matches analytic formula within 2%', () => {
    const res = simulateProjectile({ angleDeg: 45, speed: 15, mass: 1, gravity: 9.8 });
    expect(res.errorPct).toBeLessThan(2);
    expect(res.analyticRange).toBeCloseTo(analyticRange(15, 45, 9.8), 6);
  });

  it('mass does not change the range (vacuum model)', () => {
    const base = { angleDeg: 40, speed: 18, gravity: 9.8 };
    const light = simulateProjectile({ ...base, mass: 0.5 }).range;
    const heavy = simulateProjectile({ ...base, mass: 5 }).range;
    expect(light).toBeCloseTo(heavy, 10);
  });
});
