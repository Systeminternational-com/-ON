import { state } from "./state.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderMembers } from "./modules/members.js";
import { renderAttendance } from "./modules/attendance.js";
import { renderWorkLogs } from "./modules/worklogs.js";
import { renderPerformance } from "./modules/performance.js";
import { renderUpdates } from "./modules/updates.js";
import { renderChat } from "./modules/chat.js";
import { renderReports } from "./modules/reports.js";
import { renderAudit } from "./modules/audit.js";

const routes = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview & Statistics', render: renderDashboard },
  members: { title: 'Team Directory', subtitle: 'Profiles & Roles', render: renderMembers },
  attendance: { title: 'Attendance Management', subtitle: 'Sessions & Records', render: renderAttendance },
  worklogs: { title: 'Development Work Logs', subtitle: 'Hours & Milestones', render: renderWorkLogs },
  performance: { title: 'Performance & Remarks', subtitle: 'Weekly Evaluations', render: renderPerformance },
  updates: { title: 'Team Updates', subtitle: 'Official Announcements', render: renderUpdates },
  chat: { title: 'Messages', subtitle: 'Team Chat & Direct Messages', render: renderChat },
  reports: { title: 'Official Reports', subtitle: 'Principal-Ready Attendance Reports', render: renderReports, adminOnly: true },
  audit: { title: 'Audit Trail', subtitle: 'Administrative Activity History', render: renderAudit, adminOnly: true }
};

export function navigateTo(viewName) {
  const route = routes[viewName] || routes.dashboard;

  if (route.adminOnly && !state.isAdmin()) {
    navigateTo('dashboard');
    return;
  }

  state.cleanupListeners();
  state.currentView = viewName;

  document.getElementById('page-title').textContent = route.title;
  document.getElementById('page-subtitle').textContent = route.subtitle;
  document.getElementById('topbar-actions-slot').innerHTML = '';

  document.querySelectorAll('.nav-item, .tab-item').forEach((item) => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const container = document.getElementById('view-container');
  container.innerHTML = '<div class="state-box"><div class="state-icon">⏳</div><div class="state-title">Loading...</div></div>';

  route.render(container);
}

export function initRouter() {
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const view = el.getAttribute('data-view');
      navigateTo(view);
    });
  });
}
