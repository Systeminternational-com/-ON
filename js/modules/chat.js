import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, showToast, getInitials } from "../ui-utils.js";
import { initDirectChat } from "./direct-messages.js";

export async function renderChat(container) {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const members = usersSnap.docs
      .map(d => d.data())
      .filter(m => m.uid !== state.currentUser.uid && m.status === 'active');

    let threadItemsHTML = `
      <div class="chat-thread-item active" data-thread="team">
        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px; background: var(--ios-blue-light); color: var(--ios-blue);">👥</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; font-size: 13px;"># Team Chat</div>
          <div class="chat-thread-role" style="font-size: 11px; color: var(--text-secondary);">Public Channel</div>
        </div>
      </div>
    `;

    members.forEach(m => {
      threadItemsHTML += `
        <div class="chat-thread-item" data-thread="dm" data-uid="${m.uid}" data-name="${escapeHTML(m.name)}">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">${getInitials(m.name)}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(m.name)}</div>
            <div class="chat-thread-role" style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(m.startupRole || 'Member')}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="chat-container">
        <div class="chat-sidebar">
          <div style="padding: 12px 14px; font-weight: 700; font-size: 13px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
            CHANNELS & DIRECT MESSAGES
          </div>
          <div class="chat-thread-list">${threadItemsHTML}</div>
        </div>
        <div class="chat-main" id="chat-active-panel"></div>
      </div>
    `;

    const chatMain = container.querySelector('#chat-active-panel');
    mountTeamGroupChat(chatMain);

    container.querySelectorAll('.chat-thread-item').forEach(item => {
      item.onclick = () => {
        container.querySelectorAll('.chat-thread-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const threadType = item.getAttribute('data-thread');
        if (threadType === 'team') {
          mountTeamGroupChat(chatMain);
        } else {
          const uid = item.getAttribute('data-uid');
          const name = item.getAttribute('data-name');
          initDirectChat(uid, name, chatMain);
        }
      };
    });

  } catch (err) {
    console.error('Chat view load error:', err);
    container.innerHTML = '<div class="state-box"><div class="state-title">Failed to load chat workspace</div></div>';
  }
}

function mountTeamGroupChat(panel) {
  panel.innerHTML = `
    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
      <span># Team Chat</span>
      <span class="badge badge-blue">Group Stream</span>
    </div>
    <div class="chat-messages" id="team-chat-messages">
      <div style="text-align: center; color: var(--text-tertiary); font-size: 13px; margin: auto;">Connecting...</div>
    </div>
    <form class="chat-composer" id="team-chat-form">
      <input type="text" id="chat-input-field" class="chat-input" placeholder="Message startup team..." autocomplete="off" required>
      <button type="submit" class="btn btn-primary btn-icon" style="width: 38px; height: 38px;">➤</button>
    </form>
  `;

  const messagesContainer = panel.querySelector('#team-chat-messages');
  const chatForm = panel.querySelector('#team-chat-form');
  const inputField = panel.querySelector('#chat-input-field');

  const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(100));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = '';
    if (snapshot.empty) {
      messagesContainer.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); font-size: 13px; margin: auto;">No messages yet. Say hello to the team!</div>';
      return;
    }

    snapshot.forEach((d) => {
      const msg = d.data();
      const isMe = msg.senderId === state.currentUser.uid;
      const bubble = document.createElement('div');
      bubble.className = `message-bubble ${isMe ? 'outgoing' : 'incoming'}`;
      bubble.innerHTML = `
        <div class="message-sender-meta">
          <span>${escapeHTML(msg.senderName || 'Member')}</span>
          <span style="color: var(--ios-blue);">(${escapeHTML(msg.senderRole || 'Team')})</span>
        </div>
        <div class="message-pill">${escapeHTML(msg.message)}</div>
      `;
      messagesContainer.appendChild(bubble);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, (err) => {
    console.error('Chat listener error:', err);
    showToast('Failed to connect to team chat', 'error');
  });

  state.registerListener(unsubscribe);

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = inputField.value.trim();
    if (!text) return;

    inputField.value = '';
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: state.currentUser.uid,
        senderName: state.userProfile.name,
        senderRole: state.userProfile.startupRole || 'Member',
        message: text,
        timestamp: serverTimestamp(),
        type: 'text'
      });
    } catch (err) {
      showToast('Failed to deliver message', 'error');
    }
  };
                  }
