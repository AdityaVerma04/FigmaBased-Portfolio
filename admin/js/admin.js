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
  const urls = [
    '/data/case-studies.json',
    '../data/case-studies.json',
    'data/case-studies.json',
    './data/case-studies.json'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.caseStudies) && json.caseStudies.length) {
          return json;
        }
      }
    } catch (err) {
      // try next
    }
  }
  return { caseStudies: [] };
}

// ── Initialise ────────────────────────────────────────────
async function init() {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved) {
    try {
      workingData = JSON.parse(saved);
      if (!workingData || !Array.isArray(workingData.caseStudies) || !workingData.caseStudies.length) {
        workingData = await loadFromServer();
      }
    } catch {
      workingData = await loadFromServer();
    }
  } else {
    workingData = await loadFromServer();
  }

  renderList();
  updatePreview();
  updateStats();

  // Form events
  document.getElementById('csForm').addEventListener('submit', onSave);
  document.getElementById('deleteBtn').addEventListener('click', onDelete);
  document.getElementById('downloadBtn').addEventListener('click', onDownload);
  document.getElementById('resetBtn').addEventListener('click', onReset);
  document.getElementById('f-type').addEventListener('change', updateFormTabs);

  // Slug preview — auto-update as user types title (only for new entries)
  document.getElementById('f-title').addEventListener('input', () => {
    if (!activeId) {
      document.getElementById('f-slug').value = slugify(document.getElementById('f-title').value);
    }
  });
}

