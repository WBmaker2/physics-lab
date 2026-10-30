/** Trial table + CSV — 실험 노트 표. */
import {
  clearTrials,
  downloadTrialsCsv,
  getTrials,
  subscribeTrials,
  type Trial,
} from '../stores/trialsStore';
import { BENCH_LABEL } from '../stores/benchStore';

export function trialTableSection(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'notebook';
  section.setAttribute('aria-label', '실험 노트');
  section.innerHTML = `
    <div class="notebook-head">
      <h2>실험 노트</h2>
      <div class="notebook-actions">
        <button type="button" id="csv-btn" class="ghost-btn">CSV 내보내기</button>
        <button type="button" id="clear-btn" class="ghost-btn">지우기</button>
      </div>
    </div>
    <p class="hint" id="trial-count" role="status"></p>
    <div class="table-wrap">
      <table>
        <caption class="sr-only">시도 기록표: 조건, 예측, 실측, 오차</caption>
        <thead><tr>
          <th scope="col">회차</th><th scope="col">시각</th><th scope="col">실험대</th>
          <th scope="col">조건</th><th scope="col">예측</th><th scope="col">실측</th><th scope="col">오차</th>
        </tr></thead>
        <tbody id="trial-body"></tbody>
      </table>
    </div>`;

  const body = section.querySelector('#trial-body') as HTMLElement;
  const count = section.querySelector('#trial-count') as HTMLElement;

  const render = (rows: Trial[]) => {
    count.textContent =
      rows.length === 0 ? '아직 기록이 없어요. 발사·측정하면 자동 기록됩니다.' : `총 ${rows.length}회 기록됨`;
    body.innerHTML =
      rows.length === 0
        ? `<tr><td colspan="7" class="empty">기록 없음</td></tr>`
        : rows
            .slice(-30)
            .reverse()
            .map(
              (t) => `<tr>
              <td>${t.id}</td><td>${escapeHtml(t.time)}</td><td>${BENCH_LABEL[t.bench]}</td>
              <td>${escapeHtml(t.setup)}</td><td>${escapeHtml(t.predicted)}</td>
              <td>${escapeHtml(t.measured)}</td><td>${escapeHtml(t.error)}</td>
            </tr>`,
            )
            .join('');
  };
  render(getTrials());
  subscribeTrials(render);

  section.querySelector('#csv-btn')?.addEventListener('click', () => {
    downloadTrialsCsv(getTrials());
  });
  section.querySelector('#clear-btn')?.addEventListener('click', () => {
    clearTrials();
  });
  return section;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
