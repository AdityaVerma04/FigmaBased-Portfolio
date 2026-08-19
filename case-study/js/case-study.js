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

// ── Scroll Reveal Observer ──────────────────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── NEW 13-SECTION RENDER FUNCTIONS ────────────────────────────────

// 1. Cover Image
function renderCover(cs) {
  if (!cs.coverImage) return;
  show('coverWrap');
  document.getElementById('coverWrap').innerHTML = `
    <div class="cover-img-wrap">
      <img src="${escapeHtml(cs.coverImage)}" alt="Cover — ${escapeHtml(cs.title)}" loading="lazy">
    </div>
  `;
}

// 2. Context & Problem
function renderContextProblem(cs) {
  if (!cs.context && !cs.problemStatement) return;
  show('contextSectionLabel');
  show('contextWrap');
  const contextBlock = cs.context ? `
    <div class="ctx-context-block">
      <div class="cs-block-label">Context</div>
      <p class="ctx-body">${escapeHtml(cs.context)}</p>
    </div>` : '';
  const problemBlock = cs.problemStatement ? `
    <div class="ctx-problem-block" style="margin-top: 48px;">
      <div class="cs-block-label">Problem Statement</div>
      <div class="problem-statement-box">
        <h2 class="problem-statement">${escapeHtml(cs.problemStatement)}</h2>
      </div>
    </div>` : '';
  document.getElementById('contextWrap').innerHTML =
    `<div class="ctx-grid">${contextBlock}${problemBlock}</div>`;
}

// 3. Solution — Mosaic Grid
function renderSolution(cs) {
  if (!cs.solutionScreens || !cs.solutionScreens.length) return;
  show('solutionSectionLabel');
  show('solutionWrap');
  const pool = [
    ...(cs.solutionScreens || []),
    ...(cs.detScreens || []).map(s => ({ src: s.src, caption: s.caption }))
  ].slice(0, 8);
  const cellsHtml = pool.map(s => `
    <div class="solution-mosaic-cell">
      <img src="${escapeHtml(s.src)}" alt="${escapeHtml(s.caption || '')}" loading="lazy">
    </div>`).join('');
  document.getElementById('solutionWrap').innerHTML = `
    <div class="solution-strip" style="padding: 48px 0 24px;">
      <div class="iter-heading-row" style="margin-bottom: 24px;">
        <span class="iter-heading">Crafted Solution</span>
      </div>
      <div class="solution-mosaic">${cellsHtml}</div>
    </div>`;
}

// 4. Project Details — 2x2 Story Grid
function renderProjectDetails(cs) {
  if (!cs.team && !cs.timeline && !cs.role && !(cs.tools && cs.tools.length)) return;
  show('detailsInfoSectionLabel');
  show('detailsInfoWrap');
  const toolsVal = cs.tools && cs.tools.length ? cs.tools.join(', ') : (cs.detDesignsUrl || '—');
  document.getElementById('detailsInfoWrap').innerHTML = `
    <div style="padding:48px 0;">
      <div class="iter-heading-row" style="margin-bottom: 28px;">
        <span class="iter-heading">Project Story</span>
      </div>
      <div class="story-grid">
        <div class="story-cell">
          <div class="story-cell-label">The Team</div>
          <div class="story-cell-value">${escapeHtml(cs.team || '—')}</div>
        </div>
        <div class="story-cell">
          <div class="story-cell-label">My Role</div>
          <div class="story-cell-value">${escapeHtml(cs.role || cs.detMyRole || '—')}</div>
        </div>
        <div class="story-cell">
          <div class="story-cell-label">Duration</div>
          <div class="story-cell-value">${escapeHtml(cs.timeline || '—')}</div>
        </div>
        <div class="story-cell">
          <div class="story-cell-label">Tools</div>
          <div class="story-cell-value muted">${escapeHtml(toolsVal)}</div>
        </div>
      </div>
    </div>`;
}

