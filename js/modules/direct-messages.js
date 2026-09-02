import { collection, addDoc, doc, setDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { state } from "../state.js";
import { escapeHTML, showToast } from "../ui-utils.js";

export function initDirectChat(targetMemberUid, targetMemberName, chatPanel) {
  const currentUid = state.currentUser.uid;
  const conversationId = currentUid < targetMemberUid ? `${currentUid}_${targetMemberUid}` : `${targetMemberUid}_${currentUid}`;

  chatPanel.innerHTML = `
    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
      <span>Direct Message: ${escapeHTML(targetMemberName)}</span>
      <span class="badge badge-green">End-to-End Logged</span>
    </div>
    <div class="chat-messages" id="dm-messages-stream">
      <div style="text-align: center; color: var(--text-tertiary); font-size: 13px; margin: auto;">Opening private channel...</div>
    </div>
    <form class="chat-composer" id="dm-composer-form">
      <input type="text" id="dm-input-field" class="chat-input" placeholder="Message ${escapeHTML(targetMemberName)}..." autocomplete="off" required>
      <button type="submit" class="btn btn-primary btn-icon" style="width: 38px; height: 38px;">➤</button>
    </form>
  `;

  const messagesStream = chatPanel.querySelector('#dm-messages-stream');
  const dmForm = chatPanel.querySelector('#dm-composer-form');
  const dmInput = chatPanel.querySelector('#dm-input-field');

  setDoc(doc(db, 'directChats', conversationId), {
    id: conversationId,
    participants: [currentUid, targetMemberUid],
    lastUpdated: serverTimestamp()
  }, { merge: true }).catch(() => {});

  const q = query(
    collection(db, 'directChats', conversationId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    messagesStream.innerHTML = '';
    if (snapshot.empty) {
      messagesStream.innerHTML = `<div style="text-align: center; color: var(--text-tertiary); font-size: 13px; margin: auto;">This is the start of your direct conversation with ${escapeHTML(targetMemberName)}.</div>`;
      return;
    }

    snapshot.forEach(d => {
      const msg = d.data();
      const isMe = msg.senderId === currentUid;
      const bubble = document.createElement('div');
      bubble.className = `message-bubble ${isMe ? 'outgoing' : 'incoming'}`;
      bubble.innerHTML = `<div class="message-pill">${escapeHTML(msg.message)}</div>`;
      messagesStream.appendChild(bubble);
    });

    messagesStream.scrollTop = messagesStream.scrollHeight;
  }, (err) => {
    console.error('Direct chat error:', err);
    showToast('Failed to load conversation', 'error');
  });

  state.registerListener(unsubscribe);

  dmForm.onsubmit = async (e) => {
    e.preventDefault();
    const message = dmInput.value.trim();
    if (!message) return;

    dmInput.value = '';
    try {
      await addDoc(collection(db, 'directChats', conversationId, 'messages'), {
        senderId: currentUid,
        message,
        timestamp: serverTimestamp(),
        type: 'text'
      });

      await setDoc(doc(db, 'directChats', conversationId), {
        lastMessage: message,
        lastMessageTimestamp: serverTimestamp(),
        lastSenderId: currentUid
      }, { merge: true });

    } catch (err) {
      console.error(err);
      showToast('Failed to send direct message', 'error');
    }
  };
}
