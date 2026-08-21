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

function getDeviceLabel() {
  const ua = navigator.userAgent || '';
  const w = window.innerWidth;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua) && 'ontouchend' in document)) {
    return 'iOS Device';
  } else if (/Android/.test(ua)) {
    return 'Android Device';
  } else if (w < 600) {
    return 'Mobile';
  } else if (w < 1024) {
    return 'Tablet';
  } else if (/Windows/.test(ua)) {
    return 'Windows PC';
  } else if (/Macintosh/.test(ua)) {
    return 'Mac Display';
  } else if (/Linux/.test(ua)) {
    return 'Linux Display';
  }
  return 'Desktop Display';
}

function getRgbToHex(col) {
  if (!col) return '#14131A';
  if (col.startsWith('#')) return col.toUpperCase();
  const m = col.match(/\d+/g);
  if (!m || m.length < 3) return '#14131A';
  const r = parseInt(m[0], 10).toString(16).padStart(2, '0');
  const g = parseInt(m[1], 10).toString(16).padStart(2, '0');
  const b = parseInt(m[2], 10).toString(16).padStart(2, '0');
  return ('#' + r + g + b).toUpperCase();
}

function initInspector() {
  const sections    = document.querySelectorAll('.section[data-frame]');
  const layerItems  = document.querySelectorAll('.layer-item');
  const inspName    = document.getElementById('inspName');
  const inspDevice  = document.getElementById('inspDevice');
  const inspScreen  = document.getElementById('inspScreen');
  const inspDpr     = document.getElementById('inspDpr');
  const inspSize    = document.getElementById('inspSize');
  const inspFill    = document.getElementById('inspFill');
  const inspSwatch  = document.getElementById('inspSwatch');
  const inspRadius  = document.getElementById('inspRadius');
  const inspLayout  = document.getElementById('inspLayout');
  const inspOpacity = document.getElementById('inspOpacity');
  const inspBlur    = document.getElementById('inspBlur');

  if (!sections.length || !inspName) return;

  let currentActiveEl = sections[0];

  const updateDeviceInfo = () => {
    if (inspDevice) inspDevice.textContent = getDeviceLabel();
    if (inspScreen) inspScreen.textContent = `${window.innerWidth} × ${window.innerHeight}`;
    if (inspDpr) inspDpr.textContent = `${(window.devicePixelRatio || 1).toFixed(1)}×`;
  };

  const updateSectionMetrics = (el) => {
    if (!el) return;
    currentActiveEl = el;

    const setVal = (node, value) => {
      if (!node) return;
      const prev = node.textContent;
      if (prev === value) return;
      node.textContent = value;
      flashVal(node);
    };

    // Live frame width and height measurement
    const measuredW = Math.round(el.offsetWidth || window.innerWidth);
    const measuredH = Math.round(el.offsetHeight || window.innerHeight);
    setVal(inspSize, `${measuredW} × ${measuredH}`);

    setVal(inspLayout, el.dataset.layout || 'Auto');
    
    // Live radius
    const compStyle = window.getComputedStyle(el);
    const rad = el.dataset.radius || parseInt(compStyle.borderRadius) || '0';
    setVal(inspRadius, rad !== '0' && rad !== 0 ? `${rad} px` : '0 px');

    setVal(inspOpacity, el.dataset.opacity || (compStyle.opacity ? `${Math.round(parseFloat(compStyle.opacity) * 100)}%` : '100%'));
    setVal(inspBlur, el.dataset.blur || '0 px');

    // Live Fill color + swatch
    let fill = el.dataset.fill;
    if (el.id === 'hero') {
      const liveAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      fill = liveAccent || '#0D0C13';
    }
    if (!fill) {
      fill = getRgbToHex(compStyle.backgroundColor);
    }
    fill = fill.toUpperCase();
    setVal(inspFill, fill);
    if (inspSwatch) inspSwatch.style.background = fill;

    // Active layer highlight
    layerItems.forEach(item => {
      item.classList.toggle('active', item.dataset.target === el.id);
    });
  };

  updateDeviceInfo();

  const heroEl = document.getElementById('hero') || sections[0];
  if (heroEl) {
    if (inspName && inspName.childNodes[0]) {
      inspName.childNodes[0].textContent = 'Frame · ' + (heroEl.dataset.frame || 'Cover');
    }
    updateSectionMetrics(heroEl);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      // Fade-swap the frame name
      inspName.style.opacity = '0';
      setTimeout(() => {
        inspName.childNodes[0].textContent = 'Frame · ' + (el.dataset.frame || 'Workspace');
        inspName.style.opacity = '1';
      }, 120);

      updateSectionMetrics(el);
    });
  }, { threshold: 0.25 });

  sections.forEach(s => observer.observe(s));

  // Live resize & orientation change listener
  window.addEventListener('resize', () => {
    updateDeviceInfo();
    if (currentActiveEl) {
      updateSectionMetrics(currentActiveEl);
    }
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateDeviceInfo();
      if (currentActiveEl) {
        updateSectionMetrics(currentActiveEl);
      }
    }, 150);
  });

  // Listen to live accentChange event to update fill
  window.addEventListener('accentChange', () => {
    if (currentActiveEl) {
      updateSectionMetrics(currentActiveEl);
    }
  });
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
  initHeroParallax();
  initEyeBlink();
  initMagneticElements();
  initAmbientMusic();
});