// 5. Research — Analysis Grid
function renderResearch(cs) {
  if (!cs.researchMethods && !cs.personas && !cs.evidenceImages) return;
  show('researchSectionLabel');
  show('researchWrap');

  // Map data to 4 analysis quadrants
  const methods = cs.researchMethods || [];
  const quads = [
    { label: methods[0] ? methods[0].name + ':' : 'Competitive Analysis:', text: methods[0] ? methods[0].description : '' },
    { label: methods[1] ? methods[1].name + ':' : 'Use Case Analysis:',  text: methods[1] ? methods[1].description : '' },
    { label: methods[2] ? methods[2].name + ':' : 'Pain Points',         text: methods[2] ? methods[2].description : '' },
    { label: methods[3] ? methods[3].name + ':' : 'Target Audience',     text: methods[3] ? methods[3].description : '' },
  ];
  const quadHtml = quads.map(q => `
    <div class="analysis-cell">
      <div class="analysis-cell-label">${escapeHtml(q.label)}</div>
      <div class="analysis-cell-text">${escapeHtml(q.text)}</div>
    </div>`).join('');

  // Evidence images for strip
  const imgs = (cs.evidenceImages || []).slice(0, 3);
  const stripHtml = imgs.map(e => `
    <div class="strip-img-cell">
      <img src="${escapeHtml(e.src)}" alt="${escapeHtml(e.caption || '')}" loading="lazy">
    </div>`).join('');

  document.getElementById('researchWrap').innerHTML = `
    <div style="padding:48px 0;">
      <div class="iter-heading-row" style="margin-bottom: 24px;">
        <span class="iter-heading">Analysis</span>
      </div>
      <div class="analysis-grid">${quadHtml}</div>
      ${stripHtml ? `<div class="section-img-strip">${stripHtml}</div>` : ''}
    </div>`;
}

// 6. Ideation — 2-col cards + image strip
function renderIdeation(cs) {
  if (!cs.ideation) return;
  show('ideationSectionLabel');
  show('ideationWrap');

  const solutions = cs.ideation.solutions || [];
  const cardsHtml = `
    <div class="ideation-cards">
      <div class="ideation-card">
        <div class="ideation-card-label">Your Approach</div>
        <div class="ideation-card-text">${escapeHtml(cs.ideation.approach || '')}</div>
      </div>
      <div class="ideation-card">
        <div class="ideation-card-label">Possible Solutions</div>
        <div class="ideation-card-text">${solutions.map(s => `<strong>${escapeHtml(s.title)}</strong><br>${escapeHtml(s.description)}`).join('<br><br>')}</div>
      </div>
    </div>`;

  // Use evidenceImages as the photo strip (or empty placeholders)
  const imgs = (cs.evidenceImages || []).slice(0, 3);
  const stripHtml = imgs.length
    ? imgs.map(e => `<div class="strip-img-cell"><img src="${escapeHtml(e.src)}" alt="" loading="lazy"></div>`).join('')
    : `<div class="strip-img-cell"></div><div class="strip-img-cell"></div><div class="strip-img-cell"></div>`;

  document.getElementById('ideationWrap').innerHTML = `
    <div style="padding:48px 0;">
      <div class="iter-heading-row" style="margin-bottom: 24px;">
        <span class="iter-heading">Brainstorming &amp; Ideation</span>
      </div>
      ${cardsHtml}
      <div class="section-img-strip">${stripHtml}</div>
    </div>`;
}

// 7. Wireframes
function renderWireframes(cs) {
  if (!cs.wireframes || !cs.wireframes.length) return;
  show('wireframesSectionLabel');
  show('wireframesWrap');
  const grid = document.getElementById('wireframesGrid');
  let html = '';
  cs.wireframes.forEach((wf, i) => {
    const cap = wf.caption || cs.title;
    galleryItems.push({ url: wf.src, cap });
    const idx = galleryItems.length - 1;
    html += `
      <div class="gallery-item reveal" onclick="openGallery(${idx})" style="position:relative;">
        <div class="wf-badge ${wf.type === 'lo-fi' ? 'lo-fi' : 'hi-fi'}">${escapeHtml(wf.type || 'wireframe')}</div>
        <img src="${escapeHtml(wf.src)}" alt="${escapeHtml(cap)}" loading="lazy">
        <div class="gallery-overlay">
          <div class="gallery-overlay-num">WF . ${(i+1).toString().padStart(2,'0')}</div>
          <div class="gallery-overlay-cap">${escapeHtml(cap)}</div>
        </div>
      </div>`;
  });
  grid.innerHTML = html;
  
  // Add title wrapper inside wireframesWrap but around the grid
  const wrapperHTML = `
    <div style="padding:48px 0 0;">
      <div class="iter-heading-row" style="margin-bottom: 24px;">
        <span class="iter-heading">Sketches &amp; Wireframes</span>
      </div>
    </div>`;
  document.getElementById('wireframesWrap').insertAdjacentHTML('afterbegin', wrapperHTML);
}

