import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { state } from "./state.js";
import { showToast, getInitials } from "./ui-utils.js";
import { navigateTo } from "./router.js";

export function initAuth() {
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const restrictedModal = document.getElementById('restricted-modal');
  const restrictedCloseBtn = document.getElementById('restricted-close-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
      }

      try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verifying...';
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.error('Sign-in failed:', err);
        showToast(err.message.replace('Firebase: ', ''), 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Workspace';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        state.clearUser();
        showToast('Signed out successfully', 'info');
      } catch (err) {
        showToast('Failed to sign out', 'error');
      }
    });
  }

  if (restrictedCloseBtn) {
    restrictedCloseBtn.addEventListener('click', async () => {
      restrictedModal.classList.remove('active');
      await signOut(auth);
    });
  }

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists() || userSnap.data().status !== 'active') {
          restrictedModal.classList.add('active');
          document.getElementById('auth-view').style.display = 'none';
          document.getElementById('app-container').style.display = 'none';
          return;
        }

        const userProfile = userSnap.data();
        state.setUser(firebaseUser, userProfile);
        updateUserShellUI(userProfile);

        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        navigateTo('dashboard');
      } catch (err) {
        console.error('Profile fetch failed:', err);
        showToast('Failed to verify user profile', 'error');
        await signOut(auth);
      }
    } else {
      state.clearUser();
      document.getElementById('auth-view').style.display = 'flex';
      document.getElementById('app-container').style.display = 'none';
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Workspace';
      }
    }
  });
}

function updateUserShellUI(profile) {
  const avatar = document.getElementById('sidebar-user-avatar');
  const name = document.getElementById('sidebar-user-name');
  const role = document.getElementById('sidebar-user-role');
  const adminNav = document.querySelectorAll('.admin-only-nav');

  if (avatar) avatar.textContent = getInitials(profile.name);
  if (name) name.textContent = profile.name;
  if (role) role.textContent = profile.startupRole || profile.accountType;

  const isAdmin = profile.accountType === 'admin';
  adminNav.forEach((el) => {
    el.style.display = isAdmin ? 'block' : 'none';
  });
}
