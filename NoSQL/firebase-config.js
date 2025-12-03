import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRu4n8z5d8CM5-6p24nVIO6BinT40qoNI",
  authDomain: "books-4e31d.firebaseapp.com",
  projectId: "books-4e31d",
  storageBucket: "books-4e31d.firebasestorage.app",
  messagingSenderId: "862327295897",
  appId: "1:862327295897:web:fb7f678c5c7be954468d08"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
