// ============================================================
//  Aditya Verma Portfolio — admin.js
//  Static-site CMS: edits live in localStorage (local draft).
//  Publishing = download JSON → replace file → redeploy.
// ============================================================

const DRAFT_KEY = 'portfolio_case_studies_draft';
let workingData = { caseStudies: [] };
let activeId    = null;

// ── Utility ────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function splitCsv(value) {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

function nowIso() { return new Date().toISOString(); }

// ── Persist / load ────────────────────────────────────────
function persist() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(workingData));
}

async function loadFromServer() {
  const res  = await fetch('data/case-studies.json');
  return await res.json();
}

// ── Initialise ────────────────────────────────────────────
async function init() {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved) {
    try { workingData = JSON.parse(saved); }
    catch { workingData = { caseStudies: [] }; }
  } else {
    try   { workingData = await loadFromServer(); }
    catch { workingData = { caseStudies: [] }; }
  }

  renderList();
  updatePreview();
  updateStats();

  // Form events
  document.getElementById('csForm').addEventListener('submit', onSave);
  document.getElementById('deleteBtn').addEventListener('click', onDelete);
  document.getElementById('downloadBtn').addEventListener('click', onDownload);
  document.getElementById('resetBtn').addEventListener('click', onReset);

  // Slug preview — auto-update as user types title (only for new entries)
  document.getElementById('f-title').addEventListener('input', () => {
    if (!activeId) {
      document.getElementById('f-slug').value = slugify(document.getElementById('f-title').value);
    }
  });
}

// ── Stats row ─────────────────────────────────────────────
function updateStats() {
  const el = document.getElementById('adminStats');
  if (!el) return;
  const studies   = workingData.caseStudies || [];
  const published = studies.filter(c => c.status === 'published').length;
  const draft     = studies.filter(c => c.status === 'draft').length;
  const hidden    = studies.filter(c => c.status === 'hidden').length;
  el.innerHTML = `
    <div class="admin-stat-pill"><strong>${studies.length}</strong> total</div>
    <div class="admin-stat-pill"><strong>${published}</strong> published</div>
    <div class="admin-stat-pill"><strong>${draft}</strong> draft</div>
    ${hidden ? `<div class="admin-stat-pill"><strong>${hidden}</strong> hidden</div>` : ''}
  `;
}

// ── List pane ─────────────────────────────────────────────
function renderList() {
  const list    = document.getElementById('csList');
  const studies = workingData.caseStudies || [];

  list.innerHTML = studies
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(cs => `
      <div class="cs-list-item ${cs.id === activeId ? 'active' : ''}"
           data-id="${escapeHtml(cs.id)}"
           role="option"
           aria-selected="${cs.id === activeId}"
           tabindex="0">
        <span>${escapeHtml(cs.title || 'Untitled')}</span>
        <span class="status-dot ${cs.status || 'draft'}" title="${escapeHtml(cs.status || 'draft')}"></span>
      </div>
    `).join('');

  // Append "New" button
  list.insertAdjacentHTML('beforeend',
    `<button class="new-btn" id="newBtn">+ New case study</button>`);

  list.querySelectorAll('.cs-list-item').forEach(item => {
    const activate = () => loadIntoForm(item.dataset.id);
    item.addEventListener('click', activate);
    item.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    activeId = null;
    clearForm();
    // Deselect all items visually
    list.querySelectorAll('.cs-list-item').forEach(i => {
      i.classList.remove('active');
      i.setAttribute('aria-selected', 'false');
    });
  });
}

// ── Form helpers ──────────────────────────────────────────
function clearForm() {
  document.getElementById('csForm').reset();
  document.getElementById('f-order').value  = (workingData.caseStudies.length + 1);
  document.getElementById('f-status').value = 'draft';
  document.getElementById('f-slug').value   = '';
}

function loadIntoForm(id) {
  const cs = workingData.caseStudies.find(c => c.id === id);
  if (!cs) return;
  activeId = id;

  document.getElementById('f-title').value   = cs.title   || '';
  document.getElementById('f-client').value  = cs.client  || '';
  document.getElementById('f-role').value    = cs.role    || '';
  document.getElementById('f-year').value    = cs.year    || '';
  document.getElementById('f-status').value  = cs.status  || 'draft';
  document.getElementById('f-order').value   = cs.order   || 1;
  document.getElementById('f-slug').value    = cs.slug    || '';
  document.getElementById('f-cover').value   = cs.coverImage || '';
  document.getElementById('f-tags').value    = (cs.tags   || []).join(', ');
  document.getElementById('f-tools').value   = (cs.tools  || []).join(', ');
  document.getElementById('f-summary').value = cs.summary || '';
  document.getElementById('f-problem').value = cs.problem || '';
  document.getElementById('f-process').value = cs.process || '';
  document.getElementById('f-outcome').value = cs.outcome || '';
  document.getElementById('f-live').value    = cs.liveUrl  || '';
  document.getElementById('f-figma').value   = cs.figmaUrl || '';

  renderList();
}

