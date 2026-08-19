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

const SEED_DATA = {
  "caseStudies": [
    {
      "id": "cs-001",
      "slug": "namisite-client-app",
      "title": "Designing a client-facing app from zero to first build",
      "client": "Namisite Technologies",
      "role": "UI/UX Designer & Front-End App Developer",
      "year": "2026",
      "status": "published",
      "isLocked": true,
      "order": 1,
      "coverImage": "assets/cover-namisite.svg",
      "tags": ["UI Design", "Figma", "Flutter", "Pre-launch"],
      "tools": ["Figma", "Flutter", "HTML/CSS"],
      "summary": "End-to-end UI/UX for a client application — from early wireframes through interactive Figma prototypes to a working Flutter front-end, delivered ahead of the app's public launch.",
      "problem": "Replace this with the real brief: what did the client need, and what wasn't working before this project started? What constraints (timeline, platform, audience) shaped the brief?",
      "process": "Replace this with your actual process: how did you start (desk research, user interviews, competitor audit)? How did you move through wireframes to high-fidelity in Figma? How many feedback rounds with the client? How did you hand off to — or personally build — the Flutter front-end?",
      "outcome": "Replace this with the real result: what shipped, any measurable impact, what the client said, and what you'd do differently next time.",
      "liveUrl": "",
      "figmaUrl": "",
      "mediaAssets": []
    },
    {
      "id": "cs-002",
      "slug": "amazon-fashion",
      "type": "quick",
      "title": "Amazon Fashion Redesign",
      "subtitle": "Landing Page UX Redesign",
      "tagline": "Make choosing easier, not to show more things.",
      "client": "Personal Project",
      "role": "Product Designer",
      "discipline": "Product · UX · Personal",
      "year": "2024",
      "status": "published",
      "isLocked": true,
      "order": 2,
      "coverImage": "https://picsum.photos/seed/amazon1/600/400",
      "tags": ["UX Design", "Redesign", "Figma"],
      "tools": ["Figma"],
      "summary": "Reimagine the Amazon Fashion landing page to make browsing easier and reduce decision fatigue.",
      "brief": "Reimagine the Amazon Fashion landing page to make browsing easier, reduce decision fatigue and help users discover products faster without limiting choice.",
      "thinking": "The redesign focuses on simplifying product discovery through clearer hierarchy, intuitive navigation and progressive exploration. By reducing visual clutter and organising content around customer intent...",
      "myRole": "Conducted research, identified user pain points, developed the UX strategy, designed user flows and wireframes, created the final UI and presented the design rationale.",
      "screens": [
        { "src": "https://picsum.photos/seed/amazon2/1200/800", "caption": "High Fidelity Mockup", "wide": false },
        { "src": "https://picsum.photos/seed/amazon3/1200/800", "caption": "Paper Wireframes", "wide": false },
        { "src": "https://picsum.photos/seed/amazon4/1200/500", "caption": "Component Library", "wide": true }
      ],
      "prototypeUrl": "https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Fproto%2F%3Fnode-id%3D0-1",
      "liveUrl": "",
      "figmaUrl": "",
      "designsUrl": ""
    },
    {
      "id": "cs-003",
      "slug": "swiggy-instamart-ux",
      "type": "detailed",
      "title": "Swiggy Instamart UX Overhaul",
      "subtitle": "10-Minute Grocery — Zero-Friction Checkout",
      "tagline": "Speed is the feature. Every tap that slows you down is a broken promise.",
      "client": "Personal Project",
      "role": "UX Designer",
      "discipline": "Product · UX · Consumer",
      "year": "2025",
      "status": "published",
      "isLocked": false,
      "order": 3,
      "coverImage": "https://picsum.photos/seed/swiggy-cover/600/400",
      "tags": ["UX Design", "Mobile", "Figma", "Research"],
      "tools": ["Figma", "Maze", "Miro"],
      "summary": "A ground-up UX audit and redesign of the Swiggy Instamart checkout flow — reducing friction from cart to confirmation by eliminating redundant steps and surfacing trust signals at the right moments.",
      "context": "Swiggy Instamart entered the 10-minute grocery delivery space with an aggressive promise — but the checkout experience hadn't kept up. Users were abandoning carts at the payment step, not because they didn't want to buy, but because the flow made them work too hard. The tension between speed-as-brand and slowness-as-UX was undercutting trust at the exact moment the product needed to deliver on its core promise.",
      "problemStatement": "How do we make the checkout feel as fast as the delivery — from cart to confirmation in under 4 taps?",
      "solutionScreens": [
        { "src": "https://picsum.photos/seed/swig-sol1/400/700", "caption": "Collapsed cart view" },
        { "src": "https://picsum.photos/seed/swig-sol2/600/400", "caption": "Persistent ETA bar" },
        { "src": "https://picsum.photos/seed/swig-sol3/600/400", "caption": "Inline coupon discovery" },
        { "src": "https://picsum.photos/seed/swig-sol4/400/700", "caption": "One-screen payment summary" },
        { "src": "https://picsum.photos/seed/swig-sol5/800/400", "caption": "Expanded coupon panel" },
        { "src": "https://picsum.photos/seed/swig-sol6/800/400", "caption": "Address + slot confirmation" },
        { "src": "https://picsum.photos/seed/swig-sol7/600/400", "caption": "Order confirmed screen" },
        { "src": "https://picsum.photos/seed/swig-sol8/600/400", "caption": "Empty cart state" }
      ],
      "researchMethods": [
        { "name": "Heuristic Audit", "description": "Mapped every screen of the existing checkout flow against Nielsen's 10 usability heuristics. Identified 3 major anti-patterns including forced address re-entry and buried coupon discovery." },
        { "name": "Moderated Usability Sessions", "description": "6 sessions (3 frequent users, 3 occasional buyers). Coded recordings for task failure and hesitation moments to identify the highest-friction points." },
        { "name": "Affinity Mapping", "description": "Session findings synthesised in Miro into an affinity map revealing 3 core user frustrations: uncertainty, extra steps, and hidden value." },
        { "name": "Competitor Analysis", "description": "Audited checkout flows of Blinkit, Zepto, and BigBasket to identify best-in-class patterns and industry benchmarks for quick-commerce checkout." }
      ],
      "ideation": {
        "approach": "After research synthesis, three design principles emerged: progressive disclosure, persistent context, and a collapsed payment summary. Sketched 6 directions and narrowed to 2 viable options.",
        "solutions": [
          { "title": "Option A — Single-scroll checkout", "description": "Everything on one vertical scroll. High cognitive load upfront.", "chosen": false },
          { "title": "Option B — Progressive disclosure", "description": "Three focused screens: Cart → Address + Slot → Payment Summary. Chosen for lower cognitive load.", "chosen": true }
        ]
      },
      "wireframes": [
        { "src": "https://picsum.photos/seed/swig-wf1/600/900", "type": "lo-fi", "caption": "Cart screen — paper sketch" },
        { "src": "https://picsum.photos/seed/swig-wf2/600/900", "type": "lo-fi", "caption": "Payment summary — paper sketch" },
        { "src": "https://picsum.photos/seed/swig-wf3/600/900", "type": "hi-fi", "caption": "Cart screen — Figma wireframe v2" },
        { "src": "https://picsum.photos/seed/swig-wf4/600/900", "type": "hi-fi", "caption": "Payment summary — Figma wireframe v2" }
      ],
      "iterations": [
        { "src": "https://picsum.photos/seed/swig-iter1/400/700", "label": "v1 — Initial lo-fi sketch" },
        { "src": "https://picsum.photos/seed/swig-iter2/400/700", "label": "v2 — After first review" },
        { "src": "https://picsum.photos/seed/swig-iter3/400/700", "label": "v3 — Final hi-fi" }
      ],
      "modules": [
        {
          "name": "Cart Screen",
          "description": "Reorganised cart with a persistent ETA bar at the top, inline item editing, and coupon discovery moved above the fold.",
          "screens": [
            { "src": "https://picsum.photos/seed/swig-m1a/380/660", "caption": "Default cart state" },
            { "src": "https://picsum.photos/seed/swig-m1b/380/660", "caption": "With coupon applied" }
          ]
        },
        {
          "name": "Address & Delivery Slot",
          "description": "Combined address confirmation and delivery slot selection into one screen.",
          "screens": [
            { "src": "https://picsum.photos/seed/swig-m2a/380/660", "caption": "Address confirmation" },
            { "src": "https://picsum.photos/seed/swig-m2b/380/660", "caption": "Slot selection expanded" }
          ]
        },
        {
          "name": "Payment Summary",
          "description": "A single-screen payment view consolidating address, delivery slot, order total, and payment method.",
          "screens": [
            { "src": "https://picsum.photos/seed/swig-m3a/380/660", "caption": "Payment summary screen" },
            { "src": "https://picsum.photos/seed/swig-m3b/380/660", "caption": "Order confirmed state" }
          ]
        }
      ],
      "designSystem": {
        "colors": [
          { "name": "Instamart Orange", "hex": "#FC8019", "role": "Primary CTA, key actions" },
          { "name": "Dark Text", "hex": "#1C1C1C", "role": "Body text, headings" },
          { "name": "Surface", "hex": "#F5F5F5", "role": "Page background" },
          { "name": "Muted Text", "hex": "#686B78", "role": "Secondary labels" },
          { "name": "Success Green", "hex": "#1BA672", "role": "Confirmation, success states" }
        ],
        "typography": {
          "Heading": "Meto Sans · Bold · 20–28px",
          "Body": "Meto Sans · Regular · 14–16px",
          "Caption": "SF Mono · Regular · 11–12px"
        },
        "componentsImage": "https://picsum.photos/seed/swig-ds/1200/450",
        "credit": "Built on top of Swiggy's existing design language and component library. Color tokens and typeface follow Swiggy's public brand guidelines."
      },
      "userTesting": {
        "method": "Unmoderated usability testing via Maze · n = 18 participants",
        "results": [
          { "metric": "Task completion rate", "before": "71%", "after": "94%" },
          { "metric": "Time to payment", "before": "2m 14s", "after": "1m 36s" },
          { "metric": "Confirmation trust score", "before": "3.1 / 5", "after": "4.6 / 5" }
        ],
        "changes": [
          "Added persistent delivery ETA bar mid-checkout",
          "Moved coupon field above payment method",
          "Added item count badge to confirmation header"
        ]
      },
      "conclusion": {
        "challenges": "Working without access to Swiggy's real analytics meant every assumption had to be validated independently.",
        "outcomes": "Task completion improved from 71% to 94%, time-to-payment dropped by 38 seconds.",
        "learnings": "Coupon placement discovery was a trust issue, not just convenience."
      },
      "futureScope": [
        "Integrate loyalty rewards directly within the cart screen",
        "Personalised delivery slot suggestions",
        "Voice-assisted checkout"
      ],
      "feedbackInvite": "Have thoughts on the design decisions or research approach? Reach out via email or LinkedIn.",
      "liveUrl": "",
      "figmaUrl": "",
      "mediaAssets": []
    }
  ]
};

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
  return SEED_DATA;
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

  // Auto-load first detailed case study by default so form is populated immediately
  if (workingData.caseStudies && workingData.caseStudies.length > 0) {
    const defaultCs = workingData.caseStudies.find(c => c.type === 'detailed') || workingData.caseStudies[0];
    loadIntoForm(defaultCs.id);
  } else {
    updateFormTabs();
  }
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

