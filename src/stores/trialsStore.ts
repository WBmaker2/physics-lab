/**
 * Lab notebook store — 실험 노트(시도 자동 기록) + CSV 내보내기 + localStorage 저장.
 */
import type { BenchKey } from './benchStore';

export interface Trial {
  id: number;
  time: string;
  bench: BenchKey;
  setup: string;
  predicted: string;
  measured: string;
  error: string;
}

type Listener = (trials: Trial[]) => void;

const STORAGE_KEY = 'physics-lab.trials.v1';
let seq = 1;
let trials: Trial[] = [];
const listeners = new Set<Listener>();

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Trial[];
    if (Array.isArray(parsed)) {
      trials = parsed.slice(0, 200);
      const maxId = trials.reduce((m, t) => Math.max(m, t.id), 0);
      seq = maxId + 1;
    }
  }
} catch {
  trials = [];
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trials));
  } catch {
    /* 저장 실패는 무시 (프라이빗 모드 등) */
  }
}

function emit(): void {
  const snap = [...trials];
  listeners.forEach((fn) => fn(snap));
  persist();
}

export function getTrials(): Trial[] {
  return [...trials];
}

export function addTrial(t: Omit<Trial, 'id' | 'time'>): Trial {
  const trial: Trial = {
    ...t,
    id: seq++,
    time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
  };
  trials = [...trials, trial].slice(-200);
  emit();
  return trial;
}

export function clearTrials(): void {
  trials = [];
  emit();
}

export function subscribeTrials(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** CSV 텍스트 생성 (BOM 포함 — 엑셀 한글 깨짐 방지). */
export function trialsToCsv(rows: Trial[]): string {
  const header = ['id', 'time', 'bench', 'setup', 'predicted', 'measured', 'error'];
  const lines = [header.join(',')];
  for (const t of rows) {
    lines.push(
      [String(t.id), t.time, t.bench, t.setup, t.predicted, t.measured, t.error]
        .map(csvCell)
        .join(','),
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** CSV 파일 다운로드 */
export function downloadTrialsCsv(rows: Trial[]): void {
  const blob = new Blob([trialsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'physics-lab-trials.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
