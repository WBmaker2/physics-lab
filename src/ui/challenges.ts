/** Challenge cards — 도전 카드 + 달성 판정. */
import { loadChallenges, type Challenge } from '../data/challenges';
import { getTrials, subscribeTrials, type Trial } from '../stores/trialsStore';

export interface ChallengeStatus {
  id: string;
  done: boolean;
  detail: string;
}

function judge(c: Challenge, trials: Trial[]): ChallengeStatus {
  const benchTrials = trials.filter((t) => t.bench === c.bench);
  const last = benchTrials[benchTrials.length - 1];
  const target = c.target;
  switch (target.kind) {
    case 'range': {
      const recent = benchTrials.slice(-target.maxTries);
      for (const t of recent) {
        const m = parseRange(t.measured);
        if (m != null && Math.abs(m - target.value) <= target.tolerance) {
          return { id: c.id, done: true, detail: `성공! 실측 ${m.toFixed(2)}m` };
        }
      }
      return {
        id: c.id,
        done: false,
        detail: `최근 ${recent.length}/${target.maxTries}회 시도 중`,
      };
    }
    case 'trials': {
      const ok = benchTrials.length >= target.count;
      return {
        id: c.id,
        done: ok,
        detail: ok ? `달성! (${benchTrials.length}회 기록)` : `${benchTrials.length}/${target.count}회 기록`,
      };
    }
    case 'period': {
      if (last) {
        const m = parsePeriod(last.measured);
        if (m != null && Math.abs(m - target.value) <= target.tolerance) {
          return { id: c.id, done: true, detail: `성공! 측정 ${m.toFixed(2)}s` };
        }
      }
      return { id: c.id, done: false, detail: last ? `최근 측정: ${last.measured}` : '아직 측정 없음' };
    }
    case 'nodes': {
      const ok = benchTrials.some((t) => t.measured.includes(`마디 ${target.value}개`));
      return {
        id: c.id,
        done: ok,
        detail: ok ? '달성! 정상파 관측 기록됨' : '정상파 관측 후 기록 필요',
      };
    }
  }
}

function parseRange(measured: string): number | null {
  const m = measured.match(/([\d.]+)\s*m/);
  return m ? Number(m[1]) : null;
}

function parsePeriod(measured: string): number | null {
  const m = measured.match(/측정\s*([\d.]+)s/);
  return m ? Number(m[1]) : null;
}

export function challengesSection(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'challenges';
  section.setAttribute('aria-label', '도전 카드');
  section.innerHTML = `<h2>도전 카드</h2><div class="cards" id="cards"></div>`;
  const wrap = section.querySelector('#cards') as HTMLElement;
  const challenges = loadChallenges();

  const render = (trials: Trial[]) => {
    wrap.innerHTML = '';
    for (const c of challenges) {
      const st = judge(c, trials);
      const card = document.createElement('article');
      card.className = `card${st.done ? ' done' : ''}`;
      card.innerHTML = `
        <h3>${st.done ? '✅ ' : ''}${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.desc)}</p>
        <p class="status" role="status">${escapeHtml(st.detail)}</p>
        <details><summary>힌트 보기</summary><p>${escapeHtml(c.hint)}</p></details>`;
      wrap.appendChild(card);
    }
  };
  render(getTrials());
  subscribeTrials(render);
  return section;
}

export function judgeAllForTest(cs: Challenge[], trials: Trial[]): ChallengeStatus[] {
  return cs.map((c) => judge(c, trials));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
