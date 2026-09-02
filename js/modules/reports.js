import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { escapeHTML } from "../ui-utils.js";

export async function renderReports(container) {
  const topbarActions = document.getElementById('topbar-actions-slot');
  if (topbarActions) {
    topbarActions.innerHTML = `<button class="btn btn-primary" id="btn-print-report">🖨️ Print Report</button>`;
    document.getElementById('btn-print-report').onclick = () => window.print();
  }

  try {
    const [usersSnap, sessionsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'attendanceSessions'))
    ]);

    const activeMembers = usersSnap.docs
      .map(d => d.data())
      .filter(m => m.status === 'active');

    const totalSessions = sessionsSnap.size;
    const recordsPromises = sessionsSnap.docs.map(s => 
      getDocs(collection(db, 'attendanceSessions', s.id, 'records'))
    );
    const recordsSnapshots = await Promise.all(recordsPromises);

    const statsByMember = {};
    activeMembers.forEach(m => {
      statsByMember[m.uid] = { present: 0, absent: 0, late: 0, excused: 0 };
    });

    recordsSnapshots.forEach(snap => {
      snap.forEach(doc => {
        const r = doc.data();
        if (statsByMember[r.memberUid]) {
          const status = r.status || 'absent';
          statsByMember[r.memberUid][status] = (statsByMember[r.memberUid][status] || 0) + 1;
        }
      });
    });

    let rowsHTML = '';
    activeMembers.forEach(m => {
      const s = statsByMember[m.uid] || { present: 0, absent: 0, late: 0, excused: 0 };
      const attended = s.present + s.late;
      const percentage = totalSessions > 0 ? ((attended / totalSessions) * 100).toFixed(1) : '100.0';

      rowsHTML += `
        <tr>
          <td><strong>${escapeHTML(m.name)}</strong></td>
          <td>${escapeHTML(m.collegeId || '--')}</td>
          <td>${escapeHTML(m.startupRole || 'Member')}</td>
          <td>${escapeHTML(m.department || '--')}</td>
          <td style="color: var(--ios-green); font-weight: 700;">${s.present}</td>
          <td style="color: var(--ios-red); font-weight: 700;">${s.absent}</td>
          <td style="color: var(--ios-orange); font-weight: 700;">${s.late}</td>
          <td><strong>${percentage}%</strong></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="card" style="max-width: 900px; margin: 0 auto; padding: 36px 32px;">
        <div style="border-bottom: 2px solid var(--border-color); padding-bottom: 20px; margin-bottom: 24px; text-align: center;">
          <h1 style="font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">STARTUP DEVELOPMENT TEAM</h1>
          <h3 style="font-size: 15px; font-weight: 600; color: var(--text-secondary); margin-top: 4px;">Official Attendance & Participation Record</h3>
          <p style="font-size: 12px; color: var(--text-tertiary); margin-top: 6px;">Total Development Sessions Conducted: <strong>${totalSessions}</strong></p>
        </div>

        <div class="table-responsive">
          <table class="ios-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>College ID</th>
                <th>Startup Role</th>
                <th>Dept</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>

        <div style="margin-top: 48px; padding-top: 32px; border-top: 1px dashed var(--border-color); display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary);">
          <div>Verified By: <strong>Startup Administrator</strong></div>
          <div>Authorized Faculty / Principal Signature: __________________</div>
        </div>
      </div>
    `;

  } catch (err) {
    console.error('Report render error:', err);
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to compile official report</div></div>';
  }
}
