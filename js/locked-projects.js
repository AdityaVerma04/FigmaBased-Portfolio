// ============================================================
//  Aditya Verma Portfolio — locked-projects.js (ISOLATED MODULE)
//  Handles interaction, hover cues, and notification alerts
//  for locked project items on the live portfolio screen.
// ============================================================

(function () {
  'use strict';

  let toastTimeout = null;

  function showLockedToast(message) {
    let toast = document.getElementById('lockedToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lockedToast';
      toast.className = 'locked-toast';
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="locked-toast-content">
        <span class="locked-toast-icon">🔒</span>
        <div class="locked-toast-text">
          <strong>Project Locked</strong>
          <span>${escapeHtml(message || 'Soon to be uploaded! Check back shortly.')}</span>
        </div>
      </div>
      <button type="button" class="locked-toast-close" aria-label="Close message">&times;</button>
    `;

    // Show toast
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Close button
    const closeBtn = toast.querySelector('.locked-toast-close');
    if (closeBtn) {
      closeBtn.onclick = () => hideToast(toast);
    }

    // Auto hide
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => hideToast(toast), 3500);
  }

  function hideToast(toast) {
    if (!toast) return;
    toast.classList.remove('visible');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function handleLockedClick(e) {
    const card = e.target.closest('.case-card[data-locked="true"]');
    if (!card) return;

    e.preventDefault();
    e.stopPropagation();

    const title = card.getAttribute('aria-label') || 'This project';
    showLockedToast(`"${title}" is locked. Soon to be uploaded!`);
  }

  function initLockedProjects() {
    const workGrid = document.getElementById('workGrid');
    if (!workGrid) return;

    // Use event delegation for clicks on locked cards
    workGrid.removeEventListener('click', handleLockedClick, true);
    workGrid.addEventListener('click', handleLockedClick, true);
  }

  // Export for main.js initialization
  window.initLockedProjects = initLockedProjects;
  window.showLockedToast = showLockedToast;
})();
