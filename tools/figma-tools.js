// ============================================================
//  Aditya Verma Portfolio — figma-tools.js
//  Fully working Figma-style tool strip:
//  V(Move)  F(Frame)  R(Rect)  P(Pen)  T(Text)  H(Hand)  C(Comment)
//  Plus a theme color picker swatch at the bottom.
// ============================================================

(function () {
  'use strict';

  // ── Tool IDs ───────────────────────────────────────────────
  const T = {
    MOVE:    'move',
    FRAME:   'frame',
    RECT:    'rect',
    PEN:     'pen',
    TEXT:    'text',
    HAND:    'hand',
    COMMENT: 'comment',
  };

  // ── Shape Subtypes ─────────────────────────────────────────
  const SHAPES = [
    { id: 'rect',    label: 'Rectangle', shortcut: 'R',       svg: '<rect x="4" y="6" width="16" height="12" rx="1"/>' },
    { id: 'line',    label: 'Line',      shortcut: 'L',       svg: '<line x1="4" y1="20" x2="20" y2="4"/>' },
    { id: 'arrow',   label: 'Arrow',     shortcut: 'Shift+L', svg: '<line x1="4" y1="20" x2="20" y2="4"/><polyline points="10 4 20 4 20 14"/>' },
    { id: 'ellipse', label: 'Ellipse',   shortcut: 'O',       svg: '<circle cx="12" cy="12" r="8"/>' },
    { id: 'polygon', label: 'Polygon',   shortcut: '',        svg: '<polygon points="12 4 21 19 3 19"/>' },
    { id: 'star',    label: 'Star',      shortcut: '',        svg: '<polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5 12 2"/>' },
  ];
  let activeShape = 'rect';

  // ── Accent color (matches CSS --accent, can be changed by picker) ──
  let ACCENT_HEX   = '#8c6fff';
  let ACCENT_RGB   = [140, 111, 255];
  let ACCENT_ALPHA = (v, mult = 1) => `rgba(${ACCENT_RGB[0]},${ACCENT_RGB[1]},${ACCENT_RGB[2]},${v * mult})`;

  // ── DOM ────────────────────────────────────────────────
  let workspace, toolCanvas, toolCtx, annoLayer;

  // Cached workspace rect (updated on resize) — canvas covers this area only
  let wsRect = { left: 0, top: 0, width: 0, height: 0 };

  // ── State ──────────────────────────────────────────────────
  let activeTool   = T.MOVE;
  let isDrawing    = false;
  let drawStart    = null;    // { x, y }
  let drawCurrent  = null;    // { x, y }
  let shapes       = [];      // persisted canvas drawings

  let penPoints    = [];      // active pen path
  let penMouse     = null;    // rubber-band target

  let handAnchor   = null;    // { cx, cy, sx, sy } for hand pan
  let draggedEl    = null;    // DOM element being dragged by the Hand tool
  let dragStartPos = { cx: 0, cy: 0 }; 
  let originalTransform = new Map();

  let commentCount = 0;
  let activeTextEl = null;

  // ── Init ───────────────────────────────────────────────────
  function init() {
    workspace  = document.querySelector('.workspace');
    toolCanvas = document.getElementById('toolCanvas');
    annoLayer  = document.getElementById('annotationLayer');
    if (!workspace || !toolCanvas || !annoLayer) return;

    syncCanvasSize();

    toolCtx = toolCanvas.getContext('2d');

    // Tool button clicks
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tool === T.RECT) {
          if (activeTool === T.RECT) {
            toggleShapeMenu();
          } else {
            activateTool(T.RECT);
          }
        } else {
          activateTool(btn.dataset.tool);
        }
      });
      if (btn.dataset.tool === T.RECT) {
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleShapeMenu();
        });
      }
    });

    // Canvas mouse events
    toolCanvas.addEventListener('mousedown',  onDown,   { passive: false });
    toolCanvas.addEventListener('mousemove',  onMove,   { passive: false });
    toolCanvas.addEventListener('mouseup',    onUp,     { passive: false });
    toolCanvas.addEventListener('dblclick',   onDbl,    { passive: false });
    toolCanvas.addEventListener('mouseleave', removeCursorLabel);
    toolCanvas.addEventListener('contextmenu', e => { e.preventDefault(); resetTool(); });

    // Keyboard shortcuts
    window.addEventListener('keydown', onKey);

    // Resize
    let resT;
    window.addEventListener('resize', () => {
      clearTimeout(resT);
      resT = setTimeout(() => { syncCanvasSize(); redraw(); }, 120);
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!workspace) return;
      wsRect = workspace.getBoundingClientRect();
      if (activeTool === T.PEN || isDrawing) {
         if (activeTool === T.PEN) {
           penMouse = {
             x: lastMouseClientX - wsRect.left,
             y: lastMouseClientY - wsRect.top,
             cx: lastMouseClientX,
             cy: lastMouseClientY
           };
         }
         if (isDrawing) {
           drawCurrent = {
             x: lastMouseClientX - wsRect.left,
             y: lastMouseClientY - wsRect.top,
             cx: lastMouseClientX,
             cy: lastMouseClientY
           };
         }
      }
    }, { passive: true });

    // Colour picker swatch button
    const swatchBtn = document.getElementById('colorSwatchBtn');
    if (swatchBtn) swatchBtn.addEventListener('click', toggleColorPicker);

    // Start animation loop for fades
    requestAnimationFrame(animLoop);

    // Start in Move mode
    activateTool(T.MOVE);
  }

  function toggleShapeMenu() {
    const existing = document.getElementById('shapeMenu');
    if (existing) { existing.remove(); return; }

    const btn = document.getElementById('shapeToolBtn') || document.querySelector('.tool-btn[data-tool="rect"]');
    const bRect = btn ? btn.getBoundingClientRect() : { top: 150, right: 52 };

    const menu = document.createElement('div');
    menu.className = 'figma-shape-menu';
    menu.id = 'shapeMenu';
    menu.style.top = Math.max(60, bRect.top) + 'px';
    menu.style.left = (bRect.right + 8) + 'px';

    menu.innerHTML = SHAPES.map(s => `
      <div class="shape-menu-item ${s.id === activeShape ? 'active' : ''}" data-shape="${s.id}">
        <span class="shape-check">${s.id === activeShape ? '✓' : ''}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          ${s.svg}
        </svg>
        <span class="shape-label">${s.label}</span>
        <span class="shape-shortcut">${s.shortcut}</span>
      </div>
    `).join('');

    document.body.appendChild(menu);

    menu.querySelectorAll('.shape-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        setShape(item.dataset.shape);
        menu.remove();
      });
    });

    setTimeout(() => {
      document.addEventListener('click', function rm(e) {
        if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', rm);
        }
      });
    }, 100);
  }

  function setShape(shapeId) {
    activeShape = shapeId;
    const shapeDef = SHAPES.find(s => s.id === shapeId) || SHAPES[0];
    const iconEl = document.getElementById('shapeToolIcon');
    if (iconEl) {
      iconEl.innerHTML = shapeDef.svg;
    }
    const btn = document.getElementById('shapeToolBtn');
    if (btn) {
      btn.dataset.shortcut = `${shapeDef.shortcut ? shapeDef.shortcut + ' — ' : ''}${shapeDef.label}`;
      btn.title = `${shapeDef.label} (${shapeDef.shortcut || 'Shapes'})`;
    }
    activateTool(T.RECT);
  }

  function syncCanvasSize() {
    // Measure the workspace element — tools should only work over the middle content area,
    // not over the left panels (tool-strip, layers) or the right inspector.
    if (!workspace) return;
    wsRect = workspace.getBoundingClientRect();

    // Size and position toolCanvas to exactly match the workspace area (absolute to body)
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    toolCanvas.style.left   = (wsRect.left + scrollX)   + 'px';
    toolCanvas.style.top    = (wsRect.top + scrollY)    + 'px';
    toolCanvas.style.width  = wsRect.width  + 'px';
    toolCanvas.style.height = wsRect.height + 'px';
    toolCanvas.width        = wsRect.width;
    toolCanvas.height       = wsRect.height;

    // Size and position annotationLayer to exactly match the workspace area (absolute to body)
    annoLayer.style.left   = (wsRect.left + scrollX)   + 'px';
    annoLayer.style.top    = (wsRect.top + scrollY)    + 'px';
    annoLayer.style.width  = wsRect.width  + 'px';
    annoLayer.style.height = wsRect.height + 'px';
  }

  // ── Activate tool ──────────────────────────────────────────
  function activateTool(tool) {
    if (activeTextEl) finishText();

    activeTool = tool;

    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    setCursor();

    const passive = tool === T.MOVE;
    toolCanvas.style.pointerEvents = passive ? 'none' : 'auto';

    if (tool !== T.PEN) { penPoints = []; penMouse = null; }
    isDrawing  = false;
    drawStart  = null;
    drawCurrent = null;
  }

  function setCursor() {
    const map = {
      [T.MOVE]:    'default',
      [T.FRAME]:   'crosshair',
      [T.RECT]:    'crosshair',
      [T.PEN]:     'crosshair',
      [T.TEXT]:    'text',
      [T.HAND]:    'grab',
      [T.COMMENT]: 'cell',
    };
    document.body.style.cursor = map[activeTool] ?? 'default';
  }

  function resetTool() {
    penPoints  = [];
    penMouse   = null;
    isDrawing  = false;
    drawStart  = null;
    activateTool(T.MOVE);
  }

  // ── Keyboard shortcuts ─────────────────────────────────────
  const KEYS = { v: T.MOVE, f: T.FRAME, r: T.RECT, p: T.PEN, t: T.TEXT, h: T.HAND, c: T.COMMENT };

  function onKey(e) {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    const editing = tag === 'INPUT' || tag === 'TEXTAREA'
      || document.activeElement?.isContentEditable;

    if (editing) {
      if (e.key === 'Escape') finishText();
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'r') { setShape('rect'); return; }
    if (k === 'l') { setShape(e.shiftKey ? 'arrow' : 'line'); return; }
    if (k === 'o') { setShape('ellipse'); return; }
    if (KEYS[k]) { activateTool(KEYS[k]); return; }

    if (e.key === 'Escape') {
      if (activeTool === T.PEN && penPoints.length > 1) finishPen();
      else resetTool();
    }
    if (e.key === 'Enter' && activeTool === T.PEN && penPoints.length > 1) finishPen();

    // Ctrl/Cmd+Z: undo last shape
    if ((e.ctrlKey || e.metaKey) && k === 'z' && shapes.length) {
      shapes.pop();
      e.preventDefault();
    }

    // Delete: clear everything
    if ((e.key === 'Delete' || e.key === 'Backspace') && activeTool === T.MOVE) {
      if (shapes.length && confirm('Clear all drawn shapes?')) {
        shapes = [];
      }
    }
  }

  // ── Inspector Integration for Hand Tool ─────────────────────
  function inspectElement(el) {
    if (!el) return;
    const inspName    = document.getElementById('inspName');
    const inspSize    = document.getElementById('inspSize');
    const inspFill    = document.getElementById('inspFill');
    const inspSwatch  = document.getElementById('inspSwatch');
    const inspRadius  = document.getElementById('inspRadius');
    const inspLayout  = document.getElementById('inspLayout');
    const inspOpacity = document.getElementById('inspOpacity');
    const inspBlur    = document.getElementById('inspBlur');

    if (!inspName) return;

    let name = 'Layer · ' + el.tagName.toLowerCase();
    if (el.classList.contains('hero-character-layer')) name = 'Layer · Character Cutout';
    else if (el.classList.contains('hero-frame-14')) name = 'Wordmark · PORTFOLIO';
    else if (el.classList.contains('hero-script-name')) name = 'Text · "aditya\'s"';
    else if (el.classList.contains('hero-role-title')) name = 'Text · "UX DESIGNER"';
    else if (el.classList.contains('origin')) name = 'Frame · Little Aditya';
    else if (el.classList.contains('case-card')) name = 'Card · Case Study';
    else if (el.classList.contains('cert-item')) name = 'Card · Certificate';
    else if (el.classList.contains('about-mini-stat')) name = 'Stat · Metric';
    else if (el.id) name = 'Layer · #' + el.id;

    if (inspName.childNodes[0]) {
      inspName.childNodes[0].textContent = name;
    }

    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (inspSize) inspSize.textContent = `${w} × ${h}`;

    const comp = window.getComputedStyle(el);
    if (inspLayout) inspLayout.textContent = comp.display === 'flex' ? 'Flex' : (comp.display === 'grid' ? 'Grid' : (comp.position === 'absolute' ? 'Absolute' : 'Auto'));
    
    const rad = comp.borderRadius || '0px';
    if (inspRadius) inspRadius.textContent = rad !== '0px' ? rad : '0 px';

    const op = comp.opacity ? `${Math.round(parseFloat(comp.opacity) * 100)}%` : '100%';
    if (inspOpacity) inspOpacity.textContent = op;

    const blur = comp.filter && comp.filter.includes('blur') ? comp.filter : '0 px';
    if (inspBlur) inspBlur.textContent = blur;

    let fill = getRgbToHex(comp.backgroundColor);
    if (fill === '#14131A' || fill === 'TRANSPARENT' || comp.backgroundColor === 'rgba(0, 0, 0, 0)') {
      fill = getRgbToHex(comp.color) || ACCENT_HEX;
    }
    if (el.classList.contains('hero-character-layer')) fill = ACCENT_HEX;
    if (inspFill) inspFill.textContent = fill.toUpperCase();
    if (inspSwatch) inspSwatch.style.background = fill;
  }

  // ── Position helpers ───────────────────────────────────────
  function getPos(e) {
    return {
      x:  e.clientX - wsRect.left,
      y:  e.clientY - wsRect.top,
      cx: e.clientX,
      cy: e.clientY,
    };
  }

  function normRect(a, b) {
    return {
      x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y),
    };
  }

  let lastMouseClientX = 0;
  let lastMouseClientY = 0;

  // ── Mouse events ───────────────────────────────────────────
  function onDown(e) {
    if (e.button !== 0) return;
    lastMouseClientX = e.clientX;
    lastMouseClientY = e.clientY;
    const pos = getPos(e);

    switch (activeTool) {
      case T.FRAME:
      case T.RECT:
        isDrawing = true; drawStart = pos; drawCurrent = pos; break;

      case T.PEN:
        penClick(pos); break;

      case T.TEXT:
        placeText(pos); break;

      case T.HAND:
        e.preventDefault();
        toolCanvas.style.pointerEvents = 'none';
        let target = document.elementFromPoint(e.clientX, e.clientY);
        toolCanvas.style.pointerEvents = 'auto';
        
        if (target) {
            const charGroup = target.closest('.hero-character-layer, .hero-character-wrapper, #heroCharacterImg, #heroCharacterOverlay');
            const scriptName = target.closest('.hero-script-name');
            const roleTitle = target.closest('.hero-role-title');
            const portfolioWordmark = target.closest('.hero-frame-14, .hero-portfolio-text, .hero-portfolio-base, .hero-portfolio-dodge');
            const originCard = target.closest('.origin');
            const card = target.closest('.case-card, .stat-card, .cert-item, .contact-card');

            if (charGroup) {
                target = document.querySelector('.hero-character-layer');
            } else if (scriptName) {
                target = scriptName;
            } else if (roleTitle) {
                target = roleTitle;
            } else if (portfolioWordmark) {
                target = document.querySelector('.hero-frame-14');
            } else if (originCard) {
                target = originCard;
            } else if (card) {
                target = card;
            } else {
                const layoutClasses = ['section', 'about-grid', 'work-grid', 'about-text', 'stat-col', 'hero-meta', 'hero-cta', 'filter-bar', 'hero', 'workspace', 'skill-cols', 'skill-group-title', 'skill-list', 'contact-grid', 'contact-info', 'hero-frame-15', 'hero-frame-13'];
                const isLayout = layoutClasses.some(c => target.classList.contains(c)) || 
                                 ['MAIN', 'SECTION', 'UL'].includes(target.tagName) || 
                                 target.id === 'annotationLayer' || 
                                 target === document.body || 
                                 target === document.documentElement;
                
                if (isLayout) {
                    target = null;
                }
            }
        }
        
        if (target && target !== document.body && target !== document.documentElement && !target.classList.contains('workspace') && !target.closest('.topbar') && !target.closest('.layers-panel') && !target.closest('.inspector') && !target.closest('.toolstrip')) {
           draggedEl = target;
           dragStartPos = { cx: e.clientX, cy: e.clientY };
           window.isDraggingHeroLayer = true;
           
           inspectElement(draggedEl);

           if (!originalTransform.has(target)) {
             originalTransform.set(target, {
                transform: target.style.transform || '',
                transition: target.style.transition || '',
                animation: target.style.animation || '',
                position: target.style.position || '',
                display: target.style.display || '',
                zIndex: target.style.zIndex || '',
                dx: 0,
                dy: 0
             });
           }
           
           target.style.setProperty('animation', 'none', 'important');
           target.style.transition = 'none';
           const compStyle = window.getComputedStyle(target);
           if (compStyle.position === 'static') {
             target.style.position = 'relative';
           }
           if (compStyle.display === 'inline') {
             target.style.display = 'inline-block';
           }
           target.style.zIndex = '80';
        }
        document.body.style.cursor = 'grabbing';
        break;

      case T.COMMENT:
        placeComment(pos); break;
    }
  }

  function onMove(e) {
    lastMouseClientX = e.clientX;
    lastMouseClientY = e.clientY;
    const pos = getPos(e);

    switch (activeTool) {
      case T.FRAME:
      case T.RECT:
        if (isDrawing) { drawCurrent = pos; }
        break;

      case T.PEN:
        penMouse = pos; break;

      case T.HAND:
        if (draggedEl) {
           const dx = e.clientX - dragStartPos.cx;
           const dy = e.clientY - dragStartPos.cy;
           let prev = originalTransform.get(draggedEl);
           let currentX = prev.dx + dx;
           let currentY = prev.dy + dy;
           
           const rot = Math.max(-15, Math.min(15, currentX * 0.04));
           
           if (draggedEl.classList.contains('hero-character-layer')) {
             draggedEl.style.transform = `translateX(calc(-50% + ${currentX}px)) translateY(${currentY}px) rotate(${rot}deg)`;
           } else if (draggedEl.classList.contains('hero-script-name')) {
             draggedEl.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rot - 6}deg)`;
           } else if (draggedEl.id === 'heroWordmark' || draggedEl.classList.contains('hero-frame-15')) {
             draggedEl.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) rotate(${rot}deg)`;
           } else {
             draggedEl.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rot}deg)`;
           }

           inspectElement(draggedEl);
        }
        break;
    }

    updateCursorLabel(e.clientX, e.clientY);
  }

  function onUp(e) {
    const pos = getPos(e);

    switch (activeTool) {
      case T.FRAME:
      case T.RECT:
        if (isDrawing && drawStart) {
          const r = normRect(drawStart, pos);
          if (r.w > 3 || r.h > 3) {
            shapes.push({
              kind: activeTool,
              shape: activeShape,
              start: drawStart,
              end: pos,
              ...r,
              time: Date.now()
            });
          }
        }
        isDrawing = false; drawStart = null; drawCurrent = null; break;

      case T.HAND:
        if (draggedEl) {
           const el = draggedEl;
           const dx = e.clientX - dragStartPos.cx;
           const dy = e.clientY - dragStartPos.cy;
           let prev = originalTransform.get(el);
           prev.dx += dx;
           prev.dy += dy;
           
           draggedEl = null;
           window.isDraggingHeroLayer = false;
           
           setTimeout(() => {
              if (originalTransform.has(el) && draggedEl !== el) {
                 el.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; 
                 el.style.transform = prev.transform; 
                 
                 setTimeout(() => {
                    if (draggedEl !== el) {
                       el.style.transition = prev.transition;
                       el.style.position = prev.position;
                       el.style.display = prev.display;
                       el.style.zIndex = prev.zIndex;
                       originalTransform.delete(el);
                    }
                 }, 600);
              }
           }, 3500); 
        }
        handAnchor = null; 
        window.isDraggingHeroLayer = false;
        document.body.style.cursor = 'grab'; 
        break;
    }
  }

  function onDbl(e) {
    if (activeTool === T.PEN && penPoints.length > 1) finishPen();
  }

  // ── Cursor tooltip label ───────────────────────────────────
  let labelEl = null;

  function updateCursorLabel(cx, cy) {
    if (activeTool === T.MOVE) { removeCursorLabel(); return; }

    const labels = {
      [T.FRAME]:   'FRAME',
      [T.RECT]:    (activeShape || 'RECT').toUpperCase(),
      [T.PEN]:     'PEN',
      [T.TEXT]:    'TEXT',
      [T.HAND]:    'HAND',
      [T.COMMENT]: 'COMMENT',
    };
    const text = labels[activeTool] ?? '';

    if (!labelEl) {
      labelEl = document.createElement('div');
      labelEl.id = 'cursorLabel';
      labelEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        display: flex; flex-direction: column; align-items: flex-start;
        gap: 2px;
      `;
      labelEl.innerHTML = `
        <span class="cl-dot"></span>
        <span class="cl-text"></span>
      `;
      document.body.appendChild(labelEl);
    }

    labelEl.style.left = (cx + 14) + 'px';
    labelEl.style.top  = (cy + 4)  + 'px';
    labelEl.querySelector('.cl-text').textContent = text;
    labelEl.querySelector('.cl-dot').style.background = ACCENT_HEX;
  }

  function removeCursorLabel() {
    if (labelEl) { labelEl.remove(); labelEl = null; }
  }

  // ── Frame / Shapes drawing ─────────────────────────────────
  function drawPreview(a, b) {
    const r = normRect(a, b);
    if (r.w < 2 && r.h < 2) return;
    drawShape({ kind: activeTool, shape: activeShape, start: a, end: b, ...r }, activeTool, true, 1);
  }

  function drawShape(s, kind, preview = false, alpha = 1) {
    const isFrame = kind === T.FRAME;
    toolCtx.save();
    toolCtx.globalAlpha = alpha;
    const shapeType = isFrame ? 'frame' : (s.shape || 'rect');

    if (isFrame) {
      toolCtx.setLineDash([5, 4]);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      toolCtx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.04 : 0.07);
      toolCtx.fillRect(s.x, s.y, s.w, s.h);

      toolCtx.setLineDash([]);
      toolCtx.font = '10px "IBM Plex Mono", monospace';
      toolCtx.fillStyle = ACCENT_ALPHA(0.85);
      toolCtx.fillText(`◇ Frame · ${Math.round(s.w)} × ${Math.round(s.h)}`, s.x + 2, s.y - 7);
      cornerHandles(s);
    } else if (shapeType === 'rect') {
      toolCtx.setLineDash([]);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.13 : 0.2);
      toolCtx.fillRect(s.x, s.y, s.w, s.h);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      toolCtx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);

      if (s.w > 50 && s.h > 20) {
        toolCtx.font = '10px "IBM Plex Mono", monospace';
        toolCtx.fillStyle = ACCENT_ALPHA(0.85);
        toolCtx.fillText(`${Math.round(s.w)} × ${Math.round(s.h)}`, s.x + 6, s.y + 14);
      }
      cornerHandles(s);
    } else if (shapeType === 'line' || shapeType === 'arrow') {
      const p1 = s.start || { x: s.x, y: s.y };
      const p2 = s.end || { x: s.x + s.w, y: s.y + s.h };
      toolCtx.setLineDash([]);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 2;
      toolCtx.beginPath();
      toolCtx.moveTo(p1.x, p1.y);
      toolCtx.lineTo(p2.x, p2.y);
      toolCtx.stroke();

      if (shapeType === 'arrow') {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headlen = 11;
        toolCtx.fillStyle = ACCENT_HEX;
        toolCtx.beginPath();
        toolCtx.moveTo(p2.x, p2.y);
        toolCtx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
        toolCtx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
        toolCtx.closePath();
        toolCtx.fill();
        toolCtx.stroke();
      }
    } else if (shapeType === 'ellipse') {
      toolCtx.setLineDash([]);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.13 : 0.2);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const rx = Math.max(1, s.w / 2);
      const ry = Math.max(1, s.h / 2);
      toolCtx.beginPath();
      toolCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      toolCtx.fill();
      toolCtx.stroke();
      cornerHandles(s);
    } else if (shapeType === 'polygon') {
      toolCtx.setLineDash([]);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.13 : 0.2);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      toolCtx.beginPath();
      toolCtx.moveTo(s.x + s.w / 2, s.y);
      toolCtx.lineTo(s.x + s.w, s.y + s.h);
      toolCtx.lineTo(s.x, s.y + s.h);
      toolCtx.closePath();
      toolCtx.fill();
      toolCtx.stroke();
      cornerHandles(s);
    } else if (shapeType === 'star') {
      toolCtx.setLineDash([]);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.13 : 0.2);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const spikes = 5;
      const outerRadius = Math.min(s.w, s.h) / 2;
      const innerRadius = outerRadius * 0.42;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      toolCtx.beginPath();
      toolCtx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        toolCtx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        toolCtx.lineTo(x, y);
        rot += step;
      }
      toolCtx.lineTo(cx, cy - outerRadius);
      toolCtx.closePath();
      toolCtx.fill();
      toolCtx.stroke();
      cornerHandles(s);
    }

    toolCtx.restore();
  }

  function cornerHandles(r) {
    toolCtx.setLineDash([]);
    const sz = 4;
    [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([cx, cy]) => {
      toolCtx.fillStyle = ACCENT_HEX;
      toolCtx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
    });
  }

  // ── Pen tool ───────────────────────────────────────────────
  function penClick(pos) {
    if (penPoints.length > 2) {
      const f  = penPoints[0];
      const dx = pos.x - f.x;
      const dy = pos.y - f.y;
      if (dx * dx + dy * dy < 144) { finishPen(); return; } // close if near start
    }
    penPoints.push({ x: pos.x, y: pos.y, time: Date.now() });
  }

  function finishPen() {
    if (penPoints.length >= 2)
      shapes.push({ kind: 'pen', pts: [...penPoints], closed: true, time: Date.now() });
    penPoints = []; penMouse = null;
  }

  function drawPen(pts, mouse, closed, alpha = 1) {
    if (!pts.length) return;
    toolCtx.save();
    toolCtx.globalAlpha = alpha;
    toolCtx.strokeStyle = ACCENT_HEX;
    toolCtx.lineWidth   = 1.5;
    toolCtx.lineJoin    = 'round';
    toolCtx.lineCap     = 'round';
    toolCtx.setLineDash([]);

    toolCtx.beginPath();
    toolCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) toolCtx.lineTo(pts[i].x, pts[i].y);
    if (closed) {
      toolCtx.closePath();
      toolCtx.fillStyle = ACCENT_ALPHA(0.1);
      toolCtx.fill();
    }
    toolCtx.stroke();

    // Rubber-band preview line
    if (!closed && mouse && pts.length) {
      const last = pts[pts.length - 1];
      toolCtx.setLineDash([4, 4]);
      toolCtx.beginPath();
      toolCtx.moveTo(last.x, last.y);
      toolCtx.lineTo(mouse.x, mouse.y);
      toolCtx.stroke();
    }

    toolCtx.setLineDash([]);

    // Anchor dots
    pts.forEach((p, i) => {
      toolCtx.beginPath();
      toolCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      toolCtx.fillStyle   = i === 0 ? ACCENT_HEX : 'rgba(20,19,26,0.9)';
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth   = 1.5;
      toolCtx.fill();
      toolCtx.stroke();
    });

    // Close-path target ring
    if (!closed && pts.length > 2 && mouse) {
      const f  = pts[0];
      const dx = mouse.x - f.x;
      const dy = mouse.y - f.y;
      if (dx * dx + dy * dy < 144) {
        toolCtx.beginPath();
        toolCtx.arc(f.x, f.y, 8, 0, Math.PI * 2);
        toolCtx.strokeStyle = ACCENT_ALPHA(0.7);
        toolCtx.lineWidth   = 2;
        toolCtx.stroke();
      }
    }

    toolCtx.restore();
  }

  // ── Text tool ──────────────────────────────────────────────
  function placeText(pos) {
    if (activeTextEl) finishText();
    const el = document.createElement('div');
    el.className        = 'figma-text-node';
    el.contentEditable  = 'true';
    el.style.cssText    = `
      position: absolute;
      left: ${pos.x}px;
      top: ${pos.y - 4}px;
      min-width: 80px;
      padding: 2px 4px;
      font-family: var(--display), sans-serif;
      font-weight: 500;
      font-size: 15px;
      line-height: 1.5;
      color: #f1f0f5;
      background: transparent;
      outline: 1px solid ${ACCENT_HEX};
      outline-offset: 3px;
      caret-color: ${ACCENT_HEX};
      z-index: 60;
      cursor: text;
      white-space: nowrap;
    `;
    annoLayer.appendChild(el);
    activeTextEl = el;
    requestAnimationFrame(() => el.focus());

    el.addEventListener('keydown', e => { if (e.key === 'Escape') finishText(); });
    el.addEventListener('blur', () => setTimeout(() => { if (activeTextEl === el) finishText(); }, 200));
  }

  function finishText() {
    if (!activeTextEl) return;
    if (!activeTextEl.textContent.trim()) {
      activeTextEl.remove();
    } else {
      activeTextEl.contentEditable = 'false';
      activeTextEl.style.outline   = 'none';
      activeTextEl.style.cursor    = 'default';
      activeTextEl.style.transition = 'opacity 1.5s ease';
      const target = activeTextEl;
      setTimeout(() => {
        target.style.opacity = '0';
        setTimeout(() => target.remove(), 1500);
      }, 4000);
    }
    activeTextEl = null;
  }

  // ── Comment tool ───────────────────────────────────────────
  function placeComment(pos) {
    commentCount++;
    const n   = commentCount;
    const pin = document.createElement('div');
    pin.className = 'figma-comment-pin';
    pin.style.cssText = `
      position: absolute;
      left: ${pos.x - 10}px;
      top: ${pos.y - 22}px;
      width: 22px; height: 22px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: ${ACCENT_HEX};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      z-index: 65;
      box-shadow: 0 2px 12px ${ACCENT_ALPHA(0.45)};
      transition: transform 0.15s, box-shadow 0.15s;
      flex-shrink: 0;
    `;
    pin.innerHTML = `<span style="transform:rotate(45deg);font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:700;color:#fff;">${n}</span>`;

    pin.addEventListener('mouseenter', () => { pin.style.transform = 'rotate(-45deg) scale(1.15)'; });
    pin.addEventListener('mouseleave', () => { pin.style.transform = 'rotate(-45deg) scale(1)'; });
    pin.addEventListener('click', e => { e.stopPropagation(); showCommentPopup(pin, n); });

    annoLayer.appendChild(pin);

    // Auto fade pin after 4 seconds (4000ms)
    setTimeout(() => {
      pin.style.transition = 'opacity 1.5s ease, transform 0.15s, box-shadow 0.15s';
      pin.style.opacity = '0';
      setTimeout(() => { if (pin.parentNode) pin.remove(); }, 1500);
    }, 4000);
  }

  function showCommentPopup(pin, n) {
    document.querySelector('.figma-comment-popup')?.remove();

    const popup = document.createElement('div');
    popup.className   = 'figma-comment-popup';
    const pinL = parseInt(pin.style.left);
    const pinT = parseInt(pin.style.top);
    popup.style.cssText = `
      position: fixed;
      left: ${pinL + 30}px;
      top: ${pinT}px;
      background: rgba(20,19,26,0.97);
      border: 1px solid ${ACCENT_ALPHA(0.3)};
      border-radius: 10px;
      padding: 12px 16px;
      z-index: 300;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      min-width: 220px;
      animation: fadeSlideUp 0.18s ease;
    `;
    popup.innerHTML = `
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:${ACCENT_HEX};margin-bottom:8px;">Comment ${n}</div>
      <div contenteditable="true" class="comment-input" style="font-family:Inter,sans-serif;font-size:13px;color:#d8d6e8;outline:none;min-height:24px;line-height:1.5;" placeholder="Add a comment…"></div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:rgba(255,255,255,0.2);margin-top:8px;">Press Esc to dismiss</div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.comment-input').focus();

    popup.addEventListener('keydown', e => { if (e.key === 'Escape') popup.remove(); });
    setTimeout(() => {
      document.addEventListener('click', function rm(e) {
        if (!popup.contains(e.target) && e.target !== pin) {
          popup.remove();
          document.removeEventListener('click', rm);
        }
      });
    }, 100);
  }

  // ── Animation & Redraw ─────────────────────────────────────
  const FADE_DELAY = 4000; // 4000ms = 4 seconds
  const FADE_DUR   = 1500; // 1.5 second smooth fade-out

  function getAlpha(time) {
    if (!time) return 1;
    const age = Date.now() - time;
    if (age < FADE_DELAY) return 1;
    if (age > FADE_DELAY + FADE_DUR) return 0;
    return 1 - ((age - FADE_DELAY) / FADE_DUR);
  }

  function animLoop() {
    redraw();
    requestAnimationFrame(animLoop);
  }

  function redraw() {
    const w = toolCanvas.width, h = toolCanvas.height;
    toolCtx.clearRect(0, 0, w, h);

    // Clean up dead shapes
    shapes = shapes.filter(s => getAlpha(s.time) > 0);
    penPoints = penPoints.filter(p => getAlpha(p.time) > 0);

    // Persisted shapes
    shapes.forEach(s => {
      const alpha = getAlpha(s.time);
      if (alpha <= 0) return;
      if (s.kind === T.FRAME)  drawShape(s, T.FRAME, false, alpha);
      if (s.kind === T.RECT)   drawShape(s, T.RECT, false, alpha);
      if (s.kind === 'pen')    drawPen(s.pts, null, s.closed, alpha);
    });

    // Preview active rect/frame
    if (isDrawing && drawStart && drawCurrent && (activeTool === T.FRAME || activeTool === T.RECT)) {
      drawPreview(drawStart, drawCurrent);
    }

    // Live pen path (fading segment by segment)
    if (penPoints.length) {
      drawLivePen(penPoints, penMouse);
    }
  }

  function drawLivePen(pts, mouse) {
    toolCtx.save();
    toolCtx.lineWidth   = 1.5;
    toolCtx.lineJoin    = 'round';
    toolCtx.lineCap     = 'round';

    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const alpha = getAlpha(p1.time);
      if (alpha <= 0) continue;
      
      const r = ACCENT_RGB[0], g = ACCENT_RGB[1], b = ACCENT_RGB[2];

      // Draw segment to next point
      if (i < pts.length - 1) {
        const p2 = pts[i+1];
        toolCtx.beginPath();
        toolCtx.moveTo(p1.x, p1.y);
        toolCtx.lineTo(p2.x, p2.y);
        toolCtx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        toolCtx.stroke();
      } else if (mouse) {
        // Line to mouse
        toolCtx.beginPath();
        toolCtx.setLineDash([4, 4]);
        toolCtx.moveTo(p1.x, p1.y);
        toolCtx.lineTo(mouse.x, mouse.y);
        toolCtx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
        toolCtx.stroke();
        toolCtx.setLineDash([]);
      }
      
      // Draw anchor dot
      toolCtx.beginPath();
      toolCtx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
      toolCtx.fillStyle   = i === 0 ? `rgba(${r},${g},${b},${alpha})` : `rgba(20,19,26,${alpha * 0.9})`;
      toolCtx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      toolCtx.fill();
      toolCtx.stroke();
    }
    toolCtx.restore();
  }

  // ── Accent colour picker ───────────────────────────────────
  const PRESETS = [
    { hex: '#8c6fff', label: 'Violet (default)' },
    { hex: '#5fd4a4', label: 'Mint' },
    { hex: '#ff7a59', label: 'Coral' },
    { hex: '#38b2ff', label: 'Sky' },
    { hex: '#ff9d6c', label: 'Peach' },
    { hex: '#f7d85e', label: 'Gold' },
    { hex: '#ff4f8b', label: 'Pink' },
    { hex: '#00c4b0', label: 'Teal' },
  ];

  function toggleColorPicker() {
    const existing = document.getElementById('colorPickerPanel');
    if (existing) { existing.remove(); return; }

    const panel = document.createElement('div');
    panel.id = 'colorPickerPanel';
    panel.style.cssText = `
      position: fixed;
      left: 60px;
      bottom: 70px;
      background: rgba(20,19,26,0.97);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px;
      z-index: 400;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
      width: 200px;
      animation: fadeSlideUp 0.18s ease;
    `;

    const swatchesHtml = PRESETS.map(p => `
      <button class="cp-swatch ${p.hex.toLowerCase() === ACCENT_HEX.toLowerCase() ? 'cp-active' : ''}"
              data-hex="${p.hex}"
              title="${p.label}"
              style="background:${p.hex}; width:28px;height:28px;border-radius:6px;border:2px solid ${p.hex.toLowerCase() === ACCENT_HEX.toLowerCase() ? '#fff' : 'transparent'};cursor:pointer;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;">
      </button>
    `).join('');

    // (Optional rainbow wheel button commented out since spectrum picker is integrated into the custom chip)
    // const wheelBtnHtml = `...`;

    panel.innerHTML = `
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">Accent color</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center;">
        ${swatchesHtml}
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:6px;letter-spacing:0.04em;">Custom hex</div>
      <div id="cpHexWrap" style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;height:34px;box-sizing:border-box;transition:border-color 0.2s,box-shadow 0.2s;">
        <label id="cpChipLabel" title="Click to open color spectrum picker" style="position:relative;width:24px;height:18px;border-radius:4px;background:${ACCENT_HEX};cursor:pointer;flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;transition:background 0.2s,transform 0.12s;">
          <input id="cpNativePicker" type="color" value="${ACCENT_HEX}" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
        </label>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:rgba(255,255,255,0.45);user-select:none;font-weight:600;line-height:1;">#</span>
        <input id="cpHexInput" type="text" value="${ACCENT_HEX.replace('#', '')}" maxlength="6" spellcheck="false" autocomplete="off"
          style="width:100%;background:transparent;border:none;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:12px;outline:none;padding:0;letter-spacing:0.04em;">
      </div>
    `;

    document.body.appendChild(panel);

    const hexWrap = panel.querySelector('#cpHexWrap');
    const hexInput = panel.querySelector('#cpHexInput');
    const nativePicker = panel.querySelector('#cpNativePicker');
    const chipLabel = panel.querySelector('#cpChipLabel');

    hexInput.addEventListener('focus', () => {
      hexWrap.style.borderColor = 'var(--accent)';
      hexWrap.style.boxShadow = '0 0 0 1px var(--accent)';
    });
    hexInput.addEventListener('blur', () => {
      hexWrap.style.borderColor = 'rgba(255,255,255,0.12)';
      hexWrap.style.boxShadow = 'none';
    });

    panel.querySelectorAll('.cp-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        applyAccent(btn.dataset.hex);
        panel.querySelectorAll('.cp-swatch').forEach(b => {
          b.style.borderColor = b === btn ? '#fff' : 'transparent';
          b.classList.toggle('cp-active', b === btn);
        });
        hexInput.value = btn.dataset.hex.replace('#', '');
        nativePicker.value = btn.dataset.hex;
        if (chipLabel) chipLabel.style.background = btn.dataset.hex;
      });
    });

    // Custom Visual Spectrum Color Picker event via Chip
    nativePicker.addEventListener('input', () => {
      const col = nativePicker.value;
      applyAccent(col);
      hexInput.value = col.replace('#', '');
      if (chipLabel) chipLabel.style.background = col;
      panel.querySelectorAll('.cp-swatch').forEach(b => {
        const isMatch = b.dataset.hex.toLowerCase() === col.toLowerCase();
        b.style.borderColor = isMatch ? '#fff' : 'transparent';
        b.classList.toggle('cp-active', isMatch);
      });
    });

    hexInput.addEventListener('input', () => {
      const clean = hexInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
      hexInput.value = clean;
      if (clean.length === 6) {
        const fullHex = '#' + clean;
        applyAccent(fullHex);
        nativePicker.value = fullHex;
        if (chipLabel) chipLabel.style.background = fullHex;
        panel.querySelectorAll('.cp-swatch').forEach(b => {
          const isMatch = b.dataset.hex.toLowerCase() === fullHex.toLowerCase();
          b.style.borderColor = isMatch ? '#fff' : 'transparent';
          b.classList.toggle('cp-active', isMatch);
        });
      }
    });
    hexInput.addEventListener('keydown', e => { if (e.key === 'Escape') panel.remove(); });

    setTimeout(() => {
      document.addEventListener('click', function rm(e) {
        const swatch = document.getElementById('colorSwatchBtn');
        if (!panel.contains(e.target) && e.target !== swatch) {
          panel.remove();
          document.removeEventListener('click', rm);
        }
      });
    }, 100);
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [isNaN(r) ? 140 : r, isNaN(g) ? 111 : g, isNaN(b) ? 255 : b];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  }

  function lightenRgb(rgb, amount = 0.2) {
    return rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount)));
  }

  function getLightestTint(rgb, amount = 0.84) {
    return rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount)));
  }

  function applyAccent(hex) {
    ACCENT_HEX = hex;
    ACCENT_RGB = hexToRgb(hex);
    const [r, g, b] = ACCENT_RGB;

    // Harmonious lighter/mid tones and ultra-light pastel tint
    const midRgb = lightenRgb(ACCENT_RGB, 0.18);
    const lightRgb = lightenRgb(ACCENT_RGB, 0.38);
    const tintRgb = getLightestTint(ACCENT_RGB, 0.84);
    const midHex = rgbToHex(...midRgb);
    const lightHex = rgbToHex(...lightRgb);
    const tintHex = rgbToHex(...tintRgb);

    // Update CSS custom properties live
    const root = document.documentElement.style;
    root.setProperty('--accent', hex);
    root.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    root.setProperty('--accent-mid', midHex);
    root.setProperty('--accent-light', lightHex);
    root.setProperty('--accent-tint', tintHex);
    root.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
    root.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.38)`);

    // Connected hero background & portfolio wordmark gradients
    root.setProperty('--hero-accent-grad', `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.35) 0%, rgba(${r}, ${g}, ${b}, 0) 60%), #0d0c13`);
    root.setProperty('--hero-accent-extra', `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.20) 0%, transparent 60%)`);
    root.setProperty('--portfolio-base-grad', `linear-gradient(178.75deg, ${midHex} -51.54%, #191919 99.44%)`);
    root.setProperty('--portfolio-dodge-grad', `linear-gradient(170.33deg, ${midHex} 13.53%, #191919 153.81%)`);
    root.setProperty('--grad-hero', `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.18) 0%, transparent 60%)`);
    root.setProperty('--grad-accent', `linear-gradient(135deg, ${hex} 0%, ${lightHex} 100%)`);

    // Update SVG gradient stops dynamically (for SVG definitions like clothGrad2 and mLogoGrad2)
    const clothGrad = document.getElementById('clothGrad2');
    if (clothGrad) {
      const stops = clothGrad.querySelectorAll('stop');
      if (stops.length >= 5) {
        stops[0].setAttribute('stop-color', midHex);
        stops[1].setAttribute('stop-color', hex);
        stops[2].setAttribute('stop-color', lightHex);
        stops[3].setAttribute('stop-color', hex);
        stops[4].setAttribute('stop-color', midHex);
      }
    }

    const mGrad = document.getElementById('mLogoGrad2');
    if (mGrad) {
      const stops = mGrad.querySelectorAll('stop');
      if (stops.length >= 2) {
        stops[0].setAttribute('stop-color', lightHex);
        stops[1].setAttribute('stop-color', hex);
      }
    }

    // Update QR Scanner Corners & Scan Label
    document.querySelectorAll('.qr-corner').forEach(c => {
      c.style.borderColor = lightHex;
    });
    const qrLabel = document.querySelector('.qr-scan-label');
    if (qrLabel) qrLabel.style.color = lightHex;

    const qrFrame = document.querySelector('.qr-frame');
    if (qrFrame) {
      qrFrame.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.35)`;
      qrFrame.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(${r}, ${g}, ${b}, 0.12)`;
    }

    const qrAura = document.querySelector('.qr-glow-aura');
    if (qrAura) {
      qrAura.style.background = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.28) 0%, transparent 70%)`;
    }

    // Update swatch button fill color
    const sw = document.querySelector('#colorSwatchBtn .swatch-fill');
    if (sw) sw.style.background = hex;

    const chip = document.getElementById('cpChipLabel');
    if (chip) chip.style.background = hex;

    // Update bg-canvas.js accent via custom event
    window.dispatchEvent(new CustomEvent('accentChange', { detail: { hex, rgb: ACCENT_RGB } }));

    // Redraw tool canvas shapes in new color
    redraw();
  }

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