// ── Save ──────────────────────────────────────────────────
function onSave(e) {
  e.preventDefault();
  const title = document.getElementById('f-title').value.trim();
  if (!title) {
    document.getElementById('f-title').focus();
    return;
  }

  const existing  = activeId ? workingData.caseStudies.find(c => c.id === activeId) : null;
  const nowTs     = nowIso();

  const entry = {
    id:          activeId || ('cs-' + Date.now()),
    slug:        existing ? (existing.slug || slugify(title)) : slugify(title),
    title,
    client:      document.getElementById('f-client').value.trim(),
    role:        document.getElementById('f-role').value.trim(),
    year:        document.getElementById('f-year').value.trim(),
    status:      document.getElementById('f-status').value,
    order:       parseInt(document.getElementById('f-order').value, 10) || 1,
    coverImage:  document.getElementById('f-cover').value.trim(),
    tags:        splitCsv(document.getElementById('f-tags').value),
    tools:       splitCsv(document.getElementById('f-tools').value),
    summary:     document.getElementById('f-summary').value.trim(),
    problem:     document.getElementById('f-problem').value.trim(),
    process:     document.getElementById('f-process').value.trim(),
    outcome:     document.getElementById('f-outcome').value.trim(),
    liveUrl:     document.getElementById('f-live').value.trim(),
    figmaUrl:    document.getElementById('f-figma').value.trim(),
    mediaAssets: existing ? (existing.mediaAssets || []) : [],
    createdAt:   existing ? (existing.createdAt || nowTs) : nowTs,
    updatedAt:   nowTs,
  };

  if (activeId) {
    const idx = workingData.caseStudies.findIndex(c => c.id === activeId);
    if (idx > -1) workingData.caseStudies[idx] = entry;
  } else {
    workingData.caseStudies.push(entry);
    activeId = entry.id;
  }

  // Update slug field
  document.getElementById('f-slug').value = entry.slug;

  persist();
  renderList();
  updatePreview();
  updateStats();
  flashSaved();
}

// ── Delete ────────────────────────────────────────────────
function onDelete() {
  if (!activeId) return;
  const cs = workingData.caseStudies.find(c => c.id === activeId);
  const name = cs ? cs.title : 'this case study';
  if (!confirm(`Delete "${name}" from your working draft?\n\nThis only removes it from your local draft — it won't be gone from the live site until you download and redeploy.`)) return;

  workingData.caseStudies = workingData.caseStudies.filter(c => c.id !== activeId);
  activeId = null;
  clearForm();
  persist();
  renderList();
  updatePreview();
  updateStats();
}

// ── Download ──────────────────────────────────────────────
function onDownload() {
  const json = JSON.stringify(workingData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'case-studies.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Reset to server data ──────────────────────────────────
async function onReset() {
  const confirmed = confirm(
    'Reset to the deployed case-studies.json?\n\n' +
    'This will discard your local draft and reload from the file on disk. ' +
    'Any unsaved edits will be lost.'
  );
  if (!confirmed) return;

  try {
    workingData = await loadFromServer();
    localStorage.removeItem(DRAFT_KEY);
    activeId = null;
    clearForm();
    renderList();
    updatePreview();
    updateStats();
    flashReset();
  } catch {
    alert('Could not load data/case-studies.json. Make sure the file exists and you are running on a server (not file://).');
  }
}

// ── JSON preview (with simple syntax highlighting) ────────
function syntaxHighlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-str';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

function updatePreview() {
  const el  = document.getElementById('jsonPreview');
  if (!el) return;
  el.innerHTML = syntaxHighlight(JSON.stringify(workingData, null, 2));
}

// ── Flash feedback ────────────────────────────────────────
function flashSaved() {
  const btn = document.getElementById('saveBtn');
  const orig = btn.textContent;
  btn.textContent = 'Saved ✓';
  btn.style.background = 'var(--success)';
  btn.style.boxShadow  = '0 4px 20px rgba(95,212,164,0.3)';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = '';
    btn.style.boxShadow  = '';
  }, 1600);
}

function flashReset() {
  const btn = document.getElementById('resetBtn');
  const orig = btn.textContent;
  btn.textContent = 'Reset ✓';
  setTimeout(() => { btn.textContent = orig; }, 1600);
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
