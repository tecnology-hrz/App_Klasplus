// Autenticación de Login con Firebase Firestore (sin Authentication)
import { auth, db, signInWithPopup, GoogleAuthProvider, collection, doc, getDoc, setDoc, query, where, getDocs } from './firebase-config.js';

// Función para hashear contraseña con SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeSlashIcon = document.getElementById('eyeSlashIcon');
    const googleBtn = document.getElementById('googleBtn');

    // Botón de Google Sign-In
    if (googleBtn) {
        googleBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Verificar si el usuario ya existe en Firestore
                const userDocRef = doc(db, 'usuarios', user.uid);
                const userDoc = await getDoc(userDocRef);

                let userData;

                if (!userDoc.exists()) {
                    // Crear nuevo usuario estudiante con datos básicos
                    const nombres = user.displayName ? user.displayName.split(' ')[0] : 'Usuario';
                    const apellidos = user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '';
                    
                    userData = {
                        email: user.email,
                        nombre: nombres,
                        apellidos: apellidos,
                        nombres: nombres,
                        nombreCompleto: user.displayName || 'Usuario',
                        tipoUsuario: 'estudiante',
                        fechaRegistro: new Date().toISOString(),
                        photoURL: user.photoURL || '',
                        uid: user.uid,
                        // Campos básicos que se llenarán después
                        documento: '',
                        numeroDocumento: '',
                        tipoDocumento: '',
                        telefono: '',
                        genero: '',
                        institucionNombre: '',
                        institucionCiudad: '',
                        institucionDepartamento: ''
                    };

                    // Guardar en Firestore
                    await setDoc(userDocRef, userData);
                    
                    window.showSuccess('Cuenta creada exitosamente. Completa tu perfil más tarde', 'Bienvenido a Klasplus');
                } else {
                    // Usuario existente
                    userData = userDoc.data();
                    window.showSuccess(`Bienvenido de nuevo ${userData.nombreCompleto}`, 'Inicio de sesión exitoso');
                }

                // Guardar datos en localStorage (persistente)
                localStorage.setItem('userId', user.uid);
                localStorage.setItem('userEmail', user.email);
                localStorage.setItem('userRole', userData.tipoUsuario || 'estudiante');
                localStorage.setItem('userName', userData.nombreCompleto || user.displayName);
                localStorage.setItem('userPhoto', user.photoURL || '');

                // Redirigir según el rol
                setTimeout(() => {
                    redirectByRole(userData.tipoUsuario || 'estudiante');
                }, 1500);

            } catch (error) {
                console.error('Error con Google Sign-In:', error);
                
                let errorMessage = 'Error al iniciar sesión con Google';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'Inicio de sesión cancelado';
                } else if (error.code === 'auth/popup-blocked') {
                    errorMessage = 'Popup bloqueado. Por favor permite popups para este sitio';
                } else if (error.code === 'auth/unauthorized-domain') {
                    errorMessage = 'Dominio no autorizado. Por favor contacta al administrador para configurar Firebase Authentication';
                    console.error('SOLUCIÓN: Ve a Firebase Console -> Authentication -> Settings -> Authorized domains y agrega tu dominio local (ej: localhost o 127.0.0.1)');
                }
                
                window.showError(errorMessage, 'Error de autenticación');
            }
        });
    }

    // Toggle para mostrar/ocultar contraseña
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            eyeIcon.classList.toggle('hidden');
            eyeSlashIcon.classList.toggle('hidden');
        });
    }

    // Manejo del formulario de login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Validación básica
            if (!email || !password) {
                window.showWarning('Por favor completa todos los campos', 'Campos incompletos');
                return;
            }

            try {
                // Mostrar indicador de carga
                const loginBtn = loginForm.querySelector('.login-btn');
                const originalText = loginBtn.textContent;
                loginBtn.textContent = 'Iniciando sesión...';
                loginBtn.disabled = true;

                // Hashear la contraseña ingresada
                const hashedPassword = await hashPassword(password);

                // Buscar usuario en Firestore por email
                const usuariosRef = collection(db, 'usuarios');
                const q = query(usuariosRef, where('email', '==', email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    window.showError('No se encontró ninguna cuenta con este correo electrónico', 'Usuario no encontrado');
                    loginBtn.textContent = originalText;
                    loginBtn.disabled = false;
                    return;
                }

                // Obtener el primer documento (debería ser único)
                let userFound = false;
                let userData = null;
                let userId = null;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Verificar contraseña hasheada
                    if (data.password === hashedPassword) {
                        userFound = true;
                        userData = data;
                        userId = doc.id;
                    }
                });

                if (!userFound) {
                    window.showError('La contraseña ingresada es incorrecta. Por favor verifica e intenta nuevamente', 'Contraseña incorrecta');
                    loginBtn.textContent = originalText;
                    loginBtn.disabled = false;
                    return;
                }

                // Obtener rol del usuario (tipoUsuario en la BD)
                const userRole = userData.tipoUsuario || userData.rol || userData.tipo || 'estudiante';
                const userName = userData.nombreCompleto || userData.nombre || 'Usuario';

                // Guardar datos en localStorage (persistente)
                localStorage.setItem('userId', userId);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userRole', userRole);
                localStorage.setItem('userName', userName);
                localStorage.setItem('userDocument', userData.numeroDocumento || '');
                localStorage.setItem('userPhone', userData.telefono || '');
                localStorage.setItem('userPhoto', userData.fotoPerfil || '');

                // Mostrar mensaje de éxito y redirigir
                window.showSuccess(`Bienvenido ${userName}`, 'Inicio de sesión exitoso');
                
                setTimeout(() => {
                    redirectByRole(userRole);
                }, 1500);

            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                window.showError('Ocurrió un error al intentar iniciar sesión. Por favor intenta nuevamente', 'Error de conexión');
                
                const loginBtn = loginForm.querySelector('.login-btn');
                loginBtn.textContent = 'Iniciar Sesión';
                loginBtn.disabled = false;
            }
        });
    }

    // Función para redirigir según el rol
    function redirectByRole(role) {
        const roleMap = {
            'estudiante': 'dashboard-estudiante.html',
            'profesor': 'dashboard-profesor.html',
            'admin': 'dashboard-admin.html',
            'coordinador': 'dashboard-coordinador.html',
            'institucion': 'dashboard-institucion.html'
        };

        const dashboardPage = roleMap[role.toLowerCase()] || 'dashboard-estudiante.html';
        window.location.href = dashboardPage;
    }

    // Efecto visual en los inputs
    const inputs = document.querySelectorAll('.input-field');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.boxShadow = '0 4px 12px rgba(63, 81, 181, 0.2)';
        });

        input.addEventListener('blur', function() {
            this.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
        });
    });
});