// 7b. Iterations — arrow flow
function renderIterations(cs) {
  if (!cs.iterations || !cs.iterations.length) return;
  show('iterationsSectionLabel');
  show('iterationsWrap');
  const emojis = ['🧑🏻\u200d💻', '🧑🏽\u200d🎨', '🧑🏼\u200d💼'];
  let flowHtml = '';
  cs.iterations.forEach((it, i) => {
    if (i > 0) flowHtml += `<div class="iteration-arrow">→</div>`;
    flowHtml += `
      <div class="iteration-item">
        <div class="iteration-emoji">${emojis[i % emojis.length]}</div>
        <div class="iteration-screen">
          ${it.src ? `<img src="${escapeHtml(it.src)}" alt="Iteration ${i+1}" loading="lazy">` : ''}
        </div>
      </div>`;
  });
  document.getElementById('iterationsWrap').innerHTML = `
    <div style="padding:48px 0 40px;">
      <div class="iter-heading-row">
        <span class="iter-heading">Iterations</span>
      </div>
      <div class="iterations-flow">${flowHtml}</div>
    </div>`;
}

// 8. Final Design Mockups
function renderModules(cs) {
  if (!cs.modules || !cs.modules.length) return;
  show('modulesSectionLabel');
  show('modulesWrap');
  document.getElementById('modulesWrap').innerHTML = cs.modules.map(mod => {
    const screensHtml = mod.screens && mod.screens.length
      ? mod.screens.map(s => `
          <div class="module-screen-item">
            <img src="${escapeHtml(s.src)}" alt="${escapeHtml(s.caption || mod.name)}" loading="lazy">
            <div class="module-screen-cap">${escapeHtml(s.caption || '')}</div>
          </div>`).join('') : '';
    return `
      <div class="module-section">
        <div class="module-header">
          <div class="cs-block-label">${escapeHtml(mod.name)}</div>
          <div class="module-desc">${escapeHtml(mod.description || '')}</div>
        </div>
        <div class="module-screens">${screensHtml}</div>
      </div>`;
  }).join('');
}

// 9. Design System
function renderDesignSystem(cs) {
  const ds = cs.designSystem;
  if (!ds) return;
  show('dsSectionLabel');
  show('dsWrap');
  let html = '<div style="padding:48px 0;">';
  if (ds.colors && ds.colors.length) {
    html += `<div class="cs-block-label" style="margin-bottom:16px;">Color Palette</div>
      <div class="ds-colors">${ds.colors.map(c => `
        <div class="ds-color-chip">
          <div class="ds-swatch" style="background:${escapeHtml(c.hex)}"></div>
          <div>
            <div class="ds-color-name">${escapeHtml(c.name)}</div>
            <div class="ds-color-hex">${escapeHtml(c.hex)}</div>
            ${c.role ? `<div class="ds-color-role">${escapeHtml(c.role)}</div>` : ''}
          </div>
        </div>`).join('')}</div>`;
  }
  if (ds.typography) {
    html += `<div class="cs-block-label" style="margin-bottom:16px;margin-top:40px;">Typography</div>
      <div class="ds-type-row">${Object.entries(ds.typography).map(([key, val]) => `
        <div class="ds-type-item">
          <div class="ds-type-label">${escapeHtml(key)}</div>
          <div class="ds-type-specimen">Aa</div>
          <div class="ds-type-name">${escapeHtml(val)}</div>
        </div>`).join('')}</div>`;
  }
  if (ds.componentsImage) {
    html += `<div class="cs-block-label" style="margin-bottom:16px;margin-top:40px;">Component Library</div>
      <img class="ds-components-img" src="${escapeHtml(ds.componentsImage)}" alt="Component library" loading="lazy">`;
  }
  if (ds.credit) {
    html += `<div class="ds-credit">${escapeHtml(ds.credit)}</div>`;
  }
  html += '</div>';
  document.getElementById('dsWrap').innerHTML = html;
}

