// ============================================================
//  Aditya Verma Portfolio — case-study.js
//  Renders all case study types (Quick, Long, Scratchpad)
//  into the unified full-screen layout.
// ============================================================

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

// ── Block Rendering for Scratchpad & Long ──────────────────
function renderBlock(b) {
  const id = b.id ? `id="cs-blk-${escapeHtml(b.id)}"` : '';
  switch (b.type) {
    case 'heading': {
      const lvl = Math.max(1, Math.min(6, parseInt(b.level) || 2));
      return `<div class="cs-section-block" ${id}>
        <h${lvl}>${escapeHtml(b.text || '')}</h${lvl}>
      </div>`;
    }
    case 'paragraph':
      return `<div class="cs-section-block" ${id}>
        <p style="white-space:pre-wrap;">${escapeHtml(b.text || '')}</p>
      </div>`;
    case 'label':
      return `<div class="cs-section-block" ${id}>
        <div class="cs-block-label">${escapeHtml(b.text || '')}</div>
      </div>`;
    case 'callout': {
      const colors = { insight:'var(--accent)', info:'var(--success)', warning:'#ffb347' };
      const bg     = { insight:'rgba(140,111,255,0.08)', info:'rgba(95,212,164,0.08)', warning:'rgba(255,179,71,0.08)' };
      const ct     = b.calloutType || 'insight';
      return `<div class="cs-section-block" ${id}>
        <div style="border-left:3px solid ${colors[ct]||colors.insight};background:${bg[ct]||bg.insight};padding:20px 24px;border-radius:6px;">
          <p style="white-space:pre-wrap;margin:0;color:var(--text);">${escapeHtml(b.text || '')}</p>
        </div>
      </div>`;
    }
    case 'image': {
      const cap = b.caption ? `<div style="font-family:var(--mono);font-size:12px;color:var(--text-3);margin-top:12px;text-align:center;">${escapeHtml(b.caption)}</div>` : '';
      return b.src ? `<div class="cs-section-block" ${id}>
        <img src="${escapeHtml(b.src)}" alt="${escapeHtml(b.alt||'')}" style="width:100%;border-radius:12px;display:block;">
        ${cap}
      </div>` : '';
    }
    case 'image-group': {
      if (!b.images || !b.images.length) return '';
      const imgs = b.images.filter(im => im.src).map(im =>
        `<img src="${escapeHtml(im.src)}" alt="${escapeHtml(im.alt||'')}" style="flex:1;border-radius:10px;object-fit:cover;max-height:400px;min-width:0;">`
      ).join('');
      if (!imgs) return '';
      const cap = b.caption ? `<div style="font-family:var(--mono);font-size:12px;color:var(--text-3);margin-top:12px;text-align:center;">${escapeHtml(b.caption)}</div>` : '';
      return `<div class="cs-section-block" ${id}>
        <div style="display:flex;gap:16px;">${imgs}</div>${cap}
      </div>`;
    }
    case 'video': {
      if (!b.url) return '';
      const cap = b.caption ? `<div style="font-family:var(--mono);font-size:12px;color:var(--text-3);margin-top:12px;text-align:center;">${escapeHtml(b.caption)}</div>` : '';
      const ytm = b.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/\s]{11})/);
      if (ytm) {
        return `<div class="cs-section-block" ${id}>
          <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;">
            <iframe src="https://www.youtube.com/embed/${ytm[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe>
          </div>${cap}
        </div>`;
      }
      const vim = b.url.match(/vimeo\.com\/(\d+)/);
      if (vim) {
        return `<div class="cs-section-block" ${id}>
          <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;">
            <iframe src="https://player.vimeo.com/video/${vim[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe>
          </div>${cap}
        </div>`;
      }
      return `<div class="cs-section-block" ${id}>
        <a class="cs-link-btn" href="${escapeHtml(b.url)}" target="_blank" rel="noopener">${escapeHtml(b.caption || 'Watch video ↗')}</a>
      </div>`;
    }
    case 'hyperlink':
      return b.url ? `<div class="cs-section-block" ${id}>
        <a class="cs-link-btn" href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(b.label || 'View Link')} ↗</a>
      </div>` : '';
    case 'divider':
      return `<div class="cs-section-block" ${id} style="padding:20px 0;">
        <hr style="border:none;border-top:${b.style==='dashed'?'2px dashed':'1px solid'} var(--border);">
      </div>`;
    default: return '';
  }
}
function buildLegacySection(id, label, content) {
  if (!content) return '';
  return `
    <div class="cs-section-block" id="${id}">
      <div class="cs-block-label">${escapeHtml(label)}</div>
      <p style="white-space:pre-wrap;">${escapeHtml(content)}</p>
    </div>
  `;
}

