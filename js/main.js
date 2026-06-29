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

  try {
    const res  = await fetch('data/case-studies.json');
    const data = await res.json();

    // Published only (excludes draft AND hidden per PRD §4.1)
    allStudies = (data.caseStudies || [])
      .filter(cs => cs.status === 'published')
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!allStudies.length) {
      grid.innerHTML = `<div class="empty-state" role="status">
        No published case studies yet.<br>
        <span style="font-size:11px;margin-top:8px;display:block;">
          Open <a href="admin.html" style="color:var(--accent)">admin.html</a> to add one.
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

function renderGrid(studies) {
  const grid = document.getElementById('workGrid');
  grid.innerHTML = studies.map((cs, i) => `
    <a class="case-card"
       href="case-study.html?slug=${encodeURIComponent(cs.slug)}"
       data-tags="${escapeHtml((cs.tags || []).join(','))}"
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
      </div>

      <div class="case-meta">
        <div class="case-tagline">${escapeHtml(cs.client || '')}${cs.client && cs.year ? ' · ' : ''}${escapeHtml(cs.year || '')}</div>
        <h3>${escapeHtml(cs.title)}</h3>
        <p>${escapeHtml(cs.summary || '')}</p>
        <div class="case-tags" aria-label="Tags">
          ${(cs.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <span class="case-arrow" aria-hidden="true">↗</span>
    </a>
  `).join('');
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

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCaseStudies();
  initInspector();
  initLayerNav();
  initScrollHint();
  initCopyEmail();
  initFooterTs();
});
