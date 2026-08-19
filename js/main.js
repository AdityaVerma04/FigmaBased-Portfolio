// ============================================================
//  Aditya Verma Portfolio — main.js
//  Handles: case study grid + filter bar, scroll-driven inspector,
//           layer nav, copy-email, scroll-hint, footer timestamp.
// ============================================================

// ── Utility ────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ── Case studies grid ──────────────────────────────────────
let allStudies = [];

async function loadCaseStudies() {
  const grid = document.getElementById('workGrid');
  if (!grid) return;

  const urls = [
    'data/case-studies.json',
    '/data/case-studies.json',
    './data/case-studies.json',
    '../data/case-studies.json'
  ];
  let data = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        data = await res.json();
        if (data && Array.isArray(data.caseStudies) && data.caseStudies.length) break;
      }
    } catch(e) {}
  }

  try {
    if (!data) throw new Error('Could not load case studies JSON');

    // Published only (excludes draft AND hidden per PRD §4.1)
    allStudies = (data.caseStudies || [])
      .filter(cs => cs.status === 'published')
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!allStudies.length) {
      grid.innerHTML = `<div class="empty-state" role="status">
        No published case studies yet.<br>
        <span style="font-size:11px;margin-top:8px;display:block;">
          Open <a href="admin/" style="color:var(--accent)">admin.html</a> to add one.
        </span>
      </div>`;
      return;
    }

    renderGrid(allStudies);
    renderFilterBar(allStudies);

  } catch (e) {
    grid.innerHTML = `<div class="empty-state" role="alert">
      Couldn't load case studies.<br>
      <span style="font-size:11px;margin-top:8px;display:block;">
        Check <code>data/case-studies.json</code>.
      </span>
    </div>`;
    console.error('[Portfolio] loadCaseStudies:', e);
  }
}

// Determine target URL for a case study based on its type
function csHref(cs) {
  return `case-study/?slug=${encodeURIComponent(cs.slug)}`;
}

// Type badge label
function csTypeBadge(cs) {
  const t = cs.type || 'long';
  if (t === 'quick')    return '<span class="cs-type-badge cs-type-quick" title="Quick Case Study">Q</span>';
  if (t === 'detailed') return '<span class="cs-type-badge cs-type-detailed" title="Detailed Case Study">D</span>';
  if (t === 'scratch')  return '<span class="cs-type-badge cs-type-scratch" title="Scratchpad">S</span>';
  return '<span class="cs-type-badge cs-type-long" title="Long Case Study">L</span>';
}

function renderGrid(studies) {
  const grid = document.getElementById('workGrid');
  grid.innerHTML = studies.map((cs, i) => {
    const isLocked = !!cs.isLocked;
    return `
    <a class="case-card ${isLocked ? 'is-locked' : ''}"
       href="${isLocked ? 'javascript:void(0);' : csHref(cs)}"
       data-tags="${escapeHtml((cs.tags || []).join(','))}"
       ${isLocked ? 'data-locked="true" data-cursor="Locked"' : ''}
       style="animation-delay:${i * 0.08}s"
       role="listitem"
       aria-label="${escapeHtml(cs.title)}">
      <span class="corner tl" aria-hidden="true"></span>
      <span class="corner tr" aria-hidden="true"></span>
      <span class="corner bl" aria-hidden="true"></span>
      <span class="corner br" aria-hidden="true"></span>

      <div class="case-thumb" aria-hidden="${!!cs.coverImage}">
        ${cs.coverImage
          ? `<img src="${escapeHtml(cs.coverImage)}" alt="${escapeHtml(cs.title)} — cover image" loading="lazy">`
          : `<span>${escapeHtml(cs.client || 'Case Study')}</span>`}
        ${csTypeBadge(cs)}
        ${isLocked ? `
          <div class="cs-lock-badge" title="Locked — Soon to be uploaded">
            <span class="lock-icon">🔒</span> <span class="lock-text">Locked</span>
          </div>
          <div class="cs-lock-hover-overlay">
            <span class="lock-pulse-dot"></span>
            <span>Soon to be uploaded</span>
          </div>
        ` : ''}
      </div>

      <div class="case-meta">
        <div class="case-tagline">${escapeHtml(cs.client || '')}${cs.client && cs.year ? ' · ' : ''}${escapeHtml(cs.year || '')}</div>
        <h3>${escapeHtml(cs.title)}</h3>
        <p>${escapeHtml(cs.summary || '')}</p>
        <div class="case-tags" aria-label="Tags">
          ${(cs.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <span class="case-arrow ${isLocked ? 'is-locked-arrow' : ''}" aria-hidden="true">${isLocked ? '🔒' : '↗'}</span>
    </a>
  `;
  }).join('');

  if (typeof window.initLockedProjects === 'function') {
    window.initLockedProjects();
  }
}

