/** Bench + teacher-mode store — 실험대 탭/교사모드 상태 (초미니 스토어). */

export type BenchKey = 'projectile' | 'pendulum' | 'waves';

export const BENCH_LABEL: Record<BenchKey, string> = {
  projectile: '포물선',
  pendulum: '진자 · 용수철',
  waves: '파동 수조',
};

interface BenchState {
  bench: BenchKey;
  teacherMode: boolean;
}

type Listener = (s: BenchState) => void;

const state: BenchState = { bench: 'projectile', teacherMode: false };
const listeners = new Set<Listener>();

export function getBenchState(): BenchState {
  return { ...state };
}

export function setBench(bench: BenchKey): void {
  if (state.bench === bench) return;
  state.bench = bench;
  emit();
}

export function setTeacherMode(on: boolean): void {
  if (state.teacherMode === on) return;
  state.teacherMode = on;
  emit();
}

export function subscribeBench(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(): void {
  const snap = getBenchState();
  listeners.forEach((fn) => fn(snap));
}
