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

  // ── Accent color (matches CSS --accent, can be changed by picker) ──
  let ACCENT_HEX   = '#8c6fff';
  let ACCENT_RGB   = [140, 111, 255];
  let ACCENT_ALPHA = (v, mult = 1) => `rgba(${ACCENT_RGB[0]},${ACCENT_RGB[1]},${ACCENT_RGB[2]},${v * mult})`;

  // ── DOM ────────────────────────────────────────────────
  let toolCanvas, toolCtx, annoLayer;

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
    toolCanvas = document.getElementById('toolCanvas');
    annoLayer  = document.getElementById('annotationLayer');
    if (!toolCanvas || !annoLayer) return;

    syncCanvasSize();

    toolCtx = toolCanvas.getContext('2d');

    // Tool button clicks
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => activateTool(btn.dataset.tool));
    });

    // Canvas mouse events
    toolCanvas.addEventListener('mousedown',  onDown,   { passive: false });
    toolCanvas.addEventListener('mousemove',  onMove,   { passive: false });
    toolCanvas.addEventListener('mouseup',    onUp,     { passive: false });
    toolCanvas.addEventListener('dblclick',   onDbl,    { passive: false });
    toolCanvas.addEventListener('contextmenu', e => { e.preventDefault(); resetTool(); });

    // Keyboard shortcuts
    window.addEventListener('keydown', onKey);

    // Resize
    let resT;
    window.addEventListener('resize', () => {
      clearTimeout(resT);
      resT = setTimeout(() => { syncCanvasSize(); redraw(); }, 120);
    }, { passive: true });

    // Colour picker swatch button
    const swatchBtn = document.getElementById('colorSwatchBtn');
    if (swatchBtn) swatchBtn.addEventListener('click', toggleColorPicker);

    // Start animation loop for fades
    requestAnimationFrame(animLoop);

    // Start in Move mode
    activateTool(T.MOVE);
  }

  function syncCanvasSize() {
    // Measure the workspace element — tools should only work over the middle content area,
    // not over the left panels (tool-strip, layers) or the right inspector.
    const workspace = document.querySelector('.workspace');
    if (workspace) {
      wsRect = workspace.getBoundingClientRect();
    } else {
      wsRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }

    // Size and position toolCanvas to exactly match the workspace area
    toolCanvas.style.left   = wsRect.left   + 'px';
    toolCanvas.style.top    = wsRect.top    + 'px';
    toolCanvas.style.width  = wsRect.width  + 'px';
    toolCanvas.style.height = wsRect.height + 'px';
    toolCanvas.width        = wsRect.width;
    toolCanvas.height       = wsRect.height;

    // Size and position annotationLayer to exactly match the workspace area
    annoLayer.style.left   = wsRect.left   + 'px';
    annoLayer.style.top    = wsRect.top    + 'px';
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

  // ── Position helpers ───────────────────────────────────────
  function getPos(e) {
    // x/y are workspace-local canvas coords (for drawing on toolCanvas)
    // cx/cy are viewport coords (for placing fixed-position DOM elements like text/comment pins)
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

  // ── Mouse events ───────────────────────────────────────────
  function onDown(e) {
    if (e.button !== 0) return;
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
        e.preventDefault(); // Prevent native drag-and-drop of links/images and text selection
        // Hide toolCanvas from pointer events briefly so we can find what's underneath it
        toolCanvas.style.pointerEvents = 'none';
        let target = document.elementFromPoint(e.clientX, e.clientY);
        toolCanvas.style.pointerEvents = 'auto';
        
        if (target) {
            // Heuristic: If we clicked inside a card, button, or paragraph, drag the whole thing!
            target = target.closest('.case-card, .tool-chip, button, a, p, h1, h2, h3, h4, h5, h6, .stat-card') || target;
        }
        
        // Only pick up elements inside the workspace, not UI panels or the background
        if (target && target !== document.body && target !== document.documentElement && !target.classList.contains('workspace') && !target.closest('.topbar') && !target.closest('.layers-panel') && !target.closest('.inspector') && !target.closest('.toolstrip')) {
           draggedEl = target;
           dragStartPos = { cx: e.clientX, cy: e.clientY };
           
           if (!originalTransform.has(target)) {
             originalTransform.set(target, {
                transform: target.style.transform || '',
                transition: target.style.transition || '',
                position: target.style.position || '',
                display: target.style.display || '',
                zIndex: target.style.zIndex || '',
                dx: 0,
                dy: 0
             });
           }
           
           target.style.transition = 'none';
           const compStyle = window.getComputedStyle(target);
           if (compStyle.position === 'static') {
             target.style.position = 'relative';
           }
           if (compStyle.display === 'inline') {
             target.style.display = 'inline-block';
           }
           target.style.zIndex = '999999';
        } else {
           handAnchor = { cx: e.clientX, cy: e.clientY, sx: window.scrollX, sy: window.scrollY };
        }
        document.body.style.cursor = 'grabbing';
        break;

      case T.COMMENT:
        placeComment(pos); break;
    }
  }

  function onMove(e) {
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
           
           draggedEl.style.transform = `translate(${currentX}px, ${currentY}px)`;
        } else if (handAnchor) {
           const dx = e.clientX - handAnchor.cx;
           const dy = e.clientY - handAnchor.cy;
           window.scrollTo(handAnchor.sx - dx, handAnchor.sy - dy);
        }
        break;
    }

    // Show cursor tooltip label
    updateCursorLabel(e.clientX, e.clientY);
  }

  function onUp(e) {
    const pos = getPos(e);

    switch (activeTool) {
      case T.FRAME:
      case T.RECT:
        if (isDrawing && drawStart) {
          const r = normRect(drawStart, pos);
          if (r.w > 4 && r.h > 4) shapes.push({ kind: activeTool, ...r, time: Date.now() });
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
           
           // Keep it there for 3.5 seconds, then snap back
           setTimeout(() => {
              // Only snap back if we aren't dragging it again
              if (originalTransform.has(el) && draggedEl !== el) {
                 el.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; 
                 el.style.transform = prev.transform; 
                 
                 setTimeout(() => {
                    if (draggedEl !== el) {
                       el.style.transition = prev.transition;
                       el.style.position = prev.position;
                       el.style.display = prev.display;
                       el.style.zIndex = prev.zIndex;
                       originalTransform.delete(el);
                    }
                 }, 500);
              }
           }, 3500); 
        }
        handAnchor = null; 
        document.body.style.cursor = 'grab'; 
        break;
    }
  }

  function onDbl(e) {
    if (activeTool === T.PEN && penPoints.length > 1) finishPen();
  }

  // ── Cursor tooltip label (shown for all non-Move tools) ────
  let labelEl = null;

  function updateCursorLabel(cx, cy) {
    if (activeTool === T.MOVE) { removeCursorLabel(); return; }

    const labels = {
      [T.FRAME]:   'FRAME',
      [T.RECT]:    'RECT',
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

  // ── Frame / Rectangle drawing ──────────────────────────────
  function drawPreview(a, b) {
    const r = normRect(a, b);
    if (r.w < 2 || r.h < 2) return;
    drawRect(r, activeTool, true, 1);
  }

  function drawRect(r, kind, preview = false, alpha = 1) {
    const isFrame = kind === T.FRAME;
    toolCtx.save();
    toolCtx.globalAlpha = alpha;

    if (isFrame) {
      // Dashed violet outline
      toolCtx.setLineDash([5, 4]);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      toolCtx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.04 : 0.07);
      toolCtx.fillRect(r.x, r.y, r.w, r.h);

      // Frame label
      toolCtx.setLineDash([]);
      toolCtx.font = '10px "IBM Plex Mono", monospace';
      toolCtx.fillStyle = ACCENT_ALPHA(0.85);
      toolCtx.fillText(`◇ Frame · ${Math.round(r.w)} × ${Math.round(r.h)}`, r.x + 2, r.y - 7);

      cornerHandles(r);
    } else {
      // Filled rectangle
      toolCtx.setLineDash([]);
      toolCtx.fillStyle = ACCENT_ALPHA(preview ? 0.13 : 0.2);
      toolCtx.fillRect(r.x, r.y, r.w, r.h);
      toolCtx.strokeStyle = ACCENT_HEX;
      toolCtx.lineWidth = 1.5;
      toolCtx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);

      // Dimension label inside
      if (r.w > 60 && r.h > 20) {
        toolCtx.font = '10px "IBM Plex Mono", monospace';
        toolCtx.fillStyle = ACCENT_ALPHA(0.85);
        toolCtx.fillText(`${Math.round(r.w)} × ${Math.round(r.h)}`, r.x + 6, r.y + 14);
      }
      cornerHandles(r);
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
      position: fixed;
      left: ${pos.cx}px;
      top: ${pos.cy - 4}px;
      min-width: 80px;
      padding: 2px 4px;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      line-height: 1.5;
      color: #f1f0f5;
      background: transparent;
      outline: 1px solid ${ACCENT_HEX};
      outline-offset: 3px;
      caret-color: ${ACCENT_HEX};
      z-index: 160;
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
      activeTextEl.style.transition = 'opacity 2s ease';
      const target = activeTextEl;
      setTimeout(() => {
        target.style.opacity = '0';
        setTimeout(() => target.remove(), 2000);
      }, 6000);
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
      position: fixed;
      left: ${pos.cx - 10}px;
      top: ${pos.cy - 22}px;
      width: 22px; height: 22px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: ${ACCENT_HEX};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      z-index: 160;
      box-shadow: 0 2px 12px ${ACCENT_ALPHA(0.45)};
      transition: transform 0.15s, box-shadow 0.15s;
      flex-shrink: 0;
    `;
    pin.innerHTML = `<span style="transform:rotate(45deg);font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:700;color:#fff;">${n}</span>`;

    pin.addEventListener('mouseenter', () => { pin.style.transform = 'rotate(-45deg) scale(1.15)'; });
    pin.addEventListener('mouseleave', () => { pin.style.transform = 'rotate(-45deg) scale(1)'; });
    pin.addEventListener('click', e => { e.stopPropagation(); showCommentPopup(pin, n); });

    annoLayer.appendChild(pin);

    // Auto fade pin
    setTimeout(() => {
      pin.style.transition = 'opacity 2s ease, transform 0.15s, box-shadow 0.15s';
      pin.style.opacity = '0';
      setTimeout(() => { if (pin.parentNode) pin.remove(); }, 2000);
    }, 6000);
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
  const FADE_DELAY = 6000;
  const FADE_DUR   = 2000;

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
      if (s.kind === T.FRAME)  drawRect(s, T.FRAME, false, alpha);
      if (s.kind === T.RECT)   drawRect(s, T.RECT, false, alpha);
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

    const grid = PRESETS.map(p => `
      <button class="cp-swatch ${p.hex === ACCENT_HEX ? 'cp-active' : ''}"
              data-hex="${p.hex}"
              title="${p.label}"
              style="background:${p.hex}; width:28px;height:28px;border-radius:6px;border:2px solid ${p.hex === ACCENT_HEX ? '#fff' : 'transparent'};cursor:pointer;flex-shrink:0;transition:border-color 0.15s,transform 0.15s;">
      </button>
    `).join('');

    panel.innerHTML = `
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">Accent color</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">${grid}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:6px;">Custom hex</div>
      <input id="cpHexInput" type="text" value="${ACCENT_HEX}"
        style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 8px;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;">
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.cp-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        applyAccent(btn.dataset.hex);
        panel.querySelectorAll('.cp-swatch').forEach(b => {
          b.style.borderColor = b === btn ? '#fff' : 'transparent';
          b.classList.toggle('cp-active', b === btn);
        });
        document.getElementById('cpHexInput').value = btn.dataset.hex;
      });
    });

    const hexInput = panel.querySelector('#cpHexInput');
    hexInput.addEventListener('input', () => {
      const v = hexInput.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) applyAccent(v);
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
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function applyAccent(hex) {
    ACCENT_HEX = hex;
    ACCENT_RGB = hexToRgb(hex);

    // Update CSS custom properties live
    document.documentElement.style.setProperty('--accent', hex);

    // Lightened soft version
    const [r, g, b] = ACCENT_RGB;
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.12)`);

    // Update swatch button fill color
    const sw = document.querySelector('#colorSwatchBtn .swatch-fill');
    if (sw) sw.style.background = hex;

    // Update bg-canvas.js accent via custom event
    window.dispatchEvent(new CustomEvent('accentChange', { detail: { hex, rgb: ACCENT_RGB } }));

    // Redraw tool canvas shapes in new color
    redraw();
  }

  // ── Boot ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
