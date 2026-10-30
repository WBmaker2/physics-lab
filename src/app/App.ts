/**
 * App — BenchTabs + 3 benches (projectile / pendulum-spring / waves).
 * 좌측 캔버스 무대, 우측 조작 패널, 하단 그래프+기록표+도전카드, 교사모드 학습지.
 */
import { fitCanvas } from '../canvas/rulers';
import {
  renderPendulum,
  renderProjectile,
  renderSpring,
  renderWaves,
} from '../canvas/renderer';
import { loadChallenges } from '../data/challenges';
import {
  BENCH_LABEL,
  getBenchState,
  setBench,
  setTeacherMode,
  subscribeBench,
  type BenchKey,
} from '../stores/benchStore';
import { addTrial } from '../stores/trialsStore';
import { simulatePendulum } from '../sim/pendulum';
import {
  analyticRange,
  GRAVITIES,
  GRAVITY_LABEL,
  simulateProjectile,
  predictionError,
  type GravityKey,
} from '../sim/projectile';
import { simulateSpring } from '../sim/spring';
import {
  DEFAULT_WAVE_SPEED,
  standingNodeCount,
  standingWave,
  superpose,
  wavelength,
} from '../sim/waves';
import { challengesSection } from '../ui/challenges';
import { drawLineChart } from '../ui/graphs';
import { numberRow, selectRow, sliderRow } from '../ui/sliders';
import { trialTableSection } from '../ui/trialTable';
import { worksheetSection } from '../ui/worksheet';

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BENCHES: BenchKey[] = ['projectile', 'pendulum', 'waves'];

