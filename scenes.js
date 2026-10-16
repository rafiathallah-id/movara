// Illustrated scenes for MOVARA. Every scene uses a 1000 × 600 viewBox.
(function () {
  const W = 1000, H = 600;

  function house(x, y, w, tone) {
    const h = w * 0.42, stilt = w * 0.35;
    const top = y - stilt - h;
    let s = `<g>`;
    for (let i = 0; i < 4; i++) {
      const sx = x - w / 2 + 6 + i * ((w - 12) / 3);
      s += `<rect x="${sx - 3}" y="${y - stilt}" width="6" height="${stilt}" fill="#6e4520"/>`;
    }
    s += `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" rx="2" fill="${tone}"/>`;
    s += `<rect x="${x - w * 0.12}" y="${top + h * 0.3}" width="${w * 0.24}" height="${h * 0.7}" fill="#5a3818"/>`;
    s += `<polygon points="${x - w / 2 - 10},${top + 2} ${x},${top - h * 0.95} ${x + w / 2 + 10},${top + 2}" fill="#7a5a32"/>`;
    s += `<polygon points="${x - w * 0.18},${top - h * 0.1} ${x},${top - h * 0.75} ${x + w * 0.18},${top - h * 0.1}" fill="#e9b872" opacity=".85"/>`;
    s += `</g>`;
    return s;
  }
  function palm(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 0 C 4 -40 10 -80 6 -120" stroke="#7a5a32" stroke-width="7" fill="none" stroke-linecap="round"/>
      <g fill="#3f7f42"><path d="M6 -120 C -30 -135 -55 -120 -70 -100 C -40 -118 -20 -118 6 -118Z"/>
      <path d="M6 -120 C 40 -140 65 -125 78 -104 C 50 -120 30 -120 6 -118Z"/>
      <path d="M6 -122 C -10 -160 -40 -165 -55 -158 C -25 -150 -8 -140 6 -122Z"/>
      <path d="M6 -122 C 25 -160 55 -162 66 -150 C 40 -148 22 -140 6 -122Z"/></g></g>`;
  }
  function boat(x, y, c, id) {
    return `<g id="${id}" transform="translate(${x} ${y})"><g class="tilt" style="transition:transform 2s ease">
      <path d="M-42 0 L42 0 L30 16 L-30 16Z" fill="${c}"/><path d="M-42 0 L42 0" stroke="#fff" stroke-width="3"/>
      <path d="M0 0 V-40" stroke="#5a3818" stroke-width="3"/><path d="M2 -38 L26 -8 L2 -8Z" fill="#f4ead8"/></g></g>`;
  }
  function person(x, y, shirt, pants, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-34" r="6" fill="#8d5a3b"/>
      <rect x="-6" y="-27" width="12" height="15" rx="3" fill="${shirt}"/><rect x="-5" y="-12" width="4" height="12" fill="${pants}"/><rect x="1" y="-12" width="4" height="12" fill="${pants}"/></g>`;
  }
  function evacSign(x, y) {
    return `<g transform="translate(${x} ${y})"><rect x="-2" y="-70" width="4" height="70" fill="#4a5768"/>
      <rect x="-34" y="-112" width="68" height="46" rx="5" fill="#1f6fa8" stroke="#fff" stroke-width="3"/>
      <circle cx="-12" cy="-101" r="5" fill="#fff"/><path d="M-12 -95 L-8 -84 M-12 -93 L-20 -86 M-11 -92 L-2 -90 M-8 -84 L-16 -74 M-8 -84 L-1 -76" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M6 -89 H24 M18 -96 L25 -89 L18 -82" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  function flag(x, y, label) {
    return `<g transform="translate(${x} ${y})"><rect x="-2" y="-64" width="4" height="64" fill="#4a5768"/>
      <path d="M2 -64 L54 -52 L2 -40Z" fill="#2b8f5a"/>${label ? `<text x="0" y="16" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="15" fill="#1d2a3a">${label}</text>` : ""}</g>`;
  }

  // ---------- Module 1: Simeulue coastal village ----------
  function village(opts = {}) {
    const ripples = Array.from({ length: 9 }, (_, i) => `<path d="M${20 + (i % 3) * 110} ${400 + Math.floor(i / 3) * 55} q 20 -8 40 0 t 40 0" stroke="#b9a271" stroke-width="3" fill="none"/>`).join("");
    const fish = [[150, 470], [230, 520], [90, 545], [300, 430]].map(([x, y], i) => `<g transform="translate(${x} ${y}) rotate(${i * 40 - 30})"><ellipse rx="13" ry="6" fill="#7aa7c7"/><path d="M12 0 l10 -6 v12z" fill="#7aa7c7"/></g>`).join("");
    const rocks = [[60, 440], [270, 560], [190, 410]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="11" fill="#8f8a7d"/>`).join("");
    const people = [0, 1, 2, 3].map(i => person(470 + i * 26, 478 - (i % 2) * 4, ["#f4f4f4", "#d9534f", "#2f6fd6", "#e9b872"][i], "#1d2a3a", 1)).join("");
    return `<svg class="world" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${opts.label || ""}">
      <defs>
        <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9def2"/><stop offset="1" stop-color="#f7efdf"/></linearGradient>
        <linearGradient id="sea1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d86bf"/><stop offset="1" stop-color="#1b5f8f"/></linearGradient>
        <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fae63"/><stop offset="1" stop-color="#3f7a3c"/></linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky1)"/>
      <circle cx="160" cy="110" r="38" fill="#fff6d8"/>
      <rect x="0" y="300" width="${W}" height="40" fill="#4f97c6"/>
      <path id="hwave" d="M-40 302 Q 120 290 260 300 T 560 300 L 560 312 L -40 312Z" fill="#163f63" opacity="0" style="transition:opacity 3s"/>
      <path d="M520 600 L600 430 Q700 270 820 232 L1000 222 L1000 600Z" fill="url(#hill1)"/>
      <path d="M600 470 Q 690 330 820 236" stroke="#f1e6d2" stroke-width="5" stroke-dasharray="10 9" fill="none" opacity=".9"/>
      ${evacSign(880, 230)}${flag(950, 226, "")}
      <g id="seabed"><path d="M0 332 L430 332 Q405 400 372 470 L332 600 L0 600Z" fill="#cdb98a"/>${ripples}${rocks}${fish}</g>
      <path d="M330 600 L372 470 Q 405 400 430 332 L 560 330 L 640 600Z" fill="#ead9ad"/>
      <path d="M430 332 L1000 330 L1000 360 Q 760 360 600 410 L 470 480Z" fill="#7fb36e" opacity=".9"/>
      <g id="sea" style="transition:transform 3.2s cubic-bezier(.45,0,.3,1)">
        <path d="M-320 332 L430 332 Q405 400 372 470 L332 600 L-320 600Z" fill="url(#sea1)"/>
        <path d="M430 332 Q405 400 372 470 L332 600" stroke="#e8f4fb" stroke-width="7" fill="none" opacity=".85"/>
        <path d="M60 380 q 25 -8 50 0 M200 430 q 25 -8 50 0 M110 520 q 25 -8 50 0" stroke="#7cc0e8" stroke-width="3" fill="none"/>
      </g>
      ${boat(230, 405, "#d9534f", "boat1")}${boat(320, 470, "#2f6fd6", "boat2")}
      ${palm(400, 488, 0.9)}${palm(668, 470, 0.8)}
      ${house(480, 470, 70, "#a8733d")}${house(565, 462, 62, "#b9844a")}${house(632, 488, 56, "#9a6533")}
      <g id="people" style="transition:transform 4s ease-in">${people}</g>
    </svg>`;
  }

  // ---------- Module 2: Rumoh Aceh frame ----------
  const RUMOH = {
    slots: {
      col0: { x: 300, y: 390, kind: "col" }, col1: { x: 500, y: 390, kind: "col" }, col2: { x: 700, y: 390, kind: "col" },
      floor: { x: 500, y: 380, kind: "floor" }, top: { x: 500, y: 250, kind: "top" }, roof: { x: 500, y: 172.5, kind: "roof" }
    },
    parts: [
      { id: "p0", kind: "col", tray: [840, 172], s: .45 }, { id: "p1", kind: "col", tray: [882, 172], s: .45 }, { id: "p2", kind: "col", tray: [924, 172], s: .45 },
      { id: "p3", kind: "floor", tray: [893, 305], s: .35 }, { id: "p4", kind: "top", tray: [893, 350], s: .35 },
      { id: "p5", kind: "roof", tray: [893, 450], s: .32 }
    ]
  };
  function partShape(kind) {
    if (kind === "col") return `<rect x="-12" y="-130" width="24" height="260" rx="10" fill="url(#wood)" stroke="#5a3818" stroke-width="2"/>
      <path d="M-4 -110 V-40 M4 -20 V60 M-2 80 V118" stroke="#6e4520" stroke-width="2" opacity=".5"/>`;
    if (kind === "floor" || kind === "top") return `<rect x="-230" y="-10" width="460" height="20" rx="4" fill="url(#woodh)" stroke="#5a3818" stroke-width="2"/>
      <path d="M-200 -2 H-60 M20 3 H180" stroke="#6e4520" stroke-width="2" opacity=".5"/>`;
    // roof: thatch with a carved gable panel
    return `<polygon points="-250,77.5 0,-77.5 250,77.5" fill="#8d7a4d" stroke="#5a3818" stroke-width="3"/>
      <path d="M-210 60 L0 -60 L210 60" stroke="#a8935f" stroke-width="6" fill="none"/>
      <polygon points="-110,77.5 0,8 110,77.5" fill="#6e4520"/>
      <g stroke="#e9b872" stroke-width="3" fill="none"><path d="M-80 72 Q -40 40 0 30 Q 40 40 80 72"/><circle cx="0" cy="52" r="10"/><path d="M-50 72 q 10 -14 20 0 M30 72 q 10 -14 20 0"/></g>`;
  }
  function rumoh(opts = {}) {
    const s = RUMOH.slots;
    const trees = [[90, 520, 1.1], [170, 520, .8], [960, 525, .7]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-5" y="-60" width="10" height="60" fill="#6e4520"/><circle cx="0" cy="-90" r="42" fill="#5c9a55"/><circle cx="-26" cy="-70" r="28" fill="#4f8f4a"/><circle cx="26" cy="-72" r="26" fill="#4f8f4a"/></g>`).join("");
    const joints = [[300, 380], [500, 380], [700, 380], [300, 250], [500, 250], [700, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#f2a93b" stroke="#fff" stroke-width="3"/>`).join("");
    return `<svg class="world" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${opts.label || ""}">
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dbeee9"/><stop offset="1" stop-color="#f7efdf"/></linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a4b22"/><stop offset=".45" stop-color="#b47d45"/><stop offset="1" stop-color="#7a4b22"/></linearGradient>
        <linearGradient id="woodh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47d45"/><stop offset="1" stop-color="#7a4b22"/></linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky2)"/>
      <path d="M0 470 Q 200 430 420 455 T 1000 440 L1000 600 L0 600Z" fill="#b9d3a6"/>
      ${trees}
      <g id="groundg"><rect x="-60" y="520" width="${W + 120}" height="90" fill="#c9b38a"/><path d="M-60 520 H${W + 60}" stroke="#9d8660" stroke-width="3"/></g>
      <g id="frame">
        ${[300, 500, 700].map(x => `<ellipse cx="${x}" cy="524" rx="30" ry="10" fill="#8f8a7d"/>`).join("")}
        <g id="slots">
          <rect class="slot" data-slot="col0" x="${s.col0.x - 12}" y="260" width="24" height="260" rx="10"/>
          <rect class="slot" data-slot="col1" x="${s.col1.x - 12}" y="260" width="24" height="260" rx="10"/>
          <rect class="slot" data-slot="col2" x="${s.col2.x - 12}" y="260" width="24" height="260" rx="10"/>
          <rect class="slot" data-slot="floor" x="270" y="370" width="460" height="20" rx="4"/>
          <rect class="slot" data-slot="top" x="270" y="240" width="460" height="20" rx="4"/>
          <polygon class="slot" data-slot="roof" points="250,250 500,95 750,250"/>
        </g>
        <g id="placed"></g>
        <g id="joints" opacity="0" style="transition:opacity .6s">${joints}</g>
      </g>
      <g id="tray"><rect x="808" y="70" width="172" height="440" rx="16" fill="#fff" opacity=".88"/>
        <text x="894" y="100" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="17" fill="#8a5a2b" letter-spacing="1.5">${(opts.trayLabel || "PARTS").toUpperCase()}</text></g>
      <g id="parts"></g>
      <g id="seis" opacity="0" style="transition:opacity .4s"><rect x="24" y="24" width="250" height="96" rx="12" fill="#fff" opacity=".92"/>
        <text x="40" y="48" font-family="Figtree, sans-serif" font-weight="700" font-size="14" fill="#1d2a3a">Ground motion</text>
        <path d="M40 84 H258" stroke="#d9ccb4" stroke-width="1.5"/><polyline id="seisline" points="" fill="none" stroke="#1f6fa8" stroke-width="2.5"/></g>
    </svg>`;
  }

  // ---------- Module 3a: classroom ----------
  function classroom(opts = {}) {
    const desk = (x) => `<g><rect x="${x - 95}" y="392" width="190" height="16" rx="3" fill="#a8733d"/><rect x="${x - 85}" y="408" width="10" height="72" fill="#6e4520"/><rect x="${x + 75}" y="408" width="10" height="72" fill="#6e4520"/></g>`;
    const books = ["#d9534f", "#2f6fd6", "#e9b872", "#4f8f4a", "#8a5a2b"].map((c, i) => `<rect x="${812 + i * 18}" y="${206 - (i % 2) * 8}" width="15" height="${44 + (i % 2) * 8}" fill="${c}"/>`).join("");
    return `<svg class="world" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${opts.label || ""}">
      <rect width="${W}" height="${H}" fill="#f3e7cf"/>
      <rect y="470" width="${W}" height="130" fill="#c7a77a"/><path d="M0 470 H${W}" stroke="#a88c62" stroke-width="4"/>
      ${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 140 - 40} 600 L${i * 140 + 60} 470" stroke="#b8976a" stroke-width="2"/>`).join("")}
      <rect x="250" y="90" width="380" height="190" rx="6" fill="#fff" stroke="#8a8f99" stroke-width="8"/>
      <text x="440" y="160" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="22" fill="#2f6fd6">IPA · Kelas VIII</text>
      <text x="440" y="200" text-anchor="middle" font-family="Figtree, sans-serif" font-size="20" fill="#4a5768">Getaran &amp; Gelombang</text>
      <path d="M300 240 q 30 -30 60 0 t 60 0 t 60 0 t 60 0" stroke="#d9534f" stroke-width="3" fill="none"/>
      <rect x="40" y="110" width="150" height="160" fill="#bfe1f2" stroke="#8a5a2b" stroke-width="8"/><path d="M115 110 V270 M40 190 H190" stroke="#8a5a2b" stroke-width="5"/>
      <rect x="40" y="215" width="150" height="55" fill="#2d86bf" opacity=".7"/>
      <rect x="790" y="250" width="130" height="10" fill="#6e4520"/><g id="books">${books}</g>
      <circle cx="700" cy="120" r="34" fill="#fff" stroke="#4a5768" stroke-width="5"/><path d="M700 120 V96 M700 120 L716 128" stroke="#1d2a3a" stroke-width="4" stroke-linecap="round"/>
      <g id="lamp" style="transform-origin:500px 0px"><path d="M500 0 V60" stroke="#4a5768" stroke-width="3"/><path d="M470 60 H530 L515 40 H485Z" fill="#e9b872"/><ellipse cx="500" cy="62" rx="12" ry="5" fill="#fff6d8"/></g>
      ${desk(220)}${desk(500)}${desk(780)}
      <g id="avatar-stand">${person(640, 480, "#ffffff", "#1d2a3a", 2.4)}</g>
      <g id="avatar-crouch" opacity="0" style="transition:opacity .2s"><g transform="translate(500 476) scale(2.2)">
        <ellipse cx="0" cy="0" rx="20" ry="4" fill="#000" opacity=".12"/>
        <path d="M-12 -2 Q -14 -20 2 -24 Q 16 -22 14 -2Z" fill="#ffffff" stroke="#c9ccd2"/>
        <circle cx="8" cy="-26" r="6" fill="#8d5a3b"/><path d="M2 -32 Q 8 -38 15 -30" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
        <rect x="-12" y="-4" width="22" height="5" rx="2" fill="#1d2a3a"/></g></g>
    </svg>`;
  }

  // ---------- Module 3b: climb to high ground ----------
  const CLIMB = [[230, 476], [410, 458], [505, 404], [430, 362], [560, 318], [650, 262], [600, 228], [740, 196], [845, 178]];
  function climb(opts = {}) {
    const pts = CLIMB.map(p => p.join(",")).join(" ");
    return `<svg class="world" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${opts.label || ""}">
      <defs><linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6e3f2"/><stop offset="1" stop-color="#f7efdf"/></linearGradient>
      <linearGradient id="hill3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fb36e"/><stop offset="1" stop-color="#4f8f4a"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sky3)"/>
      <rect x="0" y="470" width="300" height="130" fill="#cdb98a"/>
      <g id="wave" style="transition:transform 1s linear"><path d="M-420 600 L-420 452 Q -260 430 -150 440 Q -70 448 -40 470 Q -20 486 0 488 L 0 600Z" fill="#1b5f8f"/>
      <path d="M-150 440 Q -70 448 -40 470 Q -20 486 0 488" stroke="#e8f4fb" stroke-width="6" fill="none"/></g>
      <path d="M200 600 L210 478 L300 476 Q 430 468 520 384 Q 640 266 760 196 L1000 150 L1000 600Z" fill="url(#hill3)"/>
      <g><rect x="60" y="400" width="130" height="78" fill="#f4f4f4" stroke="#8a8f99" stroke-width="3"/><polygon points="50,402 125,360 200,402" fill="#d9534f"/>
      ${[0, 1, 2].map(i => `<rect x="${76 + i * 38}" y="418" width="24" height="22" fill="#bfe1f2"/>`).join("")}<rect x="114" y="448" width="22" height="30" fill="#8a5a2b"/>
      <rect x="120" y="340" width="3" height="24" fill="#4a5768"/><rect x="123" y="340" width="18" height="6" fill="#d9534f"/><rect x="123" y="346" width="18" height="6" fill="#fff"/></g>
      <polyline points="${pts}" fill="none" stroke="#f1e6d2" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${pts}" fill="none" stroke="#c9b38a" stroke-width="4" stroke-dasharray="3 10" stroke-linecap="round"/>
      ${evacSign(560, 316)}${flag(872, 174, opts.safe || "SAFE ZONE")}
      <path d="M1000 150 L 860 172 L 1000 172Z" fill="#3f7a3c" opacity=".4"/>
      <g id="climber">${person(0, 0, "#ffffff", "#1d2a3a", 1.6)}</g>
    </svg>`;
  }
  function climbPoint(f) {
    f = Math.max(0, Math.min(1, f));
    const seg = [];
    let total = 0;
    for (let i = 1; i < CLIMB.length; i++) { const d = Math.hypot(CLIMB[i][0] - CLIMB[i - 1][0], CLIMB[i][1] - CLIMB[i - 1][1]); seg.push(d); total += d; }
    let target = f * total;
    for (let i = 0; i < seg.length; i++) {
      if (target <= seg[i] || i === seg.length - 1) {
        const t = seg[i] ? Math.min(1, target / seg[i]) : 0;
        return [CLIMB[i][0] + (CLIMB[i + 1][0] - CLIMB[i][0]) * t, CLIMB[i][1] + (CLIMB[i + 1][1] - CLIMB[i][1]) * t];
      }
      target -= seg[i];
    }
    return CLIMB[CLIMB.length - 1];
  }

  // ---------- icons ----------
  const ICON = {
    hand: `<svg viewBox="0 0 48 48"><path d="M18 26V10a3 3 0 0 1 6 0v12V7a3 3 0 0 1 6 0v15V10a3 3 0 0 1 6 0v18c0 9-5 15-13 15-6 0-9-3-12-8l-5-8a3 3 0 0 1 5-3l3 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    point: `<svg viewBox="0 0 48 48"><path d="M20 30V8a3 3 0 0 1 6 0v16l9 2c3 1 5 3 4 7l-2 7c-1 3-3 4-6 4H24c-3 0-5-1-7-4l-6-9a3 3 0 0 1 5-3l4 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    pinch: `<svg viewBox="0 0 48 48"><path d="M14 30c-3-4-2-10 3-12l6-3m-9 15c3 5 9 8 15 7 7-1 11-7 10-14l-1-9a3 3 0 0 0-6 0v6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="13" r="4" fill="currentColor"/></svg>`,
    both: `<svg viewBox="0 0 48 48"><circle cx="24" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 18v14m0 0-6 10m6-10 6 10M24 22 14 8m10 14L34 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    crouch: `<svg viewBox="0 0 48 48"><path d="M6 24h36M10 24v16M38 24v16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="31" r="4" fill="currentColor"/><path d="M16 40c0-5 3-8 8-8s8 3 8 8M17 28c2-3 8-3 10 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    march: `<svg viewBox="0 0 48 48"><circle cx="24" cy="8" r="4" fill="currentColor"/><path d="M24 13v14m0 0-6 13m6-13h8v8M24 17l-7 8m7-8 7 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    body: `<svg viewBox="0 0 48 48"><circle cx="24" cy="8" r="4" fill="currentColor"/><path d="M24 13v16m0 0-6 13m6-13 6 13M14 20h20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="5" y="3" width="38" height="42" rx="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/></svg>`,
    think: `<svg viewBox="0 0 48 48"><path d="M24 6c-8 0-14 6-14 13 0 5 3 8 6 11v6h16v-6c3-3 6-6 6-11 0-7-6-13-14-13Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M19 42h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    quake: `<svg viewBox="0 0 48 48"><path d="M4 30h8l4-12 6 22 6-30 5 20 3-6h8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    recede: `<svg viewBox="0 0 48 48"><path d="M4 34c6-4 10-4 16 0s10 4 16 0M8 24c5-3 9-3 14 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M40 16H26m0 0 5-5m-5 5 5 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    rain: `<svg viewBox="0 0 48 48"><path d="M14 26a8 8 0 0 1 1-16 11 11 0 0 1 21 3 7 7 0 0 1-1 13Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 32l-2 6M24 32l-2 6M32 32l-2 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
    hill: `<svg viewBox="0 0 48 48"><path d="M4 40 18 16l8 12 6-8 12 20Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M18 16V6l8 3-8 3" fill="currentColor"/></svg>`,
    fish: `<svg viewBox="0 0 48 48"><path d="M6 24c6-8 18-10 26-2l8-6v16l-8-6c-8 8-20 6-26-2Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="22" r="2" fill="currentColor"/></svg>`
  };

  window.SCENES = { village, rumoh, classroom, climb, climbPoint, partShape, RUMOH, ICON };
})();

