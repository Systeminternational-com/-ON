import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML } from "../ui-utils.js";

export async function recordAudit(action, targetType, targetId, description) {
  try {
    if (!state.currentUser || !state.isAdmin()) return;

    await addDoc(collection(db, 'adminActivity'), {
      adminId: state.currentUser.uid,
      adminName: state.userProfile.name || 'Admin',
      action,
      targetType,
      targetId,
      description,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export async function renderAudit(container) {
  try {
    const q = query(collection(db, 'adminActivity'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = '<div class="state-box"><div class="state-icon">📋</div><div class="state-title">No Audit Events Logged</div></div>';
      return;
    }

    let html = `
      <div class="card">
        <div class="card-header"><span class="card-title">Immutable Administrative Audit Log</span></div>
        <div class="table-responsive">
          <table class="ios-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Admin</th>
                <th>Target</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
    `;

    snap.forEach(d => {
      const a = d.data();
      html += `
        <tr>
          <td><span class="badge badge-purple">${escapeHTML(a.action)}</span></td>
          <td><strong>${escapeHTML(a.adminName)}</strong></td>
          <td>${escapeHTML(a.targetType)} (${escapeHTML(a.targetId)})</td>
          <td>${escapeHTML(a.description)}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error('Audit fetch failed:', err);
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load audit records</div></div>';
  }
}