export class App {
  private root: HTMLElement;
  private scene!: HTMLCanvasElement;
  private graph!: HTMLCanvasElement;
  private panel!: HTMLElement;
  private readout!: HTMLElement;
  private caption!: HTMLElement;
  private raf = 0;
  private destroyed = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
    const bench = getBenchState().bench;
    this.mountBench(bench);
    subscribeBench((s) => {
      this.syncTabs();
      this.root.classList.toggle('teacher', s.teacherMode);
      this.mountBench(s.bench);
    });
    window.addEventListener('resize', () => this.redraw());
  }

  // ---------- shell ----------

  private render(): void {
    this.root.innerHTML = `
      <a class="skip-link" href="#main">본문으로 건너뛰기</a>
      <header class="topbar">
        <h1>Physics Lab <span class="sub">가상 물리 실험실</span></h1>
        <nav aria-label="실험대 선택">
          <div class="tabs" role="tablist" aria-label="실험대">
            ${BENCHES.map(
              (b) =>
                `<button type="button" role="tab" data-bench="${b}" aria-selected="${b === getBenchState().bench}">${BENCH_LABEL[b]}</button>`,
            ).join('')}
          </div>
        </nav>
        <label class="teacher-toggle"><input type="checkbox" id="teacher-mode" /> 교사모드(학습지)</label>
      </header>
      <main id="main" class="layout">
        <section class="stage" aria-label="실험 무대">
          <canvas id="scene" aria-label="물리 실험 캔버스"></canvas>
          <p class="caption" id="stage-caption" role="status" aria-live="polite"></p>
          <div class="readout" id="readout" role="status" aria-live="polite"></div>
        </section>
        <aside class="panel" id="panel" aria-label="조작 패널"></aside>
        <section class="bottom" aria-label="그래프와 기록">
          <div class="graph-card">
            <canvas id="graph" aria-label="실시간 그래프"></canvas>
          </div>
          <div id="notebook-slot"></div>
          <div id="challenge-slot"></div>
        </section>
        <div id="worksheet-slot"></div>
      </main>
      <footer class="footer"><small>이론식과 수치 시뮬(120Hz 반암시적 오일러)을 함께 보여주는 개념 모형입니다 · 고정 스텝+시드 난수로 항상 동일하게 재현됩니다</small></footer>`;

    this.scene = this.root.querySelector('#scene') as HTMLCanvasElement;
    this.graph = this.root.querySelector('#graph') as HTMLCanvasElement;
    this.panel = this.root.querySelector('#panel') as HTMLElement;
    this.readout = this.root.querySelector('#readout') as HTMLElement;
    this.caption = this.root.querySelector('#stage-caption') as HTMLElement;

    this.root.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((tab) => {
      tab.addEventListener('click', () => setBench(tab.dataset.bench as BenchKey));
    });
    const teacher = this.root.querySelector('#teacher-mode') as HTMLInputElement;
    teacher.addEventListener('change', () => setTeacherMode(teacher.checked));

    (this.root.querySelector('#notebook-slot') as HTMLElement).appendChild(trialTableSection());
    (this.root.querySelector('#challenge-slot') as HTMLElement).appendChild(challengesSection());
    (this.root.querySelector('#worksheet-slot') as HTMLElement).appendChild(worksheetSection());
    // 도전 카드 중 현재 실험대 외 카드도 보이지만, 현재 탭 강조용 데이터 속성
    void loadChallenges;
  }

  private syncTabs(): void {
    const bench = getBenchState().bench;
    this.root.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.bench === bench));
    });
  }

  private mountBench(bench: BenchKey): void {
    cancelAnimationFrame(this.raf);
    this.panel.innerHTML = '';
    if (bench === 'projectile') this.mountProjectile();
    else if (bench === 'pendulum') this.mountOscillator();
    else this.mountWaves();
  }

  private redraw(): void {
    // 리사이즈 시 현재 벤치를 처음 상태로 다시 그림 (애니메이션은 다음 인터랙션에)
    if (!this.destroyed) this.mountBench(getBenchState().bench);
  }

  private loop(fn: (now: number) => void): void {
    const tick = (now: number) => {
      if (this.destroyed) return;
      fn(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  // ---------- F1/F2 projectile ----------

  private mountProjectile(): void {
    this.caption.textContent =
      '포물선 발사기: 먼저 착지점을 예측해 입력한 뒤 발사하세요. 질량은 비거리에 영향을 주지 않습니다(진공 모형).';
    const gravity = selectRow('gravity', '중력', (Object.keys(GRAVITIES) as GravityKey[]).map((k) => ({ value: k, label: GRAVITY_LABEL[k] })), 'earth');
    const angle = sliderRow({ id: 'angle', label: '발사 각도', min: 5, max: 80, step: 1, value: 45, unit: '°' });
    const speed = sliderRow({ id: 'speed', label: '발사 속도', min: 5, max: 30, step: 0.5, value: 15, unit: ' m/s' });
    const mass = sliderRow({ id: 'mass', label: '질량 (궤적 무관·에너지 표시용)', min: 0.5, max: 5, step: 0.1, value: 1, unit: ' kg' });
    const predict = numberRow('predict', '예측 착지점 (m)', 15);
    const targetWrap = document.createElement('div');
    targetWrap.className = 'check-row';
    targetWrap.innerHTML = `<label><input type="checkbox" id="show-target" checked /> 12m 표적 표시</label>`;
    const fire = document.createElement('button');
    fire.type = 'button';
    fire.className = 'btn-pulse';
    fire.textContent = '발사하기';
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'ghost-btn';
    replay.textContent = '다시 보기';

    this.panel.append(
      gravity.el, angle.el, speed.el, mass.el, predict.el, targetWrap, fire, replay,
      note('질량이 바뀌어도 비거리는 같습니다. 왜 그럴까요? (갈릴레이의 낙하 실험과 연결)'),
    );

    const target = () => (targetWrap.querySelector('#show-target') as HTMLInputElement).checked;
    let last = simulateProjectile(current());
    let progress = 1;
    let startStamp = 0;

    function current() {
      return {
        angleDeg: angle.get(),
        speed: speed.get(),
        mass: mass.get(),
        gravity: GRAVITIES[gravity.get() as GravityKey],
      };
    }
    const draw = () => {
      const ctx = this.scene.getContext('2d');
      if (!ctx) return;
      const { w, h } = fitCanvas(this.scene);
      renderProjectile(ctx, w, h, {
        points: last.points,
        progress,
        predictedX: predict.get(),
        showTarget: target(),
        angleDeg: angle.get(),
      });
      this.drawProjectileGraph(last);
    };

    const refreshPreview = () => {
      last = simulateProjectile(current());
      if (progress >= 1) {
        // 발사 전 미리보기: 전체 궤적 점선으로 표시
        draw();
      } else draw();
    };
    for (const s of [angle, speed, mass]) s.onInput(refreshPreview);
    gravity.select.addEventListener('change', refreshPreview);
    predict.el.querySelector('input')?.addEventListener('input', () => draw());
    targetWrap.querySelector('input')?.addEventListener('change', () => draw());

    const doFire = () => {
      const p = current();
      last = simulateProjectile(p);
      const predicted = predict.get();
      const err = predicted == null ? null : predictionError(predicted, last.range);
      addTrial({
        bench: 'projectile',
        setup: `${p.angleDeg}°·${p.speed}m/s·중력 ${p.gravity}m/s²`,
        predicted: predicted == null ? '—' : `${predicted.toFixed(1)} m`,
        measured: `${last.range.toFixed(2)} m (이론 ${last.analyticRange.toFixed(2)} m)`,
        error: err == null ? `수치오차 ${last.errorPct.toFixed(2)}%` : `예측오차 ${err.toFixed(2)} m · 수치오차 ${last.errorPct.toFixed(2)}%`,
      });
      this.readout.textContent =
        `발사! 비거리 ${last.range.toFixed(2)}m · 체공 ${last.flightTime.toFixed(2)}s · 최고 ${last.maxHeight.toFixed(2)}m · ` +
        `이론 ${last.analyticRange.toFixed(2)}m(오차 ${last.errorPct.toFixed(2)}%)` +
        (err != null ? ` · 예측 오차 ${err.toFixed(2)}m` : '');
      // 애니메이션: 실제 체공시간(최대 6초로 압축)
      progress = REDUCED_MOTION ? 1 : 0;
      startStamp = performance.now();
      draw();
    };
    fire.addEventListener('click', doFire);
    replay.addEventListener('click', () => {
      progress = REDUCED_MOTION ? 1 : 0;
      startStamp = performance.now();
      draw();
    });

    cancelAnimationFrame(this.raf);
    if (REDUCED_MOTION) {
      progress = 1;
      draw();
    } else {
      const dur = () => Math.min(6, Math.max(0.8, last.flightTime));
      this.loop(() => {
        if (progress < 1) {
          progress = Math.min(1, (performance.now() - startStamp) / (dur() * 1000));
          draw();
        }
      });
      draw();
    }
    // 초기 안내 (e2e 호환: 발사 전에는 안내 문구)
    this.readout.textContent = `이론 비거리 ${analyticRange(15, 45, GRAVITIES.earth).toFixed(2)}m — 예측을 입력하고 발사하세요.`;
  }

  private drawProjectileGraph(last: { points: { t: number; y: number }[] }): void {
    const n = last.points.length;
    const ts = new Float64Array(n);
    const ys = new Float64Array(n);
    last.points.forEach((p, i) => {
      ts[i] = p.t;
      ys[i] = p.y;
    });
    drawLineChart(this.graph, [{ label: '높이 y', color: '#7ddf9e', xs: ts, ys }], {
      title: '높이–시간 그래프',
      yUnit: 'm',
    });
  }

  // ---------- F3 pendulum / spring ----------

  private mountOscillator(): void {
    this.caption.textContent =
      '진자·용수철: 길이·질량·탄성계수를 바꾸고 주기를 측정하세요. KE/PE 그래프가 서로 오르내림을 바꿉니다.';
    const typeWrap = document.createElement('div');
    typeWrap.className = 'seg';
    typeWrap.setAttribute('role', 'group');
    typeWrap.setAttribute('aria-label', '진동자 종류');
    typeWrap.innerHTML = `
      <label><input type="radio" name="osc" value="pendulum" checked /> 진자</label>
      <label><input type="radio" name="osc" value="spring" /> 용수철</label>`;
    const body = document.createElement('div');
    body.className = 'osc-body';
    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'btn-pulse';
    run.textContent = '측정하고 기록하기';
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'ghost-btn';
    pauseBtn.textContent = '일시정지';
    this.panel.append(typeWrap, body, run, pauseBtn);

    let mode: 'pendulum' | 'spring' = 'pendulum';
    let paused = REDUCED_MOTION;
    pauseBtn.textContent = paused ? '재생하기' : '일시정지';

    // 진자 컨트롤
    const length = sliderRow({ id: 'plen', label: '실 길이', min: 0.2, max: 2, step: 0.05, value: 1, unit: ' m' });
    const pgrav = selectRow('pgravity', '중력', (Object.keys(GRAVITIES) as GravityKey[]).map((k) => ({ value: k, label: GRAVITY_LABEL[k] })), 'earth');
    const pmass = sliderRow({ id: 'pmass', label: '추 질량', min: 0.2, max: 3, step: 0.1, value: 1, unit: ' kg' });
    const theta0 = sliderRow({ id: 'theta0', label: '초기 각도', min: 5, max: 40, step: 1, value: 20, unit: '°' });
    // 용수철 컨트롤
    const smass = sliderRow({ id: 'smass', label: '질량', min: 0.1, max: 3, step: 0.1, value: 0.5, unit: ' kg' });
    const k = sliderRow({ id: 'kval', label: '용수철 상수 k', min: 5, max: 120, step: 1, value: 20, unit: ' N/m' });
    const x0 = sliderRow({ id: 'x0', label: '초기 변위', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: ' m' });

    const penBox = document.createElement('div');
    penBox.append(length.el, pgrav.el, pmass.el, theta0.el);
    const sprBox = document.createElement('div');
    sprBox.append(smass.el, k.el, x0.el);
    sprBox.hidden = true;
    body.append(penBox, sprBox);

    // 시뮬 결과 캐시
    let pen = simulatePendulum({ length: 1, gravity: GRAVITIES.earth, mass: 1, theta0Deg: 20 });
    let spr = simulateSpring({ mass: 0.5, k: 20, x0: 0.2 });
    let t0 = performance.now();
    let elapsed = 0;

    const recompute = () => {
      pen = simulatePendulum({
        length: length.get(),
        gravity: GRAVITIES[pgrav.get() as GravityKey],
        mass: pmass.get(),
        theta0Deg: theta0.get(),
      });
      spr = simulateSpring({ mass: smass.get(), k: k.get(), x0: x0.get() });
      t0 = performance.now();
      draw(0);
    };
    for (const s of [length, pmass, theta0, smass, k, x0]) s.onInput(recompute);
    pgrav.select.addEventListener('change', recompute);

    typeWrap.querySelectorAll('input').forEach((r) =>
      r.addEventListener('change', () => {
        mode = (typeWrap.querySelector('input:checked') as HTMLInputElement).value as 'pendulum' | 'spring';
        penBox.hidden = mode !== 'pendulum';
        sprBox.hidden = mode !== 'spring';
        t0 = performance.now();
        draw(0);
      }),
    );

    const draw = (t: number) => {
      const ctx = this.scene.getContext('2d');
      if (!ctx) return;
      const { w, h } = fitCanvas(this.scene);
      if (mode === 'pendulum') {
        const s = sampleAt(pen.samples.map((p) => p.t), t);
        const th = interp(pen.samples.map((p) => p.theta), s);
        const om = interp(pen.samples.map((p) => p.omega), s);
        renderPendulum(ctx, w, h, { length: length.get(), theta: th, omega: om });
        const ts = pen.samples.map((p) => p.t);
        drawLineChart(
          this.graph,
          [
            { label: 'KE 운동에너지', color: '#ffd166', xs: ts, ys: pen.samples.map((p) => p.ke) },
            { label: 'PE 위치에너지', color: '#7cc7ff', xs: ts, ys: pen.samples.map((p) => p.pe) },
          ],
          { title: '에너지–시간 그래프', yUnit: 'J' },
        );
      } else {
        const s = sampleAt(spr.samples.map((p) => p.t), t);
        const x = interp(spr.samples.map((p) => p.x), s);
        renderSpring(ctx, w, h, { x, x0: x0.get() });
        const ts = spr.samples.map((p) => p.t);
        drawLineChart(
          this.graph,
          [
            { label: 'KE 운동에너지', color: '#ffd166', xs: ts, ys: spr.samples.map((p) => p.ke) },
            { label: 'PE 탄성에너지', color: '#7cc7ff', xs: ts, ys: spr.samples.map((p) => p.pe) },
          ],
          { title: '에너지–시간 그래프', yUnit: 'J' },
        );
      }
    };

    run.addEventListener('click', () => {
      paused = false;
      pauseBtn.textContent = '일시정지';
      t0 = performance.now();
      elapsed = 0;
      if (mode === 'pendulum') {
        const m = pen.measuredPeriod;
        addTrial({
          bench: 'pendulum',
          setup: `진자 L=${length.get().toFixed(2)}m·g=${GRAVITIES[pgrav.get() as GravityKey]}·θ₀=${theta0.get()}°`,
          predicted: `이론 ${pen.theoryPeriod.toFixed(2)} s`,
          measured: m == null ? '측정 실패' : `측정 ${m.toFixed(2)}s (이론 ${pen.theoryPeriod.toFixed(2)}s)`,
          error: pen.errorPct == null ? '—' : `${pen.errorPct.toFixed(2)}%`,
        });
        this.readout.textContent =
          m == null
            ? '주기를 찾지 못했어요. 시간을 늘리거나 감쇠를 줄이세요.'
            : `진자 측정 주기 ${m.toFixed(2)}s · 이론 ${pen.theoryPeriod.toFixed(2)}s (오차 ${pen.errorPct?.toFixed(2)}%)`;
      } else {
        const m = spr.measuredPeriod;
        addTrial({
          bench: 'pendulum',
          setup: `용수철 m=${smass.get().toFixed(1)}kg·k=${k.get()}N/m·x₀=${x0.get().toFixed(2)}m`,
          predicted: `이론 ${spr.theoryPeriod.toFixed(2)} s`,
          measured: m == null ? '측정 실패' : `측정 ${m.toFixed(2)}s (이론 ${spr.theoryPeriod.toFixed(2)}s)`,
          error: spr.errorPct == null ? '—' : `${spr.errorPct.toFixed(2)}%`,
        });
        this.readout.textContent =
          m == null
            ? '주기를 찾지 못했어요.'
            : `용수철 측정 주기 ${m.toFixed(2)}s · 이론 ${spr.theoryPeriod.toFixed(2)}s (오차 ${spr.errorPct?.toFixed(2)}%)`;
      }
    });
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? '재생하기' : '일시정지';
      if (!paused) t0 = performance.now() - elapsed * 1000;
    });

    let lastStamp = 0;
    cancelAnimationFrame(this.raf);
    recompute();
    this.readout.textContent = `진자 이론 주기 ${pen.theoryPeriod.toFixed(2)}s · 용수철 이론 주기 ${spr.theoryPeriod.toFixed(2)}s — “측정하고 기록하기”를 눌러보세요.`;
    if (!REDUCED_MOTION) {
      this.loop((now) => {
        if (lastStamp === 0) {
          lastStamp = now;
          t0 = now - elapsed * 1000;
        }
        if (!paused) {
          elapsed = (now - t0) / 1000;
          lastStamp = now;
          draw(elapsed % 12);
        }
      });
    }
  }

  // ---------- F4 waves ----------

  private mountWaves(): void {
    this.caption.textContent =
      '파동 수조: 진폭·진동수를 바꾸고 진행파·정상파·간섭을 관찰하세요. 파장은 λ = v/f 로 계산됩니다.';
    const modeSel = selectRow(
      'wmode',
      '보기 방식',
      [
        { value: 'travel', label: '진행파 (한 파원)' },
        { value: 'standing', label: '정상파 (고정단)' },
        { value: 'interference', label: '간섭 (두 파원)' },
      ],
      'travel',
    );
    const amp = sliderRow({ id: 'wamp', label: '진폭', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: ' m' });
    const freq = sliderRow({ id: 'wfreq', label: '진동수', min: 0.2, max: 3, step: 0.1, value: 1, unit: ' Hz' });
    const harm = sliderRow({ id: 'wharm', label: '배음수 (정상파)', min: 1, max: 4, step: 1, value: 2, unit: '' });
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'btn-pulse';
    play.textContent = REDUCED_MOTION ? '파형 그리기' : '일시정지';
    const record = document.createElement('button');
    record.type = 'button';
    record.className = 'ghost-btn';
    record.textContent = '관측 기록하기';
    this.panel.append(
      modeSel.el, amp.el, freq.el, harm.el, play, record,
      note(`수조 길이 10m · 파동 속력 ${DEFAULT_WAVE_SPEED}m/s (개념 모형)`),
    );

    const L = 10;
    const N = 240;
    let t = 0;
    let playing = !REDUCED_MOTION;
    let lastStamp = 0;

    const fieldAt = (tt: number): Float64Array => {
      const mode = modeSel.get();
      const a = amp.get();
      const f = freq.get();
      if (mode === 'standing') return standingWave(N, L, tt, a, f, harm.get());
      if (mode === 'interference')
        return superpose(N, L, tt, [
          { x: 2, amplitude: a, frequency: f },
          { x: 8, amplitude: a, frequency: f },
        ]);
      return superpose(N, L, tt, [{ x: 0.5, amplitude: a, frequency: f }]);
    };

    const draw = () => {
      const ctx = this.scene.getContext('2d');
      if (!ctx) return;
      const { w, h } = fitCanvas(this.scene);
      const mode = modeSel.get();
      const field = fieldAt(t);
      const f = freq.get();
      let nodeXs: number[] | undefined;
      if (mode === 'standing') {
        const hn = harm.get();
        nodeXs = [];
        for (let i = 0; i <= hn; i++) nodeXs.push((L * i) / hn);
      }
      renderWaves(ctx, w, h, {
        field,
        length: L,
        maxAmp: mode === 'standing' ? amp.get() * 2 : amp.get() * (mode === 'interference' ? 2 : 1),
        mode: mode as 'travel' | 'standing' | 'interference',
        sources:
          mode === 'interference'
            ? [{ x: 2 }, { x: 8 }]
            : mode === 'standing'
              ? []
              : [{ x: 0.5 }],
        nodeXs,
      });
      // 하단 그래프: 수조 중앙 지점의 시간 파형 (probe)
      const probeM = L / 2;
      const M = 200;
      const span = Math.max(2, 3 / Math.max(0.2, f));
      const ts = new Float64Array(M);
      const ys = new Float64Array(M);
      for (let i = 0; i < M; i++) {
        const tt = t - span + (span * i) / (M - 1);
        ts[i] = tt < 0 ? 0 : tt;
        const fld = fieldAt(ts[i]);
        ys[i] = fld[Math.round((probeM / L) * (N - 1))];
      }
      drawLineChart(this.graph, [{ label: `중앙(x=5m) 변위`, color: '#7cc7ff', xs: ts, ys }], {
        title: '시간 파형 (probe)',
        yUnit: 'm',
      });
      const lam = wavelength(f, DEFAULT_WAVE_SPEED);
      const nodes = mode === 'standing' ? standingNodeCount(harm.get()) : null;
      this.readout.textContent =
        `진폭 ${amp.get().toFixed(2)}m · 진동수 ${f.toFixed(1)}Hz · 파장 λ=${lam.toFixed(2)}m` +
        (nodes != null ? ` · 마디 ${nodes}개` : mode === 'interference' ? ' · 두 파원 간섭' : '');
    };

    for (const s of [amp, freq, harm]) s.onInput(draw);
    modeSel.select.addEventListener('change', draw);
    play.addEventListener('click', () => {
      if (REDUCED_MOTION) {
        t += 0.25;
        draw();
        return;
      }
      playing = !playing;
      play.textContent = playing ? '일시정지' : '재생하기';
      lastStamp = 0;
    });
    record.addEventListener('click', () => {
      const mode = modeSel.get();
      const f = freq.get();
      const lam = wavelength(f, DEFAULT_WAVE_SPEED);
      const modeName = mode === 'standing' ? '정상파' : mode === 'interference' ? '간섭' : '진행파';
      addTrial({
        bench: 'waves',
        setup: `${modeName} A=${amp.get().toFixed(2)}m·f=${f.toFixed(1)}Hz${mode === 'standing' ? `·배음 ${harm.get()}` : ''}`,
        predicted: `λ=${lam.toFixed(2)}m`,
        measured:
          mode === 'standing'
            ? `마디 ${standingNodeCount(harm.get())}개 관측 (λ=${lam.toFixed(2)}m)`
            : `λ=${lam.toFixed(2)}m 관측 (f=${f.toFixed(1)}Hz)`,
        error: '—',
      });
    });

    cancelAnimationFrame(this.raf);
    draw();
    if (!REDUCED_MOTION) {
      this.loop((now) => {
        if (lastStamp === 0) lastStamp = now;
        const dt = Math.min(0.05, (now - lastStamp) / 1000);
        lastStamp = now;
        if (playing) {
          t += dt;
          draw();
        }
      });
    }
  }
}

// ---------- helpers ----------

function note(text: string): HTMLElement {
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = text;
  return p;
}

/** 주기 배열에서 시간 t가 들어갈 구간 인덱스 (12s 루프용). */
function sampleAt(times: number[], t: number): number {
  const looped = ((t % 12) + 12) % 12;
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= looped) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(0, lo - 1);
}

function interp(values: number[], i: number): number {
  return values[Math.min(i, values.length - 1)];
}
