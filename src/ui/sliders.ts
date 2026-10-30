/** Slider row builder — 접근성 라벨 + 값 표시 포함. */

export interface SliderOpts {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  format?: (v: number) => string;
}

export interface SliderHandle {
  el: HTMLDivElement;
  input: HTMLInputElement;
  output: HTMLOutputElement;
  get(): number;
  set(v: number): void;
  onInput(fn: (v: number) => void): void;
}

export function sliderRow(opts: SliderOpts): SliderHandle {
  const el = document.createElement('div');
  el.className = 'slider-row';
  const fmt = opts.format ?? ((v: number) => `${v}${opts.unit}`);
  el.innerHTML = `
    <div class="slider-head">
      <label for="${opts.id}">${opts.label}</label>
      <output id="${opts.id}-val" for="${opts.id}">${fmt(opts.value)}</output>
    </div>`;
  const input = document.createElement('input');
  input.type = 'range';
  input.id = opts.id;
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);
  input.value = String(opts.value);
  input.setAttribute('aria-describedby', `${opts.id}-val`);
  const output = el.querySelector('output') as HTMLOutputElement;
  el.appendChild(input);

  const get = () => Number(input.value);
  const set = (v: number) => {
    input.value = String(v);
    output.textContent = fmt(get());
  };
  const onInput = (fn: (v: number) => void) => {
    input.addEventListener('input', () => {
      output.textContent = fmt(get());
      fn(get());
    });
  };
  // 초기 표시 동기화
  output.textContent = fmt(get());
  return { el, input, output, get, set, onInput };
}

/** Select row builder */
export function selectRow(
  id: string,
  label: string,
  options: { value: string; label: string }[],
  value: string,
): { el: HTMLDivElement; select: HTMLSelectElement; get(): string } {
  const el = document.createElement('div');
  el.className = 'slider-row';
  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  const select = document.createElement('select');
  select.id = id;
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    select.appendChild(opt);
  }
  el.append(labelEl, select);
  return { el, select, get: () => select.value };
}

/** Number input row (예측값 입력 등) */
export function numberRow(
  id: string,
  label: string,
  value: number,
  step = 0.1,
): { el: HTMLDivElement; get(): number | null } {
  const el = document.createElement('div');
  el.className = 'slider-row';
  el.innerHTML = `<label for="${id}">${label}</label>`;
  const input = document.createElement('input');
  input.type = 'number';
  input.id = id;
  input.value = String(value);
  input.step = String(step);
  input.inputMode = 'decimal';
  el.appendChild(input);
  return {
    el,
    get: () => {
      const v = Number(input.value);
      return Number.isFinite(v) ? v : null;
    },
  };
}