// ── Ambient Music Player (Desktop & Tablet) ────────────────
function initAmbientMusic() {
  const musicBtn = document.getElementById('musicBtn');
  if (!musicBtn) return;

  // Royalty-free calming instrumental background tracks (lofi / ambient acoustic tunes)
  const TRACKS = [
    'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Relaxing Lofi Study Tune
    'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3', // Chill Aesthetic Instrumental
    'https://cdn.pixabay.com/download/audio/2022/11/06/audio_98553ec592.mp3'  // Soft Ambient Guitar & Keys
  ];

  let audio = new Audio();
  audio.loop = true;
  audio.volume = 0;
  audio.crossOrigin = 'anonymous';
  let trackIdx = 0;
  audio.src = TRACKS[trackIdx];

  let isPlaying = false;
  let fadeInterval = null;
  let audioCtx = null;
  let synthInterval = null;

  // Fallback generative ambient synthesizer (Web Audio API) in case external MP3 is blocked by CORS/offline
  function startGenerativeAmbient() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 3);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, audioCtx.currentTime);

      masterGain.connect(filter);
      filter.connect(audioCtx.destination);

      // Warm soothing pentatonic chords (C major 7th / F maj 9th ambient arpeggios)
      const notes = [130.81, 164.81, 196.00, 246.94, 261.63, 329.63, 392.00, 493.88, 523.25];
      let step = 0;

      function playChime() {
        if (!isPlaying || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();

        const freq = notes[step % notes.length];
        step = (step + Math.floor(Math.random() * 3) + 1) % notes.length;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        noteGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 4.5);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start();
        osc.stop(audioCtx.currentTime + 4.6);
      }

      playChime();
      synthInterval = setInterval(playChime, 1800);
    } catch (e) {
      console.warn('Web Audio Ambient fallback unavailable:', e);
    }
  }

  function stopGenerativeAmbient() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    if (audioCtx) {
      try {
        audioCtx.close();
      } catch (e) {}
      audioCtx = null;
    }
  }

  function fadeInAudio() {
    clearInterval(fadeInterval);
    const targetVol = 0.35;
    fadeInterval = setInterval(() => {
      if (audio.volume < targetVol) {
        audio.volume = Math.min(targetVol, audio.volume + 0.04);
      } else {
        clearInterval(fadeInterval);
      }
    }, 100);
  }

  function fadeOutAudio(callback) {
    clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      if (audio.volume > 0.04) {
        audio.volume = Math.max(0, audio.volume - 0.05);
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(fadeInterval);
        if (callback) callback();
      }
    }, 80);
  }

  function toggleMusic() {
    if (isPlaying) {
      isPlaying = false;
      musicBtn.classList.remove('playing');
      musicBtn.dataset.shortcut = 'M — Ambient Tune';
      musicBtn.title = 'Play ambient tune (M)';
      fadeOutAudio();
      stopGenerativeAmbient();
    } else {
      isPlaying = true;
      musicBtn.classList.add('playing');
      musicBtn.dataset.shortcut = 'M — Playing (Click to Pause)';
      musicBtn.title = 'Pause ambient tune (M)';

      audio.play().then(() => {
        fadeInAudio();
      }).catch(err => {
        console.info('Audio streaming fallback to generative ambient synthesis:', err);
        startGenerativeAmbient();
      });
    }
  }

  musicBtn.addEventListener('click', toggleMusic);

  // Shortcut: Press 'M' to toggle ambient music
  window.addEventListener('keydown', e => {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    const editing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    if (editing) return;
    if (e.key === 'm' || e.key === 'M') {
      toggleMusic();
    }
  });

  // Handle audio loading errors with seamless fallback to next track or generative synth
  audio.addEventListener('error', () => {
    trackIdx = (trackIdx + 1) % TRACKS.length;
    if (trackIdx !== 0) {
      audio.src = TRACKS[trackIdx];
      if (isPlaying) audio.play().catch(startGenerativeAmbient);
    } else {
      startGenerativeAmbient();
    }
  });
}

