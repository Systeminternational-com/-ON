import { initAuth } from "./auth.js";
import { initRouter } from "./router.js";

// Theme Controller (Light/Dark Mode)
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  applyTheme(savedTheme);

  const toggles = document.querySelectorAll('#login-theme-toggle, #app-theme-toggle');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('#login-theme-toggle, #app-theme-toggle').forEach(btn => {
    btn.textContent = icon;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initRouter();
});
