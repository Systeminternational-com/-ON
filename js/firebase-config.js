import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYNP7-Zo7cJHTeketAt2mfe9uY1bJgFjg",
  authDomain: "management-e9625.firebaseapp.com",
  projectId: "management-e9625",
  storageBucket: "management-e9625.firebasestorage.app",
  messagingSenderId: "449001305435",
  appId: "1:449001305435:web:92a0a38ca64788c2db567e",
  measurementId: "G-X3EDZ76M58"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