// 11. User Testing
function renderUserTesting(cs) {
  const ut = cs.userTesting;
  if (!ut) return;
  show('testingSectionLabel');
  show('testingWrap');
  let html = '<div style="padding:48px 0;">';
  if (ut.method) html += `<div class="testing-method">${escapeHtml(ut.method)}</div>`;
  if (ut.results && ut.results.length) {
    html += `<div class="cs-block-label" style="margin-bottom:16px;">Results &amp; Outcomes</div>
      <div class="testing-results">${ut.results.map(r => `
        <div class="testing-metric">
          <div class="testing-metric-label">${escapeHtml(r.metric)}</div>
          <div class="testing-before-after">
            <div class="testing-val">
              <div class="testing-val-num before">${escapeHtml(r.before)}</div>
              <div class="testing-val-tag">Before</div>
            </div>
            <div class="testing-arrow">→</div>
            <div class="testing-val">
              <div class="testing-val-num after">${escapeHtml(r.after)}</div>
              <div class="testing-val-tag">After</div>
            </div>
          </div>
        </div>`).join('')}</div>`;
  }
  if (ut.changes && ut.changes.length) {
    html += `<div class="testing-changes-title" style="margin-top:32px;">Design Changes Made Based on Testing</div>
      <div>${ut.changes.map(c => `<div class="testing-change-item">${escapeHtml(c)}</div>`).join('')}</div>`;
  }
  html += '</div>';
  document.getElementById('testingWrap').innerHTML = html;
}

// 12. Conclusion
function renderConclusion(cs) {
  const con = cs.conclusion;
  if (!con) return;
  show('conclusionSectionLabel');
  show('conclusionWrap');
  document.getElementById('conclusionWrap').innerHTML = `
    <div style="padding:48px 0;">
      <div class="conclusion-grid">
        <div class="conclusion-card">
          <div class="conclusion-tag">Challenges</div>
          <h3>Constraints &amp; Hurdles</h3>
          <p>${escapeHtml(con.challenges || '—')}</p>
        </div>
        <div class="conclusion-card">
          <div class="conclusion-tag">Outcomes</div>
          <h3>What Was Achieved</h3>
          <p>${escapeHtml(con.outcomes || '—')}</p>
        </div>
        <div class="conclusion-card">
          <div class="conclusion-tag">Learnings</div>
          <h3>What I'd Do Differently</h3>
          <p>${escapeHtml(con.learnings || '—')}</p>
        </div>
      </div>
    </div>`;
}

// 13. Future Scope
function renderFutureScope(cs) {
  if (!cs.futureScope && !cs.feedbackInvite) return;
  show('futureSectionLabel');
  show('futureWrap');
  let html = '<div style="padding:48px 0;">';
  if (cs.futureScope && cs.futureScope.length) {
    html += `<div class="cs-block-label" style="margin-bottom:16px;">Scope of Improvements</div>
      <ul class="future-list">${cs.futureScope.map((item, i) => `
        <li>
          <span class="future-num">${(i+1).toString().padStart(2,'0')}</span>
          <span>${escapeHtml(item)}</span>
        </li>`).join('')}</ul>`;
  }
  if (cs.feedbackInvite) {
    html += `
      <div class="feedback-box">
        <p>${escapeHtml(cs.feedbackInvite)}</p>
        <a class="fl-btn primary" href="mailto:adityaverma0424@gmail.com">Get in touch ↗</a>
      </div>`;
  }
  html += '</div>';
  document.getElementById('futureWrap').innerHTML = html;
}


// ── Visibility Manager ─────────────────────────────────────────────
const ADMIN_SECTIONS = [
  { key: 'cover',      ids: ['coverWrap'] },
  { key: 'context',    ids: ['contextSectionLabel','contextWrap'] },
  { key: 'solution',   ids: ['solutionSectionLabel','solutionWrap'] },
  { key: 'details',    ids: ['detailsInfoSectionLabel','detailsInfoWrap'] },
  { key: 'overview',   ids: ['notesSectionLabel','notes'] },
  { key: 'research',   ids: ['researchSectionLabel','researchWrap'] },
  { key: 'ideation',   ids: ['ideationSectionLabel','ideationWrap'] },
  { key: 'wireframes', ids: ['wireframesSectionLabel','wireframesWrap'] },
  { key: 'iterations', ids: ['iterationsSectionLabel','iterationsWrap'] },
  { key: 'mockups',    ids: ['modulesSectionLabel','modulesWrap'] },
  { key: 'designsys',  ids: ['dsSectionLabel','dsWrap'] },
  { key: 'prototype',  ids: ['protoWrap'] },
  { key: 'testing',    ids: ['testingSectionLabel','testingWrap'] },
  { key: 'conclusion', ids: ['conclusionSectionLabel','conclusionWrap'] },
  { key: 'future',     ids: ['futureSectionLabel','futureWrap'] },
];

