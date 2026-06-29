// ============================================================
//  Aditya Verma Portfolio — case-study.js
//  Renders a case study detail page from a ?slug= URL param.
//  Handles: content rendering, inspector panel, left layer nav,
//           scroll progress bar, section IntersectionObserver.
// ============================================================

// ── Utility ────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ── Scroll progress bar ────────────────────────────────────
function initScrollProgress() {
  const bar      = document.getElementById('scrollProgress');
  const readPct  = document.getElementById('csReadPct');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop  = document.documentElement.scrollTop;
    const docHeight  = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct        = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
    bar.style.width  = pct + '%';
    if (readPct) readPct.textContent = pct + '%';
  }, { passive: true });
}

// ── Left layers panel — section observer ──────────────────
function initCsLayerNav() {
  const items    = document.querySelectorAll('.cs-layer-item');
  const sections = document.querySelectorAll('.cs-section-block[id]');

  // Click → smooth scroll
  items.forEach(item => {
    const activate = () => {
      const target = document.getElementById(item.dataset.section);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  });

  // Scroll → highlight active
  if (!sections.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      items.forEach(item => {
        item.classList.toggle('active', item.dataset.section === entry.target.id);
      });
    });
  }, { threshold: 0.4 });

  sections.forEach(s => obs.observe(s));
}

