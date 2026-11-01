// Museum: a draggable display case for the account's virtual keys. One fob per
// vehicle, tinted in the brand's signature colour and engraved with its logo.
// The carousel wraps around forever (three copies of the key set, seamlessly
// re-anchored whenever the view crosses into an adjacent copy), follows the
// finger one-to-one while dragging, and snaps with a distance-proportional
// ease; a flick throws a little further, also distance-proportional.
(function () {
  const ENTRY = document.getElementById('museumRow');
  if (!ENTRY) return;
  document.getElementById('museumIco').innerHTML = ICONS.key;
  document.getElementById('museumChev').innerHTML = ICONS.chev;

  let cars = [];
  let N = 0;        // number of keys
  let W = 0;        // slide width in px (the stage's width)
  let x = 1;        // carousel position in slide units; always kept in [1, 2N-1]
  let open = false; // sheet visible
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mod = (v, m) => ((v % m) + m) % m;

  const backdrop = document.createElement('div');
  backdrop.className = 'museum-backdrop';
  const sheet = document.createElement('section');
  sheet.className = 'museum-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Museum');
  sheet.innerHTML = `
    <div class="museum-head">
      <button class="icon-btn museum-close" aria-label="Close">${ICONS.back}</button>
      <h2>Museum</h2><span></span>
    </div>
    <div class="museum-stage-wrap">
      <div class="museum-empty" hidden>${ICONS.key}<p>No keys here yet</p><p class="m-note">Add a vehicle and its key goes on display.</p></div>
      <div class="museum-stage" tabindex="0" aria-label="Drag sideways to see the next key"><div class="museum-track"></div></div>
      <div class="museum-caption" hidden><div class="m-title"></div><div class="m-sub"></div></div>
      <div class="museum-foot" hidden>
        <div class="museum-dots" aria-label="Keys"></div>
        <span class="museum-count"></span>
      </div>
    </div>`;
  sheet.querySelector('.museum-close').onclick = close;
  document.body.append(backdrop, sheet);

  const stage = sheet.querySelector('.museum-stage');
  const track = sheet.querySelector('.museum-track');
  const emptyEl = sheet.querySelector('.museum-empty');
  const captionEl = sheet.querySelector('.museum-caption');
  const captionTitle = sheet.querySelector('.m-title');
  const captionSub = sheet.querySelector('.m-sub');
  const footEl = sheet.querySelector('.museum-foot');
  const dotsEl = sheet.querySelector('.museum-dots');
  const countEl = sheet.querySelector('.museum-count');
  stage.style.touchAction = 'pan-y'; // horizontal drags are ours, vertical scroll stays native

  // ---------- Rendering ----------
  // `x` slide units -> px offset, neighbour fobs' scale/alpha, and the caption.
  function render() {
    track.style.transform = `translate3d(${-(x * W)}px, 0, 0)`;
    const selI = mod(Math.round(x), N);
    for (let s = 0; s < 3 * N; s++) {
      const fob = track.children[s]?.firstElementChild;
      if (!fob) continue;
      const d = s - x;
      const near = Math.min(Math.abs(d), 1.15);
      if (near > 1.14 && fob.dataset.far) continue; // already fully hidden
      fob.dataset.far = near > 1.14 ? '1' : '';
      fob.style.opacity = (1 - Math.min(near, 1) * 0.55).toFixed(3);
      fob.style.transform = `scale(${(1 - Math.min(near, 1) * 0.16).toFixed(4)})`;
      fob.style.zIndex = s === Math.round(x) ? 1 : 0;
    }
    if (selI !== told) {
      told = selI;
      const car = cars[selI];
      captionTitle.textContent = car.title;
      captionSub.textContent = `${brandBySlug(car.brand).name} Virtual Key`;
      countEl.textContent = `${selI + 1} / ${N}`;
      [...dotsEl.children].forEach((d, k) => {
        d.classList.toggle('sel', k === selI);
        d.setAttribute('aria-pressed', String(k === selI));
      });
    }
  }
  let told = -1;

  // Slide one full copy in either direction; pixel-identical because the
  // copies repeat, so it can run mid-drag or mid-animation.
  function reband() {
    let shift = 0;
    const first = Math.round(x);
    if (first < 1) shift = N;
    else if (first > 2 * N - 1) shift = -N;
    if (shift) {
      x += shift;
      dragAnchor += shift;
      render();
    }
  }

  // ---------- Dragging: 1:1 with the finger ----------
  let dragging = false;
  let dragAnchor = 0;
  let flickSamples = [];

  stage.addEventListener('pointerdown', (e) => {
    if (N < 2) return;
    cancelTween();
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    dragAnchor = x;
    flickSamples = [{ t: performance.now(), px: e.clientX }];
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    flickSamples.push({ t: now, px: e.clientX });
    if (flickSamples.length > 6) flickSamples.shift();
    x = dragAnchor - (e.clientX - flickSamples[0].px) / W;
    reband(); // keeps x in band and the anchor in sync
    render();
  });
  stage.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    // Flick: keep ~220ms of finger velocity, measured over the last sliver.
    const last = flickSamples[flickSamples.length - 1];
    let first = flickSamples[0];
    for (const s of flickSamples) if (last.t - s.t < 100) { first = s; break; }
    const dt = last.t - first.t;
    const speed = dt > 10 ? (last.px - first.px) / dt : 0; // px/ms, finger space
    // x = anchor - dx/W, so a right-moving finger scrolls back: negate into slide space.
    snap(Math.round(x - (speed / W) * 220));
  });
  stage.addEventListener('pointercancel', () => {
    if (!dragging) return;
    dragging = false;
    snap(Math.round(x));
  });

  // ---------- Snapping tween ----------
  let tweenRaf = 0;
  function cancelTween() {
    if (tweenRaf) { cancelAnimationFrame(tweenRaf); tweenRaf = 0; }
  }
  // targetRaw: where the round-position should land. Among the representatives
  // of the same key (spaced N apart), animate to the one nearest the current x,
  // so the travel is no longer than one screen even across the wrap seam.
  function snap(targetRaw) {
    cancelTween();
    let target = targetRaw;
    for (const c of [targetRaw - N, targetRaw + N, targetRaw + 2 * N, targetRaw - 2 * N]) {
      if (c >= 1 && c <= 2 * N - 1 && Math.abs(c - x) < Math.abs(target - x)) target = c;
    }
    if (target < 1 || target > 2 * N - 1) target = mod(Math.round(target), N) + N;
    const from = x;
    const dist = Math.abs(target - from);
    if (dist < 0.001) return render();
    if (REDUCED) { x = target; return render(); }
    const dur = 180 + dist * 280; // proportional to how far it travels
    const t0 = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      x = from + (target - from) * easeOut(t);
      reband();
      render();
      if (t < 1) tweenRaf = requestAnimationFrame(frame);
      else { tweenRaf = 0; reband(); }
    };
    tweenRaf = requestAnimationFrame(frame);
    if (navigator.vibrate && !REDUCED) navigator.vibrate(6); // same tick as the car-page buttons
  }

  // Dots pick the shortest way around the loop; keyboard arrows step one key.
  dotsEl.addEventListener('click', (e) => {
    const i = [...dotsEl.children].indexOf(e.target);
    if (i < 0) return;
    const cur = mod(Math.round(x), N);
    if (i === cur) return;
    let delta = i - cur;
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    snap(Math.round(x) + delta);
  });

  // ---------- Building the fobs ----------
  function fobHtml(car) {
    return `
      <div class="keyfob" style="--tint:${brandTheme(car.brand).accent}">
        <span class="fob-ring"></span>
        ${logoHtml(car.brand, 'fob-logo')}
        <div class="fob-brand">${escapeHtml(brandBySlug(car.brand).name)}</div>
        <div class="fob-btns">
          <span class="fob-btn">${ICONS.lock}</span>
          <span class="fob-btn big">${ICONS.unlock}</span>
          <span class="fob-btn">${ICONS.trunk}</span>
        </div>
      </div>`;
  }

  function build(list) {
    cars = list;
    N = cars.length;
    told = -1;
    const empty = !N;
    emptyEl.hidden = !empty;
    stage.hidden = empty;
    captionEl.hidden = empty;
    footEl.hidden = empty;
    if (empty) return;
    W = stage.clientWidth;
    const slide = (car) => `<div class="keyslide">${fobHtml(car)}</div>`;
    track.innerHTML = [0, 1, 2].map(() => cars.map(slide).join('')).join('');
    dotsEl.innerHTML = cars.map((_, k) =>
      `<button type="button" aria-label="Key ${k + 1} of ${N}"></button>`).join('');
    x = N; // start the first key, which lives at the middle copy's head
    render();
  }

  // ---------- Open / close ----------
  async function show() {
    if (open) return close();
    open = true;
    document.body.classList.add('museum-open');
    build(await DB.getCars());
    if (!stage.hidden) stage.focus({ preventScroll: true });
  }
  function close() {
    open = false;
    cancelTween();
    document.body.classList.remove('museum-open');
  }
  ENTRY.onclick = show;
  backdrop.onclick = close;

  window.addEventListener('keydown', (e) => {
    if (!open || N < 2) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') snap(Math.round(x) - 1);
    else if (e.key === 'ArrowRight') snap(Math.round(x) + 1);
  });

  // ---------- Entry subtitle + resize ----------
  DB.getCars().then((list) => {
    document.getElementById('museumSub').textContent =
      list.length ? `${list.length} ${list.length === 1 ? 'key' : 'keys'} on display` : 'Add your first key';
  });
  window.addEventListener('resize', () => {
    if (!open || !N) return;
    W = stage.clientWidth;
    const re = mod(Math.round(x), N) + N; // same key, anchored in the band
    x = re;
    track.style.transition = 'none';
    render();
    track.style.transition = '';
  });
})();
