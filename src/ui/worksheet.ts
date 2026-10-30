/** Teacher worksheet view — 교사모드 인쇄용 학습지. */
import { getTrials } from '../stores/trialsStore';

export function worksheetSection(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'worksheet';
  section.id = 'worksheet';
  section.setAttribute('aria-label', '인쇄용 학습지');
  section.innerHTML = `
    <div class="worksheet-paper">
      <h2>Physics Lab — 탐구 학습지 <span class="ws-sub">(교사모드 인쇄용)</span></h2>
      <p>이름: ______ &nbsp;&nbsp; 반: ______ &nbsp;&nbsp; 날짜: ______</p>
      <h3>학습 목표</h3>
      <ul>
        <li>v–t / x–t 그래프를 읽고 운동을 설명할 수 있다.</li>
        <li>역학적 에너지 보존을 말할 수 있다.</li>
        <li>진폭·진동수·파장을 말할 수 있다.</li>
      </ul>
      <h3>내 실험 기록</h3>
      <div id="ws-trials"></div>
      <h3>생각해 보기</h3>
      <ol>
        <li>포물선: 45°에서 비거리가 가장 긴 이유는? (이론식 R = v²·sin2θ/g 와 연결)</li>
        <li>진자: 실 길이를 4배로 하면 주기는 몇 배가 되는가? (T = 2π√(L/g))</li>
        <li>파동: 진동수를 2배로 하면 파장은 어떻게 변하는가? (v = fλ)</li>
      </ol>
      <div class="no-print" style="margin-top:12px">
        <button type="button" id="print-btn" class="ghost-btn">학습지 인쇄하기</button>
      </div>
    </div>`;

  const render = () => {
    const rows = getTrials().slice(-10);
    const box = section.querySelector('#ws-trials') as HTMLElement;
    box.innerHTML =
      rows.length === 0
        ? '<p>아직 기록이 없습니다.</p>'
        : `<table class="ws-table"><thead><tr><th>회차</th><th>실험대</th><th>조건</th><th>예측</th><th>실측</th><th>오차</th></tr></thead>
           <tbody>${rows.map((t) => `<tr><td>${t.id}</td><td>${t.bench}</td><td>${t.setup}</td><td>${t.predicted}</td><td>${t.measured}</td><td>${t.error}</td></tr>`).join('')}</tbody></table>`;
  };
  render();
  // 인쇄 직전에 최신 기록 반영
  window.addEventListener('beforeprint', render);
  section.querySelector('#print-btn')?.addEventListener('click', () => window.print());
  return section;
}