function updateFormTabs() {
  const type = document.getElementById('f-type').value;
  document.querySelectorAll('[data-type]').forEach(el => {
    if (el.dataset.type === type) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// ── Stats row ─────────────────────────────────────────────
function updateStats() {
  const el = document.getElementById('adminStats');
  if (!el) return;
  const studies   = workingData.caseStudies || [];
  const published = studies.filter(c => c.status === 'published').length;
  const locked    = studies.filter(c => c.isLocked).length;
  const draft     = studies.filter(c => c.status === 'draft').length;
  const hidden    = studies.filter(c => c.status === 'hidden').length;
  el.innerHTML = `
    <div class="admin-stat-pill"><strong>${studies.length}</strong> total</div>
    <div class="admin-stat-pill"><strong>${published}</strong> published</div>
    ${locked ? `<div class="admin-stat-pill"><strong>${locked}</strong> 🔒 locked</div>` : ''}
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
        <div style="display:flex;align-items:center;gap:6px;">
          ${cs.isLocked ? '<span style="font-size:11px;" title="Locked (Soon to be uploaded)">🔒</span>' : ''}
          ${cs.type === 'quick' ? '<span style="font-size:10px;color:var(--success);font-weight:600">Q</span>' : ''}
          ${cs.type === 'detailed' ? '<span style="font-size:10px;color:#ff9d6c;font-weight:600">D</span>' : ''}
          ${cs.type === 'scratch' ? '<span style="font-size:10px;color:var(--accent);font-weight:600">S</span>' : ''}
          ${(!cs.type || cs.type === 'long') ? '<span style="font-size:10px;color:var(--text-faint);font-weight:600">L</span>' : ''}
          <span class="status-dot ${cs.status || 'draft'}" title="${escapeHtml(cs.status || 'draft')}"></span>
        </div>
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

// ── Dynamic Builders ──────────────────────────────────────────

function createBuilderItem(container, headerText, onRemove) {
  const item = document.createElement('div');
  item.className = 'builder-item';
  
  const header = document.createElement('div');
  header.className = 'builder-item-header';
  
  const title = document.createElement('span');
  title.textContent = headerText;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'builder-remove-btn';
  removeBtn.textContent = 'Remove';
  removeBtn.type = 'button';
  removeBtn.onclick = () => { item.remove(); if (onRemove) onRemove(); };
  
  header.appendChild(title);
  header.appendChild(removeBtn);
  item.appendChild(header);
  container.appendChild(item);
  return item;
}

function renderStringArrayBuilder(containerId, dataArray, itemName) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'builder-items';
  
  const addBtn = document.createElement('div');
  addBtn.className = 'builder-add-btn';
  addBtn.textContent = '+ Add ' + itemName;
  addBtn.onclick = () => addStringItem('');
  
  container.appendChild(itemsContainer);
  container.appendChild(addBtn);
  
  function addStringItem(val) {
    const item = createBuilderItem(itemsContainer, itemName);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = val || '';
    input.placeholder = itemName + ' text...';
    input.className = 'builder-val';
    item.appendChild(input);
  }
  
  (dataArray || []).forEach(val => addStringItem(val));
}

function getStringArrayData(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const inputs = Array.from(container.querySelectorAll('.builder-val'));
  const vals = inputs.map(i => i.value.trim()).filter(v => v);
  return vals.length ? vals : null;
}

function renderObjectArrayBuilder(containerId, dataArray, fieldsConfig, itemName) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'builder-items';
  
  const addBtn = document.createElement('div');
  addBtn.className = 'builder-add-btn';
  addBtn.textContent = '+ Add ' + itemName;
  addBtn.onclick = () => addObjItem({});
  
  container.appendChild(itemsContainer);
  container.appendChild(addBtn);
  
  function addObjItem(data) {
    const item = createBuilderItem(itemsContainer, itemName);
    item.dataset.isObj = 'true';
    
    fieldsConfig.forEach(fc => {
      const row = document.createElement('div');
      row.className = 'builder-row';
      
      const lbl = document.createElement('label');
      lbl.textContent = fc.label || fc.key;
      lbl.style.fontSize = '11px';
      lbl.style.color = 'var(--text-faint)';
      lbl.style.minWidth = '60px';
      
      let input;
      if (fc.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 2;
      } else {
        input = document.createElement('input');
        input.type = fc.type || 'text';
      }
      
      if (fc.type === 'checkbox') {
        input.checked = !!data[fc.key];
      } else {
        input.value = data[fc.key] || '';
        input.placeholder = fc.placeholder || '';
      }
      
      input.dataset.key = fc.key;
      input.className = 'builder-field-' + fc.key;
      
      row.appendChild(lbl);
      row.appendChild(input);
      item.appendChild(row);
    });
  }
  
  (dataArray || []).forEach(d => addObjItem(d));
}

function getObjectArrayData(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const items = Array.from(container.querySelectorAll('.builder-item[data-is-obj="true"]'));
  const result = [];
  
  items.forEach(item => {
    const obj = {};
    let hasData = false;
    Array.from(item.querySelectorAll('[data-key]')).forEach(input => {
      const key = input.dataset.key;
      if (input.type === 'checkbox') {
        obj[key] = input.checked;
        if (input.checked) hasData = true;
      } else {
        const val = input.value.trim();
        obj[key] = val;
        if (val) hasData = true;
      }
    });
    if (hasData) result.push(obj);
  });
  
  return result.length ? result : null;
}

function renderIdeationBuilder(containerId, dataObj) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const d = dataObj || {};
  
  const approachLbl = document.createElement('label');
  approachLbl.textContent = 'Approach / Summary';
  const approachInput = document.createElement('textarea');
  approachInput.id = 'builder-ideation-approach';
  approachInput.value = d.approach || '';
  
  container.appendChild(approachLbl);
  container.appendChild(approachInput);
  
  const solContainer = document.createElement('div');
  solContainer.id = 'builder-ideation-solutions';
  container.appendChild(solContainer);
  
  renderObjectArrayBuilder('builder-ideation-solutions', d.solutions || [], [
    {key:'title', label:'Title'},
    {key:'description', label:'Description', type:'textarea'},
    {key:'chosen', label:'Chosen Option?', type:'checkbox'}
  ], 'Solution Option');
}

function getIdeationData(containerId) {
  const approach = document.getElementById('builder-ideation-approach')?.value.trim();
  const solutions = getObjectArrayData('builder-ideation-solutions');
  if (!approach && !solutions) return null;
  return { approach, solutions };
}

function renderModulesBuilder(containerId, dataArray) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'builder-items';
  
  const addBtn = document.createElement('div');
  addBtn.className = 'builder-add-btn';
  addBtn.textContent = '+ Add Module';
  addBtn.onclick = () => addModule({});
  
  container.appendChild(itemsContainer);
  container.appendChild(addBtn);
  
  function addModule(data) {
    const item = createBuilderItem(itemsContainer, 'Module');
    item.dataset.isModule = 'true';
    
    // Name
    const nameRow = document.createElement('div'); nameRow.className = 'builder-row';
    const nameInput = document.createElement('input'); nameInput.className = 'mod-name';
    nameInput.placeholder = 'Module Name'; nameInput.value = data.name || '';
    nameRow.appendChild(nameInput); item.appendChild(nameRow);
    
    // Description
    const descRow = document.createElement('div'); descRow.className = 'builder-row';
    const descInput = document.createElement('textarea'); descInput.className = 'mod-desc';
    descInput.placeholder = 'Module Description'; descInput.value = data.description || '';
    descRow.appendChild(descInput); item.appendChild(descRow);
    
    // Screens Container
    const screensWrap = document.createElement('div');
    screensWrap.className = 'builder-nested';
    
    const scList = document.createElement('div');
    screensWrap.appendChild(scList);
    
    const scAdd = document.createElement('div');
    scAdd.className = 'builder-add-btn';
    scAdd.textContent = '+ Add Screen';
    scAdd.onclick = () => addSc({});
    screensWrap.appendChild(scAdd);
    
    item.appendChild(screensWrap);
    
    function addSc(scData) {
      const scItem = createBuilderItem(scList, 'Screen');
      scItem.dataset.isScreen = 'true';
      const r1 = document.createElement('div'); r1.className = 'builder-row';
      const i1 = document.createElement('input'); i1.className = 'sc-src'; i1.placeholder = 'Image URL'; i1.value = scData.src || '';
      r1.appendChild(i1); scItem.appendChild(r1);
      const r2 = document.createElement('div'); r2.className = 'builder-row';
      const i2 = document.createElement('input'); i2.className = 'sc-cap'; i2.placeholder = 'Caption'; i2.value = scData.caption || '';
      r2.appendChild(i2); scItem.appendChild(r2);
    }
    
    (data.screens || []).forEach(s => addSc(s));
  }
  
  (dataArray || []).forEach(m => addModule(m));
}

function getModulesData(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const mods = Array.from(container.querySelectorAll('.builder-item[data-is-module="true"]'));
  const res = [];
  mods.forEach(mod => {
    const name = mod.querySelector('.mod-name').value.trim();
    const desc = mod.querySelector('.mod-desc').value.trim();
    const scs = Array.from(mod.querySelectorAll('.builder-item[data-is-screen="true"]')).map(sc => {
      return {
        src: sc.querySelector('.sc-src').value.trim(),
        caption: sc.querySelector('.sc-cap').value.trim()
      };
    }).filter(s => s.src || s.caption);
    
    if (name || desc || scs.length) {
      res.push({ name, description: desc, screens: scs });
    }
  });
  return res.length ? res : null;
}

function renderDesignSysBuilder(containerId, dataObj) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const d = dataObj || {};
  
  container.innerHTML = `
    <div class="builder-row">
      <input type="text" id="ds-components" placeholder="Components Image URL" value="${escapeHtml(d.componentsImage||'')}">
    </div>
    <div class="builder-row">
      <input type="text" id="ds-credit" placeholder="Credit / Footer Text" value="${escapeHtml(d.credit||'')}">
    </div>
    <label style="margin-top:10px;">Colors</label>
    <div id="ds-colors"></div>
    <label style="margin-top:10px;">Typography</label>
    <div class="builder-row"><label style="min-width:60px;">Heading</label><input type="text" id="ds-typo-h" value="${escapeHtml(d.typography?.Heading||'')}"></div>
    <div class="builder-row"><label style="min-width:60px;">Body</label><input type="text" id="ds-typo-b" value="${escapeHtml(d.typography?.Body||'')}"></div>
    <div class="builder-row"><label style="min-width:60px;">Caption</label><input type="text" id="ds-typo-c" value="${escapeHtml(d.typography?.Caption||'')}"></div>
  `;
  
  renderObjectArrayBuilder('ds-colors', d.colors || [], [
    {key:'name', label:'Name'}, {key:'hex', label:'Hex Code'}, {key:'role', label:'Role'}
  ], 'Color');
}

function getDesignSysData(containerId) {
  const componentsImage = document.getElementById('ds-components')?.value.trim();
  const credit = document.getElementById('ds-credit')?.value.trim();
  const colors = getObjectArrayData('ds-colors') || [];
  const Heading = document.getElementById('ds-typo-h')?.value.trim();
  const Body = document.getElementById('ds-typo-b')?.value.trim();
  const Caption = document.getElementById('ds-typo-c')?.value.trim();
  
  const typography = {};
  if (Heading) typography.Heading = Heading;
  if (Body) typography.Body = Body;
  if (Caption) typography.Caption = Caption;
  
  if (!componentsImage && !credit && !colors.length && !Object.keys(typography).length) return null;
  return { colors, typography, componentsImage, credit };
}

function renderTestingBuilder(containerId, dataObj) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const d = dataObj || {};
  
  container.innerHTML = `
    <div class="builder-row">
      <input type="text" id="ts-method" placeholder="Method (e.g. Unmoderated usability testing)" value="${escapeHtml(d.method||'')}">
    </div>
    <label style="margin-top:10px;">Results</label>
    <div id="ts-results"></div>
    <label style="margin-top:10px;">Changes Made</label>
    <div id="ts-changes"></div>
  `;
  
  renderObjectArrayBuilder('ts-results', d.results || [], [
    {key:'metric', label:'Metric'}, {key:'before', label:'Before'}, {key:'after', label:'After'}
  ], 'Result Metric');
  
  renderStringArrayBuilder('ts-changes', d.changes || [], 'Change Description');
}

function getTestingData(containerId) {
  const method = document.getElementById('ts-method')?.value.trim();
  const results = getObjectArrayData('ts-results');
  const changes = getStringArrayData('ts-changes');
  if (!method && !results && !changes) return null;
  return { method, results, changes };
}


// ── Form helpers ──────────────────────────────────────────
function clearForm() {
  document.getElementById('csForm').reset();
  document.getElementById('f-order').value  = (workingData.caseStudies.length + 1);
  document.getElementById('f-status').value = 'draft';
  if (document.getElementById('f-locked')) document.getElementById('f-locked').checked = false;
  document.getElementById('f-slug').value   = '';
  document.getElementById('f-type').value   = 'long';
  
  // Clear dynamic builders
  const builders = ['builder-quick-screens', 'builder-det-screens', 'builder-det-research', 'builder-det-ideation', 'builder-det-iterations', 'builder-det-wireframes', 'builder-det-modules', 'builder-det-designsys', 'builder-det-testing', 'builder-det-future'];
  builders.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  
  updateFormTabs();
}

function loadIntoForm(id) {
  const cs = workingData.caseStudies.find(c => c.id === id);
  if (!cs) return;
  activeId = id;
  
  // Visibility toggles
  const v = cs.visibility || {};
  document.getElementById('v-cover').checked      = v.cover !== false;
  document.getElementById('v-context').checked    = v.context !== false;
  document.getElementById('v-solution').checked   = v.solution !== false;
  document.getElementById('v-details').checked    = v.details !== false;
  document.getElementById('v-research').checked   = v.research !== false;
  document.getElementById('v-ideation').checked   = v.ideation !== false;
  document.getElementById('v-wireframes').checked = v.wireframes !== false;
  document.getElementById('v-iterations').checked = v.iterations !== false;
  document.getElementById('v-mockups').checked    = v.mockups !== false;
  document.getElementById('v-designsys').checked  = v.designsys !== false;
  document.getElementById('v-testing').checked    = v.testing !== false;
  document.getElementById('v-conclusion').checked = v.conclusion !== false;
  document.getElementById('v-future').checked     = v.future !== false;

  document.getElementById('f-title').value   = cs.title   || '';
  document.getElementById('f-type').value    = cs.type    || 'long';
  document.getElementById('f-client').value  = cs.client  || '';
  document.getElementById('f-role').value    = cs.role    || '';
  document.getElementById('f-year').value    = cs.year    || '';
  document.getElementById('f-status').value  = cs.status  || 'draft';
  if (document.getElementById('f-locked')) document.getElementById('f-locked').checked = !!cs.isLocked;
  document.getElementById('f-order').value   = cs.order   || 1;
  document.getElementById('f-slug').value    = cs.slug    || '';
  document.getElementById('f-cover').value   = cs.coverImage || '';
  document.getElementById('f-tags').value    = (cs.tags   || []).join(', ');
  document.getElementById('f-tools').value   = (cs.tools  || []).join(', ');
  document.getElementById('f-summary').value = cs.summary || '';
  
  // Long fields
  document.getElementById('f-problem').value = cs.problem || '';
  document.getElementById('f-process').value = cs.process || '';
  document.getElementById('f-outcome').value = cs.outcome || '';
  
  // Quick fields
  document.getElementById('f-subtitle').value   = cs.subtitle || '';
  document.getElementById('f-tagline').value    = cs.tagline || '';
  document.getElementById('f-discipline').value = cs.discipline || '';
  document.getElementById('f-brief').value      = cs.brief || '';
  document.getElementById('f-thinking').value   = cs.thinking || '';
  document.getElementById('f-myrole').value     = cs.myRole || '';
  document.getElementById('f-prototype').value  = cs.prototypeUrl || '';
  document.getElementById('f-designs').value    = cs.designsUrl || '';
  
  renderObjectArrayBuilder('builder-quick-screens', cs.screens || [], [
    {key:'src', label:'Image URL'}, {key:'caption', label:'Caption'}, {key:'wide', label:'Wide Layout?', type:'checkbox'}
  ], 'Screen');

  // Detailed fields
  document.getElementById('f-det-subtitle').value   = cs.detSubtitle   || cs.subtitle   || '';
  document.getElementById('f-det-tagline').value    = cs.detTagline    || cs.tagline    || '';
  document.getElementById('f-det-discipline').value = cs.detDiscipline || cs.discipline || '';
  document.getElementById('f-det-brief').value      = cs.detBrief      || cs.brief      || '';
  document.getElementById('f-det-thinking').value   = cs.detThinking   || cs.thinking   || '';
  document.getElementById('f-det-myrole').value     = cs.detMyRole     || cs.myRole     || '';
  document.getElementById('f-det-outcome').value    = cs.detOutcome    || cs.outcome    || '';
  document.getElementById('f-det-prototype').value  = cs.detPrototypeUrl || cs.prototypeUrl || '';
  document.getElementById('f-det-designs').value    = cs.detDesignsUrl   || cs.designsUrl   || '';
  
  renderObjectArrayBuilder('builder-det-screens', cs.detScreens || cs.solutionScreens || [], [
    {key:'src', label:'Image URL'}, {key:'caption', label:'Caption'}
  ], 'Screen');
  
  document.getElementById('f-det-context').value    = cs.context || '';
  document.getElementById('f-det-problem').value    = cs.problemStatement || '';
  
  renderObjectArrayBuilder('builder-det-research', cs.researchMethods || (cs.research && cs.research.methods) || [], [
    {key:'name', label:'Method Name'}, {key:'description', label:'Description', type:'textarea'}
  ], 'Method');
  
  renderIdeationBuilder('builder-det-ideation', cs.ideation);
  
  renderObjectArrayBuilder('builder-det-iterations', cs.iterations || [], [
    {key:'src', label:'Image URL'}, {key:'label', label:'Label'}
  ], 'Iteration');
  
  renderObjectArrayBuilder('builder-det-wireframes', cs.wireframes || [], [
    {key:'src', label:'Image URL'}, {key:'caption', label:'Caption'}, {key:'type', label:'Type (lo-fi/hi-fi)'}
  ], 'Wireframe');
  
  renderModulesBuilder('builder-det-modules', cs.modules);
  renderDesignSysBuilder('builder-det-designsys', cs.designSystem);
  renderTestingBuilder('builder-det-testing', cs.userTesting);
  
  const con = cs.conclusion || {};
  document.getElementById('f-con-challenges').value = con.challenges || '';
  document.getElementById('f-con-outcomes').value = con.outcomes || '';
  document.getElementById('f-con-learnings').value = con.learnings || '';
  
  renderStringArrayBuilder('builder-det-future', cs.futureScope || [], 'Future Scope Item');
  
  document.getElementById('f-det-feedback').value   = cs.feedbackInvite || '';
  
  document.getElementById('f-live').value    = cs.liveUrl  || '';
  document.getElementById('f-figma').value   = cs.figmaUrl || '';

  updateFormTabs();
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

  const screensParsed = getObjectArrayData('builder-quick-screens') || (existing ? (existing.screens || []) : []);
  const detScreensParsed = getObjectArrayData('builder-det-screens') || (existing ? existing.solutionScreens : null);

  const entry = {
    id:          activeId || ('cs-' + Date.now()),
    slug:        existing ? (existing.slug || slugify(title)) : slugify(title),
    title,
    type:        document.getElementById('f-type').value,
    client:      document.getElementById('f-client').value.trim(),
    role:        document.getElementById('f-role').value.trim(),
    year:        document.getElementById('f-year').value.trim(),
    status:      document.getElementById('f-status').value,
    isLocked:    !!(document.getElementById('f-locked') && document.getElementById('f-locked').checked),
    order:       parseInt(document.getElementById('f-order').value, 10) || 1,
    coverImage:  document.getElementById('f-cover').value.trim(),
    tags:        splitCsv(document.getElementById('f-tags').value),
    tools:       splitCsv(document.getElementById('f-tools').value),
    summary:     document.getElementById('f-summary').value.trim(),
    
    // Long fields
    problem:     document.getElementById('f-problem').value.trim(),
    process:     document.getElementById('f-process').value.trim(),
    outcome:     document.getElementById('f-outcome').value.trim(),
    
    visibility: {
      cover:      document.getElementById('v-cover').checked,
      context:    document.getElementById('v-context').checked,
      solution:   document.getElementById('v-solution').checked,
      details:    document.getElementById('v-details').checked,
      research:   document.getElementById('v-research').checked,
      ideation:   document.getElementById('v-ideation').checked,
      wireframes: document.getElementById('v-wireframes').checked,
      iterations: document.getElementById('v-iterations').checked,
      mockups:    document.getElementById('v-mockups').checked,
      designsys:  document.getElementById('v-designsys').checked,
      testing:    document.getElementById('v-testing').checked,
      conclusion: document.getElementById('v-conclusion').checked,
      future:     document.getElementById('v-future').checked
    },
    // Quick fields
    subtitle:    document.getElementById('f-subtitle').value.trim(),
    tagline:     document.getElementById('f-tagline').value.trim(),
    discipline:  document.getElementById('f-discipline').value.trim(),
    brief:       document.getElementById('f-brief').value.trim(),
    thinking:    document.getElementById('f-thinking').value.trim(),
    myRole:      document.getElementById('f-myrole').value.trim(),
    prototypeUrl:document.getElementById('f-prototype').value.trim(),
    designsUrl:  document.getElementById('f-designs').value.trim(),
    screens:     screensParsed,

    // Detailed fields
    detSubtitle:    document.getElementById('f-det-subtitle').value.trim(),
    detTagline:     document.getElementById('f-det-tagline').value.trim(),
    detDiscipline:  document.getElementById('f-det-discipline').value.trim(),
    detBrief:       document.getElementById('f-det-brief').value.trim(),
    detThinking:    document.getElementById('f-det-thinking').value.trim(),
    detMyRole:      document.getElementById('f-det-myrole').value.trim(),
    detOutcome:     document.getElementById('f-det-outcome').value.trim(),
    detPrototypeUrl:document.getElementById('f-det-prototype').value.trim(),
    detDesignsUrl:  document.getElementById('f-det-designs').value.trim(),
    solutionScreens: detScreensParsed,
    
    context:          document.getElementById('f-det-context').value.trim(),
    problemStatement: document.getElementById('f-det-problem').value.trim(),
    researchMethods:  getObjectArrayData('builder-det-research'),
    ideation:         getIdeationData('builder-det-ideation'),
    iterations:       getObjectArrayData('builder-det-iterations'),
    wireframes:       getObjectArrayData('builder-det-wireframes'),
    modules:          getModulesData('builder-det-modules'),
    designSystem:     getDesignSysData('builder-det-designsys'),
    userTesting:      getTestingData('builder-det-testing'),
    conclusion:       {
      challenges: document.getElementById('f-con-challenges').value.trim(),
      outcomes:   document.getElementById('f-con-outcomes').value.trim(),
      learnings:  document.getElementById('f-con-learnings').value.trim()
    },
    futureScope:      getStringArrayData('builder-det-future'),
    feedbackInvite:   document.getElementById('f-det-feedback').value.trim(),
    
    // External links
    liveUrl:     document.getElementById('f-live').value.trim(),
    figmaUrl:    document.getElementById('f-figma').value.trim(),
    
    // Internals
    mediaAssets: existing ? (existing.mediaAssets || []) : [],
    blocks:      existing ? (existing.blocks || []) : [], // Preserve builder blocks
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

