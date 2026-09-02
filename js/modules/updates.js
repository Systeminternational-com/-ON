import { collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, formatDate, openModal, closeModal, showToast } from "../ui-utils.js";
import { recordAudit } from "./audit.js";

export async function renderUpdates(container) {
  const isAdmin = state.isAdmin();
  const topbarActions = document.getElementById('topbar-actions-slot');

  if (isAdmin && topbarActions) {
    topbarActions.innerHTML = `<button class="btn btn-primary" id="btn-post-update">+ Post Update</button>`;
    document.getElementById('btn-post-update').onclick = openPostUpdateModal;
  }

  try {
    const snap = await getDocs(query(collection(db, 'updates'), orderBy('createdAt', 'desc')));

    if (snap.empty) {
      container.innerHTML = '<div class="state-box"><div class="state-icon">📢</div><div class="state-title">No Updates Posted</div></div>';
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 14px; max-width: 720px; margin: 0 auto;">';
    snap.forEach((d) => {
      const u = d.data();
      html += `
        <div class="card">
          <div class="card-header" style="margin-bottom: 8px;">
            <span class="badge badge-blue">${escapeHTML(u.type || 'General')}</span>
            <span style="font-size: 12px; color: var(--text-tertiary);">${u.createdAt ? formatDate(u.createdAt.toDate().toISOString()) : 'Recent'}</span>
          </div>
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">${escapeHTML(u.title)}</h3>
          <p style="font-size: 14px; color: var(--text-primary); line-height: 1.5;">${escapeHTML(u.content)}</p>
          <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
            Published by <strong>${escapeHTML(u.authorName || 'Administrator')}</strong>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load updates</div></div>';
  }
}

function openPostUpdateModal() {
  openModal({
    title: 'Publish Team Announcement',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" id="up-title" class="form-control" placeholder="Update headline" required>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select id="up-type" class="form-control">
          <option value="Announcement">Announcement</option>
          <option value="Meeting">Meeting</option>
          <option value="Prototype">Prototype</option>
          <option value="Important">Important</option>
          <option value="General">General</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Announcement Content *</label>
        <textarea id="up-content" class="form-control" rows="4" placeholder="Write message to the startup team" required></textarea>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="btn-cancel-up">Cancel</button>
      <button class="btn btn-primary" id="btn-save-up">Publish</button>
    `,
    onMount: (sheet) => {
      sheet.querySelector('#btn-cancel-up').onclick = closeModal;
      sheet.querySelector('#btn-save-up').onclick = async () => {
        const title = sheet.querySelector('#up-title').value.trim();
        const type = sheet.querySelector('#up-type').value;
        const content = sheet.querySelector('#up-content').value.trim();

        if (!title || !content) {
          showToast('Please fill all fields', 'error');
          return;
        }

        try {
          const updateId = `up_${Date.now()}`;
          await setDoc(doc(db, 'updates', updateId), {
            id: updateId,
            title,
            type,
            content,
            authorName: state.userProfile.name,
            createdBy: state.currentUser.uid,
            createdAt: serverTimestamp()
          });

          await recordAudit('POST_UPDATE', 'update', updateId, `Published update: ${title}`);
          showToast('Announcement posted', 'success');
          closeModal();
          renderUpdates(document.getElementById('view-container'));
        } catch (err) {
          showToast('Failed to post announcement', 'error');
        }
      };
    }
  });
}
