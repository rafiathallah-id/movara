// MOVARA: webcam-based embodied virtual lab (smong, Rumoh Aceh, evacuation).
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const S = window.SCENES, ICON = S.ICON;

  // ---------------- language ----------------
  let lang = "en";
  try { lang = localStorage.getItem("movara-lang") || ((navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en"); } catch (e) { /* ignore */ }
  const t = (k) => (window.I18N[lang] && window.I18N[lang][k] !== undefined ? window.I18N[lang][k] : window.I18N.en[k]);
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const strip = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent || ""; };

  // ---------------- state ----------------
  const state = {
    mode: null,          // "cam" | "mouse"
    fallback: false,     // tracking failed: show buttons even in cam mode
    soundOn: true,
    stepName: null,
    startTime: 0,
    retries: { m1: 0, m2: 0, m3: 0 },
    base: null,          // calibration baseline
    quiz: {}
  };
  let step = null;
  let timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  // ---------------- elements ----------------
  const app = $("#app"), scene = $("#scene"), video = $("#video"), overlay = $("#overlay"), octx = overlay.getContext("2d");
  const camStatus = $("#cam-status"), camMouse = $("#cam-mouse"), fb = $("#feedback"), controlsEl = $("#controls");

  // ---------------- audio ----------------
  let actx = null, rumbleSrc = null, rumbleGain = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } return actx; }
  function tone(freq, dur, type = "sine", vol = 0.12, when = 0) {
    const c = ac(); if (!c || !state.soundOn) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
    o.connect(g).connect(c.destination); o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.05);
  }
  const chime = () => { tone(660, 0.18); tone(990, 0.3, "sine", 0.1, 0.12); };
  const buzz = () => { tone(170, 0.28, "square", 0.06); };
  const tick = () => tone(880, 0.05, "triangle", 0.05);
  function rumble(on) {
    const c = ac(); if (!c) return;
    if (on && !rumbleSrc && state.soundOn) {
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      rumbleSrc = c.createBufferSource(); rumbleSrc.buffer = buf; rumbleSrc.loop = true;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 90;
      rumbleGain = c.createGain(); rumbleGain.gain.value = 0.0001;
      rumbleSrc.connect(f).connect(rumbleGain).connect(c.destination); rumbleSrc.start();
      rumbleGain.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.6);
    } else if (!on && rumbleSrc) {
      const src = rumbleSrc, g = rumbleGain; rumbleSrc = null;
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5); setTimeout(() => { try { src.stop(); } catch (e) { /* */ } }, 600);
    }
  }
  function speak(text) {
    if (!state.soundOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(strip(text));
      u.lang = lang === "id" ? "id-ID" : "en-US"; u.rate = 1;
      const v = speechSynthesis.getVoices().find(v => v.lang.replace("_", "-").toLowerCase().startsWith(lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  // ---------------- UI helpers ----------------
  function setInstr(eyebrow, title, text, icon, say = true) {
    $("#instr-eyebrow").textContent = eyebrow; $("#instr-title").textContent = title;
    $("#instr-text").innerHTML = text; $("#instr-icon").innerHTML = ICON[icon] || "";
    if (say) speak(title + ". " + strip(text));
  }
  function setFeedback(kind, html, say = true) {
    fb.hidden = !html; fb.className = "feedback " + (kind || ""); fb.innerHTML = html || "";
    if (html && say) speak(html);
  }
  function setProgress(label, frac, value) {
    $("#prog-label").textContent = label; $("#prog-value").textContent = value || "";
    $("#prog-fill").style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
  }
  function button(label, onClick, cls = "", key = "") {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn " + cls; b.innerHTML = label + (key ? ` <kbd>${key}</kbd>` : "");
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  function setControls(nodes) { controlsEl.innerHTML = ""; (nodes || []).forEach(n => controlsEl.appendChild(n)); }
  const usesButtons = () => state.mode === "mouse" || state.fallback;
  function refreshControls() { setControls(step && step.controls ? step.controls() : []); }

  const MOD = { m1: ["m1a", "m1info", "m1seis", "m1b", "m1v1", "m1v2", "m1c", "m1done"], m2: ["m2a", "m2info", "m2l1", "m2l2", "m2res", "m2b", "m2q", "m2done"], m3: ["m3a", "m3route", "m3b", "m3done"] };
  const GROUP = { welcome: -1, setup: 0, reflect: 4 };
  Object.values(MOD).forEach((arr, i) => arr.forEach(s => { GROUP[s] = i + 1; }));
  function prog(sub = 0, extra = "") {
    for (const [k, arr] of Object.entries(MOD)) {
      const i = arr.indexOf(state.stepName);
      if (i >= 0) { setProgress(t(k + "Name"), (i + Math.max(0, Math.min(1, sub))) / arr.length, `${i + 1} / ${arr.length}${extra}`); return; }
    }
  }
  const DONE_AT = { m1done: 1, m2done: 2, m3done: 3, reflect: 4 };
  function renderStepper() {
    const g = GROUP[state.stepName] ?? -1;
    const labels = t("steps");
    $("#stepper").innerHTML = labels.map((l, i) => {
      const done = i < g || (DONE_AT[state.stepName] !== undefined && i === g && state.stepName !== "reflect");
      const cls = i === g ? (done ? "done" : "current") : (i < g ? "done" : "");
      return `<li class="${cls}"><span class="dot">${i < g || done ? "✓" : i + 1}</span><span class="lbl">${l}</span></li>`;
    }).join("");
  }
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $("#btn-lang").textContent = lang === "en" ? "ID" : "EN";
    $("#about-body").innerHTML = t("aboutHtml");
  }

  // ---------------- scene cursor & choices ----------------
  let cursorEl = null;
  function addCursor() { cursorEl = document.createElement("div"); cursorEl.className = "cursor"; cursorEl.hidden = true; scene.appendChild(cursorEl); }
  function showCursor(nx, ny, pinch) {
    if (!cursorEl) return;
    cursorEl.hidden = false; cursorEl.style.left = nx * 100 + "%"; cursorEl.style.top = ny * 100 + "%";
    cursorEl.classList.toggle("pinch", !!pinch);
  }
  function hideCursor() { if (cursorEl) cursorEl.hidden = true; }
  function sceneRectOf(el) {
    const s = scene.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x0: (r.left - s.left) / s.width, x1: (r.right - s.left) / s.width, y0: (r.top - s.top) / s.height, y1: (r.bottom - s.top) / s.height };
  }
  function makeChoices(items, onPick) {
    const wrap = document.createElement("div"); wrap.className = "choices";
    items.forEach((it, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.dataset.id = it.id;
      b.innerHTML = `<span class="letter">${"AB"[i]}</span>${it.icon ? ICON[it.icon] : ""}<span>${it.text}</span><span class="dwell"></span>`;
      b.addEventListener("click", () => onPick(it.id, b));
      wrap.appendChild(b);
    });
    scene.appendChild(wrap);
    return wrap;
  }
  // dwell selection with a pointing cursor
  function dwellUpdate(dw, wrap, nx, ny, dt, onPick) {
    let hit = null;
    wrap.querySelectorAll(".choice").forEach(c => {
      const r = sceneRectOf(c), inside = nx >= r.x0 && nx <= r.x1 && ny >= r.y0 && ny <= r.y1;
      c.classList.toggle("hover", inside); if (inside) hit = c;
    });
    if (hit && dw.el === hit) dw.t += dt; else { dw.el = hit; dw.t = 0; }
    wrap.querySelectorAll(".dwell").forEach(d => d.style.width = "0");
    if (hit) {
      hit.querySelector(".dwell").style.width = Math.min(100, dw.t / 1.4 * 100) + "%";
      if (dw.t >= 1.4) { dw.t = -1.2; onPick(hit.dataset.id, hit); }
    }
  }

  // ---------------- camera & tracking ----------------
  let stream = null, pose = null, hands = null;
  const ready = { pose: false, hands: false };
  let activeModel = null, lastPose = null, lastHands = [], lastPoseAt = 0, loopRunning = false;
  let ASPECT = 4 / 3;

  async function startCamera() {
    if (!window.isSecureContext) throw new Error("insecure");
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
    video.srcObject = stream; await video.play();
    overlay.width = video.videoWidth || 640; overlay.height = video.videoHeight || 480;
    ASPECT = (video.videoWidth || 640) / (video.videoHeight || 480);
  }
  async function ensureModel(name) {
    if (name === "pose" && !pose) {
      pose = new window.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}` });
      pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose.onResults(onPoseResults);
      await pose.initialize(); ready.pose = true;
    }
    if (name === "hands" && !hands) {
      hands = new window.Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}` });
      hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
      hands.onResults(onHandsResults);
      await hands.initialize(); ready.hands = true;
    }
  }
  function useModel(name) {
    activeModel = name; lastPose = null; lastHands = []; lastPoseAt = performance.now();
    if (state.mode !== "cam" || !name) { camStatus.textContent = ""; return; }
    if (!ready[name]) {
      camStatus.textContent = t("loadingModel");
      ensureModel(name).then(() => { if (activeModel === name) camStatus.textContent = ""; }).catch(err => {
        console.error(err); state.fallback = true; camStatus.textContent = t("modelFail"); refreshControls();
      });
    }
    if (!loopRunning) trackLoop();
  }
  async function trackLoop() {
    loopRunning = true;
    while (state.mode === "cam") {
      const m = activeModel === "pose" && ready.pose ? pose : activeModel === "hands" && ready.hands ? hands : null;
      if (m && video.readyState >= 2) {
        try { await m.send({ image: video }); } catch (e) { console.warn(e); }
      } else drawOverlay();
      await new Promise(r => requestAnimationFrame(r));
    }
    loopRunning = false;
  }
  function onPoseResults(res) {
    if (activeModel !== "pose") return;
    lastPose = res.poseLandmarks || null;
    if (lastPose) lastPoseAt = performance.now();
    drawOverlay();
    if (step && step.onPose) step.onPose(lastPose);
  }
  function onHandsResults(res) {
    if (activeModel !== "hands") return;
    lastHands = res.multiHandLandmarks || [];
    drawOverlay();
    if (step && step.onHands) step.onHands(lastHands);
  }
  const POSE_CONN = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [15, 19], [16, 20], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32]];
  const HAND_CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
  function drawOverlay() {
    const w = overlay.width, h = overlay.height;
    octx.clearRect(0, 0, w, h);
    const X = p => (1 - p.x) * w, Y = p => p.y * h;
    octx.lineWidth = Math.max(2, w / 220); octx.strokeStyle = "rgba(0,224,255,.9)"; octx.fillStyle = "#ffffff";
    if (activeModel === "pose" && lastPose) {
      POSE_CONN.forEach(([a, b]) => { const p = lastPose[a], q = lastPose[b]; if ((p.visibility ?? 1) < .4 || (q.visibility ?? 1) < .4) return; octx.beginPath(); octx.moveTo(X(p), Y(p)); octx.lineTo(X(q), Y(q)); octx.stroke(); });
      [0, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28].forEach(i => { const p = lastPose[i]; if ((p.visibility ?? 1) < .4) return; octx.beginPath(); octx.arc(X(p), Y(p), w / 110, 0, 7); octx.fill(); octx.stroke(); });
    }
    if (activeModel === "hands") {
      lastHands.forEach(hd => {
        HAND_CONN.forEach(([a, b]) => { octx.beginPath(); octx.moveTo(X(hd[a]), Y(hd[a])); octx.lineTo(X(hd[b]), Y(hd[b])); octx.stroke(); });
        hd.forEach((p, i) => { octx.beginPath(); octx.arc(X(p), Y(p), (i === 4 || i === 8) ? w / 70 : w / 160, 0, 7); octx.fill(); });
      });
    }
    if (state.mode === "cam" && activeModel === "pose" && ready.pose && !lastPose && performance.now() - lastPoseAt > 1500) camStatus.textContent = t("noPerson");
    else if (camStatus.textContent === t("noPerson")) camStatus.textContent = "";
  }

  // ---------------- pose geometry ----------------
  const vis = (lm, i, th = 0.5) => lm && lm[i] && (lm[i].visibility ?? 1) > th;
  const dist = (a, b) => Math.hypot((a.x - b.x) * ASPECT, a.y - b.y);
  const shW = lm => dist(lm[11], lm[12]);
  const shY = lm => (lm[11].y + lm[12].y) / 2;
  function handRaised(lm) {
    if (!lm || !vis(lm, 11) || !vis(lm, 12)) return false;
    const sw = shW(lm);
    return (vis(lm, 15, .4) && lm[15].y < lm[11].y - 0.3 * sw) || (vis(lm, 16, .4) && lm[16].y < lm[12].y - 0.3 * sw);
  }
  function posePointer(lm) {
    if (!lm) return null;
    const c = [19, 20].filter(i => vis(lm, i, .4)).map(i => lm[i]).filter(p => p.y < (vis(lm, 23) ? lm[23].y : 1));
    if (!c.length) return null;
    const p = c.sort((a, b) => a.y - b.y)[0];
    return { x: clamp(((1 - p.x) - 0.15) / 0.7), y: clamp((p.y - 0.08) / 0.62) };
  }
  const clamp = v => Math.max(0, Math.min(1, v));
  function handPointer(hd) {
    const mx = (hd[4].x + hd[8].x) / 2, my = (hd[4].y + hd[8].y) / 2;
    return { x: clamp(((1 - mx) - 0.12) / 0.76), y: clamp((my - 0.08) / 0.72) };
  }
  const pinchRatio = hd => Math.hypot((hd[4].x - hd[8].x) * ASPECT, hd[4].y - hd[8].y) / Math.max(1e-4, Math.hypot((hd[0].x - hd[9].x) * ASPECT, hd[0].y - hd[9].y));

  // hold-to-confirm helper for poses
  function holdDetector(seconds) {
    let t0 = null;
    return (on) => { if (!on) { t0 = null; return false; } if (t0 === null) t0 = performance.now(); return (performance.now() - t0) / 1000 >= seconds; };
  }

  // ---------------- navigation ----------------
  function go(name) {
    timers.forEach(clearTimeout); timers = [];
    if (step && step.exit) step.exit();
    rumble(false);
    cursorEl = null;
    state.stepName = name; step = STEPS[name];
    const full = name === "welcome" || name === "reflect";
    app.classList.toggle("full", full);
    scene.className = "scene" + (full ? " free" : "");
    scene.innerHTML = "";
    setFeedback(null, ""); setControls([]);
    camMouse.hidden = state.mode !== "mouse";
    renderStepper();
    prog(0);
    step.enter();
    refreshControls();
    try { history.replaceState(null, "", name === "welcome" ? location.pathname : "#" + name); } catch (e) { /* */ }
  }

  // ---------------- frame ticker ----------------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (step && step.tick) step.tick(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // =====================================================================
  // STEPS
  // =====================================================================
  const STEPS = {};

  // ---------------- welcome ----------------
  STEPS.welcome = {
    enter() {
      useModel(null);
      const mod = (n, name, desc, svg) => `<div class="mod-card"><div class="thumb">${svg}</div><div><p class="num">${t(n)}</p><h3>${t(name)}</h3><p>${t(desc)}</p></div></div>`;
      const thumb = (svg, vb) => svg.replace('viewBox="0 0 1000 600" preserveAspectRatio="none"', `viewBox="${vb}" preserveAspectRatio="xMidYMid slice"`).replace('class="world"', "");
      scene.innerHTML = `<div class="welcome">
        <div class="hero">
          <p class="tag">${t("wTag")}</p>
          <h1>${t("wTitle")}</h1>
          <p>${t("wText")}</p>
          <div class="req">${t("wReq").map(r => `<span>${r}</span>`).join("")}</div>
          <div class="actions" id="w-actions"></div>
          <p class="cam-error" id="cam-err" hidden></p>
          <p class="motto">${t("wMotto")}</p>
          <svg class="hero-wave" viewBox="0 0 200 120" aria-hidden="true"><path d="M0 80c25-30 50-30 75 0s50 30 75 0 35-30 50-20" fill="none" stroke="currentColor" stroke-width="10"/><path d="M0 110c25-30 50-30 75 0s50 30 75 0 35-30 50-20" fill="none" stroke="currentColor" stroke-width="10"/></svg>
        </div>
        <div class="modules">
          ${mod("m1Num", "m1Name", "m1Desc", thumb(S.village(), "180 300 400 300"))}
          ${mod("m2Num", "m2Name", "m2Desc", thumb(S.rumoh(), "200 60 600 480").replace('<g id="tray">', '<g id="tray" display="none">'))}
          ${mod("m3Num", "m3Name", "m3Desc", thumb(S.climb(), "350 120 600 420"))}
          <p class="privacy">${t("wPrivacy")}</p>
        </div></div>`;
      // the Rumoh Aceh thumbnail shows the finished frame
      const rth = scene.querySelectorAll(".thumb svg")[1];
      if (rth) {
        const placed = rth.querySelector("#placed");
        S.RUMOH.parts.forEach((p, i) => { const sl = ["col0", "col1", "col2", "floor", "top", "roof"][i], s = S.RUMOH.slots[sl]; placed.insertAdjacentHTML("beforeend", `<g transform="translate(${s.x} ${s.y})">${S.partShape(p.kind)}</g>`); });
        rth.querySelectorAll(".slot").forEach(e => e.remove());
      }
      const acts = $("#w-actions");
      acts.appendChild(button(t("wStart"), startCam, "primary big"));
      acts.appendChild(button(t("wMouse"), startMouse, "big"));
    }
  };
  async function startCam() {
    ac(); state.startTime = performance.now(); state.retries = { m1: 0, m2: 0, m3: 0 }; state.quiz = {};
    try {
      await startCamera();
      state.mode = "cam"; state.fallback = false;
      go("setup");
    } catch (e) {
      console.warn(e);
      const el = $("#cam-err"); if (el) { el.hidden = false; el.textContent = e && e.message === "insecure" ? t("camInsecure") : t("camDenied"); }
    }
  }
  function startMouse() {
    ac(); state.startTime = performance.now(); state.retries = { m1: 0, m2: 0, m3: 0 }; state.quiz = {};
    state.mode = "mouse"; state.fallback = false; state.base = null;
    if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
    go("setup");
  }

  // ---------------- setup ----------------
  STEPS.setup = {
    enter() {
      scene.innerHTML = S.village({ label: t("scSimeulue") });
      scene.querySelector("svg").style.filter = "blur(3px) saturate(.8)";
      setProgress(t("steps")[0], 0, "");
      if (state.mode === "mouse") {
        setInstr(t("sEyebrow"), t("setupMouseTitle"), t("setupMouseText"), "body");
        scene.insertAdjacentHTML("beforeend", `<div class="card-overlay"><h2>${t("setupMouseTitle")}</h2><p class="lead">${t("setupMouseText")}</p><div id="go-wrap"></div></div>`);
        $("#go-wrap").appendChild(button(t("begin"), () => go("m1a"), "primary big"));
        setProgress(t("steps")[0], 1, "");
        return;
      }
      useModel("pose");
      setInstr(t("sEyebrow"), t("sTitle"), t("sText"), "body");
      scene.insertAdjacentHTML("beforeend", `<div class="card-overlay"><h2>${t("sTitle")}</h2><p class="lead">${t("sText")}</p>
        <ul class="points" id="checks" style="list-style:none;padding:0"></ul>
        <div class="bar"><div class="bar-fill" id="still-bar" style="background:var(--ok)"></div></div></div>`);
      this.still = 0; this.prev = null; this.done = false; this.bright = 0; this.lastB = 0; this.body = false;
      this.cv = document.createElement("canvas"); this.cv.width = 32; this.cv.height = 24;
      later(() => { this.showSkip = true; refreshControls(); }, 8000);
      this.renderChecks();
    },
    controls() {
      if (state.mode === "mouse") return [];
      return this.showSkip || state.fallback ? [button(t("skipCalib"), () => this.finish(true))] : [];
    },
    renderChecks() {
      const c = (ok, label) => `<li style="display:flex;gap:10px;align-items:center;font-weight:600"><span class="ok-chip" style="${ok ? "" : "background:var(--sand);color:var(--ink-soft)"}">${ok ? "✓" : "…"}</span>${label}</li>`;
      const el = $("#checks"); if (el) el.innerHTML = c(this.body, t("chkBody")) + c(this.bright > 55, t("chkLight")) + c(this.still >= 3, t("chkStill"));
    },
    tick(dt) {
      if (state.mode !== "cam" || this.done) return;
      const now = performance.now();
      if (now - this.lastB > 500 && video.readyState >= 2) {
        this.lastB = now;
        try {
          const cx = this.cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(video, 0, 0, 32, 24);
          const d = cx.getImageData(0, 0, 32, 24).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
          this.bright = s / (d.length / 4);
        } catch (e) { this.bright = 100; }
        this.renderChecks();
      }
      const lm = lastPose;
      this.body = !!lm && [0, 11, 12, 23, 24, 25, 26, 27, 28].every(i => vis(lm, i, .5) && lm[i].x > 0.01 && lm[i].x < 0.99 && lm[i].y > 0.01 && lm[i].y < 0.995);
      let moving = true;
      if (lm && this.prev) moving = Math.hypot(lm[11].x - this.prev[0], lm[11].y - this.prev[1]) > 0.012;
      if (lm) this.prev = [lm[11].x, lm[11].y];
      if (this.body && this.bright > 55 && !moving) this.still += dt; else if (moving || !this.body) this.still = Math.max(0, this.still - dt * 2);
      const f = Math.min(1, this.still / 3);
      const bar = $("#still-bar"); if (bar) bar.style.width = f * 100 + "%";
      setProgress(t("steps")[0], f, "");
      if (this.still >= 3) this.finish(false);
    },
    finish(skip) {
      if (this.done) return; this.done = true;
      const lm = lastPose;
      if (lm && vis(lm, 11) && vis(lm, 12)) {
        state.base = { shY: shY(lm), sw: shW(lm), hipY: vis(lm, 23) ? (lm[23].y + lm[24].y) / 2 : null, kneeY: vis(lm, 25) ? (lm[25].y + lm[26].y) / 2 : null };
      } else state.base = null;
      this.renderChecks(); chime();
      setFeedback("ok", t("calibrated"));
      setProgress(t("steps")[0], 1, "");
      later(() => go("m1a"), skip ? 300 : 1500);
    }
  };

  // ---------------- Module 1 ----------------
  function m1Scene(receded) {
    scene.innerHTML = S.village({ label: t("scSimeulue") });
    const sea = scene.querySelector("#sea");
    if (receded) {
      sea.style.transition = "none"; sea.style.transform = "translate(-240px,0)";
      scene.querySelectorAll(".tilt").forEach((b, i) => { b.style.transition = "none"; b.style.transform = `rotate(${i ? 12 : -14}deg)`; });
      scene.querySelector("#hwave").style.opacity = ".55";
    }
    scene.insertAdjacentHTML("beforeend", `<div class="badges" id="badges"></div>`);
    addCursor();
  }
  function addBadge(text) { const b = $("#badges"); if (b) b.insertAdjacentHTML("beforeend", `<div class="badge"><i>✓</i>${text}</div>`); }

  STEPS.m1a = {
    enter() {
      m1Scene(false); useModel("pose");
      setInstr(t("m1Eyebrow"), t("q1Title"), t("q1Text"), "hand");
      this.done = false; this.hold = holdDetector(0.4);
      later(() => { scene.querySelector("svg").classList.add("shake"); rumble(true); }, 700);
    },
    controls() { return usesButtons() ? [button(t("q1Btn"), () => this.ok(), "primary", "Space")] : []; },
    onKey(e) { if (e.code === "Space") { e.preventDefault(); this.ok(); } },
    onPose(lm) { if (!this.done && this.hold(handRaised(lm))) this.ok(); },
    ok() {
      if (this.done) return; this.done = true;
      scene.querySelector("svg").classList.remove("shake"); rumble(false); chime();
      addBadge(t("badge1")); setFeedback("ok", t("q1Ok")); prog(1);
      later(() => go("m1info"), 2600);
    },
    exit() { rumble(false); }
  };

  function choiceStep(cfg) {
    return {
      enter() {
        m1Scene(cfg.receded); useModel("pose");
        cfg.badges.forEach(k => addBadge(t(k)));
        setInstr(t("m1Eyebrow"), t(cfg.title), usesButtons() ? t(cfg.mouse) : t(cfg.text), "point");
        this.done = false; this.dw = { el: null, t: 0 }; this.wrap = null; this.p = null;
        if (cfg.onEnter) cfg.onEnter();
        later(() => {
          this.wrap = makeChoices(cfg.items.map(it => ({ id: it.id, icon: it.icon, text: t(it.text) })), (id, el) => this.pick(id, el));
        }, cfg.delay || 0);
      },
      controls() { return []; },
      onPose(lm) {
        if (!this.wrap || this.done) { hideCursor(); return; }
        const p = posePointer(lm);
        if (!p) { hideCursor(); this.dw.el = null; this.dw.t = 0; return; }
        this.p = this.p ? { x: this.p.x + (p.x - this.p.x) * .4, y: this.p.y + (p.y - this.p.y) * .4 } : p;
        showCursor(this.p.x, this.p.y);
      },
      tick(dt) {
        if (state.mode !== "cam" || !this.wrap || this.done || !this.p || !lastPose) return;
        dwellUpdate(this.dw, this.wrap, this.p.x, this.p.y, dt, (id, el) => this.pick(id, el));
      },
      pick(id, el) {
        if (this.done) return;
        quizScore(state.stepName, id === cfg.correct);
        if (id === cfg.correct) {
          this.done = true; el.classList.add("right"); chime(); hideCursor();
          setFeedback("ok", t(cfg.ok)); prog(1);
          if (cfg.badge) addBadge(t(cfg.badge));
          if (cfg.onRight) cfg.onRight();
          later(() => go(cfg.next), cfg.wait || 3600);
        } else {
          state.retries.m1++; buzz(); el.classList.remove("wrong"); void el.offsetWidth; el.classList.add("wrong");
          setFeedback("err", t(cfg.err));
          later(() => el.classList.remove("wrong"), 900);
        }
      }
    };
  }
  STEPS.m1b = choiceStep({
    receded: false, badges: ["badge1"], title: "q2Title", text: "q2Text", mouse: "q2Mouse", prog: 1 / 3, progText: "2 / 3",
    items: [{ id: "a", icon: "recede", text: "q2A" }, { id: "b", icon: "rain", text: "q2B" }], correct: "a",
    ok: "q2Ok", err: "q2Err", badge: "badge2", next: "m1v1", delay: 3600, wait: 4800,
    onEnter() {
      later(() => {
        scene.querySelector("#sea").style.transform = "translate(-240px,0)";
        scene.querySelectorAll(".tilt").forEach((b, i) => b.style.transform = `rotate(${i ? 12 : -14}deg)`);
        scene.querySelector("#hwave").style.opacity = ".55";
      }, 300);
    }
  });
  STEPS.m1c = choiceStep({
    receded: true, badges: ["badge1", "badge2"], title: "q3Title", text: "q3Text", mouse: "q3Mouse", prog: 2 / 3, progText: "3 / 3",
    items: [{ id: "b", icon: "fish", text: "q3B" }, { id: "a", icon: "hill", text: "q3A" }], correct: "a",
    ok: "q3Ok", err: "q3Err", next: "m1done", wait: 4200,
    onRight() { const p = scene.querySelector("#people"); if (p) p.style.transform = "translate(370px,-245px) scale(.9)"; }
  });

  function continueCard(title, lead, inner, nextName, howKey, model) {
    scene.insertAdjacentHTML("beforeend", `<div class="card-overlay"><h2>${title}</h2><p class="lead">${lead}</p>${inner}<div id="cont"></div></div>`);
    $("#cont").appendChild(button(t("continueBtn"), () => go(nextName), "primary", "Enter"));
    useModel(model);
    return { hold: holdDetector(0.6), howKey };
  }
  const chainHtml = (items) => `<div class="chain">${items.map((it, i) => `${i ? '<span class="arrow">→</span>' : ""}<div class="node">${ICON[it[0]]}<span>${it[1]}</span></div>`).join("")}</div>`;

  STEPS.m1done = {
    enter() {
      m1Scene(true);
      const p = scene.querySelector("#people"); p.style.transition = "none"; p.style.transform = "translate(370px,-245px) scale(.9)";
      ["badge1", "badge2"].forEach(k => addBadge(t(k)));
      this.c = continueCard(t("m1DoneTitle"), t("m1DoneLead"), chainHtml([["quake", t("chain1")], ["recede", t("chain2")], ["hill", t("chain3")]]), "m2a", "raiseToContinue", "pose");
      setInstr(t("m1Eyebrow"), t("m1DoneTitle"), usesButtons() ? t("continueBtn") : t("raiseToContinue"), "hand");
      prog(1);
      this.armed = false; later(() => this.armed = true, 1500);
    },
    onPose(lm) { if (this.armed && this.c.hold(handRaised(lm))) { this.armed = false; go("m2a"); } },
    onKey(e) { if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); go("m2a"); } }
  };

  // ---------------- Module 2 ----------------
  const NAMES = { col: "partCol", floor: "partFloor", top: "partTop", roof: "partRoof" };
  const OKS = { col: "okCol", floor: "okFloor", top: "okTop", roof: "okRoof" };
  function m2Scene() {
    scene.innerHTML = S.rumoh({ label: t("scRumoh"), trayLabel: t("parts") });
    addCursor();
  }
  function placeAll() {
    const placed = scene.querySelector("#placed");
    ["col0", "col1", "col2", "floor", "top", "roof"].forEach(sl => {
      const s = S.RUMOH.slots[sl];
      placed.insertAdjacentHTML("beforeend", `<g transform="translate(${s.x} ${s.y})">${S.partShape(s.kind)}</g>`);
    });
    scene.querySelectorAll(".slot").forEach(e => e.classList.add("filled"));
  }
  STEPS.m2a = {
    enter() {
      m2Scene(); useModel("hands");
      setInstr(t("m2Eyebrow"), t("b1Title"), usesButtons() ? t("b1Mouse") : t("b1Text"), "pinch");
      this.parts = S.RUMOH.parts.map(p => ({ ...p, x: p.tray[0], y: p.tray[1], scale: p.s, placed: false }));
      this.filled = {}; this.drag = null; this.pinching = false; this.count = 0; this.done = false;
      const layer = scene.querySelector("#parts");
      this.parts.forEach(p => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "part"); g.dataset.id = p.id; g.innerHTML = S.partShape(p.kind);
        p.el = g; layer.appendChild(g); this.pos(p);
        g.addEventListener("pointerdown", (e) => { if (p.placed || this.done) return; e.preventDefault(); try { scene.setPointerCapture(e.pointerId); } catch (x) { /* */ } this.grab(p); this.mouseMove(e); });
      });
      this.onMove = (e) => { if (this.drag && this.drag.byMouse) this.mouseMove(e); };
      this.onUp = () => { if (this.drag && this.drag.byMouse) this.release(); };
      scene.addEventListener("pointermove", this.onMove); window.addEventListener("pointerup", this.onUp);
      this.updateSlots(); this.updateProgress();
    },
    exit() { scene.removeEventListener("pointermove", this.onMove); window.removeEventListener("pointerup", this.onUp); },
    pos(p) { p.el.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${p.scale})`); },
    svgPoint(nx, ny) { return [nx * 1000, ny * 600]; },
    mouseMove(e) {
      const r = scene.getBoundingClientRect();
      const [x, y] = this.svgPoint((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      if (this.drag) { const p = this.drag.part; p.x = x; p.y = y; this.pos(p); }
    },
    grab(p, byHand) {
      this.drag = { part: p, byMouse: !byHand };
      p.scale = 0.85; p.el.classList.add("dragging"); p.el.parentNode.appendChild(p.el); this.pos(p);
      tick(); setFeedback("", `<b>${t(NAMES[p.kind])}</b>`, false);
    },
    nextKinds() {
      const cols = ["col0", "col1", "col2"].filter(k => this.filled[k]).length;
      if (cols < 3) return ["col"];
      const beams = ["floor", "top"].filter(k => this.filled[k]).length;
      return beams < 2 ? ["floor", "top"] : ["roof"];
    },
    updateSlots() {
      const nk = this.nextKinds();
      scene.querySelectorAll(".slot").forEach(s => {
        const sl = S.RUMOH.slots[s.dataset.slot];
        s.classList.toggle("filled", !!this.filled[s.dataset.slot]);
        s.classList.toggle("next", !this.filled[s.dataset.slot] && nk.includes(sl.kind));
      });
    },
    updateProgress() { prog(this.count / 6, ` · ${this.count}/6`); },
    toTray(p, bounce) {
      p.x = p.tray[0]; p.y = p.tray[1]; p.scale = p.s; p.el.classList.remove("dragging"); this.pos(p);
      if (bounce) { p.el.classList.remove("bounce"); void p.el.getBBox(); p.el.classList.add("bounce"); }
    },
    release() {
      const d = this.drag; if (!d) return; this.drag = null;
      const p = d.part;
      let best = null, bestD = 1e9, any = null, anyD = 1e9;
      Object.entries(S.RUMOH.slots).forEach(([k, s]) => {
        if (this.filled[k]) return;
        const dd = Math.hypot(s.x - p.x, s.y - p.y);
        if (dd < anyD) { anyD = dd; any = k; }
        if (s.kind === p.kind && dd < bestD) { bestD = dd; best = k; }
      });
      const R = p.kind === "roof" ? 120 : 95;
      if (best && bestD < R) {
        const nk = this.nextKinds();
        if (!nk.includes(p.kind)) {
          buzz(); state.retries.m2++; this.toTray(p, true);
          setFeedback("err", t(p.kind === "roof" ? "errOrderRoof" : "errOrderBeam")); return;
        }
        const s = S.RUMOH.slots[best];
        this.filled[best] = true; p.placed = true; p.x = s.x; p.y = s.y; p.scale = 1;
        p.el.classList.remove("dragging"); p.el.classList.add("placed");
        scene.querySelector("#placed").appendChild(p.el); this.pos(p);
        this.count++; chime(); setFeedback("ok", t(OKS[p.kind])); this.updateSlots(); this.updateProgress();
        if (this.count === 6) { this.done = true; hideCursor(); later(() => go("m2info"), 2600); }
      } else if (any && anyD < 95) {
        buzz(); state.retries.m2++; this.toTray(p, true); setFeedback("err", t("errSlot"));
      } else this.toTray(p, false);
    },
    onHands(hs) {
      if (this.done) { hideCursor(); return; }
      if (!hs.length) { hideCursor(); if (this.drag && !this.drag.byMouse) this.release(); return; }
      let hd = hs[0];
      if (hs.length > 1 && pinchRatio(hs[1]) < pinchRatio(hs[0])) hd = hs[1];
      const ptr = handPointer(hd), r = pinchRatio(hd);
      this.c = this.c ? { x: this.c.x + (ptr.x - this.c.x) * .45, y: this.c.y + (ptr.y - this.c.y) * .45 } : ptr;
      if (!this.pinching && r < 0.3) {
        this.pinching = true;
        const [x, y] = this.svgPoint(this.c.x, this.c.y);
        let best = null, bd = 1e9;
        this.parts.forEach(p => { if (p.placed) return; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } });
        if (best && bd < 90) this.grab(best, true);
      } else if (this.pinching && r > 0.45) {
        this.pinching = false;
        if (this.drag && !this.drag.byMouse) this.release();
      }
      showCursor(this.c.x, this.c.y, this.pinching);
      if (this.drag && !this.drag.byMouse) { const p = this.drag.part; [p.x, p.y] = this.svgPoint(this.c.x, this.c.y); this.pos(p); }
    }
  };

  function bothHandsUp(hs) { return hs.length >= 2 && hs.every(h => h[0].y < 0.45); }
  STEPS.m2b = {
    enter() {
      m2Scene(); placeAll(); useModel("hands");
      scene.querySelector("#tray").style.display = "none";
      setInstr(t("m2Eyebrow"), t("b2Title"), usesButtons() ? t("b2Mouse") : t("b2Text"), "both");
      this.running = false; this.time = 0; this.done = false; this.hold = holdDetector(0.6); this.pts = [];
      this.shown = 0;
    },
    controls() { return usesButtons() && !this.running && !this.done ? [button(t("b2Btn"), () => this.start(), "primary", "Space")] : []; },
    onKey(e) { if (e.code === "Space") { e.preventDefault(); this.start(); } },
    onHands(hs) { if (!this.running && !this.done && this.hold(bothHandsUp(hs))) this.start(); },
    start() {
      if (this.running || this.done) return;
      this.running = true; refreshControls(); rumble(true);
      scene.querySelector("#seis").style.opacity = "1"; scene.querySelector("#seis text").textContent = t("shRead"); scene.querySelector("#joints").style.opacity = "1";
      setFeedback("warn", t("shaking"));
    },
    tick(dt) {
      if (!this.running) return;
      this.time += dt; const T = 8, tt = this.time;
      const env = Math.sin(Math.PI * Math.min(1, tt / T));
      const dx = env * 24 * Math.sin(2 * Math.PI * 1.0 * tt);
      const frameEl = scene.querySelector("#frame"), ground = scene.querySelector("#groundg");
      if (frameEl) frameEl.setAttribute("transform", `translate(${dx * 0.7} 0) translate(0 520) skewX(${(-dx * 0.32).toFixed(2)}) translate(0 -520)`);
      if (ground) ground.setAttribute("transform", `translate(${dx} 0)`);
      this.pts.push([40 + (tt / T) * 218, 84 - dx * 1.2]);
      const line = scene.querySelector("#seisline"); if (line) line.setAttribute("points", this.pts.map(p => p.map(v => v.toFixed(1)).join(",")).join(" "));
      const msgs = ["sh1", "sh2", "sh3"], due = tt > 6 ? 3 : tt > 4 ? 2 : tt > 1.5 ? 1 : 0;
      if (due > this.shown) { this.shown = due; setFeedback("ok", t(msgs[due - 1])); }
      if (tt >= T) {
        this.running = false; this.done = true; rumble(false);
        if (frameEl) frameEl.removeAttribute("transform"); if (ground) ground.removeAttribute("transform");
        chime(); prog(1);
        later(() => go("m2q"), 3200);
      }
    },
    exit() { rumble(false); }
  };
  STEPS.m2done = {
    enter() {
      m2Scene(); placeAll(); scene.querySelector("#tray").style.display = "none"; scene.querySelector("#joints").style.opacity = "1";
      this.c = continueCard(t("m2DoneTitle"), t("m2DoneLead"), `<ol class="points"><li>${t("m2p1")}</li><li>${t("sh1")}</li><li>${t("sh2")}</li><li>${t("sh3")}</li></ol><p class="note">${t("m2Note")}</p>`, "m3a", "raiseBoth", "hands");
      setInstr(t("m2Eyebrow"), t("m2DoneTitle"), usesButtons() ? t("continueBtn") : t("raiseBoth"), "both");
      prog(1);
      this.armed = false; later(() => this.armed = true, 1500);
    },
    onHands(hs) { if (this.armed && this.c.hold(bothHandsUp(hs))) { this.armed = false; go("m3a"); } },
    onKey(e) { if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); go("m3a"); } }
  };

  // ---------------- Module 3 ----------------
  function ringHtml(label) {
    return `<div class="ring-wrap"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="#fff" stroke="#e3d3b6" stroke-width="12"/>
      <circle id="ring" cx="60" cy="60" r="50" fill="none" stroke="#2b8f5a" stroke-width="12" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="314" transform="rotate(-90 60 60)"/></svg>
      <div class="ring-label"><span id="ring-num">0</span><small>${label}</small></div></div>`;
  }
  function crouched(lm) {
    if (!lm || !vis(lm, 11, .3) || !vis(lm, 12, .3)) return false;
    const base = state.base || { shY: 0.35, sw: shW(lm) };
    const sw = base.sw || shW(lm), sy = shY(lm);
    const down = sy - base.shY > 0.8 * sw;
    const midX = (lm[11].x + lm[12].x) / 2;
    const handOk = (i) => vis(lm, i, .25) && lm[i].y < sy + 0.2 * sw && Math.abs(lm[i].x - midX) * ASPECT < 1.6 * sw;
    return down && handOk(15) && handOk(16);
  }
  STEPS.m3a = {
    enter() {
      scene.innerHTML = S.classroom({ label: t("scClass") }) + ringHtml(t("holdLabel"));
      useModel("pose");
      scene.querySelector("svg").classList.add("shake-soft");
      setInstr(t("m3Eyebrow"), t("e1Title"), usesButtons() ? t("e1Mouse") : t("e1Text"), "crouch");
      this.held = 0; this.goal = 8; this.done = false; this.on = false; this.mouseHold = false; this.lastWarn = 0; this.time = 0;
      rumble(true);
    },
    controls() {
      if (!usesButtons() || this.done) return [];
      const b = button(t("e1Btn"), null, "primary", "Space");
      const down = (e) => { e.preventDefault(); this.mouseHold = true; b.classList.add("pressed"); };
      const up = () => { this.mouseHold = false; b.classList.remove("pressed"); };
      b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up);
      this.btn = b; return [b];
    },
    onKey(e, type) { if (e.code === "Space") { e.preventDefault(); this.mouseHold = type === "down"; this.btn && this.btn.classList.toggle("pressed", this.mouseHold); } },
    onPose(lm) { this.on = crouched(lm); },
    tick(dt) {
      if (this.done) return;
      this.time += dt;
      const lamp = scene.querySelector("#lamp"); if (lamp) lamp.style.transform = `rotate(${Math.sin(this.time * 5) * 12}deg)`;
      const books = scene.querySelector("#books"); if (books) books.setAttribute("transform", `translate(${Math.sin(this.time * 17) * 3} 0)`);
      const ok = this.on || this.mouseHold;
      scene.querySelector("#avatar-crouch").style.opacity = ok ? "1" : "0";
      scene.querySelector("#avatar-stand").style.opacity = ok ? "0" : "1";
      if (ok) this.held += dt;
      else if (this.held > 0.5 && performance.now() - this.lastWarn > 4000) { this.lastWarn = performance.now(); setFeedback("warn", t("e1Warn")); }
      const f = Math.min(1, this.held / this.goal);
      scene.querySelector("#ring").setAttribute("stroke-dashoffset", (314 * (1 - f)).toFixed(1));
      $("#ring-num").textContent = Math.max(0, Math.ceil(this.goal - this.held)) + " s";
      prog(f);
      if (this.held >= this.goal) {
        this.done = true; rumble(false); scene.querySelector("svg").classList.remove("shake-soft");
        if (lamp) lamp.style.transform = "rotate(0deg)";
        chime(); setFeedback("ok", t("e1Ok")); refreshControls();
        later(() => go("m3route"), 3000);
      }
    },
    exit() { rumble(false); }
  };

  STEPS.m3b = {
    enter() {
      scene.innerHTML = S.climb({ label: t("scClass"), safe: t("safe").toUpperCase() }) +
        `<div class="hud"><span class="pill" id="time-pill"></span></div><div class="meter"><div class="meter-fill" id="meter-fill" style="height:0"></div></div><span class="meter-label" id="meter-label"></span>`;
      useModel("pose");
      setInstr(t("m3Eyebrow"), t("e2Title"), usesButtons() ? t("e2Mouse") : t("e2Text"), "march");
      this.goal = 40; this.timeLeft = 55; this.total = 55; this.steps = 0; this.lastSide = null; this.done = false; this.failed = false;
      this.lastStepAt = performance.now(); this.lastPush = 0; this.noKnee = 0; this.showSteps = usesButtons();
      this.render();
    },
    controls() {
      if (this.failed) return [button(t("tryAgain"), () => go("m3b"), "primary", "Enter")];
      if (!this.showSteps || this.done) return [];
      return [button(t("e2Left"), () => this.step("L"), "", "←"), button(t("e2Right"), () => this.step("R"), "", "→")];
    },
    onKey(e, type) {
      if (type !== "down") return;
      if (this.failed && e.code === "Enter") { go("m3b"); return; }
      if (e.code === "ArrowLeft") { e.preventDefault(); this.step("L"); }
      if (e.code === "ArrowRight") { e.preventDefault(); this.step("R"); }
    },
    onPose(lm) {
      if (this.done || this.failed) return;
      if (!lm || !vis(lm, 25, .5) || !vis(lm, 26, .5) || !vis(lm, 23, .5) || !vis(lm, 24, .5)) { this.kneeLost = true; return; }
      this.kneeLost = false;
      const thighL = Math.abs(lm[26].y - lm[24].y), thighR = Math.abs(lm[25].y - lm[23].y);
      const lUp = lm[25].y < lm[26].y - 0.3 * Math.max(thighL, 0.05);
      const rUp = lm[26].y < lm[25].y - 0.3 * Math.max(thighR, 0.05);
      if (lUp && this.lastSide !== "L") this.step("L");
      else if (rUp && this.lastSide !== "R") this.step("R");
    },
    step(side) {
      if (this.done || this.failed) return;
      if (state.mode === "mouse" || this.showSteps) { if (this.lastSide === side) return; }
      this.lastSide = side; this.steps++; this.lastStepAt = performance.now(); tick();
      this.render();
      if (this.steps >= this.goal) {
        this.done = true; chime(); refreshControls();
        setFeedback("ok", fmt(t("e2Ok"), { s: Math.ceil(this.timeLeft) }));
        later(() => go("m3done"), 3200);
      }
    },
    render() {
      const f = this.steps / this.goal, [x, y] = S.climbPoint(f);
      const cl = scene.querySelector("#climber"); if (cl) cl.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      const mf = $("#meter-fill"); if (mf) mf.style.height = (f * 100) + "%";
      const ml = $("#meter-label");
      if (ml) { ml.textContent = `${t("height")} ${Math.round(20 * f)} m / ${t("safe")} 20 m`; ml.style.top = `calc(16% + ${(1 - f) * 76}%)`; }
      const tp = $("#time-pill");
      if (tp) { tp.textContent = `${t("timeLeft")} 00:${String(Math.max(0, Math.ceil(this.timeLeft))).padStart(2, "0")}`; tp.className = "pill" + (this.timeLeft < 8 ? " err" : this.timeLeft < 15 ? " warn" : ""); }
      const tf = 1 - this.timeLeft / this.total, wv = scene.querySelector("#wave");
      if (wv) wv.setAttribute("transform", `translate(${(110 + tf * 330).toFixed(1)} ${(-tf * 18).toFixed(1)})`);
      prog(f, ` · ${this.steps}/${this.goal}`);
    },
    tick(dt) {
      if (this.done || this.failed) return;
      this.timeLeft -= dt;
      if (state.mode === "cam" && !state.fallback) {
        if (this.kneeLost) this.noKnee += dt; else this.noKnee = 0;
        if (this.noKnee > 2.5 && !this.showSteps) { this.showSteps = true; setFeedback("warn", t("e2Legs")); refreshControls(); }
        else if (!this.kneeLost && performance.now() - this.lastStepAt > 2500 && performance.now() - this.lastPush > 5000) { this.lastPush = performance.now(); setFeedback("warn", t("e2Push")); }
      }
      if (this.timeLeft <= 0) {
        this.timeLeft = 0; this.failed = true; state.retries.m3++; buzz();
        setFeedback("err", t("e2Fail")); refreshControls();
      }
      this.render();
    }
  };
  STEPS.m3done = {
    enter() {
      scene.innerHTML = S.climb({ safe: t("safe").toUpperCase() });
      const [x, y] = S.climbPoint(1); scene.querySelector("#climber").setAttribute("transform", `translate(${x} ${y})`);
      this.c = continueCard(t("m3DoneTitle"), t("m3DoneLead"), chainHtml([["quake", t("chain1")], ["crouch", t("e1Title")], ["hill", t("chain3")]]), "reflect", "raiseToContinue", "pose");
      setInstr(t("m3Eyebrow"), t("m3DoneTitle"), usesButtons() ? t("continueBtn") : t("raiseToContinue"), "hand");
      prog(1);
      this.armed = false; later(() => this.armed = true, 1500);
    },
    onPose(lm) { if (this.armed && this.c.hold(handRaised(lm))) { this.armed = false; go("reflect"); } },
    onKey(e) { if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); go("reflect"); } }
  };

  // =====================================================================
  // SCIENCE LAYER: concept cards, calculation quizzes, vibration lab
  // =====================================================================
  function quizScore(name, correct) { if (!(name in state.quiz)) state.quiz[name] = correct; }
  const blurBg = (px = 2) => { const w = scene.querySelector("svg.world"); if (w) w.style.filter = `blur(${px}px) saturate(.85)`; };

  function infoStep(cfg) {
    return {
      enter() {
        cfg.bg(); blurBg(3);
        const both = cfg.gesture === "both";
        scene.insertAdjacentHTML("beforeend", `<div class="card-overlay wide"><p class="eyebrow">${t(cfg.eyebrow)}</p><h2>${t(cfg.title)}</h2>
          <div class="concept">${cfg.diagram ? `<div class="lab-fig">${cfg.diagram()}</div>` : ""}<p class="lead">${t(cfg.html)}</p></div><div id="cont"></div></div>`);
        $("#cont").appendChild(button(t("continueBtn"), () => go(cfg.next), "primary", "Enter"));
        useModel(both ? "hands" : "pose");
        setInstr(t(cfg.eyebrow), t(cfg.title), usesButtons() ? t("continueBtn") : t(both ? "raiseBothShort" : "raiseToContinue"), both ? "both" : "hand", false);
        speak(t(cfg.title) + ". " + strip(t(cfg.html)));
        this.hold = holdDetector(0.6); this.armed = false; later(() => this.armed = true, 3000);
      },
      onPose(lm) { if (cfg.gesture !== "both" && this.armed && this.hold(handRaised(lm))) { this.armed = false; go(cfg.next); } },
      onHands(hs) { if (cfg.gesture === "both" && this.armed && this.hold(bothHandsUp(hs))) { this.armed = false; go(cfg.next); } },
      onKey(e) { if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); go(cfg.next); } }
    };
  }

  function labStep(cfg) {
    return {
      enter() {
        cfg.bg(); blurBg(2);
        const q = usesButtons() ? t(cfg.mouse) : t(cfg.text);
        scene.insertAdjacentHTML("beforeend", `<div class="labcard"><div class="lab-fig">${cfg.diagram()}</div><div class="lab-text"><p class="eyebrow">${t(cfg.eyebrow)}</p><h2>${t(cfg.title)}</h2><p>${q}</p></div></div>`);
        addCursor(); useModel("pose");
        setInstr(t(cfg.eyebrow), t(cfg.title), q, "think");
        this.done = false; this.dw = { el: null, t: 0 }; this.p = null;
        this.wrap = makeChoices(cfg.items.map(it => ({ id: it.id, icon: it.icon, text: t(it.text) })), (id, el) => this.pick(id, el));
        this.wrap.classList.add("compact");
      },
      onPose(lm) {
        if (this.done) { hideCursor(); return; }
        const p = posePointer(lm);
        if (!p) { hideCursor(); this.dw.el = null; this.dw.t = 0; return; }
        this.p = this.p ? { x: this.p.x + (p.x - this.p.x) * .4, y: this.p.y + (p.y - this.p.y) * .4 } : p;
        showCursor(this.p.x, this.p.y);
      },
      tick(dt) {
        if (state.mode !== "cam" || this.done || !this.p || !lastPose) return;
        dwellUpdate(this.dw, this.wrap, this.p.x, this.p.y, dt, (id, el) => this.pick(id, el));
      },
      pick(id, el) {
        if (this.done) return;
        quizScore(state.stepName, id === cfg.correct);
        if (id === cfg.correct) {
          this.done = true; el.classList.add("right"); chime(); hideCursor();
          setFeedback("ok", t(cfg.ok)); prog(1);
          later(() => go(cfg.next), cfg.wait || 6500);
        } else {
          state.retries[cfg.mod]++; buzz(); el.classList.remove("wrong"); void el.offsetWidth; el.classList.add("wrong");
          setFeedback("err", t(cfg.err)); later(() => el.classList.remove("wrong"), 900);
        }
      }
    };
  }

  // ---- vibration lab ----
  const FN = 1.5, ZETA = 0.12;
  const resp = f => { const r = f / FN; return 1 / Math.sqrt((1 - r * r) ** 2 + (2 * ZETA * r) ** 2); };
  function estimate(buf, now) {
    if (buf.length < 8) return { f: 0, A: 0, mean: buf.length ? buf[buf.length - 1].x : 0, cm: 0 };
    const xs = buf.map(b => b.x), mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const A = (Math.max(...xs) - Math.min(...xs)) / 2;
    const scale = buf.reduce((a, b) => a + b.s, 0) / buf.length;
    if (A < 0.012) return { f: 0, A: 0, mean, cm: 0 };
    const th = 0.3 * A; let st = 0; const ups = [];
    buf.forEach(b => { const v = b.x - mean; if (v > th) { if (st === -1) ups.push(b.t); st = 1; } else if (v < -th) st = -1; });
    let f = 0;
    if (ups.length >= 2 && now - ups[ups.length - 1] < 2.5) {
      const k = Math.min(3, ups.length - 1);
      f = k / (ups[ups.length - 1] - ups[ups.length - 1 - k]);
    }
    return { f, A, mean, cm: A / Math.max(scale, 1e-3) * 9 };
  }
  function vibStep(cfg) {
    return {
      enter() {
        m2Scene(); placeAll(); scene.querySelector("#tray").style.display = "none"; scene.querySelector("#joints").style.opacity = "1";
        const seis = scene.querySelector("#seis"); seis.style.opacity = "1"; seis.querySelector("text").textContent = t("rdHand");
        const target = cfg.band ? `<p class="target">Target: ${cfg.band[0]}–${cfg.band[1]} Hz</p>` : `<div class="sway"><span>${t("rdSway")}</span><div class="bar"><div class="bar-fill" id="rd-sway" style="background:var(--warn)"></div></div></div><p class="note">${t("simNote")}</p>`;
        scene.insertAdjacentHTML("beforeend", `<div class="readouts">
          <div class="rd"><span>${t("rdA")}</span><b id="rd-a">–</b></div><div class="rd"><span>${t("rdT")}</span><b id="rd-t">–</b></div><div class="rd"><span>${t("rdF")}</span><b id="rd-f">–</b></div>
          ${target}<div class="bar hold"><div class="bar-fill" id="rd-hold" style="background:var(--ok)"></div></div></div>`);
        useModel("hands");
        setInstr(t("m2Eyebrow"), t(cfg.title), usesButtons() ? t(cfg.mouse) : t(cfg.text), "hand");
        this.buf = []; this.holdT = 0; this.done = false; this.t0 = performance.now() / 1000; this.lastHint = 0; this.lastHand = performance.now();
        this.simF = 0.5; this.simA = 15;
      },
      controls() {
        if (!usesButtons() || this.done) return [];
        const mk = (id, label, min, max, step, val, unit, set) => {
          const w = document.createElement("label"); w.className = "slider";
          w.innerHTML = `<span>${label}: <b>${val} ${unit}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">`;
          const inp = w.querySelector("input"); inp.addEventListener("input", () => { set(+inp.value); w.querySelector("b").textContent = `${inp.value} ${unit}`; });
          return w;
        };
        return [mk("sl-f", t("sF"), 0.2, 3, 0.1, this.simF, "Hz", v => this.simF = v), mk("sl-a", t("sA"), 4, 30, 1, this.simA, "cm", v => this.simA = v)];
      },
      onHands(hs) {
        if (this.done || usesButtons() || !hs.length) return;
        const h = hs[0]; this.lastHand = performance.now();
        this.buf.push({ t: performance.now() / 1000, x: (1 - h[9].x) * ASPECT, s: Math.hypot((h[0].x - h[9].x) * ASPECT, h[0].y - h[9].y) });
      },
      tick(dt) {
        if (this.done) return;
        const now = performance.now() / 1000;
        if (usesButtons()) {
          this.phase = (this.phase || 0) + 2 * Math.PI * this.simF * dt;
          this.buf.push({ t: now, x: 0.5 + (this.simA / 9 * 0.1) * Math.sin(this.phase), s: 0.1 });
        }
        this.buf = this.buf.filter(b => now - b.t < 4);
        const e = estimate(this.buf, now), last = this.buf[this.buf.length - 1];
        const off = last ? last.x - e.mean : 0, R = e.f ? resp(e.f) : 1;
        const dx = Math.max(-50, Math.min(50, off * 190 * (cfg.band ? 1 : R)));
        const fr = scene.querySelector("#frame"), gr = scene.querySelector("#groundg");
        if (fr) fr.setAttribute("transform", `translate(${(dx * 0.7).toFixed(1)} 0) translate(0 520) skewX(${(-dx * 0.32).toFixed(2)}) translate(0 -520)`);
        if (gr) gr.setAttribute("transform", `translate(${Math.max(-30, Math.min(30, off * 190)).toFixed(1)} 0)`);
        const line = scene.querySelector("#seisline");
        if (line) line.setAttribute("points", this.buf.map(b => `${(40 + (b.t - (now - 4)) / 4 * 218).toFixed(1)},${(84 - Math.max(-30, Math.min(30, (b.x - e.mean) * 120))).toFixed(1)}`).join(" "));
        const dec = lang === "id" ? (v, n) => v.toFixed(n).replace(".", ",") : (v, n) => v.toFixed(n);
        $("#rd-a").textContent = e.cm ? `≈ ${dec(e.cm, 0)} cm` : "–";
        $("#rd-f").textContent = e.f ? `${dec(e.f, 2)} Hz` : "–";
        $("#rd-t").textContent = e.f ? `${dec(1 / e.f, 2)} s` : "–";
        if (!cfg.band) { const sw = $("#rd-sway"); if (sw) sw.style.width = Math.max(0, Math.min(100, (R - 1) / 3 * 100)) + "%"; }
        const ok = cfg.band ? (e.f >= cfg.band[0] && e.f <= cfg.band[1]) : (e.f > 0 && R >= 3);
        this.holdT = ok ? this.holdT + dt : Math.max(0, this.holdT - dt * 0.6);
        $("#rd-hold").style.width = Math.min(100, this.holdT / cfg.hold * 100) + "%";
        const nowMs = performance.now();
        if (!ok && nowMs - this.lastHint > 3500) {
          if (state.mode === "cam" && !usesButtons() && nowMs - this.lastHand > 2000) { this.lastHint = nowMs; setFeedback("warn", t("noHand")); }
          else if (cfg.band && e.f) { this.lastHint = nowMs; setFeedback("warn", t(e.f < cfg.band[0] ? "tooSlow" : "tooFast")); }
        }
        if (this.holdT >= cfg.hold) {
          this.done = true; chime(); refreshControls();
          if (fr) fr.removeAttribute("transform"); if (gr) gr.removeAttribute("transform");
          setFeedback("ok", fmt(t(cfg.ok), { f: dec(e.f || FN, 1) })); prog(1);
          later(() => go(cfg.next), cfg.wait || 4500);
        }
      }
    };
  }

  const villageBg = (receded) => () => { m1Scene(receded); };
  const rumohBg = () => { m2Scene(); placeAll(); scene.querySelector("#tray").style.display = "none"; };
  const climbBg = () => { scene.innerHTML = S.climb({ safe: t("safe").toUpperCase() }); };
  const L = (o) => () => { const r = {}; Object.entries(o).forEach(([k, v]) => r[k] = t(v)); return r; };

  STEPS.m1info = infoStep({ bg: villageBg(false), eyebrow: "m1Eyebrow", title: "c1Title", html: "c1Text", next: "m1seis",
    diagram: () => S.waves(L({ p: "dP", s: "dS", pMove: "dPMove", sMove: "dSMove", dir: "dDir" })()) });
  STEPS.m1seis = labStep({ bg: villageBg(false), mod: "m1", eyebrow: "m1Eyebrow", title: "s1Title", text: "s1Text", mouse: "s1Mouse",
    diagram: () => S.seismogram(L({ time: "dTime" })()), items: [{ id: "a", text: "s1A" }, { id: "b", text: "s1B" }], correct: "a", ok: "s1Ok", err: "s1Err", next: "m1b" });
  STEPS.m1v1 = labStep({ bg: villageBg(true), mod: "m1", eyebrow: "m1Eyebrow", title: "v1Title", text: "v1Text", mouse: "v1Mouse",
    diagram: () => S.ocean(L({ deep: "dDeep", shallow: "dShallow", small: "dSmall", tall: "dTall" })()), items: [{ id: "b", text: "v1B" }, { id: "a", text: "v1A" }], correct: "a", ok: "v1Ok", err: "v1Err", next: "m1v2" });
  STEPS.m1v2 = labStep({ bg: villageBg(true), mod: "m1", eyebrow: "m1Eyebrow", title: "v2Title", text: "v2Text", mouse: "v2Mouse", wait: 8000,
    diagram: () => S.ocean(L({ deep: "dDeep", shallow: "dShallow", small: "dSmall", tall: "dTall" })()), items: [{ id: "a", text: "v2A" }, { id: "b", text: "v2B" }], correct: "a", ok: "v2Ok", err: "v2Err", next: "m1c" });

  STEPS.m2info = infoStep({ bg: rumohBg, eyebrow: "m2Eyebrow", title: "c2Title", html: "c2Text", next: "m2l1", gesture: "both",
    diagram: () => S.vibGraph(L({ time: "dTime" })()) });
  STEPS.m2l1 = vibStep({ title: "l1Title", text: "l1Text", mouse: "l1Mouse", band: [0.7, 1.3], hold: 3, ok: "l1Ok", next: "m2l2" });
  STEPS.m2l2 = vibStep({ title: "l2Title", text: "l2Text", mouse: "l2Mouse", band: [1.7, 2.5], hold: 3, ok: "l2Ok", next: "m2res" });
  STEPS.m2res = vibStep({ title: "resTitle", text: "resText", mouse: "resMouse", band: null, hold: 2, ok: "resOk", next: "m2b", wait: 11000 });
  STEPS.m2q = labStep({ bg: rumohBg, mod: "m2", eyebrow: "m2Eyebrow", title: "q4Title", text: "q4Text", mouse: "q4Mouse",
    diagram: () => S.vibGraph(L({ time: "dTime" })()), items: [{ id: "b", text: "q4B" }, { id: "a", text: "q4A" }], correct: "a", ok: "q4Ok", err: "q4Err", next: "m2done" });

  STEPS.m3route = labStep({ bg: climbBg, mod: "m3", eyebrow: "m3Eyebrow", title: "rtTitle", text: "rtText", mouse: "rtMouse", wait: 9000,
    diagram: () => S.routeMap(L({ coast: "mapCoast", school: "mapSchool", hillA: "mapHillA", hillB: "mapHillB" })()), items: [{ id: "a", text: "rtA" }, { id: "b", text: "rtB" }], correct: "a", ok: "rtOk", err: "rtErr", next: "m3b" });


  // ---------------- reflection ----------------
  STEPS.reflect = {
    enter() {
      useModel(null);
      const secs = Math.round((performance.now() - state.startTime) / 1000);
      const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
      const row = (name, what, r) => `<tr><td><b>${name}</b></td><td>${what}</td><td class="num"><span class="ok-chip">✓ ${t("rDone")}</span>${r ? ` · ${r} ${t("rRetries")}` : ""}</td></tr>`;
      scene.innerHTML = `<div class="reflect">
        <div class="panel"><p class="eyebrow">${t("rEyebrow")}</p><h2>${t("rTitle")}</h2>
          <div style="overflow-x:auto"><table class="summary"><thead><tr><th>${t("rModule")}</th><th>${t("rPractised")}</th><th>${t("rResult")}</th></tr></thead><tbody>
          ${row(t("m1Name"), t("rM1"), state.retries.m1)}${row(t("m2Name"), t("rM2"), state.retries.m2)}${row(t("m3Name"), t("rM3"), state.retries.m3)}
          </tbody></table></div>
          <p><b>${t("rTime")}:</b> <span style="font-variant-numeric:tabular-nums">${mm}:${ss}</span></p>
          <p><b>${t("rScore")}:</b> <span style="font-variant-numeric:tabular-nums">${Object.values(state.quiz).filter(Boolean).length} / ${Object.keys(state.quiz).length}</span></p>
          <h3 style="font-size:18px">${t("rFormulas")}</h3>
          <ul class="points formulas"><li>${t("fm1")}</li><li>${t("fm2")}</li><li>${t("fm3")}</li><li>${t("fm4")}</li></ul>
        </div>
        <div class="panel"><h2>${t("rQ")}</h2><p class="lead" style="color:var(--ink-soft)">${t("rLead")}</p>
          <ol class="qs"><li><b>${t("rq1")}</b><span>${t("rq1h")}</span></li><li><b>${t("rq2")}</b><span>${t("rq2h")}</span></li><li><b>${t("rq3")}</b><span>${t("rq3h")}</span></li><li><b>${t("rq4")}</b><span>${t("rq4h")}</span></li></ol>
          <p class="privacy">${t("rTeacher")}</p><div class="actions" id="r-actions" style="display:flex;gap:10px;flex-wrap:wrap"></div></div></div>`;
      const a = $("#r-actions");
      a.appendChild(button(t("restart"), () => { state.startTime = performance.now(); state.retries = { m1: 0, m2: 0, m3: 0 }; state.quiz = {}; go("m1a"); }, "primary"));
      a.appendChild(button(t("home"), () => go("welcome")));
      speak(t("rTitle") + ". " + t("rLead"));
    }
  };

  // ---------------- global events ----------------
  document.addEventListener("keydown", (e) => { if (e.repeat && e.code === "Space" && state.stepName === "m3a") return; if (step && step.onKey && $("#about").hidden) step.onKey(e, "down"); });
  document.addEventListener("keyup", (e) => { if (step && step.onKey && e.code === "Space" && state.stepName === "m3a") step.onKey(e, "up"); });
  $("#btn-lang").addEventListener("click", () => {
    lang = lang === "en" ? "id" : "en";
    try { localStorage.setItem("movara-lang", lang); } catch (e) { /* */ }
    applyStatic(); go(state.stepName || "welcome");
  });
  $("#btn-sound").addEventListener("click", (e) => {
    state.soundOn = !state.soundOn; e.currentTarget.setAttribute("aria-pressed", String(state.soundOn));
    if (!state.soundOn) { rumble(false); try { speechSynthesis.cancel(); } catch (x) { /* */ } }
  });
  $("#btn-about").addEventListener("click", () => { $("#about").hidden = false; $("#about-close").focus(); });
  $("#about-close").addEventListener("click", () => { $("#about").hidden = true; });
  $("#about").addEventListener("click", (e) => { if (e.target.id === "about") $("#about").hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#about").hidden = true; });

  // ---------------- boot ----------------
  applyStatic();
  // deep link for demos and screenshots: #m2a etc. (mouse mode)
  const h = location.hash.slice(1);
  if (h && STEPS[h] && h !== "welcome" && h !== "setup") { state.mode = "mouse"; state.startTime = performance.now(); go(h); }
  else go("welcome");
  window.MOVARA = { go, state };
})();
