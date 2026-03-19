// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDorARgt7-sjGWjdmO5Ew0cZUjxrrvrbgM",
  authDomain: "klasplus-2161f.firebaseapp.com",
  projectId: "klasplus-2161f",
  storageBucket: "klasplus-2161f.firebasestorage.app",
  messagingSenderId: "506110700204",
  appId: "1:506110700204:web:4a81dff534874d0158cd09",
  measurementId: "G-VWR41TJEE4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInWithPopup, GoogleAuthProvider, collection, doc, getDoc, setDoc, query, where, getDocs };
