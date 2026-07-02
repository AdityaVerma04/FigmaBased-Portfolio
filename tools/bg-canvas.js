// ============================================================
//  Aditya Verma Portfolio — bg-canvas.js
//  Interactive dot-grid background: dots near the cursor
//  glow and grow with the accent purple colour, with a smooth
//  distance-based falloff. Replaces the CSS static dot grid.
// ============================================================

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────
  const CFG = {
    spacing:     28,            // px between dot grid intersections
    baseR:       1,             // base dot radius (px)
    maxR:        4.5,           // max radius at cursor
    influence:   180,           // px radius of mouse influence
    lerpSpeed:   0.09,          // how fast dots chase their target (0..1)
    baseAlpha:   0.042,         // opacity of unlit dots
    maxAlpha:    0.9,           // opacity of fully-lit dot at cursor
    glowAlpha:   0.14,          // soft outer glow max opacity
    glowRMult:   3.0,           // glow radius = dot.r * glowRMult
    base:        [255, 255, 255],    // unlit colour  (white)
    accent:      [140, 111, 255],    // lit colour    (--accent #8c6fff)
    accentGlow:  [160, 123, 255],    // glow colour   (slightly lighter)
  };

  // ── State ──────────────────────────────────────────────────
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let mouse = { x: -9999, y: -9999 };  // viewport coords
  let dots  = [];
  let raf;

  // ── Build dot array (viewport-only, fixed position) ────────
  function buildDots() {
    dots = [];
    const cols = Math.ceil(canvas.width  / CFG.spacing) + 2;
    const rows = Math.ceil(canvas.height / CFG.spacing) + 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x:          c * CFG.spacing,
          y:          r * CFG.spacing,
          brightness: 0,   // 0..1 – current (lerped)
          target:     0,   // 0..1 – desired
        });
      }
    }
  }

  // ── Resize ─────────────────────────────────────────────────
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    buildDots();
  }

  // ── Math helpers ───────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpColor(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t)),
    ];
  }

  // ── Draw loop ──────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mx = mouse.x;
    const my = mouse.y;
    const inf2 = CFG.influence * CFG.influence;

    for (let i = 0, len = dots.length; i < len; i++) {
      const dot = dots[i];
      const dx  = dot.x - mx;
      const dy  = dot.y - my;
      const d2  = dx * dx + dy * dy;

      // Compute target brightness from distance
      if (d2 < inf2) {
        const d = Math.sqrt(d2);
        dot.target = Math.pow(1 - d / CFG.influence, 2.2); // smooth falloff
      } else {
        dot.target = 0;
      }

      // Lerp towards target (slower return than approach)
      const speed = dot.brightness > dot.target
        ? CFG.lerpSpeed * 0.5  // fade out slower
        : CFG.lerpSpeed;
      dot.brightness = lerp(dot.brightness, dot.target, speed);

      const b = dot.brightness;
      if (b < 0.002) {
        // Draw base dot cheaply
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, CFG.baseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${CFG.baseAlpha})`;
        ctx.fill();
        continue;
      }

      // ── Glow halo (drawn before the dot so it's underneath) ──
      if (b > 0.08) {
        const glowR   = lerp(CFG.baseR, CFG.maxR, b) * CFG.glowRMult;
        const glowA   = b * CFG.glowAlpha;
        const [gr, gg, gb] = CFG.accentGlow;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${gr},${gg},${gb},${glowA})`;
        ctx.fill();
      }

      // ── Lit dot ──
      const r      = lerp(CFG.baseR, CFG.maxR, b);
      const alpha  = lerp(CFG.baseAlpha, CFG.maxAlpha, b);
      const [cr, cg, cb] = lerpColor(CFG.base, CFG.accent, b);

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  // ── Event listeners ────────────────────────────────────────
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      cancelAnimationFrame(raf);
      resize();
      draw();
    }, 120);
  }, { passive: true });

  // ── Live accent recolour (from figma-tools color picker) ──
  window.addEventListener('accentChange', e => {
    CFG.accent     = e.detail.rgb;
    CFG.accentGlow = e.detail.rgb.map(v => Math.min(255, v + 20));
  });

  // ── Boot ───────────────────────────────────────────────────
  resize();
  draw();

})();