// ── Character Eye Blink Cycle ──────────────────────────────
// Intervals: 1.8s, 2.6s, 1.4s, 3.1s loop
// Transition: Open (overlay transparent) -> Half closed -> Closed -> Half open -> Open
function initEyeBlink() {
  const overlay = document.getElementById('heroCharacterOverlay');
  if (!overlay) return;

  const frames = {
    half: 'assets/aditya-character-half.png',
    closed: 'assets/aditya-character-closed.png'
  };

  // Pre-instantiate Image objects in memory for instant synchronous overlay frame swap
  Object.values(frames).forEach(src => {
    const img = new Image();
    img.src = src;
  });

  const intervals = [1800, 2600, 1400, 3100];
  let intervalIdx = 0;
  let blinkTimeout = null;

  function performBlink() {
    // Stage 1: Half closed (40ms)
    overlay.src = frames.half;
    overlay.style.opacity = '1';

    setTimeout(() => {
      // Stage 2: Fully closed (70ms)
      overlay.src = frames.closed;

      setTimeout(() => {
        // Stage 3: Half open (40ms)
        overlay.src = frames.half;

        setTimeout(() => {
          // Stage 4: Fully open (hide overlay to expose base open eyes seamlessly)
          overlay.style.opacity = '0';

          // Schedule next blink from the interval pattern
          const nextDelay = intervals[intervalIdx % intervals.length];
          intervalIdx++;
          blinkTimeout = setTimeout(performBlink, nextDelay);
        }, 40);
      }, 70);
    }, 40);
  }

  // Initial blink trigger after first interval (1.8s)
  blinkTimeout = setTimeout(performBlink, intervals[0]);
  intervalIdx = 1;
}