// ── Lightbox Logic ──────────────────────────────────────────
let galleryItems = [];
let lbIndex = 0;

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const lbCounter = document.getElementById('lbCounter');
  const lbCaption = document.getElementById('lbCaption');

  function openLightbox(index) {
    lbIndex = index;
    updateLightbox();
    lightbox.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('on');
    document.body.style.overflow = '';
  }
  function updateLightbox() {
    const item = galleryItems[lbIndex];
    if(!item) return;
    lbImg.src = item.url;
    lbCaption.textContent = item.cap || '';
    lbCounter.textContent = `${lbIndex + 1} / ${galleryItems.length}`;
  }

  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  lbPrev.addEventListener('click', () => { lbIndex = (lbIndex - 1 + galleryItems.length) % galleryItems.length; updateLightbox(); });
  lbNext.addEventListener('click', () => { lbIndex = (lbIndex + 1) % galleryItems.length; updateLightbox(); });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('on')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbPrev.click();
    if (e.key === 'ArrowRight') lbNext.click();
  });

  return { openLightbox };
}

// ── Scroll Reveal Observer ──────────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── Main Render ─────────────────────────────────────────────
async function renderCaseStudy() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');

  if (!slug) {
    document.getElementById('page').innerHTML = '<div style="padding:100px;text-align:center;">No slug provided.</div>';
    return;
  }

  try {
    const res = await fetch('../data/case-studies.json');
    const data = await res.json();
    const cases = data.caseStudies || [];
    const idx = cases.findIndex(c => c.slug === slug);
    const cs = cases[idx];

    if (!cs) {
      document.getElementById('page').innerHTML = `<div style="padding:100px;text-align:center;">Case study not found: ${escapeHtml(slug)}</div>`;
      return;
    }

    // Prev / Next calculation
    const prevCs = cases[(idx - 1 + cases.length) % cases.length];
    const nextCs = cases[(idx + 1) % cases.length];

    // Meta tags
    document.title = cs.title + ' — Aditya Verma';
    document.getElementById('tbTitle').textContent = cs.title + '.fig';
    if(cs.tags) {
      document.getElementById('tbTags').textContent = cs.tags.join(', ');
    }

    const ogTitle = document.getElementById('ogTitle');
    const ogDesc  = document.getElementById('ogDesc');
    if (ogTitle) ogTitle.setAttribute('content', cs.title + ' — Aditya Verma');
    if (ogDesc)  ogDesc.setAttribute('content', cs.summary || 'UI/UX case study by Aditya Verma.');

    // ── Hero ──
    const pidx = (idx + 1).toString().padStart(2, '0');
    document.getElementById('heroEyebrow').textContent = `PROJECT ${pidx}`;
    
    // Convert newlines in title to <br> for stylistic effect
    const titleLines = cs.title.split(' ');
    if (titleLines.length >= 2 && cs.title.indexOf('\n') === -1) {
      // If no explicit newlines but multiple words, break after first word (just for flair)
      document.getElementById('heroTitle').innerHTML = escapeHtml(titleLines[0]) + '<br>' + escapeHtml(titleLines.slice(1).join(' '));
    } else {
      document.getElementById('heroTitle').innerHTML = escapeHtml(cs.title).replace(/\n/g, '<br>');
    }

    document.getElementById('heroSubtitle').textContent = cs.subtitle || cs.client || '';
    document.getElementById('heroTagline').textContent = cs.tagline || cs.summary || '';

    // Meta items
    const metaWrap = document.getElementById('heroMeta');
    let metaHtml = '';
    if (cs.client) metaHtml += `<div class="hero-meta-item"><div class="hero-meta-label">Client</div><div class="hero-meta-value">${escapeHtml(cs.client)}</div></div>`;
    if (cs.role)   metaHtml += `<div class="hero-meta-item"><div class="hero-meta-label">Role</div><div class="hero-meta-value">${escapeHtml(cs.role)}</div></div>`;
    if (cs.year)   metaHtml += `<div class="hero-meta-item"><div class="hero-meta-label">Year</div><div class="hero-meta-value">${escapeHtml(cs.year)}</div></div>`;
    if (cs.tools && cs.tools.length) metaHtml += `<div class="hero-meta-item"><div class="hero-meta-label">Tools</div><div class="hero-meta-value">${escapeHtml(cs.tools.join(', '))}</div></div>`;
    metaWrap.innerHTML = metaHtml;

    // ── 3-Notes Section (for Quick cases, but can fallback for others) ──
    if (cs.notes && cs.notes.length) {
      show('notesSectionLabel');
      show('notes');
      const tags = ['The Brief', 'My Role', 'Thinking'];
      document.getElementById('notes').innerHTML = cs.notes.map((n, i) => `
        <div class="note-card">
          <div class="note-card-border-accent"></div>
          <div class="note-card-tag">${tags[i] || 'Note'}</div>
          <h3>${escapeHtml(n.title)}</h3>
          <p>${escapeHtml(n.body)}</p>
        </div>
      `).join('');
    } else if (cs.type === 'quick') {
      // Fallback if notes array doesn't exist but it's a quick template
      show('notesSectionLabel');
      show('notes');
      document.getElementById('notes').innerHTML = `
        <div class="note-card"><div class="note-card-border-accent"></div><div class="note-card-tag">The Brief</div><h3>Challenge</h3><p>${escapeHtml(cs.problem || '—')}</p></div>
        <div class="note-card"><div class="note-card-border-accent"></div><div class="note-card-tag">My Role</div><h3>Process</h3><p>${escapeHtml(cs.process || '—')}</p></div>
        <div class="note-card"><div class="note-card-border-accent"></div><div class="note-card-tag">Thinking</div><h3>Outcome</h3><p>${escapeHtml(cs.outcome || '—')}</p></div>
      `;
    }

    // ── Details Section (Legacy text & Scratchpad blocks) ──
    let hasBlocks = false;
    let blockHtml = '';

    if (cs.blocks && cs.blocks.length) {
      // Scratchpad format
      hasBlocks = true;
      blockHtml = cs.blocks
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(b => renderBlock(b))
        .join('');
    } else if (cs.type !== 'quick') {
      // Legacy format (long text fields)
      hasBlocks = true;
      blockHtml = [
        buildLegacySection('cs-overview', 'Overview',    cs.summary),
        buildLegacySection('cs-problem',  'The Problem', cs.problem),
        buildLegacySection('cs-process',  'Process',     cs.process),
        buildLegacySection('cs-outcome',  'Outcome',     cs.outcome),
      ].join('');
    }

    if (hasBlocks) {
      show('blocksSectionLabel');
      show('csBlocks');
      document.getElementById('csBlocks').innerHTML = blockHtml;
    }

    // ── Gallery ──
    const assets = cs.mediaAssets || cs.screens || [];
    if (assets.length) {
      show('gallerySectionLabel');
      show('galleryWrap');
      const lb = initLightbox();

      const grid = document.getElementById('galleryGrid');
      let html = '';
      assets.forEach((m, i) => {
        const isWide = !!m.wide;
        const imgUrl = m.url || m.src;
        const cap = m.altText || m.caption || cs.title;
        galleryItems.push({ url: imgUrl, cap });
        html += `
          <div class="gallery-item ${isWide ? 'wide' : ''} reveal" onclick="openGallery(${i})">
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(cap)}" loading="lazy">
            <div class="gallery-overlay">
              <div class="gallery-overlay-num">FIG . ${(i+1).toString().padStart(2,'0')}</div>
              <div class="gallery-overlay-cap">${escapeHtml(cap)}</div>
            </div>
          </div>
        `;
      });
      grid.innerHTML = html;

      // Expose to global for onclick
      window.openGallery = lb.openLightbox;
    }

    // ── Prototype ──
    if (cs.prototypeUrl) {
      show('protoSectionLabel');
      show('protoWrap');
      document.getElementById('protoDevice').innerHTML = `
        <div class="proto-titlebar">
          <div class="proto-dot" style="background:#ff5f57"></div>
          <div class="proto-dot" style="background:#febc2e"></div>
          <div class="proto-dot" style="background:#28c840"></div>
          <div class="proto-label">Figma Prototype</div>
        </div>
        <div class="proto-frame">
          <iframe src="${escapeHtml(cs.prototypeUrl)}" allowfullscreen></iframe>
        </div>
      `;
    }

    const fl = document.getElementById('footerLinks');
    let flHtml = '';
    if (cs.liveUrl) {
      flHtml += `<a class="fl-btn" href="${escapeHtml(cs.liveUrl)}" target="_blank" rel="noopener">🌍 Visit Live Site ↗</a>`;
    }
    if (cs.figmaUrl) {
      flHtml += `<a class="fl-btn" href="${escapeHtml(cs.figmaUrl)}" target="_blank" rel="noopener">🎨 Open in Figma ↗</a>`;
    }
    if (flHtml) {
      flHtml += '<div class="fl-spacer"></div>';
    }
    flHtml += `<a class="fl-btn primary" href="../index.html#work">All Projects ↗</a>`;
    fl.innerHTML = flHtml;

    // ── Prev / Next Navigation ──
    if (cases.length > 1) {
      show('projectNav');
      document.getElementById('projectNav').innerHTML = `
        <a href="?slug=${encodeURIComponent(prevCs.slug)}" class="pn-btn">
          <div class="pn-label">Previous Project</div>
          <div class="pn-title">${escapeHtml(prevCs.title)}</div>
        </a>
        <a href="?slug=${encodeURIComponent(nextCs.slug)}" class="pn-btn right">
          <div class="pn-label">Next Project</div>
          <div class="pn-title">${escapeHtml(nextCs.title)}</div>
        </a>
      `;
    }

    initScrollReveal();

  } catch (e) {
    document.getElementById('page').innerHTML = `<div style="padding:100px;text-align:center;">Failed to load case study data.</div>`;
    console.error(e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCaseStudy();
  initCursor();
});

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

  const hov = "a, button, .case-card, .pn-btn, .fl-btn, .lb-nav-btn, [role='button'], [data-cursor]";
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
