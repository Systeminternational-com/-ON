export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px) scale(0.95)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openModal({ title, bodyHTML, footerHTML, onMount }) {
  const overlay = document.getElementById('global-modal');
  const sheet = document.getElementById('global-modal-sheet');
  if (!overlay || !sheet) return;

  sheet.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${escapeHTML(title)}</div>
      <button class="btn btn-icon btn-secondary" id="modal-close-x" style="width: 28px; height: 28px;">✕</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
    ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
  `;

  overlay.classList.add('active');

  const closeBtn = sheet.querySelector('#modal-close-x');
  if (closeBtn) closeBtn.onclick = closeModal;

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  if (typeof onMount === 'function') {
    onMount(sheet);
  }
}

export function closeModal() {
  const overlay = document.getElementById('global-modal');
  if (overlay) overlay.classList.remove('active');
}

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDate(dateString) {
  if (!dateString) return '--';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', options);
}

export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
