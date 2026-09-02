import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, getInitials, openModal, closeModal, showToast } from "../ui-utils.js";
import { recordAudit } from "./audit.js";

export async function renderMembers(container) {
  const isAdmin = state.isAdmin();
  const topbarActions = document.getElementById('topbar-actions-slot');

  if (isAdmin && topbarActions) {
    topbarActions.innerHTML = `<button class="btn btn-primary" id="btn-add-member">+ Add Member</button>`;
    document.getElementById('btn-add-member').onclick = openAddMemberModal;
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) {
      container.innerHTML = '<div class="state-box"><div class="state-icon">👥</div><div class="state-title">No Members Found</div></div>';
      return;
    }

    let gridHTML = '<div class="members-grid">';
    snap.forEach((d) => {
      const u = d.data();
      gridHTML += `
        <div class="member-card" data-uid="${u.uid}">
          <div class="member-card-avatar">${getInitials(u.name)}</div>
          <strong style="font-size: 16px; font-weight: 700;">${escapeHTML(u.name)}</strong>
          <span style="font-size: 13px; color: var(--ios-blue); font-weight: 600; margin-top: 2px;">${escapeHTML(u.startupRole || 'Member')}</span>
          <span style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${escapeHTML(u.department || '--')} • ${escapeHTML(u.year || '')}</span>
          <div style="margin-top: 14px; display: flex; gap: 8px;">
            <span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}">${u.status === 'active' ? 'Active' : 'Inactive'}</span>
            <span class="badge badge-purple">${escapeHTML(u.accountType)}</span>
          </div>
        </div>
      `;
    });
    gridHTML += '</div>';
    container.innerHTML = gridHTML;

    container.querySelectorAll('.member-card').forEach((card) => {
      card.onclick = () => {
        const uid = card.getAttribute('data-uid');
        const userDoc = snap.docs.find(d => d.data().uid === uid);
        if (userDoc) openMemberDetailModal(userDoc.data());
      };
    });

  } catch (err) {
    console.error('Error rendering members:', err);
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load team directory</div></div>';
  }
}

function openMemberDetailModal(m) {
  const isAdmin = state.isAdmin();
  openModal({
    title: `${m.name}'s Profile`,
    bodyHTML: `
      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between;"><strong>Member ID:</strong> <span>${escapeHTML(m.memberId || '--')}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>Email:</strong> <span>${escapeHTML(m.email)}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>College ID:</strong> <span>${escapeHTML(m.collegeId || '--')}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>Department:</strong> <span>${escapeHTML(m.department || '--')}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>Year:</strong> <span>${escapeHTML(m.year || '--')}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>Startup Role:</strong> <span>${escapeHTML(m.startupRole || '--')}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>Joined Date:</strong> <span>${escapeHTML(m.joinedDate || '--')}</span></div>
        <div style="display: flex; justify-content: space-between;"><strong>Status:</strong> <span class="badge ${m.status === 'active' ? 'badge-green' : 'badge-red'}">${m.status}</span></div>
      </div>
    `,
    footerHTML: isAdmin ? `
      <button class="btn btn-secondary" id="btn-toggle-status">${m.status === 'active' ? 'Deactivate Member' : 'Activate Member'}</button>
      <button class="btn btn-primary" id="btn-close-detail">Done</button>
    ` : '<button class="btn btn-primary" id="btn-close-detail">Close</button>',
    onMount: (sheet) => {
      sheet.querySelector('#btn-close-detail').onclick = closeModal;
      const toggleBtn = sheet.querySelector('#btn-toggle-status');
      if (toggleBtn) {
        toggleBtn.onclick = async () => {
          const newStatus = m.status === 'active' ? 'inactive' : 'active';
          try {
            await updateDoc(doc(db, 'users', m.uid), { status: newStatus, updatedAt: serverTimestamp() });
            await recordAudit('UPDATE_MEMBER_STATUS', 'member', m.uid, `Changed status of ${m.name} to ${newStatus}`);
            showToast(`Member marked as ${newStatus}`, 'success');
            closeModal();
            renderMembers(document.getElementById('view-container'));
          } catch (err) {
            showToast('Failed to update status', 'error');
          }
        };
      }
    }
  });
}

function openAddMemberModal() {
  openModal({
    title: 'Add New Team Member',
    bodyHTML: `
      <form id="form-add-member">
        <div class="form-group">
          <label class="form-label">Firebase Auth UID *</label>
          <input type="text" id="add-uid" class="form-control" placeholder="Paste user UID created in Auth" required>
        </div>
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" id="add-name" class="form-control" placeholder="e.g. Rahul Sharma" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email *</label>
          <input type="email" id="add-email" class="form-control" placeholder="rahul@startup.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Startup Role *</label>
          <input type="text" id="add-role" class="form-control" placeholder="e.g. AI Developer" required>
        </div>
        <div class="form-group">
          <label class="form-label">Department & Year</label>
          <input type="text" id="add-dept" class="form-control" placeholder="CSE - 3rd Year">
        </div>
        <div class="form-group">
          <label class="form-label">Account Role</label>
          <select id="add-account-type" class="form-control">
            <option value="member">Team Member</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </form>
    `,
    footerHTML: `
      <button class="btn btn-secondary" id="btn-cancel-add">Cancel</button>
      <button class="btn btn-primary" id="btn-submit-add">Save Member</button>
    `,
    onMount: (sheet) => {
      sheet.querySelector('#btn-cancel-add').onclick = closeModal;
      sheet.querySelector('#btn-submit-add').onclick = async () => {
        const uid = sheet.querySelector('#add-uid').value.trim();
        const name = sheet.querySelector('#add-name').value.trim();
        const email = sheet.querySelector('#add-email').value.trim();
        const startupRole = sheet.querySelector('#add-role').value.trim();
        const department = sheet.querySelector('#add-dept').value.trim();
        const accountType = sheet.querySelector('#add-account-type').value;

        if (!uid || !name || !email || !startupRole) {
          showToast('Please fill all required fields', 'error');
          return;
        }

        try {
          await setDoc(doc(db, 'users', uid), {
            uid,
            name,
            email,
            startupRole,
            department,
            accountType,
            status: 'active',
            memberId: `STU-${Date.now().toString().slice(-4)}`,
            joinedDate: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          await recordAudit('ADD_MEMBER', 'member', uid, `Added new member: ${name} (${startupRole})`);
          showToast('Member successfully registered', 'success');
          closeModal();
          renderMembers(document.getElementById('view-container'));
        } catch (err) {
          console.error(err);
          showToast('Failed to add member', 'error');
        }
      };
    }
  });
}
