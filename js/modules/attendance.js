import { collection, getDocs, doc, setDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, formatDate, openModal, closeModal, showToast } from "../ui-utils.js";
import { recordAudit } from "./audit.js";

export async function renderAttendance(container) {
  const isAdmin = state.isAdmin();
  const topbarActions = document.getElementById('topbar-actions-slot');

  if (isAdmin && topbarActions) {
    topbarActions.innerHTML = `<button class="btn btn-primary" id="btn-create-session">+ Take Attendance</button>`;
    document.getElementById('btn-create-session').onclick = () => openCreateSessionModal();
  }

  try {
    const sessionsSnap = await getDocs(query(collection(db, 'attendanceSessions'), orderBy('date', 'desc')));

    if (sessionsSnap.empty) {
      container.innerHTML = '<div class="state-box"><div class="state-icon">📅</div><div class="state-title">No Attendance Sessions</div><div class="state-desc">Sessions conducted will appear here.</div></div>';
      return;
    }

    let html = `
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header"><span class="card-title">Development Sessions History</span></div>
        <div class="table-responsive">
          <table class="ios-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
    `;

    sessionsSnap.forEach((d) => {
      const s = d.data();
      html += `
        <tr>
          <td><strong>${formatDate(s.date)}</strong></td>
          <td>${escapeHTML(s.title)}</td>
          <td style="color: var(--text-secondary);">${escapeHTML(s.description || '--')}</td>
          <td>
            <button class="btn btn-secondary btn-view-session" data-id="${d.id}" data-title="${escapeHTML(s.title)}" style="padding: 4px 10px; font-size: 12px;">View Records</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;

    container.querySelectorAll('.btn-view-session').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        openSessionRecordsModal(id, title);
      };
    });

  } catch (err) {
    console.error('Attendance render error:', err);
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load attendance records</div></div>';
  }
}

async function openCreateSessionModal() {
  const membersSnap = await getDocs(collection(db, 'users'));
  const activeMembers = membersSnap.docs.filter(d => d.data().status === 'active').map(d => d.data());

  if (activeMembers.length === 0) {
    showToast('No active members to mark attendance for', 'error');
    return;
  }

  let listHTML = '';
  activeMembers.forEach((m) => {
    listHTML += `
      <div class="attendance-row" data-uid="${m.uid}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <div>
          <strong>${escapeHTML(m.name)}</strong>
          <div style="font-size: 12px; color: var(--text-secondary);">${escapeHTML(m.startupRole || 'Member')}</div>
        </div>
        <div class="attendance-picker">
          <button type="button" class="attendance-opt selected-present" data-val="present">Present</button>
          <button type="button" class="attendance-opt" data-val="absent">Absent</button>
          <button type="button" class="attendance-opt" data-val="late">Late</button>
          <button type="button" class="attendance-opt" data-val="excused">Excused</button>
        </div>
      </div>
    `;
  });

  openModal({
    title: 'New Attendance Session',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Session Title *</label>
        <input type="text" id="sess-title" class="form-control" placeholder="e.g. Sprint #18 - Backend Integration" required>
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" id="sess-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Description / Objectives</label>
        <input type="text" id="sess-desc" class="form-control" placeholder="Summary of agenda">
      </div>
      <div style="margin-top: 16px;">
        <label class="form-label">Mark Team Attendance</label>
        <div style="max-height: 260px; overflow-y: auto;">${listHTML}</div>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="btn-cancel-sess">Cancel</button>
      <button class="btn btn-primary" id="btn-save-sess">Save Session</button>
    `,
    onMount: (sheet) => {
      sheet.querySelector('#btn-cancel-sess').onclick = closeModal;

      sheet.querySelectorAll('.attendance-row').forEach((row) => {
        const btns = row.querySelectorAll('.attendance-opt');
        btns.forEach((b) => {
          b.onclick = () => {
            btns.forEach(btn => btn.className = 'attendance-opt');
            b.className = `attendance-opt selected-${b.getAttribute('data-val')}`;
          };
        });
      });

      sheet.querySelector('#btn-save-sess').onclick = async () => {
        const title = sheet.querySelector('#sess-title').value.trim();
        const date = sheet.querySelector('#sess-date').value;
        const description = sheet.querySelector('#sess-desc').value.trim();

        if (!title || !date) {
          showToast('Please enter title and date', 'error');
          return;
        }

        try {
          const sessionId = `sess_${Date.now()}`;
          await setDoc(doc(db, 'attendanceSessions', sessionId), {
            id: sessionId,
            title,
            date,
            description,
            createdAt: serverTimestamp(),
            createdBy: state.currentUser.uid
          });

          const rows = sheet.querySelectorAll('.attendance-row');
          for (const row of rows) {
            const uid = row.getAttribute('data-uid');
            const member = activeMembers.find(m => m.uid === uid);
            const selectedOpt = row.querySelector('.attendance-opt[class*="selected-"]');
            const status = selectedOpt ? selectedOpt.getAttribute('data-val') : 'present';

            await setDoc(doc(db, 'attendanceSessions', sessionId, 'records', uid), {
              memberUid: uid,
              memberName: member.name,
              startupRole: member.startupRole || 'Member',
              status,
              markedAt: serverTimestamp(),
              markedBy: state.currentUser.uid
            });
          }

          await recordAudit('CREATE_ATTENDANCE', 'attendance', sessionId, `Marked attendance for: ${title}`);
          showToast('Attendance recorded successfully', 'success');
          closeModal();
          renderAttendance(document.getElementById('view-container'));
        } catch (err) {
          console.error(err);
          showToast('Failed to save attendance', 'error');
        }
      };
    }
  });
}

async function openSessionRecordsModal(sessionId, sessionTitle) {
  try {
    const recordsSnap = await getDocs(collection(db, 'attendanceSessions', sessionId, 'records'));
    let rowsHTML = '';
    recordsSnap.forEach(d => {
      const r = d.data();
      let badgeClass = 'badge-green';
      if (r.status === 'absent') badgeClass = 'badge-red';
      if (r.status === 'late') badgeClass = 'badge-orange';
      if (r.status === 'excused') badgeClass = 'badge-purple';

      rowsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <strong>${escapeHTML(r.memberName)}</strong>
            <div style="font-size: 12px; color: var(--text-secondary);">${escapeHTML(r.startupRole)}</div>
          </div>
          <span class="badge ${badgeClass}">${escapeHTML(r.status.toUpperCase())}</span>
        </div>
      `;
    });

    openModal({
      title: sessionTitle,
      bodyHTML: `<div style="max-height: 360px; overflow-y: auto;">${rowsHTML || 'No records found'}</div>`,
      footerHTML: '<button class="btn btn-primary" id="btn-close-records">Close</button>',
      onMount: (sheet) => {
        sheet.querySelector('#btn-close-records').onclick = closeModal;
      }
    });
  } catch (err) {
    showToast('Failed to load session details', 'error');
  }
                                         }