// ---------- Lab-card diagrams (science content) ----------
(function () {
  const F = 'font-family="Figtree, sans-serif"';
  const txt = (x, y, s, o = "") => `<text x="${x}" y="${y}" ${F} font-size="15" fill="#1d2a3a" ${o}>${s}</text>`;

  // P (longitudinal) vs S (transverse) waves
  function waves(l) {
    let lines = "";
    for (let i = 0; i < 34; i++) {
      const x = 30 + i * 13 + 6 * Math.sin(i / 2.2);
      lines += `<line x1="${x.toFixed(1)}" y1="44" x2="${x.toFixed(1)}" y2="92" stroke="#1f6fa8" stroke-width="3"/>`;
    }
    let sine = "M30 175";
    for (let x = 30; x <= 470; x += 5) sine += ` L${x} ${(175 - 26 * Math.sin((x - 30) / 30)).toFixed(1)}`;
    return `<svg viewBox="0 0 500 230" class="diagram">
      ${txt(30, 28, `<tspan font-weight="700">${l.p}</tspan>`)}${lines}
      <path d="M380 108 h70 m-10 -7 l10 7 -10 7" stroke="#8a5a2b" stroke-width="3" fill="none"/><path d="M60 108 h40 m-34 -6 l-6 6 6 6 m28 -12 l6 6 -6 6" stroke="#c2433c" stroke-width="2.5" fill="none"/>
      ${txt(108, 113, l.pMove, 'font-size="13" fill="#c2433c"')}
      ${txt(30, 140, `<tspan font-weight="700">${l.s}</tspan>`)}
      <path d="${sine}" stroke="#1f6fa8" stroke-width="3.5" fill="none"/>
      <path d="M380 218 h70 m-10 -7 l10 7 -10 7" stroke="#8a5a2b" stroke-width="3" fill="none"/>
      <path d="M78 158 v34 m-6 -28 l6 -6 6 6 m-12 22 l6 6 6 -6" stroke="#c2433c" stroke-width="2.5" fill="none"/>
      ${txt(92, 222, l.sMove, 'font-size="13" fill="#c2433c"')}${txt(300, 222, l.dir, 'font-size="13" fill="#8a5a2b"')}
    </svg>`;
  }

  // seismogram: P at 5 s, S at 15 s
  function seismogram(l) {
    const X = s => 40 + s * 14.5;
    let d = "M40 120";
    for (let s = 0; s <= 30; s += 0.1) {
      let a = 1.5 * Math.sin(s * 40);
      if (s >= 5) a += 14 * Math.exp(-(s - 5) * 0.35) * Math.sin(s * 23);
      if (s >= 15) a += 48 * Math.exp(-(s - 15) * 0.22) * Math.sin(s * 13);
      d += ` L${X(s).toFixed(1)} ${(120 - a).toFixed(1)}`;
    }
    const ticks = [0, 5, 10, 15, 20, 25, 30].map(s => `<line x1="${X(s)}" y1="190" x2="${X(s)}" y2="196" stroke="#4a5768"/>${txt(X(s) - 6, 214, s, 'font-size="13"')}`).join("");
    return `<svg viewBox="0 0 500 230" class="diagram">
      <rect x="40" y="40" width="435" height="150" fill="#fbf8f2" stroke="#d9ccb4"/>
      <path d="${d}" stroke="#1d2a3a" stroke-width="1.6" fill="none"/>
      <line x1="${X(5)}" y1="36" x2="${X(5)}" y2="190" stroke="#1f6fa8" stroke-width="2" stroke-dasharray="5 4"/>
      <line x1="${X(15)}" y1="36" x2="${X(15)}" y2="190" stroke="#c2433c" stroke-width="2" stroke-dasharray="5 4"/>
      ${txt(X(5) + 5, 30, `<tspan font-weight="700" fill="#1f6fa8">P</tspan> = 5 s`)}${txt(X(15) + 5, 30, `<tspan font-weight="700" fill="#c2433c">S</tspan> = 15 s`)}
      <line x1="40" y1="190" x2="475" y2="190" stroke="#4a5768"/>${ticks}${txt(420, 228, l.time, 'font-size="12" fill="#4a5768"')}
    </svg>`;
  }

  // ocean cross-section for v = sqrt(g d)
  function ocean(l) {
    return `<svg viewBox="0 0 500 230" class="diagram">
      <rect x="0" y="70" width="500" height="160" fill="#cfe6f4"/>
      <path d="M0 230 L0 215 L300 210 Q 380 205 430 120 L 470 80 L500 70 L500 230Z" fill="#cdb98a"/>
      <path d="M0 70 Q 40 62 80 70 Q 120 78 160 70" stroke="#1f6fa8" stroke-width="3" fill="none"/>
      <path d="M380 70 Q 410 30 440 70" fill="#1f6fa8" opacity=".85"/>
      <line x1="120" y1="72" x2="120" y2="210" stroke="#1d2a3a" stroke-dasharray="5 4"/>${txt(128, 112, l.deep, 'font-size="13" font-weight="700"')}
      <line x1="448" y1="72" x2="448" y2="96" stroke="#1d2a3a" stroke-dasharray="3 3"/>${txt(330, 112, l.shallow, 'font-size="13" font-weight="700"')}
      ${txt(10, 56, l.small, 'font-size="13"')}${txt(300, 24, l.tall, 'font-size="13"')}
      <rect x="150" y="146" width="150" height="40" rx="8" fill="#fff" stroke="#8a5a2b"/>${txt(166, 172, "v = √(g · d)", 'font-size="18" font-weight="700" fill="#8a5a2b"')}
    </svg>`;
  }

  // 3 full cycles in 2 s
  function vibGraph(l) {
    const X = s => 50 + s * 210, Y = v => 115 - v * 70;
    let d = `M${X(0)} ${Y(0)}`;
    for (let s = 0; s <= 2; s += 0.01) d += ` L${X(s).toFixed(1)} ${Y(Math.sin(2 * Math.PI * 1.5 * s)).toFixed(1)}`;
    const ticks = [0, 0.5, 1, 1.5, 2].map(s => `<line x1="${X(s)}" y1="40" x2="${X(s)}" y2="190" stroke="#e3d3b6"/>${txt(X(s) - 8, 212, s, 'font-size="13"')}`).join("");
    return `<svg viewBox="0 0 500 230" class="diagram">${ticks}
      <line x1="${X(0)}" y1="115" x2="${X(2)}" y2="115" stroke="#4a5768"/>
      <path d="${d}" stroke="#1f6fa8" stroke-width="3.5" fill="none"/>
      <line x1="30" y1="${Y(1)}" x2="30" y2="115" stroke="#c2433c" stroke-width="2"/>${txt(6, 80, "A", 'font-weight="700" fill="#c2433c"')}
      ${txt(400, 228, l.time, 'font-size="12" fill="#4a5768"')}
    </svg>`;
  }

  // evacuation route map
  function routeMap(l) {
    return `<svg viewBox="0 0 500 230" class="diagram">
      <rect width="500" height="230" fill="#e9f2df"/>
      <path d="M0 190 Q 120 180 250 196 T 500 188 L500 230 L0 230Z" fill="#7fb3d8"/>${txt(20, 222, l.coast, 'font-size="13" fill="#fff" font-weight="700"')}
      <ellipse cx="120" cy="50" rx="80" ry="38" fill="#6fae63"/><ellipse cx="120" cy="50" rx="45" ry="20" fill="#4f8f4a"/>${txt(80, 22, l.hillA, 'font-size="13" font-weight="700"')}
      <ellipse cx="440" cy="48" rx="70" ry="34" fill="#6fae63"/><ellipse cx="440" cy="48" rx="38" ry="17" fill="#4f8f4a"/>${txt(398, 22, l.hillB, 'font-size="13" font-weight="700"')}
      <rect x="215" y="140" width="46" height="30" fill="#fff" stroke="#c2433c" stroke-width="3"/>${txt(205, 186, l.school, 'font-size="13" font-weight="700"')}
      <path d="M215 150 Q 170 120 150 80" stroke="#1f6fa8" stroke-width="5" fill="none" stroke-dasharray="2 8" stroke-linecap="round"/>
      <path d="M261 155 Q 340 160 380 120 Q 420 90 425 70" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-dasharray="2 8" stroke-linecap="round"/>
      <rect x="100" y="104" width="94" height="24" rx="6" fill="#1f6fa8"/>${txt(108, 121, "A · 900 m", 'font-size="14" font-weight="700" fill="#fff"')}
      <rect x="318" y="164" width="104" height="24" rx="6" fill="#8a5a2b"/>${txt(326, 181, "B · 2.4 km", 'font-size="14" font-weight="700" fill="#fff"')}
    </svg>`;
  }

  Object.assign(window.SCENES, { waves, seismogram, ocean, vibGraph, routeMap });
})();
