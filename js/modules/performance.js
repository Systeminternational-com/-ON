import { collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, openModal, closeModal, showToast } from "../ui-utils.js";
import { recordAudit } from "./audit.js";

export async function renderPerformance(container) {
  const isAdmin = state.isAdmin();
  const topbarActions = document.getElementById('topbar-actions-slot');

  if (isAdmin && topbarActions) {
    topbarActions.innerHTML = `<button class="btn btn-primary" id="btn-add-perf">+ Add Evaluation</button>`;
    document.getElementById('btn-add-perf').onclick = openAddPerformanceModal;
  }

  try {
    const snap = await getDocs(query(collection(db, 'performance'), orderBy('createdAt', 'desc')));

    if (snap.empty) {
      container.innerHTML = '<div class="state-box"><div class="state-icon">📊</div><div class="state-title">No Performance Records</div></div>';
      return;
    }

    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">';
    snap.forEach((d) => {
      const p = d.data();
      html += `
        <div class="card">
          <div class="card-header">
            <div>
              <strong style="font-size: 16px;">${escapeHTML(p.memberName)}</strong>
              <div style="font-size: 12px; color: var(--text-secondary);">Week ${p.weekNumber} (${p.weekStart} to ${p.weekEnd})</div>
            </div>
            <span class="badge ${p.score >= 8 ? 'badge-green' : p.score >= 5 ? 'badge-orange' : 'badge-red'}" style="font-size: 14px; font-weight: 700;">
              ${p.score} / 10
            </span>
          </div>
          <div style="font-size: 13px; margin-top: 8px;">
            <p><strong>Completed:</strong> ${escapeHTML(p.completedWork || '--')}</p>
            <p style="margin-top: 4px;"><strong>Strengths:</strong> ${escapeHTML(p.strengths || '--')}</p>
            <p style="margin-top: 4px;"><strong>Improvement:</strong> ${escapeHTML(p.improvements || '--')}</p>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); font-style: italic; color: var(--text-secondary);">
              "${escapeHTML(p.remark || 'No remark added.')}"
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load performance evaluations</div></div>';
  }
}

async function openAddPerformanceModal() {
  const membersSnap = await getDocs(collection(db, 'users'));
  const members = membersSnap.docs.map(d => d.data());

  let memberOpts = '';
  members.forEach(m => {
    memberOpts += `<option value="${m.uid}" data-name="${escapeHTML(m.name)}">${escapeHTML(m.name)}</option>`;
  });

  openModal({
    title: 'Weekly Performance & Remark',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Member *</label>
        <select id="perf-member" class="form-control">${memberOpts}</select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="form-group">
          <label class="form-label">Week Start *</label>
          <input type="date" id="perf-start" class="form-control" required>
        </div>
        <div class="form-group">
          <label class="form-label">Week End *</label>
          <input type="date" id="perf-end" class="form-control" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Performance Score (0.0 to 10.0) *</label>
        <input type="number" id="perf-score" class="form-control" min="0" max="10" step="0.5" value="8.5" required>
      </div>
      <div class="form-group">
        <label class="form-label">Completed Work Summary</label>
        <input type="text" id="perf-work" class="form-control" placeholder="Milestones finished">
      </div>
      <div class="form-group">
        <label class="form-label">Strengths</label>
        <input type="text" id="perf-strengths" class="form-control" placeholder="Technical/team strengths">
      </div>
      <div class="form-group">
        <label class="form-label">Areas for Improvement</label>
        <input type="text" id="perf-improvements" class="form-control" placeholder="Focus areas">
      </div>
      <div class="form-group">
        <label class="form-label">Official Remark *</label>
        <textarea id="perf-remark" class="form-control" rows="2" placeholder="Administrator evaluation remark" required></textarea>
      </div>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="btn-cancel-perf">Cancel</button>
      <button class="btn btn-primary" id="btn-save-perf">Save Evaluation</button>
    `,
    onMount: (sheet) => {
      sheet.querySelector('#btn-cancel-perf').onclick = closeModal;
      sheet.querySelector('#btn-save-perf').onclick = async () => {
        const select = sheet.querySelector('#perf-member');
        const memberUid = select.value;
        const memberName = select.options[select.selectedIndex].getAttribute('data-name');
        const weekStart = sheet.querySelector('#perf-start').value;
        const weekEnd = sheet.querySelector('#perf-end').value;
        const score = parseFloat(sheet.querySelector('#perf-score').value) || 0;
        const completedWork = sheet.querySelector('#perf-work').value.trim();
        const strengths = sheet.querySelector('#perf-strengths').value.trim();
        const improvements = sheet.querySelector('#perf-improvements').value.trim();
        const remark = sheet.querySelector('#perf-remark').value.trim();

        if (!weekStart || !weekEnd || !remark) {
          showToast('Please complete all required fields', 'error');
          return;
        }

        try {
          const perfId = `perf_${Date.now()}`;
          await setDoc(doc(db, 'performance', perfId), {
            id: perfId,
            memberUid,
            memberName,
            weekNumber: 1,
            weekStart,
            weekEnd,
            score,
            completedWork,
            strengths,
            improvements,
            remark,
            createdAt: serverTimestamp(),
            updatedBy: state.currentUser.uid
          });

          await recordAudit('EVALUATE_PERFORMANCE', 'performance', perfId, `Evaluated ${memberName}: ${score}/10`);
          showToast('Performance evaluation saved', 'success');
          closeModal();
          renderPerformance(document.getElementById('view-container'));
        } catch (err) {
          showToast('Failed to save evaluation', 'error');
        }
      };
    }
  });
}