// ── Filter bar ─────────────────────────────────────────────
function renderFilterBar(studies) {
  const bar = document.getElementById('filterBar');
  if (!bar) return;

  // Collect unique tags
  const tagSet = new Set();
  studies.forEach(cs => (cs.tags || []).forEach(t => tagSet.add(t)));
  const tags = [...tagSet];

  if (!tags.length) return; // nothing to filter

  bar.innerHTML = [
    `<button class="tag-btn active" data-tag="all" aria-pressed="true">All</button>`,
    ...tags.map(t => `<button class="tag-btn" data-tag="${escapeHtml(t)}" aria-pressed="false">${escapeHtml(t)}</button>`)
  ].join('');

  bar.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.tag-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      filterCards(btn.dataset.tag);
    });
  });
}

function filterCards(tag) {
  const grid  = document.getElementById('workGrid');
  const cards = grid.querySelectorAll('.case-card');

  cards.forEach((card, i) => {
    const cardTags = card.dataset.tags.split(',').map(s => s.trim());
    const show     = tag === 'all' || cardTags.includes(tag);
    card.style.display = show ? '' : 'none';
    if (show) card.style.animationDelay = `${i * 0.06}s`;
  });
}

// ── Scroll-driven inspector ────────────────────────────────
function flashVal(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('flash');
}

function initInspector() {
  const sections    = document.querySelectorAll('.section[data-frame]');
  const layerItems  = document.querySelectorAll('.layer-item');
  const inspName    = document.getElementById('inspName');
  const inspSize    = document.getElementById('inspSize');
  const inspFill    = document.getElementById('inspFill');
  const inspSwatch  = document.getElementById('inspSwatch');
  const inspRadius  = document.getElementById('inspRadius');
  const inspLayout  = document.getElementById('inspLayout');
  const inspOpacity = document.getElementById('inspOpacity');
  const inspBlur    = document.getElementById('inspBlur');

  if (!sections.length || !inspName) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      // Fade-swap the frame name
      inspName.style.opacity = '0';
      setTimeout(() => {
        inspName.childNodes[0].textContent = 'Frame · ' + el.dataset.frame;
        inspName.style.opacity = '1';
      }, 140);

      // Update all inspector values with flash animation
      const setVal = (node, value) => {
        if (!node) return;
        const prev = node.textContent;
        if (prev === value) return;
        node.textContent = value;
        flashVal(node);
      };

      setVal(inspSize,    el.dataset.size    || '—');
      setVal(inspLayout,  el.dataset.layout  || 'Fixed');
      setVal(inspRadius,  (el.dataset.radius || '0') + (el.dataset.radius && el.dataset.radius !== '0' ? ' px' : ''));
      setVal(inspOpacity, el.dataset.opacity || '100%');
      setVal(inspBlur,    el.dataset.blur    || '0 px');

      // Fill color + swatch
      const fill = (el.dataset.fill || '#14131A').toUpperCase();
      setVal(inspFill, fill);
      if (inspSwatch) inspSwatch.style.background = fill;

      // Active layer highlight
      layerItems.forEach(item => {
        item.classList.toggle('active', item.dataset.target === el.id);
      });
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

// ── Layer nav clicks ───────────────────────────────────────
function initLayerNav() {
  document.querySelectorAll('.layer-item').forEach(item => {
    const activate = () => {
      const target = document.getElementById(item.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  });
}

// ── Scroll hint fade ──────────────────────────────────────
function initScrollHint() {
  const hint = document.getElementById('scrollHint');
  if (!hint) return;
  const onScroll = () => {
    if (window.scrollY > 100) {
      hint.classList.add('hidden');
      window.removeEventListener('scroll', onScroll, { passive: true });
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ── Copy email ────────────────────────────────────────────
function initCopyEmail() {
  const btn = document.getElementById('copyEmailBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('adityaverma0424@gmail.com');
      btn.textContent = 'copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'copy';
        btn.classList.remove('copied');
      }, 2000);
    } catch {
      btn.textContent = 'failed';
      setTimeout(() => { btn.textContent = 'copy'; }, 1500);
    }
  });
}

// ── Footer timestamp ──────────────────────────────────────
function initFooterTs() {
  const el = document.getElementById('footerTs');
  if (!el) return;
  const y = new Date().getFullYear();
  el.textContent = `Updated ${y}`;
}

// ── Fullscreen / Presentation mode ───────────────────────
function initFullscreen() {
  const btn          = document.getElementById('fullscreenBtn');
  if (!btn) return;
  const iconExpand   = btn.querySelector('.icon-expand');
  const iconCompress = btn.querySelector('.icon-compress');

  function enter() {
    document.body.classList.add('fullscreen');
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('active');
    iconExpand.style.display   = 'none';
    iconCompress.style.display = '';
    btn.title = 'Exit fullscreen (F)';
  }

  function exit() {
    document.body.classList.remove('fullscreen');
    btn.setAttribute('aria-pressed', 'false');
    btn.classList.remove('active');
    iconExpand.style.display   = '';
    iconCompress.style.display = 'none';
    btn.title = 'Toggle fullscreen (F)';
  }

  btn.addEventListener('click', () => {
    document.body.classList.contains('fullscreen') ? exit() : enter();
  });

  // Keyboard shortcut: F key (when not focused on input/textarea)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      const tag = document.activeElement.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable) return;
      document.body.classList.contains('fullscreen') ? exit() : enter();
    }
    // Escape to exit fullscreen
    if (e.key === 'Escape' && document.body.classList.contains('fullscreen')) {
      exit();
    }
  });
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSplashScreen();
  loadCaseStudies();
  initInspector();
  initLayerNav();
  initScrollHint();
  initCopyEmail();
  initFooterTs();
  initFullscreen();
  initCursor();
});

