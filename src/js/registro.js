// Funcionalidad del formulario de registro
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function() {
    const registroForm = document.getElementById('registroForm');
    const togglePassword = document.getElementById('togglePassword');
    const institucionSelect = document.getElementById('institucion');

    // Cargar instituciones activas desde Firebase
    await cargarInstituciones();

    async function cargarInstituciones() {
        try {
            const q = query(
                collection(db, "usuarios"), 
                where("tipoUsuario", "==", "institucion"),
                where("estado", "==", "activo")
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                institucionSelect.innerHTML = '<option value="">No hay instituciones disponibles</option>';
                return;
            }

            // Limpiar opciones existentes excepto la primera
            institucionSelect.innerHTML = '<option value="">Selecciona tu institución</option>';
            
            querySnapshot.forEach((doc) => {
                const institucion = doc.data();
                const option = document.createElement('option');
                option.value = doc.id; // UID de la institución
                option.textContent = institucion.nombre || institucion.nombreCompleto || 'Sin nombre';
                option.dataset.nombreInstitucion = institucion.nombre || institucion.nombreCompleto;
                institucionSelect.appendChild(option);
            });

            console.log(`${querySnapshot.size} instituciones cargadas`);
        } catch (error) {
            console.error('Error al cargar instituciones:', error);
            institucionSelect.innerHTML = '<option value="">Error al cargar instituciones</option>';
        }
    }

    // Toggle para mostrar/ocultar contraseña
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const eyeIcon = this.querySelector('#eyeIcon');
            const eyeSlashIcon = this.querySelector('#eyeSlashIcon');
            eyeIcon.classList.toggle('hidden');
            eyeSlashIcon.classList.toggle('hidden');
        });
    }

    // Validación del formulario
    if (registroForm) {
        registroForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener todos los valores del formulario
            const institucionOption = institucionSelect.options[institucionSelect.selectedIndex];
            const formData = {
                nombres: document.getElementById('nombres').value.trim(),
                apellidos: document.getElementById('apellidos').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                tipoDocumento: document.getElementById('tipoDocumento').value,
                numeroDocumento: document.getElementById('numeroDocumento').value.trim(),
                sexo: document.getElementById('sexo').value,
                jornada: document.getElementById('jornada').value,
                institucionId: institucionSelect.value,
                institucionNombre: institucionOption.dataset.nombreInstitucion || '',
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value.trim(),
                autorizacion: document.getElementById('autorizacion').checked
            };

            // Validaciones
            if (!formData.nombres || formData.nombres.length < 2) {
                showError('Por favor ingresa tus nombres (mínimo 2 caracteres)', 'Campo requerido');
                document.getElementById('nombres').focus();
                return;
            }

            if (!formData.apellidos || formData.apellidos.length < 2) {
                showError('Por favor ingresa tus apellidos (mínimo 2 caracteres)', 'Campo requerido');
                document.getElementById('apellidos').focus();
                return;
            }

            if (!formData.telefono || formData.telefono.length < 7) {
                showError('Por favor ingresa un teléfono válido', 'Campo requerido');
                document.getElementById('telefono').focus();
                return;
            }

            if (!formData.tipoDocumento) {
                showError('Por favor selecciona tu tipo de documento', 'Campo requerido');
                document.getElementById('tipoDocumento').focus();
                return;
            }

            if (!formData.numeroDocumento || formData.numeroDocumento.length < 5) {
                showError('Por favor ingresa un número de documento válido', 'Campo requerido');
                document.getElementById('numeroDocumento').focus();
                return;
            }

            if (!formData.sexo) {
                showError('Por favor selecciona tu sexo', 'Campo requerido');
                document.getElementById('sexo').focus();
                return;
            }

            if (!formData.jornada) {
                showError('Por favor selecciona tu jornada', 'Campo requerido');
                document.getElementById('jornada').focus();
                return;
            }

            if (!formData.institucionId) {
                showError('Por favor selecciona tu institución', 'Campo requerido');
                institucionSelect.focus();
                return;
            }

            if (!formData.email || !validateEmail(formData.email)) {
                showError('Por favor ingresa un correo electrónico válido', 'Campo requerido');
                document.getElementById('email').focus();
                return;
            }

            if (!formData.password || formData.password.length < 6) {
                showError('La contraseña debe tener al menos 6 caracteres', 'Contraseña débil');
                document.getElementById('password').focus();
                return;
            }

            if (!formData.autorizacion) {
                showWarning('Debes autorizar el tratamiento de datos personales para continuar', 'Autorización requerida');
                document.getElementById('autorizacion').focus();
                return;
            }

            // Deshabilitar el botón de envío
            const submitBtn = registroForm.querySelector('.registro-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando cuenta...';

            try {
                // Crear usuario en Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                // Guardar información adicional en Firestore con estado "desactivado"
                await setDoc(doc(db, "usuarios", user.uid), {
                    nombres: formData.nombres,
                    apellidos: formData.apellidos,
                    nombreCompleto: `${formData.nombres} ${formData.apellidos}`,
                    telefono: formData.telefono,
                    tipoDocumento: formData.tipoDocumento,
                    numeroDocumento: formData.numeroDocumento,
                    sexo: formData.sexo,
                    genero: formData.sexo,
                    jornada: formData.jornada,
                    institucionId: formData.institucionId,
                    institucionNombre: formData.institucionNombre,
                    email: formData.email,
                    autorizacionDatos: formData.autorizacion,
                    estado: "desactivado", // Usuario creado como desactivado
                    tipoUsuario: "estudiante", // Por defecto es estudiante
                    fechaRegistro: new Date().toISOString(),
                    uid: user.uid
                });

                console.log('Usuario registrado exitosamente:', user.uid);
                
                showSuccess(
                    'Tu cuenta ha sido creada exitosamente. Está pendiente de activación por parte de la institución. Serás redirigido al login en unos momentos.',
                    '¡Registro Exitoso!'
                );
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error('Error al registrar usuario:', error);
                
                let errorMessage = '';
                let errorTitle = 'Error al crear la cuenta';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Este correo electrónico ya está registrado. Por favor usa otro correo o inicia sesión.';
                        errorTitle = 'Correo ya registrado';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'El correo electrónico no es válido. Por favor verifica e intenta nuevamente.';
                        errorTitle = 'Correo inválido';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
                        errorTitle = 'Contraseña débil';
                        break;
                    default:
                        errorMessage = error.message || 'Ocurrió un error inesperado. Por favor intenta nuevamente.';
                }
                
                showError(errorMessage, errorTitle);
                
                // Rehabilitar el botón
                submitBtn.disabled = false;
                submitBtn.textContent = 'Crear Cuenta';
            }
        });
    }

    // Función para validar email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
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
