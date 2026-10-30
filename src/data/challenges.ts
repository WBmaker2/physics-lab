/** Challenge card types + loader. */
import raw from '../data/challenges.json';

export interface RangeTarget {
  kind: 'range';
  value: number;
  tolerance: number;
  maxTries: number;
}
export interface TrialsTarget {
  kind: 'trials';
  count: number;
}
export interface PeriodTarget {
  kind: 'period';
  value: number;
  tolerance: number;
}
export interface NodesTarget {
  kind: 'nodes';
  value: number;
}
export type ChallengeTarget = RangeTarget | TrialsTarget | PeriodTarget | NodesTarget;

export interface Challenge {
  id: string;
  bench: 'projectile' | 'pendulum' | 'waves';
  title: string;
  desc: string;
  hint: string;
  target: ChallengeTarget;
}

export function loadChallenges(): Challenge[] {
  return raw as Challenge[];
}