// ── iOS Multilingual Splash Screen ─────────────────────────
function initSplashScreen() {
  const splash = document.getElementById('splashScreen');
  const textEl = document.getElementById('splashText');
  if (!splash || !textEl) return;

  // ══════════════════════════════════════════════════════════════
  //  SPLASH SCREEN SPEED CONFIGURATION:
  //  • WORD_SPEED_MS : Milliseconds per word (lower = faster)
  //                    e.g. 180 = ultra fast, 220 = brisk/snappy, 350 = relaxed
  //  • FADE_SPEED_MS : Duration of opacity fade between words
  //  • EXIT_DELAY_MS : Brief pause on the final greeting before dissolving
  // ══════════════════════════════════════════════════════════════
  const WORD_SPEED_MS = 220;
  const FADE_SPEED_MS = 80;
  const EXIT_DELAY_MS = 250;

  const greetings = [
    "Hello",
    "नमस्ते",
    "سلام",
    "Hola",
    "Bonjour",
    "Ciao",
    "こんにちは",
    "Olá",
    "안녕하세요",
    "Guten Tag"
  ];

  let currentIndex = 0;
  let isExiting = false;

  function dismissSplash() {
    if (isExiting) return;
    isExiting = true;
    splash.classList.add('splash-hidden');
    setTimeout(() => {
      try { splash.remove(); } catch(e) {}
    }, 850);
  }

  // Click / tap to skip immediately
  splash.addEventListener('click', dismissSplash);
  splash.addEventListener('touchstart', dismissSplash, { passive: true });

  const timer = setInterval(() => {
    if (isExiting) {
      clearInterval(timer);
      return;
    }

    currentIndex++;

    if (currentIndex >= greetings.length) {
      clearInterval(timer);
      setTimeout(dismissSplash, EXIT_DELAY_MS);
      return;
    }

    // Pure smooth opacity crossfade
    textEl.classList.add('splash-text-fade');

    setTimeout(() => {
      textEl.textContent = greetings[currentIndex];
      textEl.classList.remove('splash-text-fade');
    }, FADE_SPEED_MS);

  }, WORD_SPEED_MS);
}

// ── Custom Cursor ─────────────────────────────────────────
function initCursor() {
  if (matchMedia("(max-width: 860px)").matches) return;
  const dot = document.querySelector(".cursor__dot"),
        ring = document.querySelector(".cursor__ring"),
        label = document.querySelector(".cursor__label");
  if (!dot || !ring || !label) return;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

  window.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + "px"; dot.style.top = my + "px";
    label.style.left = mx + "px"; label.style.top = my + "px";
  });

  (function loop() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.left = rx + "px"; ring.style.top = ry + "px";
    requestAnimationFrame(loop);
  })();

  const hov = "a, button, .case-card, .layer-item, .tool-btn, .topbar-btn, .share-btn, .contact-link-item, [role='button'], [data-cursor]";
  document.addEventListener("mouseover", e => {
    const t = e.target.closest(hov);
    if (t) {
      document.body.classList.add("cursor-hover");
      label.textContent = t.dataset.cursor || "";
    }
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest(hov)) {
      document.body.classList.remove("cursor-hover");
      label.textContent = "";
    }
  });
}
