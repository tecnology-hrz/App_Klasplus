// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, query, where, getDocs, orderBy, limit, serverTimestamp, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-keys.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Firestore con autodetección de long polling.
// Por defecto el SDK abre un canal de streaming (WebChannel) y hasta getDoc()
// lo usa internamente (getDocumentViaSnapshotListener). Si ese canal está
// bloqueado por extensiones del navegador, antivirus con inspección HTTPS o
// proxies, el SDK espera 10s y reporta "Could not reach Cloud Firestore
// backend / client is offline" aunque la red funcione.
// NOTA: en entornos donde ni así conecta, las lecturas deben hacerse por la
// API REST (ver src/js/firestore-rest.js), que no usa streaming.
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});

export { auth, db, firebaseConfig, signInWithPopup, GoogleAuthProvider, collection, doc, getDoc, setDoc, addDoc, updateDoc, query, where, getDocs, orderBy, limit, serverTimestamp, arrayUnion, increment };