// ── Inspector panel — populate with case study metadata ───
function renderCsInspector(cs) {
  // Update frame name
  const nameEl = document.getElementById('csInspName');
  if (nameEl) {
    nameEl.childNodes[0].textContent = 'Frame · ' + (cs.title || 'Case Study');
  }

  // Metadata rows
  const contentEl = document.getElementById('csInspContent');
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="insp-row"><span>Client</span><span>${escapeHtml(cs.client || '—')}</span></div>
      <div class="insp-row"><span>Role</span><span>${escapeHtml(cs.role || '—')}</span></div>
      <div class="insp-row"><span>Year</span><span>${escapeHtml(cs.year || '—')}</span></div>
      <div class="insp-row"><span>Status</span><span style="color:var(--success)">${escapeHtml(cs.status || '—')}</span></div>
    `;
  }

  // Tags
  const tagsEl = document.getElementById('csInspTags');
  if (tagsEl) {
    tagsEl.innerHTML = (cs.tags || [])
      .map(t => `<span class="cs-insp-tag">${escapeHtml(t)}</span>`)
      .join('') || '<span style="font-size:12px;color:var(--text-faint)">—</span>';
  }
}

// ── Build a content section block ─────────────────────────
function buildSection(id, label, content) {
  if (!content) return '';
  return `
    <div class="cs-section-block" id="${id}">
      <div class="cs-block-label">${escapeHtml(label)}</div>
      <p>${escapeHtml(content)}</p>
    </div>
  `;
}

// ── Main render ───────────────────────────────────────────
async function renderCaseStudy() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');
  const body   = document.getElementById('csBody');

  if (!slug) {
    body.innerHTML = notFound('No case study slug provided.');
    return;
  }

  try {
    const res  = await fetch('data/case-studies.json');
    const data = await res.json();
    const cs   = (data.caseStudies || []).find(c => c.slug === slug);

    if (!cs) {
      body.innerHTML = notFound(`Couldn't find a case study with slug "<strong>${escapeHtml(slug)}</strong>".`);
      return;
    }

    // ── Page meta ──
    document.title = cs.title + ' — Aditya Verma';
    const fileTab = document.getElementById('fileTab');
    if (fileTab) fileTab.innerHTML = escapeHtml(cs.title) + ' <span class="ext">.fig</span>';

    const breadTitle = document.getElementById('csBreadcrumbTitle');
    if (breadTitle) breadTitle.textContent = cs.title;

    // OG tags
    const ogTitle = document.getElementById('ogTitle');
    const ogDesc  = document.getElementById('ogDesc');
    if (ogTitle) ogTitle.setAttribute('content', cs.title + ' — Aditya Verma');
    if (ogDesc)  ogDesc.setAttribute('content', cs.summary || 'UI/UX case study by Aditya Verma.');

    // ── Inspector ──
    renderCsInspector(cs);

    // Show/hide links layer item
    if (cs.liveUrl || cs.figmaUrl) {
      const linksLayer = document.getElementById('csLinksLayer');
      if (linksLayer) linksLayer.style.display = '';
    }

    // ── Hero block (title, meta row, cover) ──
    const heroHtml = `
      <span class="eyebrow">${escapeHtml(cs.client || '')}${cs.client && cs.year ? ' · ' : ''}${escapeHtml(cs.year || '')}</span>
      <h1>${escapeHtml(cs.title)}</h1>

      <div class="cs-meta-row">
        ${cs.client ? `<div><div class="k">Client</div>${escapeHtml(cs.client)}</div>` : ''}
        ${cs.role   ? `<div><div class="k">Role</div>${escapeHtml(cs.role)}</div>`     : ''}
        ${cs.year   ? `<div><div class="k">Year</div>${escapeHtml(cs.year)}</div>`     : ''}
        ${cs.tools  && cs.tools.length ? `<div><div class="k">Tools</div>${escapeHtml(cs.tools.join(', '))}</div>` : ''}
      </div>

      <div class="cs-cover">
        ${cs.coverImage
          ? `<img src="${escapeHtml(cs.coverImage)}" alt="${escapeHtml(cs.title)} — cover image">`
          : '<span style="padding:20px;text-align:center;">Cover image · add one from admin.html</span>'}
      </div>
    `;

    // ── Content sections ──
    const contentHtml = [
      buildSection('cs-overview', 'Overview',      cs.summary),
      buildSection('cs-problem',  'The Problem',   cs.problem),
      buildSection('cs-process',  'Process',       cs.process),
      buildSection('cs-outcome',  'Outcome',       cs.outcome),
    ].join('');

    // ── Media gallery (if any) ──
    let galleryHtml = '';
    if (cs.mediaAssets && cs.mediaAssets.length) {
      galleryHtml = `
        <div class="cs-section-block">
          <div class="cs-block-label">Gallery</div>
          <div class="cs-gallery">
            ${cs.mediaAssets.map(m => `
              <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.altText || cs.title)}">
            `).join('')}
          </div>
        </div>
      `;
    }

    // ── Links block ──
    let linksHtml = '';
    if (cs.liveUrl || cs.figmaUrl) {
      linksHtml = `
        <div class="cs-section-block" id="cs-links">
          <div class="cs-block-label">Links</div>
          <div class="cs-links-block">
            ${cs.liveUrl  ? `<a class="cs-link-btn" href="${escapeHtml(cs.liveUrl)}"  target="_blank" rel="noopener noreferrer">View live ↗</a>` : ''}
            ${cs.figmaUrl ? `<a class="cs-link-btn" href="${escapeHtml(cs.figmaUrl)}" target="_blank" rel="noopener noreferrer">Open in Figma ↗</a>` : ''}
          </div>
        </div>
      `;
    }

    // ── Back link ──
    const backHtml = `
      <div style="margin-top:60px;padding-top:30px;border-top:1px solid var(--panel-border);">
        <a class="back-link" href="index.html#work">← Back to all case studies</a>
      </div>
    `;

    body.innerHTML = heroHtml + contentHtml + galleryHtml + linksHtml + backHtml;

    // Init nav and observer after DOM is populated
    initCsLayerNav();

  } catch (e) {
    body.innerHTML = notFound('Something went wrong loading this case study.');
    console.error('[Portfolio] renderCaseStudy:', e);
  }
}

function notFound(msg) {
  return `
    <div class="empty-state" style="margin-top:40px;" role="alert">
      ${msg}<br>
      <a href="index.html#work" style="color:var(--accent);margin-top:12px;display:inline-block;">← Back to all case studies</a>
    </div>
  `;
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  renderCaseStudy();
});
