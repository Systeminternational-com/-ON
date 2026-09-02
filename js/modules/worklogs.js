import { collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, formatDate, openModal, closeModal, showToast } from "../ui-utils.js";
import { recordAudit } from "./audit.js";

export async function renderWorkLogs(container) {
  const isAdmin = state.isAdmin();
  const topbarActions = document.getElementById('topbar-actions-slot');

  if (isAdmin && topbarActions) {
    topbarActions.innerHTML = `<button class="btn btn-primary" id="btn-add-log">+ Add Work Log</button>`;
    document.getElementById('btn-add-log').onclick = openAddWorkLogModal;
  }

  try {
    const snap = await getDocs(query(collection(db, 'workLogs'), orderBy('date', 'desc')));

    if (snap.empty) {
      container.innerHTML = '<div class="state-box"><div class="state-icon">📝</div><div class="state-title">No Work Logs Recorded</div></div>';
      return;
    }

    let html = `
      <div class="card">
        <div class="card-header"><span class="card-title">Development Activity & Work Logs</span></div>
        <div class="table-responsive">
          <table class="ios-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Title</th>
                <th>Duration</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
    `;

    snap.forEach((d) => {
      const l = d.data();
      html += `
        <tr>
          <td><strong>${formatDate(l.date)}</strong></td>
          <td>${escapeHTML(l.memberName)}</td>
          <td><strong>${escapeHTML(l.title)}</strong></td>
          <td><span class="badge badge-blue">${escapeHTML(String(l.durationHours))} hrs</span></td>
          <td style="color: var(--text-secondary);">${escapeHTML(l.description)}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error('Work log error:', err);
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load work logs</div></div>';
  }
}

async function openAddWorkLogModal() {
  const membersSnap = await getDocs(collection(db, 'users'));
  const members = membersSnap.docs.map(d => d.data());

  let memberOpts = '';
  members.forEach(m => {
    memberOpts += `<option value="${m.uid}" data-name="${escapeHTML(m.name)}">${escapeHTML(m.name)} (${escapeHTML(m.startupRole || 'Member')})</option>`;
  });

  openModal({
    title: 'Add Work Log',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Team Member *</label>
        <select id="log-member" class="form-control">${memberOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" id="log-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Work Title *</label>
        <input type="text" id="log-title" class="form-control" placeholder="e.g. Implemented Firebase Auth & Security" required>
      </div>
      <div class="form-group">
        <label class="form-label">Duration (Hours) *</label>
        <input type="number" id="log-duration" class="form-control" step="0.5" min="0.5" max="24" value="3" required>
      </div>
      <div class="form-group">
        <label class="form-label">Description of Completed Work *</label>
        <textarea id="log-desc" class="form-control" rows="3" placeholder="Provide details of modules created or bugs fixed" required></textarea>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="btn-cancel-log">Cancel</button>
      <button class="btn btn-primary" id="btn-save-log">Save Log</button>
    `,
    onMount: (sheet) => {
      sheet.querySelector('#btn-cancel-log').onclick = closeModal;
      sheet.querySelector('#btn-save-log').onclick = async () => {
        const select = sheet.querySelector('#log-member');
        const memberUid = select.value;
        const memberName = select.options[select.selectedIndex].getAttribute('data-name');
        const date = sheet.querySelector('#log-date').value;
        const title = sheet.querySelector('#log-title').value.trim();
        const durationHours = parseFloat(sheet.querySelector('#log-duration').value) || 0;
        const description = sheet.querySelector('#log-desc').value.trim();

        if (!title || !description || durationHours <= 0) {
          showToast('Please fill all required log fields', 'error');
          return;
        }

        try {
          const logId = `log_${Date.now()}`;
          await setDoc(doc(db, 'workLogs', logId), {
            id: logId,
            memberUid,
            memberName,
            date,
            title,
            durationHours,
            description,
            createdAt: serverTimestamp(),
            createdBy: state.currentUser.uid
          });

          await recordAudit('CREATE_WORKLOG', 'worklog', logId, `Added ${durationHours}h log for ${memberName}: ${title}`);
          showToast('Work log recorded', 'success');
          closeModal();
          renderWorkLogs(document.getElementById('view-container'));
        } catch (err) {
          showToast('Failed to add work log', 'error');
        }
      };
    }
  });
            }