function applyVisibility(cs) {
  const v = cs.visibility || {};
  ADMIN_SECTIONS.forEach(sec => {
    const on = v[sec.key] !== false; // default ON
    sec.ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') {
        el.style.visibility = on ? '' : 'hidden';
        el.style.height = on ? '' : '0';
        el.style.overflow = on ? '' : 'hidden';
        el.style.padding = on ? '' : '0';
        el.style.margin = on ? '' : '0';
        el.style.borderTop = on ? '' : 'none';
      }
    });
  });
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
    const urls = [
      '/data/case-studies.json',
      '../data/case-studies.json',
      'data/case-studies.json',
      './data/case-studies.json'
    ];
    let data = null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
          if (data && Array.isArray(data.caseStudies) && data.caseStudies.length) break;
        }
      } catch (err) {}
    }
    const cases = (data && data.caseStudies) || [];
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

    const caseType = cs.type || 'long';

    if (caseType === 'detailed') {
      // ── Detailed Case Study format (12 modular sections) ──
      renderCover(cs);
      renderContextProblem(cs);
      renderSolution(cs);
      renderProjectDetails(cs);
      renderResearch(cs);
      renderIdeation(cs);
      renderWireframes(cs);
      renderIterations(cs);
      renderModules(cs);
      renderDesignSystem(cs);
      renderUserTesting(cs);
      renderConclusion(cs);
      renderFutureScope(cs);
    } else if (caseType === 'quick') {
      // ── Quick Case Study format (3-notes + screens) ──
      renderCover(cs);
      show('notesSectionLabel');
      show('notes');
      document.getElementById('notes').innerHTML = `
        <div class="note-card"><div class="note-card-border-accent"></div><div class="note-card-tag">The Brief</div><h3>Challenge</h3><p>${escapeHtml(cs.brief || cs.problem || '—')}</p></div>
        <div class="note-card"><div class="note-card-border-accent"></div><div class="note-card-tag">My Role</div><h3>What I Did</h3><p>${escapeHtml(cs.myRole || cs.process || '—')}</p></div>
        <div class="note-card"><div class="note-card-border-accent"></div><div class="note-card-tag">Thinking</div><h3>The Approach</h3><p>${escapeHtml(cs.thinking || cs.outcome || '—')}</p></div>
      `;
    } else if (caseType === 'scratch') {
      // ── Scratchpad format (custom builder blocks) ──
      if (cs.blocks && cs.blocks.length) {
        show('blocksSectionLabel');
        show('csBlocks');
        document.getElementById('csBlocks').innerHTML = cs.blocks
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(b => renderBlock(b))
          .join('');
      }
    } else {
      // ── Long Case Study format (default: Overview, Problem, Process, Outcome) ──
      renderCover(cs);
      show('blocksSectionLabel');
      show('csBlocks');
      document.getElementById('csBlocks').innerHTML = [
        buildLegacySection('cs-overview', 'Overview',    cs.summary),
        buildLegacySection('cs-problem',  'The Problem', cs.problem),
        buildLegacySection('cs-process',  'Process',     cs.process),
        buildLegacySection('cs-outcome',  'Outcome',     cs.outcome),
      ].join('');
    }

    // ── Gallery ──
    const assets = (cs.mediaAssets && cs.mediaAssets.length ? cs.mediaAssets : null)
      || (cs.type === 'detailed' ? cs.detScreens : null)
      || cs.screens
      || [];
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
    const protoUrl = cs.type === 'detailed' ? (cs.detPrototypeUrl || cs.prototypeUrl) : cs.prototypeUrl;
    if (protoUrl) {
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
          <iframe src="${escapeHtml(protoUrl)}" allowfullscreen></iframe>
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

    // ── Render post-prototype sections ──
    renderUserTesting(cs);
    renderConclusion(cs);
    renderFutureScope(cs);

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

    applyVisibility(cs);
    initScrollReveal();

  } catch (e) {
    document.getElementById('page').innerHTML = `<div style="padding:100px;text-align:center;">Failed to load case study data.</div>`;
    console.error(e);
  }
}

function bootCaseStudy() {
  renderCaseStudy();
  initCursor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootCaseStudy);
} else {
  bootCaseStudy();
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
