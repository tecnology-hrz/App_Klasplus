// ==========================================================
// Credenciales del proyecto Firebase.
//
// Vive en su propio módulo, SIN importar el SDK, a propósito:
// firebase-config.js descarga ~660 KB del SDK desde el CDN de Google. Si la
// capa REST (firestore-rest.js) tomara la configuración desde ahí, arrastraría
// todo ese SDK solo para leer dos strings, sumando casi un segundo de carga
// a pantallas que no usan el SDK en absoluto.
//
// Ambos módulos importan estas claves desde aquí, manteniendo una sola
// fuente de verdad sin costo de red.
// ==========================================================

export const firebaseConfig = {
  apiKey: "AIzaSyDorARgt7-sjGWjdmO5Ew0cZUjxrrvrbgM",
  authDomain: "klasplus-2161f.firebaseapp.com",
  projectId: "klasplus-2161f",
  storageBucket: "klasplus-2161f.firebasestorage.app",
  messagingSenderId: "506110700204",
  appId: "1:506110700204:web:4a81dff534874d0158cd09",
  measurementId: "G-VWR41TJEE4"
};