// ── Magnetic Button & Icon Micro-interactions ─────────────
function initMagneticElements() {
  if (matchMedia("(max-width: 860px)").matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const magnets = document.querySelectorAll('.hero-btn-primary, .hero-btn-ghost, .social-circle, .tool-btn');
  
  magnets.forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.10}px, ${y * 0.10}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

// ── Hero Subtle Interactive Parallax ────────────────────────
function initHeroParallax() {
  const hero = document.getElementById('hero');
  const charWrapper = document.getElementById('heroCharacterWrapper') || document.querySelector('.hero-character-layer');
  const wordmark = document.getElementById('heroWordmark') || document.querySelector('.hero-frame-15');
  const scriptName = document.querySelector('.hero-script-name');
  if (!hero || !charWrapper || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  window.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    if (e.clientY >= rect.top - 50 && e.clientY <= rect.bottom + 50) {
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to +1
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to +1
    } else {
      targetX = 0;
      targetY = 0;
    }
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
  });

  function update() {
    currentX += (targetX - currentX) * 0.075;
    currentY += (targetY - currentY) * 0.075;

    // Character movement & subtle 3D tilt
    if (charWrapper && !window.isDraggingHeroLayer) {
      const posX = (currentX * 18).toFixed(2);
      const posY = (currentY * 10).toFixed(2);
      const rotY = (currentX * 6).toFixed(2);
      const rotX = (-currentY * 4).toFixed(2);
      charWrapper.style.transform = `perspective(800px) translate3d(${posX}px, ${posY}px, 0) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    }

    // Opposite subtle depth parallax on "PORTFOLIO" wordmark
    if (wordmark && !window.isDraggingHeroLayer) {
      const wmX = (-currentX * 12).toFixed(2);
      const wmY = (-currentY * 6).toFixed(2);
      wordmark.style.transform = `translate(calc(-50% + ${wmX}px), calc(-50% + ${wmY}px))`;
    }

    // Floating micro-shift on script name
    if (scriptName && !window.isDraggingHeroLayer) {
      const snX = (currentX * 6).toFixed(2);
      const snY = (currentY * 3).toFixed(2);
      scriptName.style.transform = `rotate(-6deg) translate3d(${snX}px, ${snY}px, 0)`;
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ── iOS Multilingual Splash Screen ─────────────────────────
function initSplashScreen() {
  const splash = document.getElementById('splashScreen');
  const textEl = document.getElementById('splashText');
  if (!splash || !textEl) return;

  // ══════════════════════════════════════════════════════════════
  //  SPLASH SCREEN TIMING (4.0s Total Runtime):
  //  • WORD_SPEED_MS : Duration for international greetings (290ms each)
  //  • FINAL_HOLD_MS : Extra hold time on "स्वागत है आपका!" (1100ms)
  //  • FADE_SPEED_MS : Smooth crossfade duration (80ms)
  // ══════════════════════════════════════════════════════════════
  const WORD_SPEED_MS = 280;
  const FINAL_HOLD_MS = 1200;
  const FADE_SPEED_MS = 80;

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
    "Guten Tag",
    "स्वागत है आपका!"
  ];

  let currentIndex = 0;
  let isExiting = false;
  let timerId = null;

  function dismissSplash() {
    if (isExiting) return;
    isExiting = true;
    if (timerId) clearTimeout(timerId);
    splash.classList.add('splash-hidden');
    setTimeout(() => {
      try { splash.remove(); } catch(e) {}
    }, 900);
  }

  // Click / tap to skip immediately
  splash.addEventListener('click', dismissSplash);
  splash.addEventListener('touchstart', dismissSplash, { passive: true });

  function showNextGreeting() {
    if (isExiting) return;
    currentIndex++;

    if (currentIndex >= greetings.length) {
      dismissSplash();
      return;
    }

    // Smooth opacity crossfade
    textEl.classList.add('splash-text-fade');

    setTimeout(() => {
      if (isExiting) return;
      const isLast = (currentIndex === greetings.length - 1);
      if (isLast) {
        textEl.classList.add('splash-text-accent');
      } else {
        textEl.classList.remove('splash-text-accent');
      }
      textEl.textContent = greetings[currentIndex];
      textEl.classList.remove('splash-text-fade');

      const delay = isLast ? FINAL_HOLD_MS : WORD_SPEED_MS;
      timerId = setTimeout(showNextGreeting, delay);
    }, FADE_SPEED_MS);
  }

  timerId = setTimeout(showNextGreeting, WORD_SPEED_MS);
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
