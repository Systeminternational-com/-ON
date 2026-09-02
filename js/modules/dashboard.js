import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML } from "../ui-utils.js";
import { navigateTo } from "../router.js";

export async function renderDashboard(container) {
  const isAdmin = state.isAdmin();
  const profile = state.userProfile;

  try {
    const [membersSnap, sessionsSnap, updatesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'attendanceSessions')),
      getDocs(query(collection(db, 'updates'), orderBy('createdAt', 'desc'), limit(3)))
    ]);

    const totalMembers = membersSnap.size;
    const activeMembers = membersSnap.docs.filter(d => d.data().status === 'active').length;
    const totalSessions = sessionsSnap.size;

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Good day, ${escapeHTML(profile.name)} 👋</h2>
        <p style="font-size: 14px; color: var(--text-secondary); margin-top: 2px;">
          ${isAdmin ? 'Administrator Console • Startup Operations Workspace' : `${escapeHTML(profile.startupRole || 'Team Member')} • ${escapeHTML(profile.department || 'Engineering')}`}
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Team Members</span>
          <span class="stat-value">${totalMembers}</span>
          <span class="stat-subtext">${activeMembers} Active Members</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Development Sessions</span>
          <span class="stat-value">${totalSessions}</span>
          <span class="stat-subtext">Conducted to date</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">My Status</span>
          <span class="stat-value" style="font-size: 20px; color: var(--ios-green); margin-top: 6px;">● Active</span>
          <span class="stat-subtext">${escapeHTML(profile.accountType.toUpperCase())}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Quick Actions</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button class="btn btn-secondary" id="dash-act-attendance">📅 Take Attendance</button>
            <button class="btn btn-secondary" id="dash-act-chat">💬 Open Chat</button>
            <button class="btn btn-secondary" id="dash-act-updates">📢 Team Updates</button>
            <button class="btn btn-secondary" id="dash-act-members">👥 View Directory</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Updates</span>
          </div>
          <div id="dash-updates-list">
            ${updatesSnap.empty ? '<p style="font-size: 13px; color: var(--text-tertiary);">No announcements posted yet.</p>' : ''}
            ${updatesSnap.docs.map(doc => {
              const u = doc.data();
              return `
                <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 14px;">${escapeHTML(u.title)}</strong>
                    <span class="badge badge-blue" style="font-size: 10px;">${escapeHTML(u.type || 'General')}</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${escapeHTML(u.content)}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('dash-act-attendance').onclick = () => navigateTo('attendance');
    document.getElementById('dash-act-chat').onclick = () => navigateTo('chat');
    document.getElementById('dash-act-updates').onclick = () => navigateTo('updates');
    document.getElementById('dash-act-members').onclick = () => navigateTo('members');

  } catch (err) {
    console.error('Error loading dashboard:', err);
    container.innerHTML = '<div class="state-box"><div class="state-icon">⚠️</div><div class="state-title">Error Loading Dashboard</div><div class="state-desc">Unable to retrieve operational metrics.</div></div>';
  }
}
